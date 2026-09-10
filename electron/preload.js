const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('antFarmAPI', {
  // Config & State
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  getColonyState: () => ipcRenderer.invoke('get-colony-state'),
  saveColonyState: (state) => ipcRenderer.invoke('save-colony-state', state),
  resetColony: (species) => ipcRenderer.invoke('reset-colony', species),

  // Window Controls
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', { width, height }),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Quick Action / IPC Listeners from Tray
  onFoodTriggered: (callback) => {
    const handler = (_event, amount) => callback(amount);
    ipcRenderer.on('quick-food', handler);
    ipcRenderer.on('quick-feed', handler);
    return () => {
      ipcRenderer.removeListener('quick-food', handler);
      ipcRenderer.removeListener('quick-feed', handler);
    };
  },
  onFeedTriggered: (callback) => {
    const handler = (_event, amount) => callback(amount);
    ipcRenderer.on('quick-food', handler);
    ipcRenderer.on('quick-feed', handler);
    return () => {
      ipcRenderer.removeListener('quick-food', handler);
      ipcRenderer.removeListener('quick-feed', handler);
    };
  },
  onWaterTriggered: (callback) => {
    const handler = (_event, amount) => callback(amount);
    ipcRenderer.on('quick-water', handler);
    return () => ipcRenderer.removeListener('quick-water', handler);
  },
  onConfigChanged: (callback) => {
    const handler = (_event, config) => callback(config);
    ipcRenderer.on('config-changed', handler);
    return () => ipcRenderer.removeListener('config-changed', handler);
  },
  onResetColony: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('reset-colony', handler);
    return () => ipcRenderer.removeListener('reset-colony', handler);
  }
});
