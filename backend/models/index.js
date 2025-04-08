const Sequelize = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
});

const db = {};

// 모델 정의
db.User = require('./user')(sequelize, Sequelize);
db.TrainerMembers = require('./trainerMembers')(sequelize, Sequelize);
db.Exercise = require('./exercise')(sequelize, Sequelize);
db.WorkoutDetail = require('./workoutDetail')(sequelize, Sequelize);
db.WorkoutLog = require('./workoutLog')(sequelize, Sequelize);
db.WorkoutSchedule = require('./workoutSchedule')(sequelize, Sequelize);
db.Meal = require('./meal')(sequelize, Sequelize);
db.TrainerSchedule = require('./trainerSchedule')(sequelize, Sequelize);
db.WeeklyReport = require('./weeklyReport')(sequelize, Sequelize);
db.MemberBookings = require('./memberBookings')(sequelize, Sequelize);
db.MealAnalysis = require('./mealAnalysis')(sequelize, Sequelize);
db.Profile = require('./profile')(sequelize, Sequelize);
db.Workout = require('./workout')(sequelize, Sequelize);

// 모델 관계 설정 (각 모델이 정의된 후 실행)
db.TrainerMembers.belongsTo(db.User, { foreignKey: 'memberId' });
db.WorkoutLog.hasMany(db.WorkoutDetail, { foreignKey: 'workout_log_id' });
db.WorkoutDetail.belongsTo(db.WorkoutLog, { foreignKey: 'workout_log_id' });
db.WorkoutDetail.belongsTo(db.Exercise, { foreignKey: 'exercise_id' });
db.Meal.belongsTo(db.User, { foreignKey: 'userId' });
db.MealAnalysis.belongsTo(db.User, { foreignKey: 'userId' });
db.MealAnalysis.belongsTo(db.Meal, { foreignKey: 'mealId' });
db.Profile.belongsTo(db.User, { foreignKey: 'userId' });
db.Workout.belongsTo(db.User, { foreignKey: 'userId' });

// 모델 연관 관계 설정
db.TrainerMembers.belongsTo(db.User, {
    foreignKey: 'memberId',
});

db.WorkoutLog.hasMany(db.WorkoutDetail, { 
    foreignKey: 'workout_log_id',
});

db.WorkoutDetail.belongsTo(db.WorkoutLog, { 
    foreignKey: 'workout_log_id',
});

db.WorkoutDetail.belongsTo(db.Exercise, {
    foreignKey: 'exercise_id',
});

db.Meal.belongsTo(db.User, {  // ✅ Meal 모델과 User 모델 연결
    foreignKey: 'userId',
});

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});


db.sequelize = sequelize;
module.exports = db;

