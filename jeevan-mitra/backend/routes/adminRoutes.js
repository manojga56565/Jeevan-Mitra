const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { auth } = require('../middleware/auth');

// ═══ PART 3: ADMIN AUTH (PLACEHOLDER) ═══
// If you have a specific Admin model, import it here. 
// Otherwise, this uses the basic auth middleware.

// ═══ PART 3, STEP 4: HOSPITAL VERIFICATION QUEUE ═══
router.get('/hospitals/pending', auth('admin'), async (req, res) => {
  try {
    const pending = await Hospital.find({ isVerified: false }).select('-password');
    res.json({ success: true, hospitals: pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/hospitals/:id/verify', auth('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    if (action === 'approve') {
      hospital.isVerified = true;
      await hospital.save();
      return res.json({ success: true, message: 'Hospital approved successfully.' });
    } else if (action === 'reject') {
      await Hospital.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: 'Hospital rejected and removed.' });
    }
    
    res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ PART 3, STEP 5 & 6: USER MANAGEMENT ═══
router.get('/donors', auth('admin'), async (req, res) => {
  try {
    const donors = await Donor.find().select('-password');
    res.json({ success: true, donors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/hospitals', auth('admin'), async (req, res) => {
  try {
    const hospitals = await Hospital.find().select('-password');
    res.json({ success: true, hospitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ PART 3, STEP 7: MONITOR REQUESTS ═══
router.get('/requests', auth('admin'), async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('hospitalId', 'hospitalName city')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══ DASHBOARD ANALYTICS (STEP 8) ═══
router.get('/stats', auth('admin'), async (req, res) => {
  try {
    const donorCount = await Donor.countDocuments();
    const hospitalCount = await Hospital.countDocuments({ isVerified: true });
    const pendingHospitals = await Hospital.countDocuments({ isVerified: false });
    const totalRequests = await Request.countDocuments();
    
    res.json({
      success: true,
      stats: {
        donors: donorCount,
        activeHospitals: hospitalCount,
        pendingHospitals: pendingHospitals,
        requests: totalRequests
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;