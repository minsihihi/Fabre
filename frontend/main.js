const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    },
});

  // Vite 개발 서버 URL 로드
    win.loadURL('http://localhost:5173');  // 이곳에 React 앱을 띄움

    // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
