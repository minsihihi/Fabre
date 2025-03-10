const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const { TrainerSchedule, TrainerMembers } = require('../models');
const { Op, Sequelize } = require('sequelize');

// 스케줄 등록 (트레이너)
router.post('/trainer/schedule', verifyToken, checkRole(['trainer']), async (req, res) => {
    const trainer_id = req.user.id;
    const { date, start_time, end_time } = req.body;

    if (start_time >= end_time) return res.status(400).json({ message: '종료 시간은 시작 시간보다 이후여야 합니다.' });

    try {
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const startTime = new Date(`${formattedDate}T${start_time}`);
        if (startTime < new Date()) return res.status(400).json({ message: '과거 시간에는 일정을 등록할 수 없습니다.' });

        const existingSchedules = await TrainerSchedule.findAll({
            where: {
                trainer_id,
                [Op.or]: [
                    { date: formattedDate },
                    Sequelize.where(Sequelize.fn('DATE', Sequelize.col('date')), formattedDate)
                ]
            }
        });

        const isOverlapping = existingSchedules.some(s => {
            const existingStart = new Date(`${formattedDate}T${s.start_time}`);
            const existingEnd = new Date(`${formattedDate}T${s.end_time}`);
            const newStart = new Date(`${formattedDate}T${start_time}`);
            const newEnd = new Date(`${formattedDate}T${end_time}`);
            return (newStart < existingEnd) && (newEnd > existingStart);
        });

        if (isOverlapping) return res.status(400).json({ message: '이미 일정이 등록되어 있습니다.' });

        await TrainerSchedule.create({ trainer_id, date: formattedDate, start_time, end_time });
        res.status(201).json({ message: '스케줄이 등록되었습니다.' });
    } catch (error) {
        console.error('스케줄 등록 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 스케줄 삭제
router.delete('/trainer/schedule/:scheduleId', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainer_id = req.user.id;
        const { scheduleId } = req.params;
        const schedule = await TrainerSchedule.findOne({ where: { id: scheduleId, trainer_id } });

        if (!schedule) return res.status(404).json({ message: '해당 스케줄이 존재하지 않습니다.' });

        const endTime = new Date(`${schedule.date.toISOString().split('T')[0]}T${schedule.end_time}`);
        if (endTime < new Date()) return res.status(400).json({ message: '이미 종료된 수업입니다.' });

        await schedule.destroy();
        res.status(200).json({ message: '스케줄 삭제 완료' });
    } catch (error) {
        console.error('스케줄 삭제 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원이 트레이너 스케줄 조회
router.get('/trainer/schedule/:trainerId', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const { trainerId } = req.params;
        const memberId = req.user.id;

        const relation = await TrainerMembers.findOne({ where: { trainer_id: trainerId, member_id: memberId, status: 'active' } });
        if (!relation) return res.status(403).json({ message: '해당 트레이너의 스케줄은 조회할 수 없습니다.' });

        const schedules = await TrainerSchedule.findAll({
            where: { trainer_id: trainerId, date: { [Op.gte]: new Date() } },
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        res.status(200).json({ message: '트레이너 스케줄 조회 성공', schedule: schedules });
    } catch (error) {
        console.error('스케줄 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
