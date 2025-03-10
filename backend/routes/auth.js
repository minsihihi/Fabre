const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { setLoggedInUser } = require('../utils/notificationScheduler');
const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { login_id, password, name, role } = req.body;

        const existingUser = await User.findOne({ where: { login_id } });
        if (existingUser) return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });

        if (!/^[A-Za-z0-9]{4,30}$/.test(login_id)) {
            return res.status(400).json({ message: '아이디는 영문자와 숫자로만 구성된 4~30자여야 합니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ login_id, password: hashedPassword, name, role });

        res.status(201).json({ message: '회원가입 성공' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { login_id, password } = req.body;

        if (!login_id || !password) return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });

        const user = await User.findOne({ where: { login_id } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const token = jwt.sign(
            { id: user.id, login_id: user.login_id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        setLoggedInUser(user.id);

        res.json({
            token,
            user: { id: user.id, login_id: user.login_id, name: user.name, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 로그아웃
router.post('/logout', async (req, res) => {
    try {
        return res.status(200).json({ message: '로그아웃 성공' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
