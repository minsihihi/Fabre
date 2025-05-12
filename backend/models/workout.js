module.exports = (sequelize, DataTypes) => {
    const Workout = sequelize.define("Workout", {
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
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.NOW
        }
    }, {
        tableName: 'workouts',
        timestamps: true,
        updatedAt: false,
        underscored: true
    });

    Workout.associate = function(models) {
        Workout.belongsTo(models.User, { foreignKey: 'userId' });
    };

    return Workout;
};
