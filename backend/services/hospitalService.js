const Hospital = require('../models/Hospital');
const Request = require('../models/Request');
const ApiError = require('../utils/ApiError');

async function getProfile(hospitalId) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw ApiError.notFound('Hospital not found');
  return hospital;
}

async function updateProfile(hospitalId, updates) {
  const allowedFields = ['name', 'phone', 'address', 'city', 'district', 'pincode'];
  const payload = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }

  if (updates.latitude !== undefined && updates.longitude !== undefined) {
    payload.location = {
      type: 'Point',
      coordinates: [updates.longitude, updates.latitude],
    };
  }

  const hospital = await Hospital.findByIdAndUpdate(hospitalId, payload, {
    new: true,
    runValidators: true,
  });
  if (!hospital) throw ApiError.notFound('Hospital not found');
  return hospital;
}

async function getDashboardStats(hospitalId) {
  const [pending, matched, accepted, completed, cancelled] = await Promise.all([
    Request.countDocuments({ hospital: hospitalId, status: 'pending' }),
    Request.countDocuments({ hospital: hospitalId, status: 'matched' }),
    Request.countDocuments({ hospital: hospitalId, status: 'accepted' }),
    Request.countDocuments({ hospital: hospitalId, status: 'completed' }),
    Request.countDocuments({ hospital: hospitalId, status: 'cancelled' }),
  ]);

  return {
    pendingRequests: pending,
    matchedRequests: matched,
    acceptedRequests: accepted,
    completedDonations: completed,
    cancelledRequests: cancelled,
  };
}

module.exports = { getProfile, updateProfile, getDashboardStats };
