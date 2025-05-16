const { app, BrowserWindow, Notification, ipcMain } = require("electron");
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
    const ws = new WebSocket("ws://13.209.19.146:3000");

    ws.on("open", () => {
        console.log("WebSocket 연결 성공");
    });

    let loggedInTrainerId = null; // 👈 트레이너 로그인 시 저장할 변수

    // 프론트에서 trainer ID 전달 받아 저장하는 채널 정의 (preload 통해)
    ipcMain.on("set-logged-in-trainer", (event, trainerId) => {
        loggedInTrainerId = trainerId;
        console.log("트레이너 로그인 ID 저장됨:", trainerId);
    });

    ws.on("message", (data) => {
        const notificationData = JSON.parse(data);

  // 👇 트레이너용 알림인지 필터링
    if (
        !notificationData.targetTrainerId ||             // 일반 사용자용 알림이면 모두에게 보냄
        notificationData.targetTrainerId === loggedInTrainerId  // 트레이너 전용이면 일치할 때만
    ) {
        if (mainWindow) {
        const notification = new Notification({
            title: notificationData.title,
            body: notificationData.message,
            silent: false,
        });
        notification.show();

        mainWindow.webContents.send("workout-notification", notificationData);
        }
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
