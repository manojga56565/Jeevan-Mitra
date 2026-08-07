const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');

async function getProfile(hospitalId) {
  const hospital = await Hospital.findById(hospitalId).select('-password');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  return hospital;
}

async function updateProfile(hospitalId, { hospitalName, phone, city, email, address, emergencyContact, landmark, googleMapsLink }) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });

  if (hospitalName !== undefined) hospital.hospitalName = hospitalName;
  if (phone !== undefined) hospital.phone = phone;
  if (city !== undefined) hospital.city = city;
  if (email !== undefined) hospital.email = email;
  if (address !== undefined) hospital.address = address;
  if (emergencyContact !== undefined) hospital.emergencyContact = emergencyContact;
  if (landmark !== undefined) hospital.landmark = landmark;
  if (googleMapsLink !== undefined) hospital.googleMapsLink = googleMapsLink;

  await hospital.save();
  const safe = hospital.toObject();
  delete safe.password;
  return safe;
}

async function changePassword(hospitalId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await Hospital.findByIdAndUpdate(hospitalId, { password: hash });
  return true;
}

module.exports = { getProfile, updateProfile, changePassword };
