const AWS = require('aws-sdk');

const axios = require('axios');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const multer = require('multer');  
const multerS3 = require('multer-s3');

const { OpenAI } = require('openai');  
const workoutScheduleRoutes = require('./workoutSchedule');
router.use('/', workoutScheduleRoutes);
const recordRoutes = require('./workout');
router.use('/', recordRoutes);
// streak 라우터 import
const streakRoutes = require('./streak');  // 실제 경로는 streak.js가 위치한 상대 경로로 수정
router.use('/', streakRoutes);

const booking = require('./booking');
router.use('/', booking);

const fs = require('fs');
const path = require('path');
const { User, Profile, Workout, TrainerMembers, WorkoutLog, WorkoutDetail, Exercise, Meal, WeeklyReport, TrainerSchedule, MemberBookings, MealAnalysis, WorkoutSchedule} = require('../models'); 
const { verifyToken, checkRole } = require('../middleware/auth');
const saveWeeklyReport = require('../utils/saveWeeklyReport');  // AI 분석 결과 저장 함수

const { Op, Sequelize } = require('sequelize'); // 주간 리포트용 날짜 계산 - sequelize 제공 연산자 객체
const trainerSchedule = require('../models/trainerSchedule');
const { check } = require('express-validator');
const memberBookings = require('../models/memberBookings');

require('dotenv').config({ path: 'backend/.env' });


// ✅ OpenAI API 설정
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ✅ AWS SDK v2 방식으로 S3 객체 생성
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// ✅ multer 설정 (AWS SDK v2 방식)
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: "public-read",
        key: function (req, file, cb) {
            const category = req.params.category;
            const userId = req.user.id;

            console.log("🔹 [DEBUG] S3 저장 - category:", category);
            console.log("🔹 [DEBUG] S3 저장 - userId:", userId);

            if (!category || !["meal", "profile", "workout"].includes(category)) {
                return cb(new Error("잘못된 카테고리"), false);
            }

            cb(null, `${category}/${userId}/${Date.now()}_${file.originalname}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});



// ✅ 식단, 프로필, 운동 이미지 업로드 API (1개 파일만 허용)
router.post("/upload/:category", verifyToken, upload.single("image"), async (req, res) => {
    try {
        console.log("🔹 [DEBUG] 업로드 요청 - category:", req.params.category);
        console.log("🔹 [DEBUG] req.file:", req.file);  // ✅ 파일이 제대로 받아졌는지 확인
        console.log("🔹 [DEBUG] req.body:", req.body);

        if (!req.file) {
            return res.status(400).json({ message: "파일이 없습니다. form-data의 Key가 'image'인지 확인하세요." });
        }

        const { category } = req.params;
        if (!category || !["meal", "profile", "workout"].includes(category)) {
            return res.status(400).json({ message: "잘못된 카테고리입니다." });
        }

        const imageUrl = `${process.env.S3_BUCKET_URL}/${req.file.key}`;
        let recordId = null;

        if (category === "meal") {
            const { mealType, mealDate } = req.body;
            if (!["breakfast", "lunch", "snack", "dinner"].includes(mealType)) {
                return res.status(400).json({ message: "mealType이 올바르지 않습니다." });
            }
            if (!mealDate) return res.status(400).json({ message: "mealDate가 필요합니다." });

            const meal = await Meal.create({ userId: req.user.id, imageUrl, mealType, mealDate });
            recordId = meal.id;

        } else if (category === "profile") {
            await Profile.destroy({ where: { userId: req.user.id } });
            const profile = await Profile.create({ userId: req.user.id, imageUrl });
            recordId = profile.id;

        } else if (category === "workout") {
            const now = new Date();
            const userId = req.user.id;
            const today = now.toLocaleDateString("en-US", { weekday: 'long' }); // 'Monday', 'Tuesday', ...

            // 사용자 스케줄 중 오늘 요일(active) 스케줄 찾기
            const schedules = await WorkoutSchedule.findAll({
                where: {
                    userId,
                    isActive: true,
                    days: {
                        [Op.like]: `%${today}%`
                    }
                }
            });

            if (!schedules || schedules.length === 0) {
                return res.status(403).json({ message: "오늘 등록된 운동 스케줄이 없습니다." });
            }

            // 현재 시간이 해당 스케줄의 운동 시간 ±1시간 이내인지 확인
            const isWithinTime = schedules.some(schedule => {
                const workoutHour = parseInt(schedule.workoutTime.split(":")[0], 10);
                const workoutStart = new Date(now);
                workoutStart.setHours(workoutHour, 0, 0, 0);
                const workoutEnd = new Date(workoutStart);
                workoutEnd.setHours(workoutStart.getHours() + 1);

                return now >= workoutStart && now <= workoutEnd;
            });

            if (!isWithinTime) {
                return res.status(403).json({ message: "운동 인증 가능한 시간이 아닙니다." });
            }

            // 통과하면 업로드
            const workout = await Workout.create({ userId, imageUrl });
            recordId = workout.id;
        }

        res.status(201).json({ message: `${category} 이미지 업로드 성공`, imageUrl, id: recordId });

    } catch (error) {
        console.error("❌ 이미지 업로드 오류:", error);
        res.status(500).json({ message: "서버 오류", error: error.message });
    }
});



/* ----------------------------------- */
/* ✅ 업로드된 '식단' 이미지 조회 API (날짜 + 식사 유형 기반) */
/* ----------------------------------- */
router.get("/images/meal", async (req, res) => {
    try {
        const { userId, mealDate } = req.query;
        if (!userId || !mealDate) {
            return res.status(400).json({ message: "userId와 mealDate가 필요합니다." });
        }

        const meals = await Meal.findAll({
            where: { userId, mealDate },
            attributes: ["id", "imageUrl", "mealType"]
        });

        res.json({ meals });

    } catch (error) {
        console.error("❌ 식단 조회 오류:", error);
        res.status(500).json({ message: "서버 오류", error: error.message });
    }
});



/* ----------------------------------- */
/* ✅ 업로드된 '오운완'이미지 조회 API */
/* ----------------------------------- */
router.get("/images/workout", async (req, res) => {
    try {
        const { userId, workoutDate } = req.query;
        if (!userId || !workoutDate) {
            return res.status(400).json({ message: "userId와 workoutDate가 필요합니다." });
        }

        const startOfDay = new Date(`${workoutDate}T00:00:00`);
        const endOfDay = new Date(`${workoutDate}T23:59:59`);

        const workouts = await Workout.findAll({
            where: {
                userId,
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            attributes: ["id", "imageUrl"]
        });

        res.json({ workouts });

    } catch (error) {
        console.error("❌ 운동 인증샷 조회 오류:", error);
        res.status(500).json({ message: "서버 오류", error: error.message });
    }
});


/* ----------------------------------- */
/* ✅ 업로드된 '프로필'이미지 조회 API */
/* ----------------------------------- */
router.get("/images/profile", async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: "userId가 필요합니다." });

        const profile = await Profile.findOne({ where: { userId }, attributes: ["imageUrl"] });
        if (!profile) return res.status(404).json({ message: "프로필 사진이 없습니다." });

        res.json({ imageUrl: profile.imageUrl });

    } catch (error) {
        console.error("❌ 프로필 조회 오류:", error);
        res.status(500).json({ message: "서버 오류", error: error.message });
    }
});


/* ----------------------------------- */
/* ✅ 2. OpenAI API를 이용한 식단 분석 API */
/* ----------------------------------- */
router.post('/meals/analyze', verifyToken, async (req, res) => {
    try {
        const { mealId } = req.query;
        if (!mealId) return res.status(400).json({ message: "mealId가 필요합니다." });

        // ✅ `mealId`를 기반으로 DB에서 해당 식단 찾기
        const meal = await Meal.findByPk(mealId);
        if (!meal) return res.status(404).json({ message: "해당 mealId의 식단을 찾을 수 없습니다." });

        // ✅ DB에서 `fileId` 가져오기
        const fileId = meal.fileId;  // 🔹 meal 테이블에 fileId 필드가 있어야 함
        if (!fileId) return res.status(400).json({ message: "해당 mealId에 대한 파일 정보가 없습니다." });

        // ✅ S3 이미지 URL 생성
        const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/meal/${fileId}`;
        console.log(`✅ 분석할 이미지 URL: ${imageUrl}`);

        // 🔹 OpenAI Vision API 요청 (🚀 수정된 부분)
        const response = await openai.chat.completions.create({
            
            // gpt 모델명
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a nutritionist analyzing meal images."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this meal and estimate the calorie count. Please calculate the total amout of calories(unit : kcal), carbs(unit : gram), protein, fat. Also, give a name of a ingredient or menu that can resolve the imbalce amoung the nutrients. (e.g. 칼로리 : 1000kcal, 탄수화물 : 20g, 단백질 : 10g, 지방 : 30g, 추천식단 : 닭가슴살) Remember that you must not depict the ingredient of the menu. Just provide the 3 nutritions of the main dish itself. Please comply with the given e.g. Korean form strictly." },
                        { type: "image_url", image_url: { url: imageUrl } } // ✅ 수정된 부분
                    ]
                }
            ],
            max_tokens: 300
        });

        // ✅ OpenAI 응답 데이터 저장
        const analysisResult = response.choices[0].message.content;
        console.log("🔍 AI 분석 결과:", analysisResult);

        // ✅ 추천 식단 추출
        const match = analysisResult.match(/추천식단\s*:\s*(.+)/);
        const recommendedFood = match ? match[1].trim() : null;
        console.log("✅ 추천 식단:", recommendedFood);

        // ✅ DB에 저장 (새로운 `MealAnalysis` 데이터 생성)
        const mealAnalysis = await MealAnalysis.create({
            userId: req.user.id,
            mealId,
            fileId,
            analysisResult,
            recommendedFood
        });

        res.status(200).json({
            message: '식단 분석 완료',
            analysisResult,
            recommendedFood,
            analysisId: mealAnalysis.id
        });

    } catch (error) {
        console.error("❌ OpenAI API 오류:", error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});


router.get('/meals/recommend', verifyToken, async (req, res) => {
    try {
        const { analysisId } = req.query;
        if (!analysisId) return res.status(400).json({ message: "analysisId가 필요합니다." });

        // ✅ DB에서 추천 식재료 조회
        const mealAnalysis = await MealAnalysis.findByPk(analysisId);
        if (!mealAnalysis) return res.status(404).json({ message: "해당 분석 결과를 찾을 수 없습니다." });

        const food = mealAnalysis.recommendedFood;
        const encodedFood = encodeURIComponent(food); // URL 인코딩
        const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodedFood}`;

        console.log(`🔍 크롤링 대상 URL: ${searchUrl}`);

        // ✅ 네이버 쇼핑 크롤링
        const { data } = await axios.get(searchUrl);
        const $ = cheerio.load(data);

        let products = [];
        $('.basicList_info_area__17Xyo').each((i, el) => {
            if (i >= 5) return false;  // 5개까지만 가져오기
            let title = $(el).find('.basicList_title__3P9Q7 a').text();
            let link = $(el).find('.basicList_title__3P9Q7 a').attr('href');
            let price = $(el).find('.price_num__2WUXn').text();
            products.push({ title, price, link });
        });

        res.status(200).json({ message: '추천 식재료 검색 완료', food, products });

    } catch (error) {
        console.error("❌ 크롤링 오류:", error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

// 회원 가입
router.post('/register', async (req, res) => {
    try {
        const { login_id, password, name, role } = req.body;
        
        // login_id 중복 체크
        const existingUser = await User.findOne({ where: { login_id } });
        if (existingUser) {
            return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
        }

        // loginId 유효성 검사
        if (!/^[A-Za-z0-9]{4,30}$/.test(login_id)) {
            return res.status(400).json({ 
                message: '아이디는 영문자와 숫자로만 구성된 4~30자여야 합니다.' 
            });
        }
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 사용자 생성
        const user = await User.create({
            login_id,
            password: hashedPassword,
            name,
            role
        });
        
        res.status(201).json({ message: '회원가입 성공' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { login_id, password } = req.body;
        
        if (!login_id || !password) {
            return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
        }

        // 아이디 확인
        const user = await User.findOne({ where: { login_id } });
        if (!user) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // 비밀번호 확인
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                id: user.id, 
                login_id: user.login_id,
                name: user.name,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ 
            token, 
            user: {
                id : user.id,
                login_id: user.login_id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류' });
    }
});

// 로그아웃
router.post('/logout', async (req, res) => {
    try {
        return res.status(200).json({ message: '로그아웃 성공' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그인한 사용자 정보 조회 (장다연이 추가함.)
router.get('/users/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'login_id', 'name', 'role']
        });
        if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 유저 정보 가져오기(트레이너)
router.get('/users', verifyToken, checkRole(['trainer']), async(req, res) => {
    try{
        const users = await User.findAll({ 
            where: { role: 'member' },
            attributes: ['id', 'login_id', 'name', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).send(users);
    }catch(error){
        console.error(error);
        return res.status(500).json({ message: '서버 오류가 발생했습니다. '});
    }
    
});

// 회원 추가(트레이너)
router.post('/trainer/members', verifyToken, checkRole('trainer'), async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { memberId, sessionsLeft } = req.body;

        // 회원 존재 여부 확인
        const member = await User.findOne({
            where: { id: memberId, role: 'member' }
        });

        if (!member) {
            return res.status(404).json({ message: '해당 회원을 찾을 수 없습니다.' });
        }

        // 이미 등록된 회원인지 확인
        const existingMember = await TrainerMembers.findOne({
            where: {
                trainerId,
                memberId,
                status: 'active'
            }
        });

        if (existingMember) {
            return res.status(400).json({ message: '이미 등록된 회원입니다.' });
        }

        const trainerMember = await TrainerMembers.create({
            trainerId,
            memberId,
            sessionsLeft,
            status: 'active',
            startDate: new Date()
        });

        res.status(201).json({
            message: '회원이 성공적으로 추가되었습니다.',
            data: trainerMember
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 트레이너의 회원 목록 조회
router.get('/trainer/members', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainerId = req.user.id;

        const myMembers = await TrainerMembers.findAll({
            where: { 
                trainerId: trainerId,
                status: 'active'
            },
            include: [{
                model: User,
                attributes: ['id', 'login_id', 'name', 'createdAt']
            }],
            // 회원 아이디와 시작 날짜, 남은 세션, 회원 상태(활성 비활성)
            attributes: ['id', 'startDate', 'sessionsLeft', 'status'], 
            order: [['startDate', 'DESC']]
        });

        if (!myMembers.length) {
            return res.status(200).json({ message: '등록된 회원이 없습니다.', data: [] });
        }

        res.status(200).json({
            message: '회원 목록을 성공적으로 조회했습니다.',
            data: myMembers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원이 자신의 트레이너 정보 조회
router.get('/member/trainer', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const memberId = req.user.id;

        const trainerMember = await TrainerMembers.findOne({
            where: { memberId, status: 'active' },
            include: [
                {
                    model: User,
                    as: 'trainer',
                    attributes: ['id', 'login_id', 'name']
                }
            ]
        });

        if (!trainerMember || !trainerMember.trainer) {
            return res.status(404).json({ message: '트레이너 정보가 없습니다.' });
        }

        res.status(200).json({ trainer: trainerMember.trainer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원 삭제 (또는 비활성화)
router.put('/trainer/members/:memberId', verifyToken, checkRole(['trainer']), async (req, res) => {
    try {
        const trainerId = req.user.id;
        const { memberId } = req.params;

        const member = await TrainerMembers.findOne({
            where: { 
                trainerId,
                memberId,
                status: 'active'
            }
        });

        if (!member) {
            return res.status(404).json({ message: '해당 회원을 찾을 수 없습니다.' });
        }

        await member.update({ status: 'inactive' });


        res.status(200).json({ message: '회원이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 운동 기록
router.post('/record', verifyToken, async(req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        const { 
            memberId, 
            trainerId,
            workout_date = new Date(), 
            start_time, 
            end_time, 
            total_duration, 
            note,
            exercises 
        } = req.body;

        if (!workout_date || !start_time || !end_time) {
            return res.status(400).json({ message: '필수 운동 정보가 누락되었습니다.' });
        }


        let workoutLog;
        let userId;

        if (req.user.role === 'trainer') {
            const trainerMember = await TrainerMembers.findOne({
                where: {
                    trainerId: req.user.id,
                    memberId: memberId,
                    status: 'active' 
                }
            });

            if (!trainerMember) {
                return res.status(400).json({ message: '유효하지 않은 회원입니다.' });
            }

            userId = memberId;

            // 운동 로그 생성
            workoutLog = await WorkoutLog.create({
                user_id: userId,
                workout_date,
                start_time,
                end_time,
                total_duration,
                note
            });

            // 세션 차감
            await trainerMember.update({
                sessionsLeft: trainerMember.sessionsLeft - 1 
            });

        } else if (req.user.role === 'member') {
            if (!trainerId) {
                return res.status(400).json({ message: '트레이너 정보가 필요합니다.' });
            }

            userId = req.user.id;

            // 운동 로그 생성
            workoutLog = await WorkoutLog.create({
                user_id: userId,
                workout_date,
                start_time,
                end_time,
                total_duration,
                note
            });
        } else {
            return res.status(403).json({ message: '접근 권한이 없습니다.' });
        }

        // 운동 상세 정보 생성
        if (exercises && exercises.length > 0) {
            for (let exerciseData of exercises) {
                // 운동 정보 생성 또는 찾기
                const [exercise] = await Exercise.findOrCreate({
                    where: { 
                        name: exerciseData.name, 
                        category: exerciseData.category 
                    }
                });

                // 운동 상세 정보 생성
                await WorkoutDetail.create({
                    workout_log_id: workoutLog.id,
                    exercise_id: exercise.id,
                    sets: exerciseData.sets,
                    reps: exerciseData.reps,
                    weight: exerciseData.weight,
                    note: exerciseData.note
                });
            }
        }

        res.status(201).json({ 
            message: '운동 기록이 성공적으로 저장되었습니다.',
            workoutLog 
        });

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

// 운동 기록 조회
router.get('/record', verifyToken, async (req, res) => {
    try {
        let workoutLogs;

        if (req.user.role === 'trainer') {
            const { memberId } = req.query;
            if (!memberId) {
                return res.status(400).json({ message: '회원 ID가 필요합니다.' });
            }

            const trainerMember = await TrainerMembers.findOne({
                where: {
                    trainerId: req.user.id,
                    memberId: memberId,
                    status: 'active'
                }
            });

            if (!trainerMember) {
                return res.status(403).json({ message: '해당 회원의 기록을 조회할 수 없습니다.' });
            }

            workoutLogs = await WorkoutLog.findAll({
                where: { user_id: memberId },
                include: [{
                    model: WorkoutDetail,
                    include: [{ model: Exercise }]
                }],
                order: [['workout_date', 'DESC']]
            });

        } else if (req.user.role === 'member') {
            workoutLogs = await WorkoutLog.findAll({
                where: { user_id: req.user.id },
                include: [{
                    model: WorkoutDetail,
                    include: [{ model: Exercise }]
                }],
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
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 트레이너 스케줄 등록
router.post('/trainer/schedule', verifyToken, checkRole(['trainer']), async(req, res) => {
    const trainer_id = req.user.id;
    const { date, start_time, end_time } = req.body;

    if (start_time >= end_time) {
        return res.status(400).json({ message: "종료 시간은 시작 시간보다 이후여야 합니다." });
    }
    
    try {
        const formattedDate = new Date(date).toISOString().split('T')[0];

        const startTime = new Date(`${formattedDate}T${start_time}`);
        const currentTime = new Date();

        // 과거 시간에 일정을 등록하려는지 확인
        if(startTime < currentTime){
            return res.status(400).json({ message: "과거 시간에는 일정을 등록할 수 없습니다." });
        }

        // 기존 일정과 겹치는지 확인
        const existingSchedules = await TrainerSchedule.findAll({
            where: {
                trainer_id,
                [Op.or]: [
                    { date: formattedDate },
                    Sequelize.where(
                        Sequelize.fn('DATE', Sequelize.col('date')), 
                        formattedDate
                    )
                ]
            }
        });

        const isOverlapping = existingSchedules.some(schedule => {
            const existingStart = new Date(`${formattedDate}T${schedule.start_time}`);
            const existingEnd = new Date(`${formattedDate}T${schedule.end_time}`);
            const newStart = new Date(`${formattedDate}T${start_time}`);
            const newEnd = new Date(`${formattedDate}T${end_time}`);

            return (newStart < existingEnd) && (newEnd > existingStart);
        });

        if (isOverlapping) {
            return res.status(400).json({ message: "이 시간대에는 이미 일정이 등록되어 있습니다." });
        }


        // 새로운 일정 등록
        const newSchedule = await TrainerSchedule.create({
            trainer_id,
            date: formattedDate,
            start_time,
            end_time,
        });

        return res.status(201).json({ message: "스케줄이 등록되었습니다." });
    } catch (error) {
        console.error("스케줄 등록 오류", error);
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
});

// 트레이너 스케줄 삭제
router.delete('/trainer/schedule/:scheduleId', verifyToken, checkRole(['trainer']), async(req, res) => {
    try{
        const trainer_id = req.user.id;
        const { scheduleId } = req.params;

        const existingSchedule = await TrainerSchedule.findOne({
            where: {
                id: scheduleId,
                trainer_id: trainer_id,
            }
        });

        if(!existingSchedule){
            return res.status(404).json({ message: "해당 스케줄이 존재하지 않습니다."});
        }

        const scheduleDate = existingSchedule.date;
        const formattedDate = new Date(scheduleDate).toISOString().split('T')[0];


        const endTime = new Date(`${formattedDate}T${existingSchedule.end_time}`);
        const currentTime = new Date();

        if(endTime < currentTime){
            return res.status(400).json({ message: "이미 종료된 수업입니다." });
        }

        await existingSchedule.destroy();
        
        return res.status(200).json({ message: "스케줄이 정상적으로 삭제되었습니다"});

    }catch(error){
        console.error("스케줄 삭제 오류", error);
        return res.status(500).json({ message: "서버 오류가 발생했습니다"})
    }
});

// 회원이 트레이너 스케줄 조회
router.get('/trainer/schedule/:trainerId', verifyToken, checkRole(['member']), async(req, res) => {
    try{
        const { trainerId } = req.params;
        const memberId = req.user.id;

        const trainerMemberRelation = await TrainerMembers.findOne({
            where:{
                trainer_id: trainerId,
                member_id: memberId,
                status: 'active'
            }
        })

        if(!trainerMemberRelation){
            return res.status(403).json("해당 트레이너의 스케줄은 조회할 수 없습니다.")
        }

        const schedule = await TrainerSchedule.findAll({
            where: {
                trainer_id: trainerId,
                // isBooked: false ,
                date: {[Op.gte]: new Date()}
            },
            order:[
                ['date', 'ASC'],
                ['start_time', 'ASC']
            ]
        });

        return res.status(200).json({ 
            message: "트레이너 스케줄 조회 성공", 
            schedule 
        });

    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "서버 오류가 발생했습니다"});
    }
});

// 회원이 스케줄 예약
router.post('/trainer/schedule/book', verifyToken, checkRole(['member']), async(req, res) => {
    const member_id = req.user.id;
    const { scheduleId } = req.body;

    try{
    //해당 스케줄의 트레이너 아이디를 조회
    const checkTrainerSchedule = await TrainerSchedule.findOne({
        where: {
            id: scheduleId
        },
        attributes: ['id', 'trainer_id', 'date', 'start_time', 'end_time', 'isBooked']
    });

    if(!checkTrainerSchedule){
        return res.status(404).json({ message: "존재하지 않는 스케줄입니다"});
    }

    if(checkTrainerSchedule.isBooked){
        return res.status(400).json({ message: "이미 예약된 스케줄입니다."});
    }

    const trainer_id = checkTrainerSchedule.trainer_id;

    const trainerMemberRelation = await TrainerMembers.findOne({
        where:{
            trainer_id: trainer_id,
            member_id: member_id,
            status: 'active'
        }
    });

    if(!trainerMemberRelation){
        return res.status(403).json({ message: "해당 트레이너의 스케줄은 예약할 수 없습니다."});
    }

    const newSchedule = await MemberBookings.create({
        trainer_id,
        member_id,
        schedule_id: scheduleId
    });

    // 트레이너 스케줄 상태 업데이트
    await TrainerSchedule.update(
        { isBooked: true },
        { where: { id: scheduleId } }
    );

    return res.status(200).json({ message: "예약 성공"});
    }catch(error){
        console.log(error);
        return res.status(500).json({ message: "서버 오류가 발생했습니다"});
    }
});

// 회원이 자신이 예약한 스케줄 조회
router.get('/member/bookings', verifyToken, checkRole(['member']), async (req, res) => {
    try {
        const memberId = req.user.id;
        
        // 현재 날짜 설정 (시간은 00:00:00으로)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 회원의 모든 예약 조회
        const bookings = await MemberBookings.findAll({
            where: {
                member_id: memberId
            },
            include: [
                {
                    model: User,
                    as: 'Trainer',
                    attributes: ['id', 'name']
                },
                {
                    model: TrainerSchedule,
                    as: 'Schedule',
                    attributes: ['id', 'date', 'start_time', 'end_time']
                }
            ],
            order: [
                [{ model: TrainerSchedule, as: 'Schedule' }, 'date', 'ASC'],
                [{ model: TrainerSchedule, as: 'Schedule' }, 'start_time', 'ASC']
            ]
        });
        
        // 예약이 없는 경우
        if (bookings.length === 0) {
            return res.status(200).json({
                message: "예약된 스케줄이 없습니다.",
                upcomingBookings: [],
                pastBookings: []
            });
        }
        
        // 예정된 예약과 지난 예약으로 분류
        const upcomingBookings = [];
        const pastBookings = [];
        
        bookings.forEach(booking => {
            // 날짜 형식 변환 (문자열 -> Date 객체)
            const scheduleDate = new Date(booking.Schedule.date);
            
            // 예약 날짜가 오늘 이후인 경우 예정된 예약으로 분류
            if (scheduleDate >= today) {
                upcomingBookings.push({
                    id: booking.id,
                    status: booking.status,
                    createdAt: booking.createdAt,
                    trainer: {
                        id: booking.Trainer.id,
                        name: booking.Trainer.name,
                        profileImage: booking.Trainer.profile_image
                    },
                    schedule: {
                        id: booking.Schedule.id,
                        date: booking.Schedule.date,
                        startTime: booking.Schedule.start_time,
                        endTime: booking.Schedule.end_time
                    }
                });
            } else {
                // 예약 날짜가 오늘 이전인 경우 지난 예약으로 분류
                pastBookings.push({
                    id: booking.id,
                    status: booking.status,
                    createdAt: booking.createdAt,
                    trainer: {
                        id: booking.Trainer.id,
                        name: booking.Trainer.name,
                        profileImage: booking.Trainer.profile_image
                    },
                    schedule: {
                        id: booking.Schedule.id,
                        date: booking.Schedule.date,
                        startTime: booking.Schedule.start_time,
                        endTime: booking.Schedule.end_time
                    }
                });
            }
        });
        
        return res.status(200).json({
            message: "예약 스케줄 조회 성공",
            upcomingBookings,
            pastBookings
        });
        
    } catch (error) {
        console.error("예약 스케줄 조회 오류:", error);
        return res.status(500).json({ message: "서버 오류가 발생했습니다" });
    }
});


// 주간 리포트
router.post('/workouts/analyze-weekly', verifyToken, async (req, res) => {
    try {
        const { memberId } = req.body;

        // 트레이너와 회원 관계 확인
        const trainerMember = await TrainerMembers.findOne({
            where: {
                trainerId: req.user.id,
                memberId: memberId,
                status: 'active'
            }
        });

        if (!trainerMember && req.user.role === 'trainer') {
            return res.status(403).json({ message: '해당 회원의 기록을 조회할 수 없습니다.' });
        }

        // 일주일간의 운동 기록 조회
        const workoutLogs = await WorkoutLog.findAll({
            where: {
                user_id: memberId,
                workout_date: {
                    [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000), // 일주일 전부터
                }
            },
            include: [{
                model: WorkoutDetail,
                include: [{ model: Exercise }]
            }]
        });

        if (!workoutLogs.length) {
            return res.status(200).json({ message: '운동 기록이 없습니다.', data: [] });
        }

        // 운동 기록을 GPT에게 전달하여 주간 리포트를 생성
        const workoutData = workoutLogs.map(log => {
            return {
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
            };
        });

        // OpenAI API 호출 - 각 변수에 대한 별도의 프롬프트 생성
      // OpenAI API 호출 후 응답 처리
const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",  // 사용할 모델
    messages: [
        {
            role: "system",
            content: "You are a fitness coach analyzing workout data. Please provide the total calories burned, muscle mass change, and body weight change based on the workout data. Only return the following format: total_calories_burned: +/- n kcal, muscle_change: +/- n kg, body_change: +/- n kg, feedback: one sentence in Korean. You have to keep the form strictly including the under bar. Please calcluate all the required calorie/muscle change/body change even accuracy would drop due to lack of information. I just need the approximate value amoung average people"
        },
        {
            role: "user",
            content: `Here are the workout details for the past week: ${JSON.stringify(workoutData)}. Please calculate and return the total calories burned, muscle mass change, and body weight change. Provide a short feedback in Korean.`
        }
    ],
    max_tokens: 200
});

// 응답에서 필요한 값 추출
const result = response.choices[0].message.content;

// 응답에서 'total_calories_burned', 'muscle_change', 'body_change'와 'feedback' 추출
const regex = /total_calories_burned: (.+?) kcal, muscle_change: (.+?) kg, body_change: (.+?) kg, feedback: (.+)/;
const matches = result.match(regex);

if (matches) {
    const total_calories_burned = matches[1];  // 칼로리 소모량
    const muscle_change = matches[2];          // 근육량 변화
    const body_change = matches[3];            // 체중 변화
    const feedback = matches[4];               // 피드백

    // AI 분석 결과 저장 (WeeklyReport 모델에 저장)
    const report = await WeeklyReport.create({
        workout_log_id: workoutLogs[0].id,  // 첫 번째 운동 기록의 ID를 사용
        total_calories_burned,  // 칼로리 소모량
        muscle_change,          // 근육량 변화
        body_change,            // 체중 변화
        feedback,               // 피드백
        analysis_result: "분석 결과는 별도로 저장하지 않음",  // 전체 리포트 요약을 나중에 추가할 수 있음
        expected_results: "예시 결과" // 추가적으로 예상 결과도 설정할 수 있음
    });

    res.status(200).json({ message: 'AI 분석 완료 및 저장', report });
} else {
    res.status(500).json({ message: 'AI 응답 처리 오류' });
}


        const feedback = feedbackResponse.choices[0].message.content.trim();  // 피드백

        // AI 분석 결과 저장 (WeeklyReport 모델에 저장)
        const report = await WeeklyReport.create({
            workout_log_id: workoutLogs[0].id,  // 첫 번째 운동 기록의 ID를 사용
            total_calories_burned: total_calories_burned, // 칼로리 소모량
            muscle_change: muscle_change,  // 근육량 변화
            body_change: body_change,    // 체중 변화
            feedback: feedback,          // 피드백
            analysis_result: "분석 결과는 별도로 저장하지 않음",  // 전체 리포트 요약을 나중에 추가할 수 있음
            expected_results: "예시 결과" // 추가적으로 예상 결과도 설정할 수 있음
        });

        res.status(200).json({ message: 'AI 분석 완료 및 저장', report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});



// AI 리포트 조회
router.get('/workouts/report/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;  // 리포트 ID

        const report = await WeeklyReport.findByPk(id);  // 리포트 ID로 조회

        if (!report) {
            return res.status(404).json({ message: '리포트를 찾을 수 없습니다.' });
        }

        res.status(200).json({ message: 'AI 리포트 조회 성공', report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});


router.get('/', (req, res) => {
    res.send('Test');
});

module.exports = router;
