const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const eventEmitter = require(path.join(app.getAppPath(), "backend", "utils", "eventEmitter"));

let mainWindow;

function setupWebSocket() {
  const ws = new WebSocket("ws://13.209.19.146:3000");

  ws.on("open", () => {
    console.log(" WebSocket 연결 성공");
  });

  let loggedInTrainerId = null;

  ipcMain.on("set-logged-in-trainer", (event, trainerId) => {
    loggedInTrainerId = trainerId;
  });

  ws.on("message", (data) => {
    const notificationData = JSON.parse(data);

    const isForTrainer =
      !notificationData.targetTrainerId || notificationData.targetTrainerId === loggedInTrainerId;

    if (mainWindow && isForTrainer) {
      const notification = new Notification({
        title: notificationData.title,
        body: notificationData.message,
        silent: false,
      });
      notification.show();

      mainWindow.webContents.send("workout-notification", notificationData);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "frontend", "preload.js"),
      contextIsolation: true,
    },
  });

  const distPath = path.join(__dirname, "frontend", "dist", "index.html");
  console.log("🚀 로컬 파일 로딩:", distPath);
  mainWindow.loadFile(distPath);

  // 개발자 도구 제거하려면 이 줄은 주석 처리
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("렌더러 로딩 완료");
  });

  mainWindow.webContents.on("did-fail-load", (e, code, desc) => {
    console.error("로딩 실패:", code, desc);
  });
}

app.whenReady().then(() => {
  createWindow();
  setupWebSocket();

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
