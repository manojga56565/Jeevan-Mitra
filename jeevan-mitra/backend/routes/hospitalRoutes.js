const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request'); // <-- Added Request model
const { auth } = require('../middleware/auth');

// ═══ AUTHENTICATION ══════════════════════════════════════════

// POST /api/hospitals/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const hospital = await Hospital.findOne({ email: email.toLowerCase() });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    if (hospital.isVerified === false) return res.status(403).json({ success: false, message: 'Account pending admin verification' });

    const isMatch = await bcrypt.compare(password, hospital.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: hospital._id, email: hospital.email, role: 'hospital' },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, token, 
      hospital: { _id: hospital._id, hospitalName: hospital.hospitalName, email: hospital.email, city: hospital.city, phone: hospital.phone, type: hospital.type }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ PROFILE MANAGEMENT ══════════════════════════════════════

router.get('/profile', auth('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.user.id).select('-password');
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profile', auth('hospital'), async (req, res) => {
  try {
    const { hospitalName, phone, city, email, type } = req.body;
    const updates = {};
    if (hospitalName) updates.hospitalName = hospitalName;
    if (phone) updates.phone = phone;
    if (city) updates.city = city;
    if (email) updates.email = email.toLowerCase();
    if (type) updates.type = type;

    const hospital = await Hospital.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated', hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ BLOOD REQUESTS (NEW!) ═══════════════════════════════════

// GET all requests created by this hospital
router.get(['/requests', '/request'], auth('hospital'), async (req, res) => {
  try {
    const requests = await Request.find({ hospitalId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST a new blood request
router.post(['/requests', '/request'], auth('hospital'), async (req, res) => {
  try {
    // Checking multiple property names to safely match your frontend form data
    const bloodGroup = req.body.bloodGroup || req.body.bloodGroupRequired;
    const units = req.body.units || req.body.unitsRequired || 1;
    const urgency = req.body.urgencyLevel || req.body.urgency || 'normal';
    const patientName = req.body.patientName;
    const doctorRefNo = req.body.doctorRefNo || req.body.doctorRef;
    const notes = req.body.notes;

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' });
    }

    const newRequest = new Request({
      hospitalId: req.user.id,
      bloodGroup,
      units,
      urgency,
      patientName,
      doctorRefNo,
      notes,
      status: 'pending'
    });

    await newRequest.save();

    // Trigger Socket.IO broadcast if configured
    const io = req.app.get('io');
    if (io) {
      io.emit('new_request', newRequest);
    }

    res.status(201).json({ success: true, message: 'Blood request posted successfully', request: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ DONOR SCANNER / LOOKUP ══════════════════════════════════

router.get('/phone/:phone', auth('hospital'), async (req, res) => {
  try {
    const donor = await Donor.findOne({ phone: req.params.phone }).select('-password -otpCode -otpExpiresAt');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;