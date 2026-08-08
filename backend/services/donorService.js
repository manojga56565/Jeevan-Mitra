const bcrypt = require('bcryptjs');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const cooldownService = require('./cooldownService');

async function getProfile(donorId) {
  const donor = await Donor.findById(donorId).select('-password -otpCode -otpExpiresAt');
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  await cooldownService.refreshCooldownIfElapsed(donor);
  return { donor, ...cooldownService.getCooldownInfo(donor) };
}

async function updateProfile(donorId, { name, email, city, availabilityStatus, district, homeTown, livingTown, emergencyContact, gender, dateOfBirth, profilePhotoUrl }) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });

  if (name) donor.name = name;
  if (email) donor.email = email;
  if (city) donor.city = city;
  if (availabilityStatus) donor.availabilityStatus = availabilityStatus;
  if (district) donor.district = district;
  if (homeTown) donor.homeTown = homeTown;
  if (livingTown) donor.livingTown = livingTown;
  if (emergencyContact) donor.emergencyContact = emergencyContact;
  if (gender) donor.gender = gender;
  if (dateOfBirth) donor.dateOfBirth = dateOfBirth;
  if (profilePhotoUrl) donor.profilePhotoUrl = profilePhotoUrl;

  await donor.save();
  return donor;
}

async function changePassword(donorId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await Donor.findByIdAndUpdate(donorId, { password: hash });
  return true;
}

async function toggleAvailability(donorId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  if (donor.cooldownUntil && new Date() < donor.cooldownUntil) {
    throw Object.assign(new Error('Cannot change availability while in cooldown'), { statusCode: 400 });
  }
  donor.availabilityStatus = donor.availabilityStatus === 'available' ? 'not available' : 'available';
  await donor.save();
  return donor.availabilityStatus;
}

async function deactivateAccount(donorId) {
  await Donor.findByIdAndUpdate(donorId, { isActive: false });
  return true;
}

async function getHistory(donorId) {
  const requests = await Request.find({ 'acceptedDonors.donor': donorId })
    .populate('hospitalId', 'hospitalName city phone')
    .sort({ createdAt: -1 });

  // Flatten to just this donor's own entry per request, for a clean history list
  return requests.map(r => {
    const entry = r.acceptedDonors.find(a => String(a.donor) === String(donorId));
    return {
      requestId: r._id,
      hospital: r.hospitalId,
      bloodGroup: r.bloodGroup,
      status: entry?.status,
      acceptedAt: entry?.acceptedAt,
      completedAt: entry?.completedAt,
      pointsEarned: entry?.status === 'completed' ? r.pointsEarned : 0
    };
  });
}

module.exports = { getProfile, updateProfile, changePassword, toggleAvailability, deactivateAccount, getHistory };
