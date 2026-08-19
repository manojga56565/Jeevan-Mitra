const { Server } = require('socket.io');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  return io;
}

module.exports = { initSocket };
