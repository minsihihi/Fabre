module.exports = (sequelize, DataTypes) => {
    const WorkoutDetail = sequelize.define('WorkoutDetail', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        workout_log_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        exercise_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sets: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        reps: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        weight: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'workout_details',
        timestamps: true,
        underscored: true
    });

    WorkoutDetail.associate = (models) => {
        WorkoutDetail.belongsTo(models.WorkoutLog, { foreignKey: 'workout_log_id' });
        WorkoutDetail.belongsTo(models.Exercise, { foreignKey: 'exercise_id' });
    };

    return WorkoutDetail;
};
