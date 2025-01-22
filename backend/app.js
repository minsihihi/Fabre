const express = require('express');
const dotenv = require('dotenv');
const db = require('./models');

dotenv.config({ path: '../.env' });

const app = express();

db.sequelize
    .authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.error('Database connection error:', err));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
