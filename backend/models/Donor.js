const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, select: false }, // set once donor does self password login (optional; OTP is primary)

  dateOfBirth: Date,
  age: Number,
  gender: { type: String, enum: ['m', 'f', 'o'] },
  weight: Number,

  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], index: true },

  district: String,
  city: String,           // living town — used as the general "location" field
  homeTown: String,
  livingTown: String,
  emergencyContact: String,

  profilePhotoUrl: String,

  // Secure QR identifier — the QR code encodes ONLY this opaque token, never
  // name/bloodGroup/etc. Hospital scan flow looks the donor up by this token.
  qrToken: { type: String, unique: true, sparse: true, index: true },

  points: { type: Number, default: 0 },
  totalDonations: { type: Number, default: 0 },
  lastDonationDate: Date,

  isActive: { type: Boolean, default: true },

  // Mock-OTP auth fields
  otpCode: { type: String, select: false },
  otpExpires: { type: Date, select: false },

  // Password reset (mock code flow)
  resetCode: { type: String, select: false },
  resetCodeExpires: { type: Date, select: false }
}, { timestamps: true });

donorSchema.virtual('eligibleNow').get(function () {
  if (!this.lastDonationDate) return true;
  const days = (Date.now() - new Date(this.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 90;
});
donorSchema.virtual('nextEligibleDate').get(function () {
  if (!this.lastDonationDate) return null;
  return new Date(new Date(this.lastDonationDate).getTime() + 90 * 24 * 60 * 60 * 1000);
});
donorSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Donor', donorSchema);
