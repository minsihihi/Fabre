const { app, BrowserWindow, Notification } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const eventEmitterPath = path.join(app.getAppPath(), "backend", "utils", "eventEmitter");
const eventEmitter = require(eventEmitterPath);

let mainWindow;
let isDev;
let autoUpdater; // 전역 선언

// 동적 import
import("electron-is-dev").then(async (module) => {
    isDev = module.default;

    // autoUpdater import
    const { autoUpdater: importedAutoUpdater } = await import("electron-updater");
    autoUpdater = importedAutoUpdater;

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

        // autoUpdater 실행 (정의된 경우만)
        if (autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.error("업데이트 오류:", err);
        });
        } else {
        console.warn("autoUpdater가 정의되지 않았습니다.");
        }

        mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        console.log("로딩 실패:", errorCode, errorDescription);
        });
    }

    // 앱 준비되면 창 생성
    app.whenReady().then(() => {
        createWindow();

        const testNotification = new Notification({
            title: "🔔 알림 테스트",
            body: "지금 이 알림이 보이면 성공입니다!",
        });
        testNotification.show();

        // 내부 이벤트 알림 핸들러
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

    // macOS 외에서 창 모두 닫히면 앱 종료
    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });

});
