module.exports = (sequelize, DataTypes) => {
    const WorkoutSchedule = sequelize.define('WorkoutSchedule', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        workoutTime: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: '운동 시간 (HH:MM 형식)'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '알림 활성화 여부'
        },
        days: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: '알림을 보낼 요일 (0-6, 쉼표로 구분)'
        }
    }, {
        tableName: 'workout_schedules',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    WorkoutSchedule.associate = function(models) {
        WorkoutSchedule.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return WorkoutSchedule;
};