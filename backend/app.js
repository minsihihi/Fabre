const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });
const express = require('express');
const db = require('./models');
const apiRoutes = require('./routes/api'); 
const cors = require('cors');
const cookieParser = require('cookie-parser');


const app = express();
app.use(express.json());
app.use('/api', apiRoutes);
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(cookieParser());


db.sequelize
    .authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.error('Database connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
