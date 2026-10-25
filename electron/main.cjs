/**
 * PowerLine Designer - Electron Main Process
 * Desktop application for Windows, macOS, and Linux
 * Handles file association (.pld), native file dialogs, and deep linking
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_VERSION = '2.4.0';

let mainWindow = null;
let pendingFileToOpen = null;

function parseCommandLineFile(argv) {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith('--') && !arg.startsWith('-') && (arg.endsWith('.pld') || arg.endsWith('.json'))) {
      if (fs.existsSync(arg)) {
        return arg;
      }
    }
  }
  return null;
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const fileToOpen = parseCommandLineFile(commandLine);
      if (fileToOpen) {
        sendFileToRenderer(fileToOpen);
      }
    }
  });
}

function sendFileToRenderer(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('open-pld-file', {
        filePath,
        content,
      });
    } else {
      pendingFileToOpen = filePath;
    }
  } catch (err) {
    console.error('Failed to read drawing file:', err);
  }
}

// Check initial process argv for file path
const initialFile = parseCommandLineFile(process.argv);
if (initialFile) {
  pendingFileToOpen = initialFile;
}

// macOS open-file event
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    sendFileToRenderer(filePath);
  } else {
    pendingFileToOpen = filePath;
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: 'PowerLine Designer',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '../public/powerline-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
    autoHideMenuBar: false,
  });

  const loadUrl = isDev && process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(loadUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingFileToOpen) {
      sendFileToRenderer(pendingFileToOpen);
      pendingFileToOpen = null;
    }
  });

  setupAppMenu();
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open .PLD Drawing...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Open PowerLine Drawing',
              filters: [
                { name: 'PowerLine Drawing (*.pld)', extensions: ['pld'] },
                { name: 'JSON Drawing Backup (*.json)', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] },
              ],
              properties: ['openFile'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              sendFileToRenderer(result.filePaths[0]);
            }
          },
        },
        {
          label: 'Save as .PLD Drawing...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('trigger-save-pld');
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Developer',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-about-developer');
            }
          },
        },
        {
          label: 'App Version & Downloads',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-app-version');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/kpaul466/Designer');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Auto Updater Integration for Desktop
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {
  // electron-updater not loaded in dev
}

function initAutoUpdater() {
  if (!autoUpdater) return;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('electron-update-available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('electron-update-downloaded', info);
    }
  });

  // Check on startup
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {}
  }, 4000);

  // Periodic check every 15 minutes
  setInterval(() => {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {}
  }, 15 * 60 * 1000);
}

// IPC Handlers
ipcMain.handle('get-app-version', () => APP_VERSION);
ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('check-for-updates', () => {
  if (autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {}
  }
});

ipcMain.handle('quit-and-install', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.handle('save-pld-file', async (event, content, defaultFilename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save PowerLine Drawing (.pld)',
    defaultPath: defaultFilename || 'powerline_drawing.pld',
    filters: [
      { name: 'PowerLine Drawing (*.pld)', extensions: ['pld'] },
      { name: 'JSON Backup (*.json)', extensions: ['json'] },
    ],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-pld-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open PowerLine Drawing (.pld)',
    filters: [
      { name: 'PowerLine Drawing (*.pld)', extensions: ['pld'] },
      { name: 'JSON Drawing Backup (*.json)', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const filePath = filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { filePath, content };
  } catch (err) {
    throw new Error(`Failed to read file: ${err.message}`);
  }
});

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

