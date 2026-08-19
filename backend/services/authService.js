const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Admin = require('../models/Admin');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const OtpToken = require('../models/OtpToken');

const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');
const { ROLES, HOSPITAL_STATUS } = require('../utils/constants');

const SALT_ROUNDS = 10;
const OTP_TTL_MINUTES = 5;

// ─────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────

async function loginAdmin({ email, password }) {
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!admin) throw ApiError.unauthorized('Invalid email or password');

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken({ id: admin._id, role: ROLES.ADMIN });
  return {
    token,
    user: { id: admin._id, name: admin.name, email: admin.email, role: ROLES.ADMIN },
  };
}

// ─────────────────────────────────────────────
// HOSPITAL
// ─────────────────────────────────────────────

async function registerHospital(payload) {
  const existing = await Hospital.findOne({ email: payload.email.toLowerCase() });
  if (existing) throw ApiError.conflict('A hospital with this email already exists');

  const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

  const hospital = await Hospital.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    phone: payload.phone,
    registrationNumber: payload.registrationNumber,
    address: payload.address,
    city: payload.city,
    district: payload.district,
    pincode: payload.pincode,
    location: {
      type: 'Point',
      coordinates: [payload.longitude || 0, payload.latitude || 0],
    },
    status: HOSPITAL_STATUS.PENDING,
  });

  return {
    id: hospital._id,
    name: hospital.name,
    email: hospital.email,
    status: hospital.status,
  };
}

async function loginHospital({ email, password }) {
  const hospital = await Hospital.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!hospital) throw ApiError.unauthorized('Invalid email or password');

  const isMatch = await bcrypt.compare(password, hospital.passwordHash);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  if (hospital.status === HOSPITAL_STATUS.PENDING) {
    throw ApiError.forbidden('Your hospital account is pending admin approval');
  }
  if (hospital.status === HOSPITAL_STATUS.REJECTED) {
    throw new ApiError(403, 'Your hospital registration was rejected', {
      reason: hospital.rejectionReason,
    });
  }
  if (hospital.status === HOSPITAL_STATUS.SUSPENDED) {
    throw new ApiError(403, 'Your hospital account is suspended', {
      reason: hospital.suspendedReason,
    });
  }

  const token = signToken({ id: hospital._id, role: ROLES.HOSPITAL });
  return {
    token,
    user: {
      id: hospital._id,
      name: hospital.name,
      email: hospital.email,
      status: hospital.status,
      role: ROLES.HOSPITAL,
    },
  };
}

// ─────────────────────────────────────────────
// DONOR - Mock/Real OTP login
// ─────────────────────────────────────────────

function generateOtpCode() {
  if (process.env.MOCK_OTP === 'true') {
    return process.env.MOCK_OTP_CODE || '123456';
  }
  // Real OTP path (future): cryptographically random 6-digit code
  return crypto.randomInt(100000, 999999).toString();
}

async function requestDonorOtp({ phone }) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OtpToken.create({ phone, code, expiresAt });

  // TODO(real OTP): call SMS provider here instead of returning the code.
  // Currently mock - notificationService will log/send this.
  return {
    phone,
    expiresInMinutes: OTP_TTL_MINUTES,
    // Only ever surface the code in the response when mocking.
    ...(process.env.MOCK_OTP === 'true' ? { devOtp: code } : {}),
  };
}

async function verifyDonorOtp({ phone, code, registrationData }) {
  const otpDoc = await OtpToken.findOne({ phone, consumed: false }).sort({ _id: -1 });

  if (!otpDoc) throw ApiError.badRequest('No OTP requested for this number');
  if (otpDoc.expiresAt < new Date()) throw ApiError.badRequest('OTP has expired, request a new one');
  if (otpDoc.code !== code) throw ApiError.badRequest('Incorrect OTP');

  otpDoc.consumed = true;
  await otpDoc.save();

  let donor = await Donor.findOne({ phone });

  if (!donor) {
    // First-time donor - registrationData must be provided by the client
    // (collected right after OTP verification in the onboarding flow).
    if (!registrationData || !registrationData.name || !registrationData.bloodGroup) {
      throw ApiError.unprocessable('New donor - name and blood group are required to complete signup', {
        code: 'NEW_DONOR_PROFILE_REQUIRED',
      });
    }
    donor = await Donor.create({
      phone,
      name: registrationData.name,
      bloodGroup: registrationData.bloodGroup,
      age: registrationData.age,
      gender: registrationData.gender,
      city: registrationData.city,
      district: registrationData.district,
      location: registrationData.latitude
        ? { type: 'Point', coordinates: [registrationData.longitude || 0, registrationData.latitude || 0] }
        : undefined,
    });
  }

  if (donor.isSuspended) {
    throw new ApiError(403, 'Your donor account is suspended', { reason: donor.suspendedReason });
  }

  const token = signToken({ id: donor._id, role: ROLES.DONOR });
  return {
    token,
    user: {
      id: donor._id,
      name: donor.name,
      phone: donor.phone,
      bloodGroup: donor.bloodGroup,
      role: ROLES.DONOR,
    },
  };
}

module.exports = {
  loginAdmin,
  registerHospital,
  loginHospital,
  requestDonorOtp,
  verifyDonorOtp,
};
