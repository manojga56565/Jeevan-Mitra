const { Server } = require('socket.io');

function initSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173,http://127.0.0.1:5173'))
    .split(',').map(origin => origin.trim()).filter(Boolean);
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: false
    }
  });
  return io;
}

module.exports = { initSocket };
