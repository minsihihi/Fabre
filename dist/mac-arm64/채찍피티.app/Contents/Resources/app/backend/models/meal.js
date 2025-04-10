module.exports = (sequelize, DataTypes) => {
    const Meal = sequelize.define('Meal', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mealDate: {
            type: DataTypes.DATEONLY, // YYYY-MM-DD 형식으로 저장
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
        timestamps: true
    });

    return Meal;
};
