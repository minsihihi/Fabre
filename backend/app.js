const crypto = require('crypto');
const dotenv = require("dotenv");
dotenv.config({ path: "backend/.env" });

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const db = require("./models");
const apiRoutes = require("./routes/api");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { startScheduler } = require("./utils/scheduler");
const cronJob = require("./cron-job");
const { initializeWorkoutNotifications } = require("./utils/notificationScheduler");
const eventEmitter = require("./utils/eventEmitter");

const app = express(); // ✅ 먼저 선언해야 함
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

// ✅ 여기로 이동
app.use('/uploads', express.static('uploads'));

// WebSocket 설정
wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
});

eventEmitter.on("notification", (notificationData) => {
    console.log("🚀 서버가 클라이언트에게 보내는 알림:", notificationData); // ✅ 여기 추가
    const payload = JSON.stringify(notificationData);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
});

// 미들웨어 설정
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: ["http://13.209.19.146:3000", "http://localhost:5173", "http://localhost:5173"],
        credentials: true,
    })
);

// API 연결 테스트
app.get("/api/test", (req, res) => {
    res.json({ message: "프론트에서 백엔드 연결 성공!" });
});

// 실제 API 라우트 연결
app.use("/api", apiRoutes);

// 스케줄러 실행 함수
const startAllSchedulers = () => {
    startScheduler();
    cronJob();
    initializeWorkoutNotifications();
};

// DB 연결 및 서버 시작
db.sequelize
    .authenticate()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("Database connection error:", err));

const PORT = process.env.PORT || 3000;

db.sequelize
    .sync({ alter: true })
    .then(() => {
        console.log("✅ 테이블 동기화 완료 (alter 모드)");
        startAllSchedulers();
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error("❌ 테이블 동기화 실패:", err);
    });
