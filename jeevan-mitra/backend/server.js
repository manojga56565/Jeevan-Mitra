require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));


// ==========================================
// 🚨 EMERGENCY INTERCEPTOR FOR YOUR PRESENTATION
// ==========================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Direct string match validation to bypass router bugs
    if (email === 'admin@jeevanmitra.in' && password === 'admin@JM2026') {
      return res.status(200).json({
        success: true,
        message: "Welcome back, Administrator!",
        token: "JM_EMERGENCY_PRESENTATION_TOKEN_2026",
        user: { email: "admin@jeevanmitra.in", role: "admin" }
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Admin Credentials" 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});


// ==========================================
// STANDARD ROUTES
// ==========================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use(['/api/donor', '/api/donors'], require('./routes/donorRoutes'));
app.use(['/api/hospital', '/api/hospitals'], require('./routes/hospitalRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));


// 🛡️ JSON Fallback for 404s
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `The URL ${req.originalUrl} was not found. Check your frontend API call!` 
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));