const express = require('express');
const router = express.Router();
const { TrainerMembers, User } = require('../models');
const { verifyToken, checkRole } = require('../middleware/auth');

// 트레이너가 회원 추가
router.post('/trainer/members', verifyToken, checkRole('trainer'), async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { memberId, sessionsLeft } = req.body;

        const member = await User.findOne({ where: { id: memberId, role: 'member' } });
        if (!member) return res.status(404).json({ message: '해당 회원을 찾을 수 없습니다.' });

        const existing = await TrainerMembers.findOne({ where: { trainerId, memberId, status: 'active' } });
        if (existing) return res.status(400).json({ message: '이미 등록된 회원입니다.' });

        const trainerMember = await TrainerMembers.create({
            trainerId,
            memberId,
            sessionsLeft,
            status: 'active',
            startDate: new Date()
        });

        res.status(201).json({ message: '회원 추가 성공', data: trainerMember });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 트레이너가 자신의 회원 목록 조회
router.get('/trainer/members', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainerId = req.user.id;

        const myMembers = await TrainerMembers.findAll({
            where: { trainerId, status: 'active' },
            include: [{ model: User, attributes: ['id', 'login_id', 'name', 'createdAt'] }],
            attributes: ['id', 'startDate', 'sessionsLeft', 'status'],
            order: [['startDate', 'DESC']]
        });

        res.status(200).json({ message: '회원 목록 조회 성공', data: myMembers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 삭제 (비활성화)
router.put('/trainer/members/:memberId', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { memberId } = req.params;

        const member = await TrainerMembers.findOne({ where: { trainerId, memberId, status: 'active' } });
        if (!member) return res.status(404).json({ message: '해당 회원을 찾을 수 없습니다.' });

        await member.update({ status: 'inactive' });
        res.status(200).json({ message: '회원이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
