const mongoose = require('mongoose');
const config = require('./env');

const connectDb = async () => {
  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(config.mongoUri);

  return connection;
};

module.exports = connectDb;
