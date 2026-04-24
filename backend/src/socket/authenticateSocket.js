const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const extractToken = (socket) => {
  const authToken = socket.handshake.auth?.token;

  if (authToken) {
    return authToken;
  }

  const authorization = socket.handshake.headers?.authorization || '';

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  const token = extractToken(socket);

  if (!token) {
    return next(new Error('Not authorized. Missing bearer token.'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).select('_id name email');

    if (!user) {
      return next(new Error('Not authorized. User no longer exists.'));
    }

    socket.data.user = user;
    return next();
  } catch {
    return next(new Error('Not authorized.'));
  }
};

module.exports = authenticateSocket;
