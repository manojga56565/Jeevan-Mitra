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

const app = express();
const server = http.createServer(app);

// ═══ GLOBAL MIDDLEWARE ═══
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
