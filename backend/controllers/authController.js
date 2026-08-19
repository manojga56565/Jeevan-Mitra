const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');
const { generateQRToken } = require('../services/qrService');

const JWT_SECRET = process.env.JWT_SECRET || 'jeevan-mitra-dev-secret';
const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;

function signToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Fast2SMS is blocked by DLT for this route, so OTPs are "sent" via a mock
// fallback: generated, stored, and logged/returned in dev so the flow is
// fully testable without a live SMS provider. Swap this out for a real
// provider call once one is available — everything else stays the same.
async function sendSMS(phone, message) {
  logger.info(`[MOCK SMS] to ${phone}: ${message}`);
  return { mocked: true };
}

// POST /api/auth/donor/send-otp
// Body: { phone, name?, city?, homeTown?, livingTown?, district?, bloodGroup?, dob?, age?, weight? }
// Used both for first-time registration (extra profile fields present) and
// for the "returning donor" Quick Login (phone only).
exports.donorSendOTP = async (req, res, next) => {
  try {
    const { phone, name, city, homeTown, livingTown, district, bloodGroup, dob, age, weight, gender, emergencyContact } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const code = generateCode();
    const otpExpires = new Date(Date.now() + OTP_TTL_MS);

    let donor = await Donor.findOne({ phone });
    if (donor) {
      donor.otpCode = code;
      donor.otpExpires = otpExpires;
      // Quietly refresh any updated profile fields the person just entered
      if (name) donor.name = name;
      if (city) donor.city = city;
      if (homeTown) donor.homeTown = homeTown;
      if (livingTown) donor.livingTown = livingTown;
      if (district) donor.district = district;
      if (bloodGroup) donor.bloodGroup = bloodGroup;
      if (dob) donor.dateOfBirth = dob;
      if (age) donor.age = age;
      if (weight) donor.weight = weight;
      if (gender) donor.gender = gender;
      if (emergencyContact) donor.emergencyContact = emergencyContact;
      await donor.save();
    } else {
      donor = await Donor.create({
        phone, name: name || 'Donor', city, homeTown, livingTown, district,
        bloodGroup, dateOfBirth: dob, age, weight, gender, emergencyContact,
        otpCode: code, otpExpires, qrToken: generateQRToken()
      });
    }

    await sendSMS(phone, `Your Jeevan Mitra OTP is ${code}. Valid for 5 minutes.`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Exposed only so the flow is testable without a live SMS provider —
      // remove this field once a real SMS provider is wired in.
      devOtp: process.env.NODE_ENV === 'production' ? undefined : code
    });
  } catch (err) { next(err); }
};

// POST /api/auth/donor/verify-otp
exports.donorVerifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP are required' });

    const donor = await Donor.findOne({ phone }).select('+otpCode +otpExpires');
    if (!donor) return res.status(401).json({ success: false, message: 'No OTP request found for this number', code: 'NOT_FOUND' });
    if (!donor.otpCode || donor.otpCode !== otp) {
      return res.status(401).json({ success: false, message: 'Incorrect OTP', code: 'INVALID_OTP' });
    }
    if (donor.otpExpires < new Date()) {
      return res.status(401).json({ success: false, message: 'OTP has expired — request a new one', code: 'OTP_EXPIRED' });
    }

    donor.otpCode = undefined;
    donor.otpExpires = undefined;
    if (!donor.qrToken) donor.qrToken = generateQRToken();
    await donor.save();

    const token = signToken(donor._id, 'donor');
    res.json({ success: true, token, user: donor });
  } catch (err) { next(err); }
};

// POST /api/hospitals/login
exports.hospitalLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const hospital = await Hospital.findOne({ email: email.toLowerCase() }).select('+password');
    if (!hospital) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, hospital.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!hospital.isVerified) {
      return res.status(403).json({ success: false, message: 'Your hospital account is awaiting admin verification' });
    }

    const token = signToken(hospital._id, 'hospital');
    const safe = hospital.toObject(); delete safe.password;
    res.json({ success: true, token, user: safe });
  } catch (err) { next(err); }
};

// POST /api/admin/login
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken(admin._id, 'admin');
    const safe = admin.toObject(); delete safe.password;
    res.json({ success: true, token, user: safe });
  } catch (err) { next(err); }
};

// POST /api/auth/forgot-password  { identifier, role }
exports.forgotPassword = async (req, res, next) => {
  try {
    const { identifier, role } = req.body;
    if (!identifier || !role) return res.status(400).json({ success: false, message: 'Identifier and role are required' });

    const Model = role === 'hospital' ? Hospital : role === 'admin' ? Admin : null;
    if (!Model) return res.status(400).json({ success: false, message: 'Password reset is only available for hospital and admin accounts' });

    const field = role === 'hospital' ? { $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] } : { email: identifier.toLowerCase() };
    const account = await Model.findOne(field);
    // Always respond success-shaped, even if not found, so this can't be used to enumerate accounts
    if (account) {
      const code = generateCode();
      account.resetCode = code;
      account.resetCodeExpires = new Date(Date.now() + RESET_TTL_MS);
      await account.save();
      await sendSMS(identifier, `Your Jeevan Mitra password reset code is ${code}. Valid for 10 minutes.`);
    }

    res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password  { identifier, code, newPassword, role }
exports.resetPassword = async (req, res, next) => {
  try {
    const { identifier, code, newPassword, role } = req.body;
    if (!identifier || !code || !newPassword || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const Model = role === 'hospital' ? Hospital : role === 'admin' ? Admin : null;
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid role' });

    const field = role === 'hospital' ? { $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] } : { email: identifier.toLowerCase() };
    const account = await Model.findOne(field).select('+resetCode +resetCodeExpires');
    if (!account || account.resetCode !== code || !account.resetCodeExpires || account.resetCodeExpires < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired reset code' });
    }

    account.password = await bcrypt.hash(newPassword, 10);
    account.resetCode = undefined;
    account.resetCodeExpires = undefined;
    await account.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};
