const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    log: (message) => ipcRenderer.send('log', message),
    openYoutube: (trackId) => ipcRenderer.send('api:open-youtube', trackId)
});

contextBridge.exposeInMainWorld('db', {
    getTracks: (page, size, playlistId) => ipcRenderer.invoke('db:get-tracks', page, size, playlistId),
    getTrack: (trackId) => ipcRenderer.invoke('db:get-track', trackId),
    getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
    jumpToTrack: (trackId, size, playlistId) => ipcRenderer.invoke('db:jump-to-track', trackId, size, playlistId),
    savePlaylist: (trackId, playlist, isDelete) => ipcRenderer.invoke('db:save-playlist', trackId, playlist, isDelete),
    deleteTrack: (trackId) => ipcRenderer.invoke('db:delete-track', trackId),
    nextTrack: (trackId) => ipcRenderer.invoke('db:next-track', trackId)
});
