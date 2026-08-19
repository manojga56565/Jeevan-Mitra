const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true, trim: true },
  registrationNumber: { type: String, trim: true },
  address: String,
  city: String,
  pincode: String,
  contactPerson: String,
  designation: String,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: String,
  password: { type: String, required: true, select: false },
  licenseDocument: String,

  latitude: Number,
  longitude: Number,

  isVerified: { type: Boolean, default: false }, // admin approval gate

  resetCode: { type: String, select: false },
  resetCodeExpires: { type: Date, select: false }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
