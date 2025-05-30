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

// 식단 이미지 업로드만 PATCH로 변경
router.patch("/upload/meal", verifyToken, uploadMeal.single("image"), async (req, res) => {
    try {
        const { mealType, mealDate } = req.query;
        const userId = req.user.id;

        if (!["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
            return res.status(400).json({ message: "mealType이 유효하지 않습니다." });
        }

        if (!mealDate) return res.status(400).json({ message: "mealDate가 필요합니다." });
        if (!req.file) return res.status(400).json({ message: "파일이 없습니다." });

        const meal = await Meal.findOne({
            where: {
                memberId: userId, // 회원이니까 memberId 기준
                mealDate,
                mealType
            }
        });

        if (!meal) {
            return res.status(404).json({ message: "해당 식단이 존재하지 않습니다. 먼저 식단을 등록하세요." });
        }

        await meal.update({ imageUrl: req.file.location });

        return res.status(200).json({ message: "식단 이미지 업로드 완료", imageUrl: req.file.location });

    } catch (error) {
        console.error("❌ 식단 이미지 업로드 실패:", error);
        return res.status(500).json({ message: "서버 오류", error: error.message });
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

router.get('/trainermeals', verifyToken, async (req, res) => {
    const { memberId, mealDate, mealType } = req.query;
    const trainerId = req.user.id;

    if (req.user.role !== 'trainer') {
        return res.status(403).json({ message: "트레이너만 접근할 수 있습니다." });
    }

    if (!memberId || !mealDate || !mealType) {
        return res.status(400).json({ message: "memberId, mealDate, mealType 모두 필요합니다." });
    }

    const relation = await TrainerMembers.findOne({
        where: { trainerId, memberId, status: 'active' }
    });

    if (!relation) {
        return res.status(403).json({ message: "이 회원과 연결된 트레이너가 아닙니다." });
    }

    const meal = await Meal.findOne({
        where: {
            userId: trainerId,
            memberId,
            mealDate,
            mealType: mealType.toLowerCase().trim()
        }
    });

    if (!meal) {
        return res.status(404).json({ message: "식단을 찾을 수 없습니다." });
    }

    return res.status(200).json({ meal });
});

router.get('/membermeals', verifyToken, async (req, res) => {
    const { mealDate, mealType } = req.query;
    const memberId = req.user.id;

    if (req.user.role !== 'member') {
        return res.status(403).json({ message: "회원만 접근할 수 있습니다." });
    }

    if (!mealDate || !mealType) {
        return res.status(400).json({ message: "mealDate와 mealType이 필요합니다." });
    }

    const meal = await Meal.findOne({
        where: {
            memberId,
            mealDate,
            mealType: mealType.toLowerCase().trim()
        }
    });

    if (!meal) {
        return res.status(404).json({ message: "식단을 찾을 수 없습니다." });
    }

    return res.status(200).json({ meal });
});

module.exports = router;
