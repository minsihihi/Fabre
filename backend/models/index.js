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

db.User = require('./user')(sequelize, Sequelize);
db.TrainerMembers = require('./trainerMembers')(sequelize, Sequelize);

db.TrainerMembers.belongsTo(db.User, {
    foreignKey: 'memberId',
    as: 'member'
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
