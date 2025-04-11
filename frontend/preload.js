// frontend/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 예시: ipcRenderer.on('channel', callback) 등 작성 가능
});
