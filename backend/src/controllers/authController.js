const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const buildAuthResponse = (user) => ({
  message: 'Authentication successful',
  token: generateToken(user._id.toString()),
  user,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required.');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    res.status(409);
    throw new Error('Email is already in use.');
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  res.status(201).json(buildAuthResponse(user));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  res.status(200).json(buildAuthResponse(user));
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

module.exports = {
  register,
  login,
  getMe,
};
