require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/database');
const { initSocket } = require('./config/socket');
const { registerSocketHandlers } = require('./sockets/socketHandler');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Fail closed: never boot with a predictable or missing token-signing secret.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
}

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173,http://127.0.0.1:5173'))
  .split(',').map(origin => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must contain the trusted frontend origin(s) in production');
}
const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header include server-to-server and native clients.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

// ═══ GLOBAL MIDDLEWARE ═══
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', require('./middleware/rateLimiter').generalLimiter); // safety net — specific endpoints below have their own tighter limits

// ═══ DATABASE ═══
connectDB();

// ═══ SOCKET.IO ═══
const io = initSocket(server);
registerSocketHandlers(io);
app.set('io', io); // available to any route/service via req.app.get('io') if needed

// ═══ ROUTES ═══
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/donors', require('./routes/donorRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/requests', require('./routes/requestsRoot'));
app.use('/api/stats', require('./routes/statsRoutes'));
// The blueprint frontend also calls /api/hospital/complete/:id (singular,
// distinct from the plural /api/hospitals mount above) — same handler as
// the existing /api/hospitals/requests/:requestId/complete route.
app.patch('/api/hospital/complete/:id', require('./middleware/auth').auth('hospital'), (req, res, next) => {
  req.params.requestId = req.params.id;
  require('./controllers/hospitalController').completeDonation(req, res, next);
});

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Jeevan Mitra API is running' }));

// ═══ ERROR HANDLING (must be last) ═══
app.use(notFound);
app.use(errorHandler);

// ═══ START ═══
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.success(`Jeevan Mitra server live on port ${PORT}`));

module.exports = { app, server };
