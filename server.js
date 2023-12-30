const express = require('express'); 
const colours = require('colors');

const app = express();

app.get('/', (req, res) => res.send('API is running'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`.green.bold));