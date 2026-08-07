const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const { generateOTP, getExpiryTimestamp, isExpired } = require('../utils/otp');
const logger = require('../utils/logger');

// In-memory OTP store. Fine for a college project / single-instance deploy;
// would move to Redis for a real multi-instance production deployment.
const otpStore = {};

function generateToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// ═══ DONOR — MOCK OTP (MSG91 disabled — always returns the OTP in the
// response so the frontend can show it directly, no real SMS sent) ═══
async function sendDonorOTP({ phone, name, city, bloodGroup, age, weight, homeTown, livingTown, gender, emergencyContact }) {
  if (!phone) throw Object.assign(new Error('Phone is required'), { statusCode: 400 });

  const otp = generateOTP();
  otpStore[phone] = {
    otp,
    name, city, bloodGroup, age, weight, homeTown, livingTown, gender, emergencyContact,
    expires: getExpiryTimestamp()
  };

  logger.info(`[MOCK OTP] ${phone} -> ${otp}`);
  return { otp }; // returned directly since there's no real SMS provider right now
}

async function verifyDonorOTP({ phone, otp }) {
  const record = otpStore[phone];
  if (!record) throw Object.assign(new Error('OTP expired or not requested'), { statusCode: 400 });
  if (record.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (isExpired(record.expires)) {
    delete otpStore[phone];
    throw Object.assign(new Error('OTP expired'), { statusCode: 400 });
  }

  let donor = await Donor.findOne({ phone });

  if (!donor) {
    donor = new Donor({
      name: record.name || 'Donor',
      phone,
      city: record.city || 'Telangana',
      bloodGroup: record.bloodGroup || 'O+',
      age: record.age || 18,
      weight: record.weight || 50,
      // Donors authenticate via OTP only, but the schema requires a
      // password — each gets a random one they will never need.
      password: crypto.randomBytes(16).toString('hex'),
      isPhoneVerified: true
    });
    await donor.save();
    logger.success(`New donor registered: ${donor.name} (${donor.phone})`);
  } else if (!donor.isPhoneVerified) {
    donor.isPhoneVerified = true;
    await donor.save();
  }

  delete otpStore[phone];

  const token = generateToken({ id: donor._id, phone: donor.phone, role: 'donor' });
  const safeDonor = donor.toObject();
  delete safeDonor.password;

  return { token, donor: safeDonor };
}

// ═══ HOSPITAL LOGIN ═══
async function hospitalLogin({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });

  const hospital = await Hospital.findOne({ email: email.toLowerCase() });
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  if (!hospital.isVerified) throw Object.assign(new Error('Your hospital account is pending admin verification'), { statusCode: 403 });
  if (!hospital.isActive) throw Object.assign(new Error('Your hospital account has been suspended'), { statusCode: 403 });

  const match = await hospital.comparePassword(password);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const token = generateToken({ id: hospital._id, role: 'hospital' });
  const safeHospital = hospital.toObject();
  delete safeHospital.password;

  return { token, hospital: safeHospital };
}

// ═══ ADMIN LOGIN — env-based OR real Admin collection, tries both ═══
async function adminLogin({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });

  const envEmail = process.env.ADMIN_EMAIL;
  const envPassword = process.env.ADMIN_PASSWORD;

  if (envEmail && envPassword && email === envEmail && password === envPassword) {
    const token = generateToken({ email, role: 'admin' });
    return { token, admin: { email, name: 'Administrator', role: 'admin' } };
  }

  const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
  if (admin) {
    const match = await admin.comparePassword(password);
    if (match) {
      admin.lastLogin = new Date();
      await admin.save();
      const token = generateToken({ id: admin._id, email: admin.email, role: 'admin' });
      return { token, admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role } };
    }
  }

  throw Object.assign(new Error('Invalid admin credentials'), { statusCode: 401 });
}

module.exports = { generateToken, sendDonorOTP, verifyDonorOTP, hospitalLogin, adminLogin };
