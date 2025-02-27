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
        analysisResult: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'meals', // 테이블 명 명시
        timestamps: true
    });

    return Meal;
};
