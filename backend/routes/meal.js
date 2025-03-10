const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const { Meal } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { OpenAI } = require('openai');

require('dotenv').config({ path: 'backend/.env' });

// ✅ OpenAI 설정
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ S3 설정
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// ✅ multer + S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        key: (req, file, cb) => cb(null, `meal-images/${Date.now()}_${file.originalname}`)
    })
});

// ✅ 식단 사진 업로드
router.post('/meals/upload', verifyToken, upload.single('mealImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });

        const imageUrl = req.file.location; // S3 URL
        const userId = req.user.id;

        const meal = await Meal.create({ userId, imageUrl });
        res.status(201).json({ message: '사진 업로드 성공', meal });
    } catch (error) {
        console.error('식단 업로드 오류:', error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

// ✅ 식단 분석
router.post('/meals/analyze/:mealId', verifyToken, async (req, res) => {
    try {
        const { mealId } = req.params;
        const meal = await Meal.findByPk(mealId);
        if (!meal) return res.status(404).json({ message: '식단을 찾을 수 없습니다.' });

        const imageUrl = meal.imageUrl;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a nutritionist analyzing meal images.' },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analyze this meal and estimate the calorie count.' },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                }
            ],
            max_tokens: 300
        });

        const analysisResult = response.choices[0].message.content;
        await meal.update({ analysisResult });

        res.status(200).json({ message: '식단 분석 완료', analysisResult });
    } catch (error) {
        console.error('OpenAI 분석 오류:', error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

// ✅ 식단 목록 조회
router.get('/meals', verifyToken, async (req, res) => {
    try {
        const meals = await Meal.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ message: '식단 목록 조회 성공', meals });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

module.exports = router;
