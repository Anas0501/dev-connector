const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const config = require('config');
const request = require('request');


// getCurrentUserId
router.get("/me", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar']);

		if (!profile) {
			return res.status(400).json({ msg: 'There is no profile for this user' });
		}

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// create or update a user profile
router.post('/', [auth,
	check('status', 'Status is required').not().isEmpty(),
	check('skills', 'Skills is required').not().isEmpty(),
], async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const {
		company,
		website,
		location,
		status,
		skills,
		bio,
		githubusername,
		experience,
		education,
		social,
		youtube,
		twitter,
		facebook,
		linkedin,
		instagram
	} = req.body;

	const profileFields = {};
	profileFields.user = req.user.id;
	if (company) profileFields.company = company;
	if (website) profileFields.website = website;
	if (location) profileFields.location = location;
	if (status) profileFields.status = status;
	if (bio) profileFields.bio = bio;
	if (githubusername) profileFields.githubusername = githubusername;
	if (skills) {
		profileFields.skills = skills.split(',').map(skill => skill.trim());
	}

	profileFields.social = {};
	if (youtube) profileFields.social.youtube = youtube;
	if (twitter) profileFields.social.twitter = twitter;
	if (facebook) profileFields.social.facebook = facebook;
	if (linkedin) profileFields.social.linkedin = linkedin;
	if (instagram) profileFields.social.instagram = instagram;

	try {
		const profile = await Profile.findOne({ user: req.user.id });
		if (profile) {
			// update
			const updatedProfile = await Profile.findOneAndUpdate({ user: req.user.id }, { $set: profileFields }, { new: true });
			res.json(updatedProfile);
		} else {
			// create
			const newProfile = new Profile(profileFields);
			await newProfile.save();
			res.json(newProfile);
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// route to get all profiles
router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		res.json(profiles);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// route to get profile by userId
router.get('/user/:user_id', async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar']);
		if (!profile) {
			return res.status(400).json({ msg: 'Profile not found' });
		}
		res.json(profile);
	} catch (err) {
		console.error(err.message);
		if (err.kind === 'ObjectId') {
			return res.status(400).json({ msg: 'Profile not found' });
		}
		res.status(500).send('Server Error');
	}
});

// route for Delete profile, user & posts 
router.delete('/', auth, async (req, res) => {
	try {
		// Remove user posts
		// Remove profile
		// Remove user
		await Promise.all([
			Profile.findOneAndDelete({ user: req.user.id }),
			User.findOneAndDelete({ _id: req.user.id })
		]);

		res.json({ msg: 'User deleted' });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// route to add profile experience
router.put(
	'/experience',
	auth,
	check('title', 'Title is required').notEmpty(),
	check('company', 'Company is required').notEmpty(),
	check('from', 'From date is required and needs to be from the past')
		.notEmpty()
		.custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.experience.unshift(req.body);

			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);


// route to delete profile experience by id 
router.delete('/experience/:exp_id', auth, async (req, res) => {
	try {
		const foundProfile = await Profile.findOne({ user: req.user.id });

		foundProfile.experience = foundProfile.experience.filter(
			(exp) => exp._id.toString() !== req.params.exp_id
		);

		await foundProfile.save();
		return res.status(200).json(foundProfile);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// route to add education 
router.put(
	'/education',
	auth,
	check('school', 'School is required').notEmpty(),
	check('degree', 'Degree is required').notEmpty(),
	check('fieldofstudy', 'Field of study is required').notEmpty(),
	check('from', 'From date is required and needs to be from the past')
		.notEmpty()
		.custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.education.unshift(req.body);

			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// route to delete education by id
router.delete('/education/:edu_id', auth, async (req, res) => {
	try {
		const foundProfile = await Profile.findOne({ user: req.user.id });
		foundProfile.education = foundProfile.education.filter(
			(edu) => edu._id.toString() !== req.params.edu_id
		);
		await foundProfile.save();
		return res.status(200).json(foundProfile);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// route to get repo from github 
router.get('/github/:username', async (req, res) => {
	try {
		const options = {
			uri: `https://api.github.com/users/${req.params.username
				}/repos?per_page=5&sort=created:asc&client_id=${config.get(
					'githubClientId'
				)}&client_secret=${config.get('githubSecret')}`,
			method: 'GET',
			headers: { 'user-agent': 'node.js' }
		};

		request(options, (error, response, body) => {
			if (error) console.error(error);

			if (response.statusCode !== 200) {
				return res.status(404).json({ msg: 'No Github profile found' });
			}

			res.json(JSON.parse(body));
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;