// cron-job.js
const cron = require('node-cron');
const crypto = require('crypto');

const { WorkoutSchedule } = require('./models');

// 주기적으로 운동 시간 확인
const cronJob = () => {
    // 매 분마다 실행되며, DB에서 운동 알림 시간에 해당하는 스케줄을 찾아서 알림을 전송합니다.
    cron.schedule('* * * * *', async () => {  // 매 분마다 실행
        try {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDay = now.getDay(); // 현재 요일 (0-6, 일요일=0)

            const schedules = await WorkoutSchedule.findAll({
                where: {
                    isActive: true,
                    workoutTime: `${currentHour}:${currentMinute}`,
                }
            });

            schedules.forEach(schedule => {
                if (schedule.daysOfWeek && schedule.daysOfWeek[currentDay]) {
                    const userId = schedule.userId;
                    // 메인 프로세스에 알림 요청 보내기 (IPC를 통해)
                    sendNotificationToMainProcess(userId, '운동 알림', '운동 시간이 되었습니다!');
                }
            });
        } catch (error) {
            console.error('운동 시간 확인 중 오류 발생:', error);
        }
    });
};

// 메인 프로세스에 알림을 보내는 함수 (IPC를 통해)
function sendNotificationToMainProcess(userId, title, message) {
    // 백엔드에서 메인 프로세스로 IPC 요청을 보냄
    // 예: 메인 프로세스에서 'workout-notification' 이벤트를 수신해 알림을 전송하도록 설정
    if (global.mainWindow) {
        global.mainWindow.webContents.send('workout-notification', { title, message, userId });
    }
}

module.exports = cronJob;
