module.exports = (sequelize, DataTypes) => {
  const Meal = sequelize.define(
    "Meal",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mealDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      mealType: {
        type: DataTypes.ENUM("breakfast", "lunch", "dinner"),
        allowNull: true,
      },
      carb: {
        type: DataTypes.STRING, // 음식 이름으로 변경
        allowNull: false,
        validate: {
          isIn: [["삶은고구마", "밥", "바나나", "단호박"]], // carb 음식 이름 리스트
        },
      },
      protein: {
        type: DataTypes.STRING, // 음식 이름으로 변경
        allowNull: false,
        validate: {
          isIn: [
            ["닭가슴살구이", "쇠고기구이", "두부", "연어구이", "삶은달걀"],
          ], // protein 음식 이름 리스트
        },
      },
      fat: {
        type: DataTypes.STRING, // 음식 이름으로 변경
        allowNull: false,
        validate: {
          isIn: [["아몬드", "캐슈넛", "방울토마토"]], // fat 음식 이름 리스트
        },
      },
      detection: {
        type: DataTypes.JSON, // ✅ 배열이라도 JSON 하나로 저장됨
        allowNull: true,
        defaultValue: [],
      },
      matchRate: {
        type: DataTypes.INTEGER, // 예: 66 (%)
        allowNull: true,
        defaultValue: null,
      },
      analysisResult: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "meals",
      timestamps: true,
    }
  );

  Meal.associate = function (models) {
    Meal.belongsTo(models.User, { foreignKey: "userId", as: "trainer" });
    Meal.belongsTo(models.User, { foreignKey: "memberId", as: "member" });
  };

  return Meal;
};
