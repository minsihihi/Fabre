module.exports = (sequelize, DataTypes) => {
    const MealAnalysis = sequelize.define("MealAnalysis", {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mealId: {
            type: DataTypes.INTEGER,
            allowNull: false
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
    });

    MealAnalysis.associate = (models) => {
        MealAnalysis.belongsTo(models.User, { foreignKey: "userId" });
        MealAnalysis.belongsTo(models.Meal, { foreignKey: "mealId" });
    };

    return MealAnalysis;
};
