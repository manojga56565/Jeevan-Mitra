require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ═══ GLOBAL MIDDLEWARE ═══
app.use(cors());
app.use(express.json());

// ═══ MONGOOSE DATABASE CONNECTION ═══
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));


// ========================================================
// 🚨 EMERGENCY INTERCEPTOR FOR YOUR LIVE PRESENTATION
// ========================================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Direct string match validation to bypass any router/DB token bugs instantly
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


// ========================================================
// ═══ STANDARD APPLICATION ROUTE ROUTING MOUNTS ═══
// ========================================================
app.use('/api/auth', require('./routes/authRoutes'));

// Handles both singular and plural API frontend fetch requests safely
app.use(['/api/donor', '/api/donors'], require('./routes/donorRoutes'));
app.use(['/api/hospital', '/api/hospitals'], require('./routes/hospitalRoutes'));

// Connects your core admin stats and queue verification handlers
app.use('/api/admin', require('./routes/adminRoutes'));


// ========================================================
// 🛡️ JSON FALLBACK FOR FRONTEND 404 MISMATCHES
// ========================================================
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `The URL ${req.originalUrl} was not found on this backend. Check your frontend API call mappings!` 
  });
});

// ═══ START APPLICATION SERVER ═══
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Jeevan Mitra Server live on port ${PORT}`));