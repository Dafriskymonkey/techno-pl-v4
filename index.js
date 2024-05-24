// Modules to control application life and create native browser window
const { Menu, app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const loadURL = serve({ directory: 'build' });

const DataManager = require('./data-manager');
const dataManager = new DataManager();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function isDev() {
  return !app.isPackaged;
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    // fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    // Use this in development mode.
    icon: isDev()
      ? path.join(process.cwd(), 'static/favicon.png')
      : path.join(__dirname, 'build/favicon.ico'),
    // Use this in production mode.
    // icon: path.join(__dirname, 'build/favicon.png'),
    show: false,
  });

  // mainWindow.maximize();

  // This block of code is intended for development purpose only.
  // Delete this entire block of code when you are ready to package the application.
  if (isDev()) {
    mainWindow.loadURL('http://localhost:9090/');
  } else {
    loadURL(mainWindow);
  }

  // Uncomment the following line of code when app is ready to be packaged.
  // loadURL(mainWindow);

  // Open the DevTools and also disable Electron Security Warning.
  // process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
  if (isDev()) mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Emitted when the window is ready to be shown
  // This helps in showing the window gracefully.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.enableSandbox();

app.whenReady().then(async () => {

  const template = [
    {
      label: 'options',
      submenu: [
        {
          label: 'exit',
          accelerator: 'CmdOrCtrl+Q',
          click() {
            app.quit()
          }
        },
        {
          label: 'open DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click() {
            mainWindow.webContents.openDevTools()
          }
        },
        {
          label: 'import downloaded tracks',
          async click() {
            console.info('import downloaded tracks');
            await dataManager.importDownloadedTracks();
            console.info('done importing downloaded tracks');
          }
        },
        {
          label: 'dummy',
          async click() {
            await dataManager.dummy();
            
          }
        }
      ]
    }
  ];

  // Create the menu
  const menu = Menu.buildFromTemplate(template);

  // Set the menu
  Menu.setApplicationMenu(menu);

  ipcMain.on('log', (event, message) => {
    console.info('render:log', message);
  });

  ipcMain.on('api:open-youtube', (event, trackId) => {
    console.info('api:open-youtube', trackId);
    shell.openExternal(`https://www.youtube.com/watch?v=${trackId}`);
  });

  ipcMain.handle('db:get-tracks', (event, page, size, playlistId) => {
    console.info('db:get-tracks', page, size, playlistId);
    let tracks = dataManager.getTracks(page, size, playlistId);
    return tracks;
  });

  ipcMain.handle('db:get-track', (event, trackId) => {
    console.info('db:get-track', trackId);
    let track = dataManager.getTrack(trackId);
    return track;
  });

  ipcMain.handle('db:get-playlists', (event) => {
    console.info('db:get-playlists');
    let tracks = dataManager.getPlaylists();
    return tracks;
  });

  ipcMain.handle('db:jump-to-track', async (event, trackId, size, playlistId) => {
    console.info('db:jump-to-track', trackId, size, playlistId);
    const page = await dataManager.jumpToTrack(trackId, size, playlistId);
    return page;
  });

  ipcMain.handle('db:save-playlist', async (event, trackId, playlist, isDelete) => {
    console.info('db:save-playlist', trackId, playlist, isDelete);
    const result = await dataManager.savePlaylist(trackId, playlist, isDelete);
    return result;
  });

  ipcMain.handle('db:edit-playlist', async (event, playlistId, playlistObj) => {
    console.info('db:edit-playlist', playlistId, playlistObj);
    const result = await dataManager.editPlaylist(playlistId, playlistObj);
    return result;
  });

  ipcMain.handle('db:delete-track', async (event, trackId) => {
    console.info('db:delete-track', trackId);
    const result = await dataManager.deleteTrack(trackId);
    return result;
  });

  ipcMain.handle('db:next-track', async (event, trackId) => {
    console.info('db:next-track', trackId);
    const result = await dataManager.nextTrack(trackId);
    return result;
  });

  ipcMain.handle('db:download-playlist', async (event, playlistId) => {
    console.info('db:download-playlist', playlistId);
    const path = await dataManager.downloadPlaylist(playlistId);
    return path;
  });

  ipcMain.handle('db:init', async () => {
    console.info('db:init');
    const result = await dataManager.init();
    return result;
  });

  ipcMain.handle('db:get-missing-tracks', async () => {
    console.info('db:get-missing-tracks');
    const result = await dataManager.getMissingFiles();
    return result;
  });

  ipcMain.handle('db:update-yt-dlp', async (event) => {
    console.info('db:update-yt-dlp');
    await dataManager.updateYtDlp();
  });

  ipcMain.handle('db:download-track', async (event, trackId) => {
    console.info('db:download-track');
    await dataManager.downloadTrack(trackId);
  });

  ipcMain.handle('db:get-trackId-setting', async () => {
    console.info('db:get-trackId-setting');
    const trackId = await dataManager.getTrackIdSetting();
    return trackId;
  });

  ipcMain.handle('db:set-trackId-setting', async (event, trackId) => {
    console.info('db:set-trackId-setting');
    return await dataManager.setTrackIdSetting(trackId);
  });

  ipcMain.handle('db:get-track-object', async (event, trackId) => {
    console.info('db:get-track-object');
    return await dataManager.getTrackObject(trackId);
  });

  ipcMain.handle('api:show-confirm', async (event, message) => {
    console.info('api:show-confirm');

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['OK', 'Cancel'],
      defaultId: 1,
      title: 'Confirm',
      message: message,
    });

    return result.response == 0;
  });

  createWindow();

  dataManager.setMainWindow(mainWindow);
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
