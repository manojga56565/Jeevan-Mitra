const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Donor = require('../models/Donor');

// ==========================================
// Temporary In-Memory OTP Store
// ==========================================
const otpStore = {};

// ==========================================
// ADMIN LOGIN
// POST /api/auth/login
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === 'admin@jeevanmitra.in' &&
      password === 'admin@JM2026'
    ) {
      const token = jwt.sign(
        {
          email,
          role: 'admin'
        },
        process.env.JWT_SECRET || 'default_secret_key',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        message: 'Login Successful',
        token,
        user: {
          email,
          role: 'admin'
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid Email or Password'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ==========================================
// DONOR SEND OTP
// POST /api/auth/donor/send-otp
// ==========================================
router.post('/donor/send-otp', async (req, res) => {
  try {
    const { phone, fullName, city, bloodGroup, dob, age } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone is required'
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    otpStore[phone] = {
      otp,
      fullName,
      city,
      bloodGroup,
      dob,
      age,
      expires: Date.now() + 300000
    };

    res.json({
      success: true,
      message: 'OTP sent successfully',
      otp
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ==========================================
// DONOR VERIFY OTP
// POST /api/auth/donor/verify-otp
// ==========================================
router.post('/donor/verify-otp', async (req, res) => {
  try {

    const { phone, otp } = req.body;

    const record = otpStore[phone];

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not requested'
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (Date.now() > record.expires) {
      return res.status(400).json({
        success: false,
        message: 'OTP Expired'
      });
    }

    let donor = await Donor.findOne({ phone });

    if (!donor) {

      donor = new Donor({
        name: record.fullName || 'User',
        phone,
        city: record.city || 'Telangana',
        bloodGroup: record.bloodGroup || 'O+',
        dob: record.dob,
        age: record.age || 18,
        weight: 50,
        password: 'otp_login_user'
      });

      await donor.save();
    }

    const token = jwt.sign(
      {
        id: donor._id,
        phone: donor.phone,
        role: 'donor'
      },
      process.env.JWT_SECRET || 'default_secret_key',
      {
        expiresIn: '30d'
      }
    );

    delete otpStore[phone];

    res.json({
      success: true,
      message: 'OTP Verified Successfully',
      token,
      donor: {
        _id: donor._id,
        fullName: donor.name,
        phone: donor.phone,
        city: donor.city,
        bloodGroup: donor.bloodGroup,
        points: donor.points || 0,
        donationCount: donor.totalDonations || 0
      }
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});

module.exports = router;