const express = require('express');
const router = express.Router();

// This is a test route
router.get("/", (req, res) => res.send('Profile route'));

module.exports = router;