const { Tray, Menu, screen, app } = require('electron');
const path = require('path');

let tray = null;

function getDockedPosition(windowWidth, windowHeight) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const margin = 20;

  const x = Math.round(workArea.x + workArea.width - windowWidth - margin);
  const y = Math.round(workArea.y + workArea.height - windowHeight - margin);

  return { x, y };
}

function createTray({ mainWindow, openSettings, store, onConfigChanged }) {
  const iconPath = path.join(__dirname, '../assets/icons/tray-icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Ant Farm');

  function updateContextMenu() {
    const config = store.config;
    const isDocked = config.windowMode === 'docked';
    const isFloat = config.windowMode === 'float';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Ant Farm',
        enabled: false
      },
      { type: 'separator' },
      {
        label: mainWindow.isVisible() ? 'Hide Farm' : 'Show Farm',
        click: () => toggleMainWindow(mainWindow, store)
      },
      {
        label: 'Window Location',
        submenu: [
          {
            label: 'Docked (Bottom-Right)',
            type: 'radio',
            checked: isDocked,
            click: () => {
              store.saveConfig({ windowMode: 'docked' });
              repositionWindow(mainWindow, store);
              onConfigChanged(store.config);
              updateContextMenu();
            }
          },
          {
            label: 'Float (Draggable)',
            type: 'radio',
            checked: isFloat,
            click: () => {
              store.saveConfig({ windowMode: 'float' });
              onConfigChanged(store.config);
              updateContextMenu();
            }
          },
          { type: 'separator' },
          {
            label: 'Reset Position',
            click: () => {
              store.saveConfig({ windowMode: 'docked', windowX: null, windowY: null });
              repositionWindow(mainWindow, store);
              onConfigChanged(store.config);
              updateContextMenu();
            }
          }
        ]
      },
      {
        label: 'Always on Top',
        type: 'checkbox',
        checked: !!config.alwaysOnTop,
        click: (menuItem) => {
          store.saveConfig({ alwaysOnTop: menuItem.checked });
          mainWindow.setAlwaysOnTop(menuItem.checked);
          onConfigChanged(store.config);
        }
      },
      { type: 'separator' },
      {
        label: '💧 Quick Water (+5)',
        click: () => {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.webContents.send('quick-water', 5);
        }
      },
      {
        label: '🌾 Quick Food (+5)',
        click: () => {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.webContents.send('quick-food', 5);
        }
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => openSettings()
      },
      { type: 'separator' },
      {
        label: 'Quit Ant Farm',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  }

  // Left click toggles the window
  tray.on('click', () => {
    toggleMainWindow(mainWindow, store);
    updateContextMenu();
  });

  // Right click opens menu
  tray.on('right-click', () => {
    updateContextMenu();
    tray.popUpContextMenu();
  });

  updateContextMenu();
  return { tray, updateContextMenu };
}

function toggleMainWindow(mainWindow, store) {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    if (store.config.windowMode === 'docked') {
      repositionWindow(mainWindow, store);
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

function repositionWindow(mainWindow, store) {
  const [width, height] = mainWindow.getSize();
  if (store.config.windowMode === 'docked' || store.config.windowX === null || store.config.windowY === null) {
    const pos = getDockedPosition(width, height);
    mainWindow.setPosition(pos.x, pos.y);
  } else {
    mainWindow.setPosition(store.config.windowX, store.config.windowY);
  }
}

module.exports = {
  createTray,
  getDockedPosition,
  repositionWindow
};
