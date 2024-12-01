const express = require('express');
const router = express.Router();  // 라우터 객체 생성

router.get('/', (req, res) => {
    res.send('Hello, World!');
});

module.exports = router;  // 이 파일을 다른 파일에서 사용할 수 있게 내보냄
