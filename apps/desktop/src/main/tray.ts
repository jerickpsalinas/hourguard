import { Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import { Tracker } from './tracker';

let tray: Tray | null = null;

export function setupTray(mainWindow: BrowserWindow, tracker: Tracker) {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Hubstaff Mimick');

  const updateMenu = () => {
    const isTracking = tracker.isTracking();
    const menu = Menu.buildFromTemplate([
      {
        label: isTracking ? 'Stop Tracking' : 'Start Tracking',
        click: () => {
          if (isTracking) {
            tracker.stop();
          } else {
            tracker.start();
          }
          updateMenu();
        },
      },
      { type: 'separator' },
      {
        label: 'Show Window',
        click: () => mainWindow.show(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          tracker.stop();
          mainWindow.destroy();
        },
      },
    ]);
    tray!.setContextMenu(menu);
  };

  updateMenu();
  tray.on('double-click', () => mainWindow.show());
}
