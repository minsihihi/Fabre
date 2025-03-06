const { MemberBookings } = require('../models');
const { Op, Sequelize } = require('sequelize');

const updateBookingStatus = async () => {
    try {
        const now = new Date();
        const formattedNow = now.toISOString().slice(0, 19).replace('T', ' ');

        await MemberBookings.update(
            { status: 'completed' },
            {
                where: {
                    status: 'confirmed',
                    schedule_id: {
                        [Op.in]: Sequelize.literal(
                            `(SELECT id FROM trainer_schedules WHERE end_time < '${formattedNow}')`
                        )
                    }
                }
            }
        );

        // console.log(`[${new Date().toISOString()}] 예약 상태 업데이트 완료`);
    } catch (error) {
        console.error("예약 상태 업데이트 오류:", error);
    }
};

// 1초마다 실행
const startScheduler = () => {
    updateBookingStatus();
    setInterval(updateBookingStatus, 1000);
};

module.exports = { startScheduler };
