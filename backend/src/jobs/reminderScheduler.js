const cron = require('node-cron');
const Task = require('../models/Task');

const getReminderType = (dueDate, now) => (dueDate <= now ? 'OVERDUE' : 'DUE_SOON');

const runReminderSweep = async () => {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

  const tasks = await Task.find({
    status: { $ne: 'completed' },
    dueDate: {
      $ne: null,
      $lte: nextHour,
    },
    reminderSent: false,
  }).populate('owner', 'email name');

  for (const task of tasks) {
    const reminderType = getReminderType(task.dueDate, now);

    console.log(
      `[Reminder] ${reminderType} | user=${task.owner?.email || 'unknown'} | task="${task.title}" | due=${task.dueDate.toISOString()}`
    );

    task.reminderSent = true;
    await task.save();
  }
};

const startReminderScheduler = () => {
  const job = cron.schedule('*/5 * * * *', async () => {
    try {
      await runReminderSweep();
    } catch (error) {
      console.error('Reminder scheduler error:', error);
    }
  });

  console.log('Reminder scheduler started. Running every 5 minutes.');

  return job;
};

module.exports = {
  startReminderScheduler,
  runReminderSweep,
};
