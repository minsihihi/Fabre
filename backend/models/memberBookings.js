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
        },
        member_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        schedule_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('confirmed', 'cancelled', 'completed'),
            defaultValue: 'confirmed'
        },
    }, {
        tableName: "member_bookings",
        timestamps: true,
        underscored: true
    });

    // 관계 정의는 associate 함수로 분리
    MemberBookings.associate = (models) => {
        MemberBookings.belongsTo(models.User, { foreignKey: 'trainer_id', as: 'Trainer' });
        MemberBookings.belongsTo(models.User, { foreignKey: 'member_id', as: 'Member' });
        MemberBookings.belongsTo(models.TrainerSchedule, { foreignKey: 'schedule_id', as: 'Schedule' });
    };

    return MemberBookings;
};
