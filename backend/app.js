const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });
const express = require('express');
const db = require('./models'); // models 임포트
const apiRoutes = require('./routes/api');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { startScheduler } = require('./utils/scheduler');

// 서버 실행 시 스케줄러 시작
startScheduler();

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(cookieParser());

// ✅ Database 연결 및 동기화
db.sequelize
    .authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.error('Database connection error:', err));

const PORT = process.env.PORT || 3000;

// app.js 또는 db 연결 파일에서 실행
db.sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synchronized successfully');
    })
    .catch((err) => {
        console.error('Error syncing database:', err);
    });


// 모델 동기화 및 서버 실행
db.sequelize.sync({ force: false })  // force: false로 설정하면 기존 테이블을 덮어쓰지 않습니다.
    .then(() => {
        console.log('Database synchronized successfully');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('Error syncing database:', err);
    });
