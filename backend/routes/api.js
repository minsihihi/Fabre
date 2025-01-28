const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // 비밀번호 해싱
const jwt = require('jsonwebtoken'); // JWT 토큰 생성
const { User } = require('../models');

require('dotenv').config({ path: 'backend/.env' });


router.post('/register', async (req, res) => {
    try {
        const { login_id, password, name, role } = req.body;
        
        // loginId 중복 체크
        const existingUser = await User.findOne({ where: { login_id } });
        if (existingUser) {
            return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
        }

        // loginId 유효성 검사
        if (!/^[A-Za-z0-9]{4,30}$/.test(login_id)) {
            return res.status(400).json({ 
                message: '아이디는 영문자와 숫자로만 구성된 4~30자여야 합니다.' 
            });
        }
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 사용자 생성
        const user = await User.create({
            login_id,
            password: hashedPassword,
            name,
            role
        });
        
        res.status(201).json({ message: '회원가입 성공' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { login_id, password } = req.body;
        
        // 아이디 확인
        const user = await User.findOne({ where: { login_id } });
        if (!user) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        // 비밀번호 확인
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                id: user.id, 
                login_id: user.login_id,
                name: user.name,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.json({ 
            token, 
            user: {
                login_id: user.login_id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

router.post('/record', async(req, res) => {

});

router.get('/', (req, res) => {
    res.send('Test');
});

module.exports = router;
