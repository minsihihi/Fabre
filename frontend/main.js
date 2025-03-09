const { app, BrowserWindow, Notification } = require("electron");
const path = require("path");
const WebSocket = require("ws");

const eventEmitter = require("../backend/utils/eventEmitter"); 

let mainWindow;

// WebSocket 연결 설정
const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
    console.log("WebSocket 연결 성공");
});

ws.on("message", (data) => {
    const notificationData = JSON.parse(data);
    console.log("WebSocket으로 받은 알림:", notificationData);

    if (mainWindow) {
        const notification = new Notification({
            title: notificationData.title,
            body: notificationData.message,
            silent: false,
            timeoutType: "default",
        });

        notification.show();
        mainWindow.webContents.send("workout-notification", notificationData);

        notification.on("click", () => {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        });
    }
});

// Electron 윈도우 생성
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadURL("http://localhost:5173"); // React 앱 실행
}

app.whenReady().then(() => {
    createWindow();

    // WebSocket으로 운동 알림 받기
    eventEmitter.on("notification", (notificationData) => {
        // console.log("알림 이벤트 수신:", notificationData);

        if (!mainWindow) {
            console.error("mainWindow가 정의되지 않았음!");
            return;
        }

        const notification = new Notification({
            title: notificationData.title,
            body: notificationData.message,
            silent: false,
            timeoutType: "default",
        });

        notification.show();
        mainWindow.webContents.send("workout-notification", notificationData);

        notification.on("click", () => {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        });
    });
});

// 창이 닫혀도 앱이 종료되지 않도록 설정
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
