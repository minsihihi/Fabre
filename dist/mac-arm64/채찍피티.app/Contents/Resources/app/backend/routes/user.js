const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { verifyToken, checkRole } = require('../middleware/auth');

// 트레이너 전용 - 회원 유저 목록 조회
router.get('/users', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'member' },
            attributes: ['id', 'login_id', 'name', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
