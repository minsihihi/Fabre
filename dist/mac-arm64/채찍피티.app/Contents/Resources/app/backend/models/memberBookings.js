const { TrainerSchedule } = require(".");

module.exports = (sequelize, DataTypes) => {
    const MemberBookings = sequelize.define('MemberBookings', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        trainer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        member_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        schedule_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'trainer_schedules',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('confirmed', 'cancelled', 'completed'),
            defaultValue: 'confirmed'
        },
    }, {
        tableName: 'member_bookings',
        timestamps: true,
    });

    // MemberBookings 모델에서 관계 설정 예시
    MemberBookings.belongsTo(sequelize.models.User, { foreignKey: 'trainer_id', as: 'Trainer' });
    MemberBookings.belongsTo(sequelize.models.User, { foreignKey: 'member_id', as: 'Member' });
    MemberBookings.belongsTo(sequelize.models.TrainerSchedule, { foreignKey: 'schedule_id', as: 'Schedule' });


    return MemberBookings;
};