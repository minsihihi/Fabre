const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // 비밀번호 해싱
const jwt = require('jsonwebtoken'); // JWT 토큰 생성
const { User } = require('../models');


router.post('/register', async(req, res) => {
    try {
        const { username, password, role } = req.body; // 클라이언트로부터 

        const 
    }
})

router.get('/', (req, res) => {
    res.send('Test');
});

module.exports = router;
