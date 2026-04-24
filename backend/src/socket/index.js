const { Server } = require('socket.io');
const config = require('../config/env');
const { requireProjectMemberAccess } = require('../middleware/projectAccessMiddleware');
const authenticateSocket = require('./authenticateSocket');

let ioInstance = null;

const getProjectRoom = (projectId) => `project:${projectId}`;
const getUserRoom = (userId) => `user:${userId}`;

const getIo = () => ioInstance;

const emitToProject = (projectId, eventName, payload) => {
  if (!ioInstance || !projectId) {
    return;
  }

  ioInstance.to(getProjectRoom(projectId)).emit(eventName, payload);
};

const emitToUser = (userId, eventName, payload) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(getUserRoom(userId)).emit(eventName, payload);
};

const emitToUsers = (userIds, eventName, payload) => {
  for (const userId of userIds || []) {
    emitToUser(userId, eventName, payload);
  }
};

const initializeSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  ioInstance.use(authenticateSocket);

  ioInstance.on('connection', (socket) => {
    const userId = socket.data.user._id.toString();
    socket.join(getUserRoom(userId));

    socket.on('project:join', async (projectId, callback) => {
      try {
        if (!projectId) {
          throw new Error('Project id is required.');
        }

        await requireProjectMemberAccess(projectId, userId);
        socket.join(getProjectRoom(projectId));

        callback?.({
          ok: true,
          projectId,
        });
      } catch (error) {
        callback?.({
          ok: false,
          projectId,
          message: error.message || 'Unable to join project room.',
        });
      }
    });

    socket.on('project:leave', (projectId, callback) => {
      if (projectId) {
        socket.leave(getProjectRoom(projectId));
      }

      callback?.({
        ok: true,
        projectId,
      });
    });
  });

  return ioInstance;
};

module.exports = {
  initializeSocket,
  getIo,
  getProjectRoom,
  getUserRoom,
  emitToProject,
  emitToUser,
  emitToUsers,
};
