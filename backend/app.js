const dotenv = require("dotenv");
dotenv.config({ path: "backend/.env" });

const express = require("express");
const http = require("http"); // WebSocket 추가
const WebSocket = require("ws"); // WebSocket 추가
const db = require("./models");
const apiRoutes = require("./routes/api");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { startScheduler } = require("./utils/scheduler");
const cronJob = require("./cron-job");
const { initializeWorkoutNotifications } = require("./utils/notificationScheduler");
const eventEmitter = require("./utils/eventEmitter"); // 이벤트 공유 객체 추가

// 서버 실행 시 스케줄러 & 운동 알림 초기화
startScheduler();
cronJob();
initializeWorkoutNotifications();

// Express 서버 + WebSocket 서버 생성
const app = express();
const server = http.createServer(app); // 기존 Express 서버를 HTTP 서버로 감싸기
const wss = new WebSocket.Server({ server }); // WebSocket 서버 추가
const clients = new Set();

// WebSocket 설정
// wss.on("connection", (ws) => {
//     eventEmitter.on("notification", (notificationData) => {
//         ws.send(JSON.stringify(notificationData));
//     });
// });

wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
        clients.delete(ws);
    });
});

eventEmitter.on("notification", (notificationData) => {
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

// CORS 설정
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
    })
);

// API 연결 테스트
app.get("/api/test", (req, res) => {
    res.json({ message: "프론트에서 백엔드 연결 성공!" });
});

// 실제 API 라우트 연결
app.use("/api", apiRoutes);

// 데이터베이스 연결
db.sequelize
    .authenticate()
    .then(() => console.log("Database connected successfully"))
    .catch((err) => console.error("Database connection error:", err));

const PORT = process.env.PORT || 3000;

// 모델 동기화 및 서버 실행
db.sequelize
    .sync({ force: false })
    .then(() => {
        console.log("Database synchronized successfully");
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error("Error syncing database:", err);
    });
