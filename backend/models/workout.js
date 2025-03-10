// ✅ Workout 모델 (파일 ID → URL 저장)
module.exports = (sequelize, DataTypes) => {
    const Workout = sequelize.define("Workout", {
        id: {  
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        imageUrl: {  // ✅ S3 이미지 URL 저장
            type: DataTypes.STRING,
            allowNull: false
        },
        createdAt: {  
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.NOW
        }
    });

    return Workout;
};
