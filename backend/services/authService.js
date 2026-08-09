const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const { generateOTP, getExpiryTimestamp, isExpired } = require('../utils/otp');
const { normalizePhone } = require('../utils/normalizePhone');
const logger = require('../utils/logger');

// In-memory OTP store. Fine for a college project / single-instance deploy;
// would move to Redis for a real multi-instance production deployment.
const otpStore = {};

// Separate in-memory store for password-reset codes (hospital/admin), same
// mock-code pattern as donor OTP since there's no real email/SMS provider yet.
const resetStore = {};

function calcAgeFromDOB(dob) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function validateDOB(dob) {
  if (!dob) return; // optional field — fine if not provided at all
  const d = new Date(dob);
  if (isNaN(d.getTime())) throw Object.assign(new Error('Invalid date of birth'), { statusCode: 400 });
  if (d.getTime() > Date.now()) throw Object.assign(new Error('Date of birth cannot be in the future'), { statusCode: 400 });
}

function generateToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// ═══ DONOR — MOCK OTP (MSG91 disabled — always returns the OTP in the
// response so the frontend can show it directly, no real SMS sent) ═══
async function sendDonorOTP({ phone, name, city, bloodGroup, age, weight, homeTown, livingTown, gender, emergencyContact, dateOfBirth, district, profilePhotoUrl }) {
  if (!phone) throw Object.assign(new Error('Phone is required'), { statusCode: 400 });
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length !== 10) throw Object.assign(new Error('Enter a valid 10-digit phone number'), { statusCode: 400 });

  validateDOB(dateOfBirth);

  // A payload with real registration fields means "I'm signing up" — a
  // bare phone number means "quick login, I already have an account".
  // These get different rules below (see verifyDonorOTP): registering on
  // an existing number should not silently log them in, and quick-login
  // on an unknown number should not silently create one.
  const isRegistrationAttempt = Boolean(name && bloodGroup && age && weight);

  const existingDonor = await Donor.findOne({ phone: normalizedPhone });
  if (isRegistrationAttempt && existingDonor) {
    throw Object.assign(new Error('Account Already Exists — this mobile number is already registered. Please login instead.'), {
      statusCode: 409, code: 'ACCOUNT_ALREADY_EXISTS'
    });
  }
  if (!isRegistrationAttempt && !existingDonor) {
    throw Object.assign(new Error("Account Not Found — we couldn't find a donor account with this mobile number. Please register first."), {
      statusCode: 404, code: 'ACCOUNT_NOT_FOUND'
    });
  }

  const resolvedAge = age || (dateOfBirth ? calcAgeFromDOB(dateOfBirth) : undefined);

  const otp = generateOTP();
  otpStore[normalizedPhone] = {
    otp,
    name, city, bloodGroup, age: resolvedAge, weight, homeTown, livingTown, gender, emergencyContact,
    dateOfBirth, district, profilePhotoUrl,
    expires: getExpiryTimestamp()
  };

  logger.info(`[MOCK OTP] ${normalizedPhone} -> ${otp}`);
  return { otp }; // returned directly since there's no real SMS provider right now
}

async function verifyDonorOTP({ phone, otp }) {
  const normalizedPhone = normalizePhone(phone);
  const record = otpStore[normalizedPhone];
  if (!record) throw Object.assign(new Error('OTP expired or not requested'), { statusCode: 400 });
  if (record.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
  if (isExpired(record.expires)) {
    delete otpStore[normalizedPhone];
    throw Object.assign(new Error('OTP expired'), { statusCode: 400 });
  }

  let donor = await Donor.findOne({ phone: normalizedPhone });

  if (!donor) {
    // sendDonorOTP already guarantees we only get here for a genuine
    // registration attempt (an unknown number with full registration
    // fields) — a bare quick-login on an unknown number never reaches
    // this point, so there's no silent-account-creation-during-login.
    donor = new Donor({
      name: record.name || 'Donor',
      phone: normalizedPhone,
      city: record.city || 'Telangana',
      bloodGroup: record.bloodGroup || 'O+',
      age: record.age || 18,
      weight: record.weight || 50,
      dateOfBirth: record.dateOfBirth || null,
      gender: record.gender || '',
      district: record.district || '',
      homeTown: record.homeTown || '',
      livingTown: record.livingTown || '',
      emergencyContact: record.emergencyContact || '',
      profilePhotoUrl: record.profilePhotoUrl || '',
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

  delete otpStore[normalizedPhone];

  const token = generateToken({ id: donor._id, phone: donor.phone, role: 'donor' });
  const safeDonor = donor.toObject();
  delete safeDonor.password;

  return { token, donor: safeDonor };
}

// ═══ HOSPITAL LOGIN ═══
async function hospitalLogin({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });

  const hospital = await Hospital.findOne({ email: email.toLowerCase() });
  if (!hospital) throw Object.assign(new Error('Hospital Account Not Found — please register your hospital first, or contact admin.'), { statusCode: 404, code: 'ACCOUNT_NOT_FOUND' });
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

// ═══ FORGOT / RESET PASSWORD — hospital or admin, mock code (no real email
// provider yet, so the code is returned directly like the donor mock OTP) ═══
async function sendPasswordResetCode({ role, identifier }) {
  if (!role || !identifier) throw Object.assign(new Error('Role and identifier are required'), { statusCode: 400 });
  if (!['hospital', 'admin'].includes(role)) throw Object.assign(new Error('Invalid role'), { statusCode: 400 });

  const Model = role === 'hospital' ? Hospital : Admin;
  const account = await Model.findOne({ email: identifier.toLowerCase() });
  if (!account) throw Object.assign(new Error('No account found with that email'), { statusCode: 404 });

  const code = generateOTP();
  resetStore[`${role}:${identifier.toLowerCase()}`] = { code, expires: getExpiryTimestamp() };

  logger.info(`[MOCK RESET CODE] ${role}:${identifier} -> ${code}`);
  return { code }; // returned directly since there's no real email/SMS provider right now
}

async function resetPassword({ role, identifier, code, newPassword }) {
  if (!role || !identifier || !code || !newPassword) {
    throw Object.assign(new Error('Role, identifier, code, and new password are required'), { statusCode: 400 });
  }
  if (newPassword.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });

  const key = `${role}:${identifier.toLowerCase()}`;
  const record = resetStore[key];
  if (!record) throw Object.assign(new Error('Reset code expired or not requested'), { statusCode: 400 });
  if (record.code !== code) throw Object.assign(new Error('Invalid reset code'), { statusCode: 400 });
  if (isExpired(record.expires)) {
    delete resetStore[key];
    throw Object.assign(new Error('Reset code expired'), { statusCode: 400 });
  }

  const Model = role === 'hospital' ? Hospital : Admin;
  const account = await Model.findOne({ email: identifier.toLowerCase() });
  if (!account) throw Object.assign(new Error('Account not found'), { statusCode: 404 });

  account.password = newPassword; // pre-save hook hashes it
  await account.save();
  delete resetStore[key];

  return true;
}

module.exports = {
  generateToken, sendDonorOTP, verifyDonorOTP, hospitalLogin, adminLogin,
  sendPasswordResetCode, resetPassword
};
