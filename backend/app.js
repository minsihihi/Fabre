const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });
const express = require('express');
const db = require('./models'); 
const apiRoutes = require('./routes/api');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { startScheduler } = require('./utils/scheduler');

// 서버 실행 시 스케줄러 시작
startScheduler();

// 서버 인스턴스 생성
const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS 설정 (프론트와 연결)
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));

// API 연결 테스트
app.get('/api/test', (req, res) => {
    res.json({ message: '프론트에서 백엔드 연결 성공!' });
});

// 실제 API 라우트 연결
app.use('/api', apiRoutes);

// 로그인 API 예시 (추가 확인)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password') {
        res.status(200).json({ message: '로그인 성공!' });
    } else {
        res.status(401).json({ message: '로그인 실패. 사용자 이름 또는 비밀번호가 틀립니다.' });
    }
});

// ✅ 데이터베이스 연결 및 동기화
db.sequelize
    .authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.error('Database connection error:', err));

const PORT = process.env.PORT || 3000;

// // app.js 또는 db 연결 파일에서 실행
// db.sequelize.sync({ alter: true })
//     .then(() => {
//         console.log('Database synchronized successfully');
//     })
//     .catch((err) => {
//         console.error('Error syncing database:', err);
//     });

// 모델 동기화 및 서버 실행
db.sequelize.sync({ force: false })  // force: false로 설정하면 기존 테이블을 덮어쓰지 않습니다.
    .then(() => {
        console.log('Database synchronized successfully');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('Error syncing database:', err);
    });
