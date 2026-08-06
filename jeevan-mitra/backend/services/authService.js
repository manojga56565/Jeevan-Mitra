const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Donor = require('../models/Donor');

const otpStore = {};

// =========================
// ADMIN LOGIN
// =========================
exports.adminLogin = async (email, password) => {
  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    throw new Error('Invalid admin credentials');
  }

  const token = jwt.sign(
    {
      email,
      role: 'admin'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  return {
    success: true,
    token,
    user: {
      email,
      role: 'admin'
    }
  };
};

// =========================
// SEND OTP
// =========================
exports.sendOTP = async (data) => {

  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  otpStore[data.phone] = {
    otp,
    data,
    expires: Date.now() + 5 * 60 * 1000
  };

  return {
    success: true,
    message: "OTP Sent Successfully",
    otp // Mock OTP for development
  };
};

// =========================
// VERIFY OTP
// =========================
exports.verifyOTP = async (phone, otp) => {

  const record = otpStore[phone];

  if (!record) {
    throw new Error("OTP Expired");
  }

  if (record.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  let donor = await Donor.findOne({ phone });

  if (!donor) {

    donor = new Donor({
      name: record.data.fullName || "User",
      phone,
      city: record.data.city || "Hyderabad",
      bloodGroup: record.data.bloodGroup || "O+",
      age: record.data.age || 18,
      weight: 50,
      password: crypto.randomBytes(16).toString("hex")
    });

    await donor.save();
  }

  delete otpStore[phone];

  const token = jwt.sign(
    {
      id: donor._id,
      role: "donor"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );

  const safeDonor = donor.toObject();
  delete safeDonor.password;

  return {
    success: true,
    message: "Login Successful",
    token,
    donor: safeDonor
  };
};

// =========================
// LOGOUT
// =========================
exports.logout = async () => {
  return {
    success: true,
    message: "Logged out successfully"
  };
};