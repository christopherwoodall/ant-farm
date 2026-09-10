const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('./store');
const { createTray, getDockedPosition, repositionWindow } = require('./tray');

const store = new Store();
let mainWindow = null;
let settingsWindow = null;
let trayController = null;

const SCALE_SIZES = {
  compact: { width: 340, height: 150 },
  standard: { width: 400, height: 180 },
  large: { width: 480, height: 215 }
};

function getWindowDimensions(config) {
  if (config.customWidth && config.customHeight) {
    return { width: config.customWidth, height: config.customHeight };
  }
  return SCALE_SIZES[config.windowScale] || SCALE_SIZES.standard;
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMainWindow() {
  const config = store.config;
  const { width, height } = getWindowDimensions(config);

  let initialX, initialY;
  if (config.windowMode === 'float' && config.windowX !== null && config.windowY !== null) {
    initialX = config.windowX;
    initialY = config.windowY;
  } else {
    const pos = getDockedPosition(width, height);
    initialX = pos.x;
    initialY = pos.y;
  }

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 320,
    minHeight: 140,
    maxWidth: 850,
    maxHeight: 450,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: !!config.alwaysOnTop,
    hasShadow: true,
    roundedCorners: true,
    opacity: (config.opacity || 95) / 100,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE ${level}] ${message} (${sourceId}:${line})`);
  });

  // Prevent closing when user clicks close; just hide to tray
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (trayController) trayController.updateContextMenu();
    }
  });

  // Track position when dragged in floating mode
  mainWindow.on('moved', () => {
    if (store.config.windowMode === 'float') {
      const [x, y] = mainWindow.getPosition();
      store.saveConfig({ windowX: x, windowY: y });
    }
  });

  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize();
    store.saveConfig({ customWidth: w, customHeight: h });
  });
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 440,
    height: 600,
    title: 'Ant Farm Settings',
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../src/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-config', () => store.config);

ipcMain.handle('resize-window', (_event, { width, height }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const w = Math.round(width);
    const h = Math.round(height);
    mainWindow.setSize(w, h);
    store.saveConfig({ customWidth: w, customHeight: h });
    if (store.config.windowMode === 'docked') {
      repositionWindow(mainWindow, store);
    }
    return { width: w, height: h };
  }
  return null;
});

ipcMain.handle('save-config', (_event, newConfig) => {
  const updated = store.saveConfig(newConfig);

  // Apply window changes if scale/opacity/alwaysOnTop changed
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (newConfig.windowScale && SCALE_SIZES[newConfig.windowScale]) {
      const preset = SCALE_SIZES[newConfig.windowScale];
      store.saveConfig({ customWidth: preset.width, customHeight: preset.height, windowScale: newConfig.windowScale });
      mainWindow.setSize(preset.width, preset.height);
      if (updated.windowMode === 'docked') {
        repositionWindow(mainWindow, store);
      }
    } else if (newConfig.windowScale) {
      const { width, height } = getWindowDimensions(updated);
      mainWindow.setSize(width, height);
      if (updated.windowMode === 'docked') {
        repositionWindow(mainWindow, store);
      }
    }
    if (newConfig.opacity !== undefined) {
      mainWindow.setOpacity(newConfig.opacity / 100);
    }
    if (newConfig.alwaysOnTop !== undefined) {
      mainWindow.setAlwaysOnTop(newConfig.alwaysOnTop);
    }
    mainWindow.webContents.send('config-changed', updated);
  }

  if (trayController) {
    trayController.updateContextMenu();
  }

  return updated;
});

ipcMain.handle('get-colony-state', () => store.colony);

ipcMain.handle('save-colony-state', (_event, state) => {
  return store.saveColony(state);
});

ipcMain.handle('set-window-mode', (_event, mode) => {
  store.saveConfig({ windowMode: mode });
  if (mode === 'docked' && mainWindow) {
    repositionWindow(mainWindow, store);
  }
  if (trayController) trayController.updateContextMenu();
  if (mainWindow) mainWindow.webContents.send('config-changed', store.config);
  return store.config;
});

ipcMain.handle('open-settings', () => {
  openSettingsWindow();
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.hide();
  if (trayController) trayController.updateContextMenu();
});

ipcMain.handle('reset-colony', (_event, species) => {
  const state = store.resetColony(species);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reset-colony', state);
  }
  return state;
});

app.whenReady().then(() => {
  createMainWindow();

  trayController = createTray({
    mainWindow,
    openSettings: openSettingsWindow,
    store,
    onConfigChanged: (config) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('config-changed', config);
      }
    }
  });

  // Re-dock on screen resize/resolution changes
  screen.on('display-metrics-changed', () => {
    if (mainWindow && store.config.windowMode === 'docked') {
      repositionWindow(mainWindow, store);
    }
  });
});

app.on('window-all-closed', () => {
  // Stay alive in tray
});
