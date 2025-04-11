const { app, BrowserWindow, Notification } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const eventEmitterPath = path.join(app.getAppPath(), "backend", "utils", "eventEmitter");
const eventEmitter = require(eventEmitterPath);

let mainWindow;
let isDev;

// 동적 import
import('electron-is-dev').then((module) => {
    isDev = module.default;

    // WebSocket 연결
    const ws = new WebSocket("ws://localhost:3000");

    ws.on("open", () => {
        console.log("WebSocket 연결 성공");
    });

    ws.on("message", (data) => {
        const notificationData = JSON.parse(data);
        if (mainWindow) {
        const notification = new Notification({
            title: notificationData.title,
            body: notificationData.message,
            silent: false,
        });
        notification.show();
        mainWindow.webContents.send("workout-notification", notificationData);
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
        mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
        }

        autoUpdater.checkForUpdatesAndNotify();
        mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
            console.log("로딩 실패:", errorCode, errorDescription);
        });
    }

    app.whenReady().then(() => {
        createWindow();

        eventEmitter.on("notification", (notificationData) => {
        if (!mainWindow) return;
        const notification = new Notification({
            title: notificationData.title,
            body: notificationData.message,
        });
        notification.show();
        mainWindow.webContents.send("workout-notification", notificationData);
        });
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
});
