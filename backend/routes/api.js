const AWS = require('aws-sdk');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 

const multer = require('multer');  
const multerS3 = require('multer-s3');

const { OpenAI } = require('openai');  

const fs = require('fs');
const path = require('path');
const { User, TrainerMembers, WorkoutLog, WorkoutDetail, Exercise, Meal } = require('../models'); 
const { verifyToken, checkRole } = require('../middleware/auth');

require('dotenv').config({ path: 'backend/.env' });


// ✅ OpenAI API 설정
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ✅ S3 설정
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// ✅ multer와 s3 연동 설정
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: 'public-read',  // 퍼블릭 읽기 권한
        key: function (req, file, cb) {
            cb(null, `meal-images/${Date.now()}_${file.originalname}`); // 파일 경로
        }
    })
});

// ✅ 이미지 저장 경로 설정 (로컬 스토리지)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });  
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// s3 설정 부분 1
/* ----------------------------------- */
/* ✅ 1. 식단 사진 업로드 API */
/* ----------------------------------- */
router.post('/meals/upload', verifyToken, upload.single('mealImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '파일이 없습니다.' });

        const imageUrl = `/uploads/${req.file.filename}`;
        // const imageUrl = req.file.location;  // S3 URL
        const userId = req.user.id;

        // 🔹 데이터베이스에 저장
        const meal = await Meal.create({ userId, imageUrl });

        res.status(201).json({ message: '사진 업로드 성공', meal });
    } catch (error) {
        console.error("❌ 식단 업로드 오류:", error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

/* ----------------------------------- */
/* ✅ 2. OpenAI API를 이용한 식단 분석 API */
/* ----------------------------------- */
router.post('/meals/analyze/:mealId', verifyToken, async (req, res) => {
    try {
        const { mealId } = req.params;
        const meal = await Meal.findByPk(mealId);

        if (!meal) return res.status(404).json({ message: '식단을 찾을 수 없습니다.' });

        const imageUrl = `http://localhost:3000${meal.imageUrl}`;
        
        // s3 설정 부분 2
        // const imageUrl = req.file.location;  // S3 URL

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
                        { type: "text", text: "Analyze this meal and estimate the calorie count." },
                        { type: "image_url", image_url: { url: imageUrl } } // ✅ 수정된 부분
                    ]
                }
            ],
            max_tokens: 300
        });

        // 🔹 OpenAI 응답 데이터 저장
        const analysisResult = response.choices[0].message.content;
        await meal.update({ analysisResult });

        res.status(200).json({ message: '식단 분석 완료', analysisResult });
    } catch (error) {
        console.error("❌ OpenAI API 오류:", error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
});

/* ----------------------------------- */
/* ✅ 3. 회원의 식단 목록 조회 API */
/* ----------------------------------- */
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



require('dotenv').config({ path: 'backend/.env' });

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
                // as: 'managedMembers',
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


router.get('/', (req, res) => {
    res.send('Test');
});

module.exports = router;
