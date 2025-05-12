module.exports = (sequelize, DataTypes) => {
    const WeeklyReport = sequelize.define('WeeklyReport', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        workout_log_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        analysis_result: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        total_calories_burned: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        muscle_change: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        body_change: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        feedback: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'weekly_reports',
        timestamps: true,
        underscored: true
    });

    WeeklyReport.associate = (models) => {
        WeeklyReport.belongsTo(models.WorkoutLog, {
            foreignKey: 'workout_log_id'
        });
    };

    return WeeklyReport;
};
