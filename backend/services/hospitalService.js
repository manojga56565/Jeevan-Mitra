const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');

async function getProfile(hospitalId) {
  const hospital = await Hospital.findById(hospitalId).select('-password');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  return hospital;
}

async function updateProfile(hospitalId, { hospitalName, phone, city, email, address, emergencyContact, landmark, googleMapsLink }) {
  const updates = {};
  if (hospitalName !== undefined) updates.hospitalName = hospitalName;
  if (phone !== undefined) updates.phone = phone;
  if (city !== undefined) updates.city = city;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
  if (landmark !== undefined) updates.landmark = landmark;
  if (googleMapsLink !== undefined) updates.googleMapsLink = googleMapsLink;

  // findByIdAndUpdate with { runValidators: true, context: 'query' } only
  // validates the fields being changed — not hospital.save(), which would
  // re-validate every required field on the document (including ones this
  // hospital was created without) and block an otherwise-valid partial edit.
  const hospital = await Hospital.findByIdAndUpdate(hospitalId, updates, {
    new: true, runValidators: true, context: 'query'
  }).select('-password');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  return hospital.toObject();
}

async function changePassword(hospitalId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await Hospital.findByIdAndUpdate(hospitalId, { password: hash });
  return true;
}

// Manual donor lookup by phone — used at hospital check-in when QR scanning
// isn't available. Deliberately returns only the fields a front-desk check
// actually needs, not the full donor record.
async function lookupDonorByPhone(phone) {
  const Donor = require('../models/Donor');
  // Donors are stored as plain 10-digit numbers, but the blueprint frontend
  // sends "+91XXXXXXXXXX" — strip any country code / non-digits first so
  // the two actually match.
  const normalized = String(phone).replace(/\D/g, '').slice(-10);
  const donor = await Donor.findOne({ phone: normalized }).select('name phone city bloodGroup points totalDonations isActive');
  if (!donor) throw Object.assign(new Error('No donor found with that phone number'), { statusCode: 404 });
  return donor;
}

module.exports = { getProfile, updateProfile, changePassword, lookupDonorByPhone };
