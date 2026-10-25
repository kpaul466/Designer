/**
 * PowerLine Designer - Electron Preload Script
 * Exposes secure IPC communication between Main and Renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  savePldFile: (content, defaultFilename) =>
    ipcRenderer.invoke('save-pld-file', content, defaultFilename),
  openPldDialog: () => ipcRenderer.invoke('open-pld-dialog'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  // Listeners from main process
  onUpdateAvailable: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('electron-update-available', handler);
    return () => ipcRenderer.removeListener('electron-update-available', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('electron-update-downloaded', handler);
    return () => ipcRenderer.removeListener('electron-update-downloaded', handler);
  },
  onOpenPldFile: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('open-pld-file', handler);
    return () => ipcRenderer.removeListener('open-pld-file', handler);
  },
  onTriggerSavePld: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-save-pld', handler);
    return () => ipcRenderer.removeListener('trigger-save-pld', handler);
  },
  onOpenAboutDeveloper: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-about-developer', handler);
    return () => ipcRenderer.removeListener('open-about-developer', handler);
  },
  onOpenAppVersion: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-app-version', handler);
    return () => ipcRenderer.removeListener('open-app-version', handler);
  },
});

