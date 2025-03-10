const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const { WorkoutLog, WorkoutDetail, Exercise, TrainerMembers } = require('../models');

// 운동 기록 등록
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { memberId, trainerId, workout_date = new Date(), start_time, end_time, total_duration, note, exercises } = req.body;

        if (!start_time || !end_time) return res.status(400).json({ message: '필수 운동 정보가 누락되었습니다.' });

        let workoutLog;
        let userId;

        if (req.user.role === 'trainer') {
            const trainerMember = await TrainerMembers.findOne({ where: { trainerId: req.user.id, memberId, status: 'active' } });
            if (!trainerMember) return res.status(400).json({ message: '유효하지 않은 회원입니다.' });
            userId = memberId;
            workoutLog = await WorkoutLog.create({ user_id: userId, workout_date, start_time, end_time, total_duration, note });
            await trainerMember.update({ sessionsLeft: trainerMember.sessionsLeft - 1 });
        } else if (req.user.role === 'member') {
            if (!trainerId) return res.status(400).json({ message: '트레이너 정보가 필요합니다.' });
            userId = req.user.id;
            workoutLog = await WorkoutLog.create({ user_id: userId, workout_date, start_time, end_time, total_duration, note });
        } else {
            return res.status(403).json({ message: '접근 권한이 없습니다.' });
        }

        if (exercises && exercises.length > 0) {
            for (let item of exercises) {
                const [exercise] = await Exercise.findOrCreate({ where: { name: item.name, category: item.category } });
                await WorkoutDetail.create({
                    workout_log_id: workoutLog.id,
                    exercise_id: exercise.id,
                    sets: item.sets,
                    reps: item.reps,
                    weight: item.weight,
                    note: item.note
                });
            }
        }

        res.status(201).json({ message: '운동 기록이 저장되었습니다.', workoutLog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

// 운동 기록 조회
router.get('/record', verifyToken, async (req, res) => {
    try {
        let workoutLogs;

        if (req.user.role === 'trainer') {
            const { memberId } = req.query;
            if (!memberId) return res.status(400).json({ message: '회원 ID가 필요합니다.' });

            const relation = await TrainerMembers.findOne({ where: { trainerId: req.user.id, memberId, status: 'active' } });
            if (!relation) return res.status(403).json({ message: '해당 회원의 기록을 조회할 수 없습니다.' });

            workoutLogs = await WorkoutLog.findAll({
                where: { user_id: memberId },
                include: [{ model: WorkoutDetail, include: [Exercise] }],
                order: [['workout_date', 'DESC']]
            });
        } else if (req.user.role === 'member') {
            workoutLogs = await WorkoutLog.findAll({
                where: { user_id: req.user.id },
                include: [{ model: WorkoutDetail, include: [Exercise] }],
                order: [['workout_date', 'DESC']]
            });
        } else {
            return res.status(403).json({ message: '접근 권한이 없습니다.' });
        }

        if (!workoutLogs.length) {
            return res.status(200).json({ message: '운동 기록이 없습니다.', data: [] });
        }

        res.status(200).json({ message: '운동 기록 조회 성공', data: workoutLogs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

module.exports = router;
