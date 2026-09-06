import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { setupTray } from './tray';
import { Tracker } from './tracker';
import { SyncManager } from './sync';

let mainWindow: BrowserWindow | null = null;
let tracker: Tracker | null = null;
let syncManager: SyncManager | null = null;

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
    if (tracker?.isTracking()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

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

  ipcMain.handle('auth:login', async (_e, email: string, password: string) => {
    return syncManager!.login(email, password);
  });

  ipcMain.handle('auth:logout', async () => {
    tracker!.stop();
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
