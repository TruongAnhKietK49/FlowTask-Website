const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateToken = (userId) =>
  jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

module.exports = generateToken;
