module.exports = (sequelize, DataTypes) => {
    const Meal = sequelize.define('Meal', {
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
        mealDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        mealType: {
            type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
            allowNull: true
        },
        analysisResult: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'meals',
        timestamps: true,
        underscored: true
    });

    Meal.associate = function(models) {
        Meal.belongsTo(models.User, { foreignKey: 'userId' });
    };

    return Meal;
};
