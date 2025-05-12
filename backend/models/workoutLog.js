module.exports = (sequelize, DataTypes) => {
    const WorkoutLog = sequelize.define('WorkoutLog', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        workout_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        start_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        end_time: {
            type: DataTypes.TIME,
            allowNull: false
        },
        total_duration: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'workout_logs',
        timestamps: true,
        underscored: true
    });

    WorkoutLog.associate = (models) => {
        WorkoutLog.belongsTo(models.User, { foreignKey: 'user_id' });
        WorkoutLog.hasMany(models.WorkoutDetail, { foreignKey: 'workout_log_id' });
        WorkoutLog.hasOne(models.WeeklyReport, { foreignKey: 'workout_log_id' });
    };

    return WorkoutLog;
};
