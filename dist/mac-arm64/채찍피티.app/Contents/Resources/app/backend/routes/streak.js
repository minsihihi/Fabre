const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const { TrainerMembers, WorkoutLog, User } = require('../models');
const { Op } = require('sequelize');

router.get('/streak', verifyToken, checkRole('member'), async (req, res) => {
    try {
        const userId = req.user.id;
        const logs = await WorkoutLog.findAll({
            where: { user_id: userId },
            attributes: ['workout_date'],
            order: [['workout_date', 'DESC']]
        });

        if (!logs.length) {
            return res.status(200).json({ message: '운동 기록이 없습니다.', streak: 0, calendar: {} });
        }

        const workoutDates = new Set(
            logs.map(log => new Date(log.workout_date).toDateString())
        );

        let streak = 0;
        let current = new Date();
        current.setHours(0, 0, 0, 0);

        while (workoutDates.has(current.toDateString())) {
            streak++;
            current.setDate(current.getDate() - 1);
        }

        const calendar = {};
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            calendar[d.toISOString().split('T')[0]] = workoutDates.has(d.toDateString()) ? 1 : 0;
        }

        return res.status(200).json({ message: '스트릭 조회 성공', streak, calendar });
    } catch (error) {
        console.error("❌ 스트릭 조회 오류:", error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

// 트레이너가 특정 회원의 스트릭 조회
router.get('/trainer/streak/:memberId', verifyToken, checkRole('trainer'), async (req, res) => {
    try {
        const trainerId = req.user.id;
        const memberId = parseInt(req.params.memberId);

        const relation = await TrainerMembers.findOne({
            where: { trainerId, memberId, status: 'active' }
        });
        if (!relation) return res.status(403).json({ message: '해당 회원의 스트릭을 조회할 수 없습니다.' });

        const logs = await WorkoutLog.findAll({
            where: { user_id: memberId },
            attributes: ['workout_date'],
            order: [['workout_date', 'DESC']]
        });

        if (!logs.length) {
            return res.status(200).json({ message: '운동 기록이 없습니다.', streak: 0, calendar: {} });
        }

        const workoutDates = new Set(
            logs.map(log => new Date(log.workout_date).toDateString())
        );

        let streak = 0;
        let current = new Date();
        current.setHours(0, 0, 0, 0);

        while (workoutDates.has(current.toDateString())) {
            streak++;
            current.setDate(current.getDate() - 1);
        }

        const calendar = {};
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            calendar[d.toISOString().split('T')[0]] = workoutDates.has(d.toDateString()) ? 1 : 0;
        }

        return res.status(200).json({ message: '회원 스트릭 조회 성공', memberId, streak, calendar });
    } catch (error) {
        console.error("❌ 트레이너 스트릭 조회 오류:", error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

// 트레이너가 자신의 전체 회원 스트릭 조회
router.get('/trainer/streak', verifyToken, checkRole('trainer'), async (req, res) => {
    try {
        const trainerId = req.user.id;

        const members = await TrainerMembers.findAll({
            where: { trainerId, status: 'active' },
            include: [{ model: User, attributes: ['id', 'name'] }]
        });

        const results = [];

        for (const { memberId, User: member } of members) {
            const logs = await WorkoutLog.findAll({
                where: { user_id: memberId },
                attributes: ['workout_date'],
                order: [['workout_date', 'DESC']]
            });

            const workoutDates = new Set(
                logs.map(log => new Date(log.workout_date).toDateString())
            );

            let streak = 0;
            let current = new Date();
            current.setHours(0, 0, 0, 0);

            while (workoutDates.has(current.toDateString())) {
                streak++;
                current.setDate(current.getDate() - 1);
            }

            results.push({
                memberId,
                name: member.name,
                streak
            });
        }

        return res.status(200).json({ message: '트레이너 회원 스트릭 조회 성공', results });
    } catch (error) {
        console.error("❌ 트레이너 전체 회원 스트릭 조회 오류:", error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

module.exports = router;