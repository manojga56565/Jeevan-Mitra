const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let ioInstance = null;

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (e) {
        // Allow anonymous connections (e.g. public landing page) — just no rooms joined
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      // Personal room — for "your request was accepted" / "donor is on the way" type events
      socket.join(`user:${socket.user.id || socket.user.email}`);
      // Role room — for broadcasts to all donors or all hospitals
      if (socket.user.role) socket.join(socket.user.role + 's');
      logger.info(`Socket connected: ${socket.user.role || 'unknown'} (${socket.id})`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  if (!ioInstance) {
    logger.warn('Socket.IO accessed before initialization');
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };
