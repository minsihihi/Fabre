const { scheduleJob } = require("node-schedule");
const notifier = require("node-notifier");
const eventEmitter = require("../utils/eventEmitter");
const { User, WorkoutSchedule, Workout, TrainerMembers } = require('../models'); 
const { Op } = require('sequelize');

// 현재 활성화된 스케줄 저장
const activeJobs = {};

let loggedInUserId = null;

// 로그인한 유저를 설정하는 함수
const setLoggedInUser = (userId) => {
    // console.log(`로그인된 사용자 설정됨: ${userId}`);
    loggedInUserId = userId;
};

// 운동 알림 스케줄링 함수
const scheduleWorkoutNotification = (schedule) => {
    try {
        if (!schedule) return;
        const { id, userId, workoutTime, days } = schedule;

        if (!id || !workoutTime) return;
        if (loggedInUserId !== userId) return;

        const weekdayToCronIndex = {
            Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
            Thursday: 4, Friday: 5, Saturday: 6
        };

        const dayList = (days || "")
            .split(",")
            .map(day => weekdayToCronIndex[day.trim()])
            .filter(day => day !== undefined);

        const [hour, minute] = workoutTime.split(":").map(Number);

        if (dayList.length === 0) return;

        if (activeJobs[id]) {
            activeJobs[id].forEach(job => job.cancel());
            delete activeJobs[id];
        }

        activeJobs[id] = [];

        dayList.forEach((dayOfWeek) => {
            const cronExpression = `0 ${minute} ${hour} * * ${dayOfWeek}`;
            const followUpCron = `0 ${minute} ${hour + 1 === 24 ? 0 : hour + 1} * * ${dayOfWeek}`; // 1시간 뒤

            // 운동 시간 알림
            const job = scheduleJob(cronExpression, () => {
                sendWorkoutNotification(userId);
            });
            activeJobs[id].push(job);

            //  운동 시간 +1시간 후 인증 여부 확인 & 트레이너에게 알림
            const checkJob = scheduleJob(followUpCron, async () => {
                const now = new Date();
                const dateStr = now.toISOString().split("T")[0];

                const startTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
                const endTime = new Date(startTime);
                endTime.setHours(endTime.getHours() + 1);

                const hasWorkout = await Workout.findOne({
                    where: {
                        userId,
                        createdAt: { [Op.between]: [startTime, endTime] }
                    }
                });

                if (!hasWorkout) {
                    const relation = await TrainerMembers.findOne({
                        where: { memberId: userId, status: 'active' }
                    });
                
                    if (relation) {
                        const trainerId = relation.trainerId;
                
                        const user = await User.findByPk(userId); // 🔹 이름 가져오기
                
                        const memberName = user ? user.name : `ID ${userId}`;
                
                        // Electron 알림
                        eventEmitter.emit("notification", {
                            title: "오운완 미제출 알림",
                            message: `회원 ${memberName}님이 운동 인증 사진을 제출하지 않았습니다.`,
                            userId: trainerId
                        });
                
                        // OS 알림
                        notifier.notify({
                            title: "오운완 미제출 알림",
                            message: `회원 ${memberName}님이 운동 인증을 안 했습니다.`,
                            sound: true
                        });
                    }
                }
            });

            activeJobs[id].push(checkJob);
        });
    } catch (error) {
        console.error("운동 스케줄 등록 중 오류가 발생했습니다:", error);
    }
};

// 운동 알림 전송 (Electron & OS 알림)
const sendWorkoutNotification = (userId) => {
    try {
        // 로그인한 사용자만 알림 받도록 설정
        if (loggedInUserId !== userId) {
            // console.log(`로그인한 사용자(${loggedInUserId})와 알림 대상(${userId}) 불일치`);
            return;
        }

        // Electron이 실행 중이면 앱 내에서 알림 전송
        if (eventEmitter) {
            eventEmitter.emit("notification", {
                title: "운동 시간 알림",
                message: "운동할 시간입니다! 🏋️‍♂️🔥"
            });
        }

        // OS 기본 알림 (앱이 꺼져 있어도 동작)
        notifier.notify({
            title: "운동 시간 알림",
            message: "운동할 시간입니다! 🏋️‍♂️🔥",
            sound: true,
            wait: false
        });

    } catch (error) {
        console.error("알림 전송 중 오류 발생:", error);
    }
};

const initializeWorkoutNotifications = async () => {
    try {
        const schedules = await WorkoutSchedule.findAll({
            where: { isActive: true },
            raw: true
        });

        if (!schedules || schedules.length === 0) {
            console.log("등록된 운동 스케줄이 없습니다.");
            return;
        }
        schedules.forEach(scheduleWorkoutNotification);
    } catch (error) {
        console.error("운동 알림 초기화 오류:", error);
    }
};

module.exports = {
    scheduleWorkoutNotification,
    sendWorkoutNotification,
    initializeWorkoutNotifications,
    setLoggedInUser
};
