module.exports = (sequelize, DataTypes) => {
    const WorkoutDetail = sequelize.define('WorkoutDetail', {
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
        exercise_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Exercises',
                key: 'id'
            }
        },
        sets: {
            type: DataTypes.INTEGER,
            allowNull: false,
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
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'WorkoutDetails',
        timestamps: true,
        underscored: true
    });

    return WorkoutDetail;
};
