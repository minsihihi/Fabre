module.exports = (sequelize, DataTypes) => {
    const UserMeal = sequelize.define('UserMeal', {
        mealId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'meals',
                key: 'id'
            }
        },
        detection: {
            type: DataTypes.JSON, // YOLO 탐지 결과 (음식 이름 리스트)
            allowNull: true
        },
        matchScore: {
            type: DataTypes.FLOAT, // 일치율 계산 결과
            allowNull: true
        }
    }, {
        tableName: 'user_meals',
        timestamps: true,
    });

    UserMeal.associate = function(models) {
        UserMeal.belongsTo(models.Meal, { foreignKey: 'mealId' });
    };

    return UserMeal;
};
