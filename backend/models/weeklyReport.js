module.exports = (sequelize, DataTypes) => {
    const WeeklyReport = sequelize.define('WeeklyReport', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        workout_log_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'WorkoutLogs',
                key: 'id'
            }
        },
        analysis_result: {
            type: DataTypes.TEXT,  // TEXT로 변경 (길이가 긴 문자열을 저장)
            allowNull: true
        },
        total_calories_burned: {
            type: DataTypes.TEXT,  // TEXT로 변경
            allowNull: false
        },
        muscle_change: {
            type: DataTypes.TEXT,  // TEXT로 변경
            allowNull: false
        },
        body_change: {
            type: DataTypes.TEXT,  // TEXT로 변경
            allowNull: false
        },
        feedback: {
            type: DataTypes.TEXT,  // TEXT로 변경
            allowNull: true
        }
    }, {
        tableName: 'weekly_reports',  // 테이블 이름 설정
        timestamps: true,
        underscored: true
    });

    // 관계 설정 (WorkoutLogs 모델과의 관계 설정)
    WeeklyReport.belongsTo(sequelize.models.WorkoutLog, { foreignKey: 'workout_log_id' });

    return WeeklyReport;
};
