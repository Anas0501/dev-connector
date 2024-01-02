const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const gravatar = require('gravatar');
const config = require('config');

router.post('/', [
	check('name', 'Name is required').not().isEmpty(),
	check('email', 'Please include a valid email').isEmail(),
	check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	const { name, email, password } = req.body;
	try {
		// Check if user exists
		const user = await User.findOne({ email });
		if (user) {
			return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
		}

		// Get gravatar
		const avatar = gravatar.url(email, {
			s: '200',
			r: 'pg',
			d:'mm'
		});

		// Create user object
		const newUser = new User({
			name,
			email,
			password,
			avatar
		});
		// Generate salt
		const salt = await bcrypt.genSalt(10);

		// Hash password before saving in database
		newUser.password = await bcrypt.hash(newUser.password, salt);

		// Save user
		await newUser.save();
		console.log(newUser);

		// Create token
		const payload = {
			user: {
				id: newUser.id
			}
		};
		
		// Sign token
		jwt.sign(
			payload,
			config.get('jwtSecret'),
			{expiresIn: 360000},
			(err, token) => {
				if (err) throw err;
				res.json({ token });
			}
			);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// route to get all users 
router.get('/', async (req, res) => {
	try {
		const users = await User.find().select('-password');
		res.json(users);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;