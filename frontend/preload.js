// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 웹 애플리케이션(React)에 노출할 API 정의
contextBridge.exposeInMainWorld('electronAPI', {
  // 기존에 노출된 다른 API 함수들...
  
  // 트레이너 ID 설정 함수 추가
  setTrainerId: (trainerId) => {
    console.log('preload: setTrainerId 호출됨:', trainerId);
    ipcRenderer.send('set-logged-in-trainer', trainerId);
  }
});