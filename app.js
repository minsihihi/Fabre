const express = require('express');  // express 라이브러리 불러오기, 웹서버 만드는 라이브러리임
const path = require('path');       // 경로 처리 라이브러리 불러오기, 파일 경로 다루는 내장 라이브러리임
const app = express();              // express 앱 초기화, 앱 객체 생성
const { initializeAllNotifications } = require('./utils/notificationScheduler');

app.set('view engine', 'ejs');      // ejs 템플릿 엔진 설정
app.set('views', path.join(__dirname, 'views')); // views 폴더 경로 설정

app.use(express.static(path.join(__dirname, 'public')));  // public 폴더에서 정적 파일 제공

// 기본 라우트 처리
app.get('/', (req, res) => {
    res.render('index');  // 'views/index.ejs' 파일을 렌더링해서 반환
});

// 서버 포트 설정
app.listen(3000, () => {
    console.log('서버가 실행 중입니다.');
    initializeAllNotifications();
});
