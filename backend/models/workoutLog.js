module.exports = (sequelize, DataTypes) => {
    const WorkoutLog = sequelize.define('WorkoutLog', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
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
        timestamps: true,
        underscored: true
    });

    return WorkoutLog;
};
