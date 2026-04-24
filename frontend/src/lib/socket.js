import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

let socketInstance = null;
let activeToken = null;

export const connectSocket = (token) => {
  if (!token) {
    return null;
  }

  if (socketInstance && activeToken === token) {
    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  activeToken = token;
  socketInstance = io(SOCKET_URL, {
    autoConnect: true,
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  activeToken = null;

  if (!socketInstance) {
    return;
  }

  socketInstance.disconnect();
  socketInstance = null;
};
