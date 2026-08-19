const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const Notification = require('../models/Notification');

const ApiError = require('../utils/ApiError');
const { HOSPITAL_STATUS } = require('../utils/constants');

// ─────────────────────────────────────────────
// HOSPITAL APPROVAL
// ─────────────────────────────────────────────

async function listHospitals({ status }) {
  const filter = status ? { status } : {};
  return Hospital.find(filter).select('-passwordHash').sort({ createdAt: -1 });
}

async function approveHospital({ hospitalId, adminId }) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw ApiError.notFound('Hospital not found');

  if (hospital.status === HOSPITAL_STATUS.APPROVED) {
    throw ApiError.conflict('Hospital is already approved');
  }

  hospital.status = HOSPITAL_STATUS.APPROVED;
  hospital.approvedBy = adminId;
  hospital.approvedAt = new Date();
  hospital.rejectionReason = null;
  hospital.suspendedReason = null;
  await hospital.save();

  return hospital;
}

async function rejectHospital({ hospitalId, reason }) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw ApiError.notFound('Hospital not found');

  hospital.status = HOSPITAL_STATUS.REJECTED;
  hospital.rejectionReason = reason || 'Not specified';
  await hospital.save();

  return hospital;
}

async function suspendHospital({ hospitalId, reason }) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw ApiError.notFound('Hospital not found');

  hospital.status = HOSPITAL_STATUS.SUSPENDED;
  hospital.suspendedReason = reason || 'Not specified';
  await hospital.save();

  return hospital;
}

// ─────────────────────────────────────────────
// DONOR MANAGEMENT
// ─────────────────────────────────────────────

async function listDonors({ bloodGroup, city, isSuspended }) {
  const filter = {};
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (city) filter.city = new RegExp(`^${city}$`, 'i');
  if (isSuspended !== undefined) filter.isSuspended = isSuspended === 'true';

  return Donor.find(filter).sort({ createdAt: -1 });
}

async function suspendDonor({ donorId, reason }) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found');

  donor.isSuspended = true;
  donor.suspendedReason = reason || 'Not specified';
  await donor.save();

  return donor;
}

async function unsuspendDonor({ donorId }) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw ApiError.notFound('Donor not found');

  donor.isSuspended = false;
  donor.suspendedReason = null;
  await donor.save();

  return donor;
}

// ─────────────────────────────────────────────
// DASHBOARD / ANALYTICS
// ─────────────────────────────────────────────

async function getDashboardStats() {
  const [
    totalDonors,
    totalHospitals,
    pendingHospitals,
    activeRequests,
    completedDonations,
    bloodGroupBreakdown,
  ] = await Promise.all([
    Donor.countDocuments({}),
    Hospital.countDocuments({ status: HOSPITAL_STATUS.APPROVED }),
    Hospital.countDocuments({ status: HOSPITAL_STATUS.PENDING }),
    Request.countDocuments({ status: { $in: ['pending', 'matched', 'accepted'] } }),
    Request.countDocuments({ status: 'completed' }),
    Donor.aggregate([{ $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]),
  ]);

  return {
    totalDonors,
    totalHospitals,
    pendingHospitals,
    activeRequests,
    completedDonations,
    bloodInventory: bloodGroupBreakdown.reduce((acc, g) => {
      acc[g._id] = g.count;
      return acc;
    }, {}),
  };
}

// ─────────────────────────────────────────────
// BROADCAST NOTIFICATIONS
// ─────────────────────────────────────────────

async function broadcastNotification({ adminId, title, message, targetRole, io }) {
  const notification = await Notification.create({
    title,
    message,
    targetRole: targetRole || 'all',
    createdBy: adminId,
  });

  if (io) {
    const event = 'notification:broadcast';
    if (!targetRole || targetRole === 'all') {
      io.emit(event, notification);
    } else {
      io.to(`role:${targetRole}`).emit(event, notification);
    }
  }

  return notification;
}

module.exports = {
  listHospitals,
  approveHospital,
  rejectHospital,
  suspendHospital,
  listDonors,
  suspendDonor,
  unsuspendDonor,
  getDashboardStats,
  broadcastNotification,
};
