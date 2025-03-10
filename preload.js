const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onWorkoutNotification: (callback) => ipcRenderer.on('workout-notification', callback),
});
