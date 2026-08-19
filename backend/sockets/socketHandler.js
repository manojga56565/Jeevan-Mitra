const logger = require('../utils/logger');

// Rooms:
//   'donors'                 — every connected donor (admin broadcasts only)
//   'donors:group:<A+|...>'  — donors of a specific blood group (emergency
//                              request matching — a donor only ever joins
//                              their own group's room, so an incompatible
//                              request is never even sent to their socket)
//   'donor:<id>'             — a single donor's personal room (their own
//                              acceptance confirmations, request-closed pings)
//   'hospital:<id>'          — a single hospital's room
//   'admins'                 — every connected admin
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join', ({ role, id, bloodGroup }) => {
      if (role === 'donor') {
        socket.join('donors');
        if (bloodGroup) socket.join(`donors:group:${bloodGroup}`);
        if (id) socket.join(`donor:${id}`);
      }
      if (role === 'hospital' && id) socket.join(`hospital:${id}`);
      if (role === 'admin') socket.join('admins');
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { registerSocketHandlers };
