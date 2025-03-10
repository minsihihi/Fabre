const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { TrainerMembers, WorkoutLog, WorkoutDetail, Exercise, WeeklyReport } = require('../models');
const { OpenAI } = require('openai');
const { Op } = require('sequelize');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ 주간 운동 리포트 분석
router.post('/workouts/analyze-weekly', verifyToken, async (req, res) => {
    try {
        const { memberId } = req.body;

        if (req.user.role === 'trainer') {
            const relation = await TrainerMembers.findOne({ where: { trainerId: req.user.id, memberId, status: 'active' } });
            if (!relation) return res.status(403).json({ message: '해당 회원의 기록을 조회할 수 없습니다.' });
        }

        const workoutLogs = await WorkoutLog.findAll({
            where: {
                user_id: memberId,
                workout_date: { [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) }
            },
            include: [{ model: WorkoutDetail, include: [Exercise] }]
        });

        if (!workoutLogs.length) return res.status(200).json({ message: '운동 기록이 없습니다.', data: [] });

        const workoutData = workoutLogs.map(log => ({
            workout_date: log.workout_date,
            start_time: log.start_time,
            end_time: log.end_time,
            total_duration: log.total_duration,
            note: log.note,
            exercises: log.WorkoutDetails.map(detail => ({
                name: detail.Exercise.name,
                category: detail.Exercise.category,
                sets: detail.sets,
                reps: detail.reps,
                weight: detail.weight,
                note: detail.note
            }))
        }));

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a fitness coach analyzing workout data. Please provide the total calories burned, muscle mass change, and body weight change based on the workout data. Only return the following format: total_calories_burned: +/- n kcal, muscle_change: +/- n kg, body_change: +/- n kg, feedback: one sentence in Korean.' },
                { role: 'user', content: `Here are the workout details for the past week: ${JSON.stringify(workoutData)}` }
            ],
            max_tokens: 200
        });

        const result = response.choices[0].message.content;
        const regex = /total_calories_burned: (.+?) kcal, muscle_change: (.+?) kg, body_change: (.+?) kg, feedback: (.+)/;
        const matches = result.match(regex);

        if (!matches) return res.status(500).json({ message: 'AI 응답 처리 오류' });

        const [_, calories, muscle, body, feedback] = matches;

        const report = await WeeklyReport.create({
            workout_log_id: workoutLogs[0].id,
            total_calories_burned: calories,
            muscle_change: muscle,
            body_change: body,
            feedback,
            analysis_result: '분석 결과는 별도로 저장하지 않음',
            expected_results: '예시 결과'
        });

        res.status(200).json({ message: 'AI 분석 완료 및 저장', report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

// ✅ 리포트 조회
router.get('/workouts/report/:id', verifyToken, async (req, res) => {
    try {
        const report = await WeeklyReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({ message: '리포트를 찾을 수 없습니다.' });
        res.status(200).json({ message: 'AI 리포트 조회 성공', report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

module.exports = router;
