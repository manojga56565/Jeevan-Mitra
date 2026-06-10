const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { Alert } = require('../models/Other');

// ═══ HOSPITAL LOGIN ═══
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hospital = await Hospital.findOne({ email: email.toLowerCase() });
    
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    if (hospital.isVerified === false) return res.status(403).json({ success: false, message: 'Pending Admin Verification' });

    const isMatch = await bcrypt.compare(password, hospital.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: hospital._id, role: 'hospital' }, 
      process.env.JWT_SECRET || 'jeevanmitra_secret', 
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, hospital });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ CREATE REQUEST (With Token Bypass Fallback for Presentation) ═══
router.post(['/', '/requests', '/request'], async (req, res) => {
  try {
    let hospitalId = null;

    // Check if a token was sent in headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jeevanmitra_secret');
        if (decoded.role === 'hospital') {
          hospitalId = decoded.id;
        }
      } catch (tokenErr) {
        console.log("Token invalid, using presentation fallback...");
      }
    }

    // PRESENTATION FALLBACK: If no token, automatically grab the first hospital from your DB
    if (!hospitalId) {
      const defaultHospital = await Hospital.findOne();
      if (!defaultHospital) {
        return res.status(404).json({ success: false, message: 'Please register at least one hospital in MongoDB first!' });
      }
      hospitalId = defaultHospital._id;
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const newRequest = new Request({
      hospitalId: hospital._id,
      hospital: hospital._id, 
      hospitalName: hospital.hospitalName || hospital.name || "General Hospital",
      hospitalCity: hospital.city || "Hyderabad",
      hospitalPhone: hospital.phone || "9999999999",
      bloodGroup: req.body.bloodGroup || "O+",
      urgency: req.body.urgency || 'normal',
      quantity: req.body.quantity || 1, 
      patientName: req.body.patientName || 'Emergency Patient',
      patientReason: req.body.patientReason || 'Urgent Requirement', 
      doctorRefNo: req.body.doctorRefNo || '',
      status: 'pending' // Matches Mongoose Model Enum perfectly
    });

    await newRequest.save();

    // Matching Engine: Match local donors
    const matchingDonors = await Donor.find({
      bloodGroup: newRequest.bloodGroup,
      city: hospital.city,
      isActive: true,
      availabilityStatus: 'available'
    });

    if (matchingDonors.length > 0) {
      const alerts = matchingDonors.map(d => ({ 
        donorId: d._id, 
        requestId: newRequest._id, 
        status: 'pending' 
      }));
      await Alert.insertMany(alerts);
    }

    res.status(201).json({ success: true, message: 'Request posted successfully!', request: newRequest });
  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ GET ALL HOSPITAL REQUESTS ═══
router.get(['/', '/requests', '/request'], async (req, res) => {
  try {
    let hospitalId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jeevanmitra_secret');
        hospitalId = decoded.id;
      } catch (e) {}
    }

    const filter = hospitalId ? { hospitalId } : {};
    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;