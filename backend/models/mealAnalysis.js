module.exports = (sequelize, DataTypes) => {
    const MealAnalysis = sequelize.define("MealAnalysis", {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        mealId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'meals',
                key: 'id'
            }
        },
        fileId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        analysisResult: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        recommendedFood: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'meal_analyses',
        timestamps: true,
        underscored: true
    });

    MealAnalysis.associate = function(models) {
        MealAnalysis.belongsTo(models.User, { foreignKey: "userId" });
        MealAnalysis.belongsTo(models.Meal, { foreignKey: "mealId" });
    };

    return MealAnalysis;
};
