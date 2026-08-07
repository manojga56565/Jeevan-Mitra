const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

/**
 * Registers custom real-time events on top of the base connection/room
 * logic already set up in config/socket.js. Called once from server.js
 * after the socket server is initialized.
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {

    // Donor taps "I'm on my way" / "I've arrived" after accepting a request
    socket.on('donor:status', ({ requestId, hospitalId, status }) => {
      if (!socket.user || socket.user.role !== 'donor') return;
      if (!['on_the_way', 'arrived'].includes(status)) return;

      io.to(`user:${hospitalId}`).emit('donor:status', {
        requestId,
        donorId: socket.user.id,
        status,
        at: new Date()
      });
      logger.info(`Donor ${socket.user.id} status -> ${status} for request ${requestId}`);
    });

  });
}

/** Convenience emitters other parts of the app can call without touching io directly */
function emitToUser(userId, event, payload) {
  const io = getIO();
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToRole(role, event, payload) {
  const io = getIO();
  if (io) io.to(role + 's').emit(event, payload);
}

module.exports = { registerSocketHandlers, emitToUser, emitToRole };
