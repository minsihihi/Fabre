const { scheduleJob } = require("node-schedule");
const notifier = require("node-notifier");
const eventEmitter = require("../utils/eventEmitter");
const { WorkoutSchedule } = require('../models');

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
        if (!schedule) {
            console.error("schedule 객체가 undefined");
            return;
        }

        const { id, userId, workoutTime, days } = schedule;

        if (!id || !workoutTime) {
            console.error(`잘못된 운동 스케줄 데이터 (ID: ${id || 'N/A'})`);
            return;
        }

        if (loggedInUserId !== userId) {
            // console.log(`로그인한 사용자(${loggedInUserId})와 스케줄 사용자(${userId}) 불일치`);
            return;
        }

        const dayList = (days || "").split(",").map(Number).filter(day => !isNaN(day));
        const [hour, minute] = workoutTime.split(":").map(Number);

        if (dayList.length === 0) {
            console.warn(`유효한 요일 없음 (ID: ${id}, 사용자: ${userId}, days: ${days})`);
            return;
        }

        // 기존 스케줄 제거 (중복 방지)
        if (activeJobs[id]) {
            activeJobs[id].forEach(job => job.cancel());
            delete activeJobs[id];
        }

        // 새로운 스케줄 등록
        activeJobs[id] = [];
        dayList.forEach((dayOfWeek) => {
            const cronExpression = `0 ${minute} ${hour} * * ${dayOfWeek}`;

            const job = scheduleJob(cronExpression, () => {
                sendWorkoutNotification(userId);
            });

            activeJobs[id].push(job);
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
