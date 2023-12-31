const express = require('express'); 
const colors = require('colors');
const connectDB = require('./config/db');

const app = express();

// connect DB 
connectDB();

app.get('/', (req, res) => res.send('API is running'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`.green.bold));