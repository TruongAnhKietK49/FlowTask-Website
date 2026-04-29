const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');

dotenv.config();
const connectDb = require('./config/db');
const config = require('./config/env');
const { startReminderScheduler } = require('./jobs/reminderScheduler');
const { initializeSocket } = require('./socket');

const startServer = async () => {
  await connectDb();
  const reminderJob = startReminderScheduler();
  const httpServer = http.createServer(app);
  initializeSocket(httpServer);

  const server = httpServer.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
  });

  const gracefulShutdown = async () => {
    reminderJob.stop();

    server.close(async () => {
      try {
        await mongoose.connection.close();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
