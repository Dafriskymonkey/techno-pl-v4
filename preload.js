const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    log: (message) => ipcRenderer.send('log', message),
    openYoutube: (trackId) => ipcRenderer.send('api:open-youtube', trackId),
    getTracks: (callback) => ipcRenderer.on('main:get-tracks', callback),
    onMessage: (callback) => ipcRenderer.on('api:message', callback)
});

contextBridge.exposeInMainWorld('db', {
    init: () => ipcRenderer.invoke('db:init'),
    getTrackIdSetting: () => ipcRenderer.invoke('db:get-trackId-setting'),
    setTrackIdSetting: (trackId) => ipcRenderer.invoke('db:set-trackId-setting', trackId),
    getTrackObject: (trackId) => ipcRenderer.invoke('db:get-track-object', trackId),
    getMissingTracks: () => ipcRenderer.invoke('db:get-missing-tracks'),
    updateYtDlp: () => ipcRenderer.invoke('db:update-yt-dlp'),
    downloadTrack: (trackId) => ipcRenderer.invoke('db:download-track', trackId),
    onYtDlpOutput: (callback) => ipcRenderer.on('yt-dlp:output', callback),
    getTracks: (page, size, playlistId) => ipcRenderer.invoke('db:get-tracks', page, size, playlistId),
    getTrack: (trackId) => ipcRenderer.invoke('db:get-track', trackId),
    getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
    jumpToTrack: (trackId, size, playlistId) => ipcRenderer.invoke('db:jump-to-track', trackId, size, playlistId),
    savePlaylist: (trackId, playlist, isDelete) => ipcRenderer.invoke('db:save-playlist', trackId, playlist, isDelete),
    deleteTrack: (trackId) => ipcRenderer.invoke('db:delete-track', trackId),
    nextTrack: (trackId) => ipcRenderer.invoke('db:next-track', trackId),
    downloadPlaylist: (playlistId) => ipcRenderer.invoke('db:download-playlist', playlistId)
});
