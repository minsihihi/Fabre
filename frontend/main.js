const { app, BrowserWindow, Notification } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const isDev = require("electron-is-dev");

const eventEmitter = require("../backend/utils/eventEmitter");

let mainWindow;

// WebSocket 연결
const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
    console.log("WebSocket 연결 성공");
});

ws.on("message", (data) => {
    const notificationData = JSON.parse(data);
    console.log("WebSocket 알림 수신:", notificationData);

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

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
    } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady().then(() => {
    createWindow();

    eventEmitter.on("notification", (notificationData) => {
        if (!mainWindow) return;

        const notification = new Notification({
        title: notificationData.title,
        body: notificationData.message,
        silent: false,
        });

        notification.show();
        mainWindow.webContents.send("workout-notification", notificationData);

        notification.on("click", () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        });
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
