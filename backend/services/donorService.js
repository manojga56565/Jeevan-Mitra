const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Request = require('../models/Request');
const ApiError = require('../utils/ApiError');
const cooldownService = require('./cooldownService');
const { MAX_MATCH_DISTANCE_METERS } = require('./matchingService');

async function getProfile(donorId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found');
  return donor;
}

async function updateProfile(donorId, updates) {
  const allowedFields = ['name', 'email', 'age', 'gender', 'address', 'city', 'district'];
  const payload = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }

  if (updates.latitude !== undefined && updates.longitude !== undefined) {
    payload.location = { type: 'Point', coordinates: [updates.longitude, updates.latitude] };
  }

  const donor = await Donor.findByIdAndUpdate(donorId, payload, {
    new: true,
    runValidators: true,
  });
  if (!donor) throw ApiError.notFound('Donor not found');
  return donor;
}

async function setAvailability(donorId, isAvailable) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found');

  if (isAvailable && donor.cooldownUntil && donor.cooldownUntil > new Date()) {
    throw ApiError.conflict(
      `You are still in your post-donation cooldown period (${cooldownService.remainingCooldownDays(donor)} day(s) remaining)`
    );
  }

  donor.isAvailable = isAvailable;
  await donor.save();
  return donor;
}

/**
 * Requests visible to this donor right now: open (pending/matched), same
 * blood group, within the same distance radius the Matching Engine uses,
 * from hospitals in good standing.
 */
async function getNearbyRequests(donorId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found');

  const hasLocation =
    donor.location?.coordinates && (donor.location.coordinates[0] !== 0 || donor.location.coordinates[1] !== 0);

  let hospitalIds = null;
  if (hasLocation) {
    const nearbyHospitals = await Hospital.find({
      status: 'approved',
      location: {
        $near: {
          $geometry: donor.location,
          $maxDistance: MAX_MATCH_DISTANCE_METERS,
        },
      },
    }).select('_id');
    hospitalIds = nearbyHospitals.map((h) => h._id);
  }

  const filter = {
    bloodGroup: donor.bloodGroup,
    status: { $in: ['pending', 'matched'] },
    ...(hospitalIds ? { hospital: { $in: hospitalIds } } : {}),
  };

  return Request.find(filter).populate('hospital', 'name city address location').sort({ urgency: -1, createdAt: -1 });
}

async function getDonationHistory(donorId) {
  return Request.find({ acceptedDonor: donorId, status: 'completed' })
    .populate('hospital', 'name city')
    .sort({ completedAt: -1 });
}

module.exports = { getProfile, updateProfile, setAvailability, getNearbyRequests, getDonationHistory };
