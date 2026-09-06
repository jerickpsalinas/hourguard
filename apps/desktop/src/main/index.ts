import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { setupTray } from './tray';
import { Tracker } from './tracker';
import { SyncManager } from './sync';

let mainWindow: BrowserWindow | null = null;
let tracker: Tracker | null = null;
let syncManager: SyncManager | null = null;
let quitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
    // Keep running in the tray while tracking, but never block an actual quit.
    if (tracker?.isTracking() && !quitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// On quit, finalize the current interval before the process exits so the last
// interval's stopped_at/activity isn't lost.
app.on('before-quit', (e) => {
  if (quitting) return;
  if (tracker?.isTracking()) {
    e.preventDefault();
    quitting = true;
    tracker.stop().finally(() => app.quit());
  } else {
    quitting = true;
  }
});

app.whenReady().then(() => {
  createWindow();

  syncManager = new SyncManager();

  let trayControls: { refresh: () => void } | null = null;

  tracker = new Tracker(syncManager, (state) => {
    // Keep the renderer and tray in sync with automatic state changes
    // (idle auto-pause / auto-resume), not just user clicks.
    mainWindow?.webContents.send('tracker:state', state);
    trayControls?.refresh();
  });

  trayControls = setupTray(mainWindow!, tracker);

  // Periodically retry syncing anything queued while offline.
  setInterval(() => {
    syncManager?.flushPendingEntries().catch(() => {});
  }, 2 * 60 * 1000);

  ipcMain.handle('auth:login', async (_e, email: string, password: string) => {
    return syncManager!.login(email, password);
  });

  ipcMain.handle('auth:logout', async () => {
    // Finalize the current interval before signing out, or the write races
    // session teardown and is lost.
    await tracker!.stop();
    return syncManager!.logout();
  });

  ipcMain.handle('auth:session', async () => {
    return syncManager!.getSession();
  });

  ipcMain.handle('tracker:start', async (_e, projectId?: string) => {
    return tracker!.start(projectId);
  });

  ipcMain.handle('tracker:stop', async () => {
    return tracker!.stop();
  });

  ipcMain.handle('tracker:status', async () => {
    return tracker!.getStatus();
  });

  ipcMain.handle('projects:list', async () => {
    return syncManager!.getProjects();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
  }
});
