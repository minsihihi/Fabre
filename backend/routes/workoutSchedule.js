// 📂 routes/workoutSchedule.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { WorkoutSchedule } = require('../models');
const { scheduleWorkoutNotification } = require('../utils/notificationScheduler');

// 운동 시간 설정
router.post('/workout-schedule', verifyToken, async (req, res) => {
    try {
        const { userId, workoutTime, days } = req.body;
        const schedule = await WorkoutSchedule.create({
            userId,
            workoutTime,
            days: days ? days.join(',') : null
        });

        scheduleWorkoutNotification(schedule);
        res.status(201).json({ message: '운동시간이 설정되었습니다.', schedule });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 운동 시간 조회
router.get('/workout-schedule/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const schedules = await WorkoutSchedule.findAll({ where: { userId, isActive: true } });
        res.status(200).json(schedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 운동 시간 수정
router.put('/workout-schedule/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { workoutTime, isActive, days } = req.body;

        const schedule = await WorkoutSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ message: '운동 일정을 찾을 수 없습니다.' });

        await schedule.update({
            workoutTime: workoutTime || schedule.workoutTime,
            isActive: isActive !== undefined ? isActive : schedule.isActive,
            days: days ? days.join(',') : schedule.days
        });

        scheduleWorkoutNotification(schedule);
        res.status(200).json({ message: '운동 시간이 성공적으로 수정되었습니다.', schedule });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 운동 시간 삭제
router.delete('/workout-schedule/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await WorkoutSchedule.findByPk(id);
        if (!schedule) return res.status(404).json({ message: '운동 일정을 찾을 수 없습니다.' });

        await schedule.destroy();
        res.status(200).json({ message: '운동 시간이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
