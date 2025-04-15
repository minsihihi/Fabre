const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const { TrainerSchedule, TrainerMembers, MemberBookings, User } = require('../models');
const { Op } = require('sequelize');

// 회원이 스케줄 예약
router.post('/trainer/schedule/book', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const member_id = req.user.id;
        const { scheduleId } = req.body;

        const schedule = await TrainerSchedule.findByPk(scheduleId);
        if (!schedule) return res.status(404).json({ message: '존재하지 않는 스케줄입니다.' });
        if (schedule.isBooked) return res.status(400).json({ message: '이미 예약된 스케줄입니다.' });

        const relation = await TrainerMembers.findOne({
            where: { trainer_id: schedule.trainer_id, member_id, status: 'active' }
        });
        if (!relation) return res.status(403).json({ message: '해당 트레이너의 스케줄은 예약할 수 없습니다.' });

        await MemberBookings.create({ trainer_id: schedule.trainer_id, member_id, schedule_id: scheduleId });
        await schedule.update({ isBooked: true });

        res.status(200).json({ message: '예약 성공' });
    } catch (error) {
        console.error('예약 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 예약 조회
router.get('/member/bookings', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const memberId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bookings = await MemberBookings.findAll({
            where: { member_id: memberId },
            include: [
                { model: User, as: 'Trainer', attributes: ['id', 'name'] },
                { model: TrainerSchedule, as: 'Schedule', attributes: ['id', 'date', 'start_time', 'end_time'] }
            ],
            order: [
                [{ model: TrainerSchedule, as: 'Schedule' }, 'date', 'ASC'],
                [{ model: TrainerSchedule, as: 'Schedule' }, 'start_time', 'ASC']
            ]
        });

        const upcoming = [];
        const past = [];

        bookings.forEach(b => {
            const scheduleDate = new Date(b.Schedule.date);
            const data = {
                id: b.id,
                status: b.status,
                createdAt: b.createdAt,
                trainer: {
                    id: b.Trainer.id,
                    name: b.Trainer.name,
                    profileImage: b.Trainer.profile_image || null
                },
                schedule: {
                    id: b.Schedule.id,
                    date: b.Schedule.date,
                    startTime: b.Schedule.start_time,
                    endTime: b.Schedule.end_time
                }
            };
            if (scheduleDate >= today) upcoming.push(data);
            else past.push(data);
        });

        res.status(200).json({
            message: '예약 조회 성공',
            upcomingBookings: upcoming,
            pastBookings: past
        });
    } catch (error) {
        console.error('예약 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 트레이너가 트레이너 스케줄 불러오기
router.get('/trainer/schedule', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainerId = req.user.id;

        const schedules = await TrainerSchedule.findAll({
            where: { trainer_id: trainerId },
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        res.status(200).json({
            message: '스케줄 조회 성공',
            schedules
        });
    } catch (error) {
        console.error('스케줄 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 트레이너가 예약한 회원 조회하기
router.get('/trainer/bookings', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const memberId = req.user.id;

        const bookings = await MemberBookings.findAll({
            where: { trainer_id: trainerId },
            include: [
                { model: User, as: 'Member', attributes: ['id', 'name'] },
                { model: TrainerSchedule, as: 'Schedule', attributes: ['id', 'date', 'start_time', 'end_time'] }
            ],
            order: [
                [{ model: TrainerSchedule, as: 'Schedule' }, 'date', 'ASC'],
                [{ model: TrainerSchedule, as: 'Schedule' }, 'start_time', 'ASC']
            ]
        });

        const results = bookings.map(b => ({
            id: b.id,
            status: b.status,
            createdAt: b.createdAt,
            member: {
                id: b.Member.id,
                name: b.Member.name,
                profileImage: b.Member.profile_image || null
            },
            schedule: {
                id: b.Schedule.id,
                date: b.Schedule.date,
                startTime: b.Schedule.start_time,
                endTime: b.Schedule.end_time
            }
        }));

        res.status(200).json({
            message: '예약된 회원 조회 성공',
            bookings: results
        });
    } catch (error) {
        console.error('트레이너 예약 조회 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원이 예약 취소 (24시간 이전만 가능)
router.delete('/member/bookings/:bookingId', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const memberId = req.user.id;
        const bookingId = req.params.bookingId;

        const booking = await MemberBookings.findOne({
            where: { id: bookingId, member_id: memberId },
            include: [{ model: TrainerSchedule, as: 'Schedule' }]
        });

        if (!booking) {
            return res.status(404).json({ message: '예약 내역을 찾을 수 없습니다.' });
        }

        // 예약 시작 시간까지 24시간 이상 남았는지 확인
        const scheduleDate = new Date(`${booking.Schedule.date}T${booking.Schedule.start_time}`);
        const now = new Date();
        const diffHours = (scheduleDate - now) / (1000 * 60 * 60);

        if (diffHours < 24) {
            return res.status(400).json({ message: '예약 시작 24시간 이전까지만 취소할 수 있습니다.' });
        }

        // 상태 업데이트 및 스케줄 다시 예약 가능 상태로 변경
        await booking.update({ status: 'cancelled' });
        await booking.Schedule.update({ isBooked: false });

        // 예약 성공 시 반환에 bookingId 포함 필요
        res.status(200).json({
            message: '예약에 성공하였습니다.',
        });
  
    } catch (error) {
        console.error('예약 취소 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});



module.exports = router;
