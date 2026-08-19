const Request = require('../models/Request');
const Hospital = require('../models/Hospital');
const ApiError = require('../utils/ApiError');
const { HOSPITAL_STATUS } = require('../utils/constants');
const matchingService = require('./matchingService');
const notificationService = require('./notificationService');
const qrService = require('./qrService');
const rewardService = require('./rewardService');
const cooldownService = require('./cooldownService');
const Donor = require('../models/Donor');

/**
 * Creates a blood request on behalf of a hospital.
 * Re-checks hospital status from the DB (not just the JWT) so a hospital
 * suspended mid-session can't keep creating requests until its token expires.
 */
async function createRequest({ hospitalId, bloodGroup, unitsNeeded, urgency, notes, io }) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw ApiError.notFound('Hospital not found');
  if (hospital.status !== HOSPITAL_STATUS.APPROVED) {
    throw ApiError.forbidden('Only approved hospitals can create blood requests');
  }

  const request = await Request.create({
    hospital: hospitalId,
    bloodGroup,
    unitsNeeded,
    urgency: urgency || 'normal',
    notes: notes || '',
    status: 'pending',
  });

  // Attempt an immediate match. If no eligible donors are found right now,
  // the request just stays 'pending' - it isn't a failure of request creation.
  const { request: updatedRequest, matchedDonors } = await matchingService.matchRequest({
    requestId: request._id,
    io,
  });

  return { request: updatedRequest, matchedDonorCount: matchedDonors.length };
}

async function listRequestsForHospital({ hospitalId, status }) {
  const filter = { hospital: hospitalId };
  if (status) filter.status = status;
  return Request.find(filter).sort({ createdAt: -1 });
}

async function getRequestById({ hospitalId, requestId, isAdmin }) {
  const request = await Request.findById(requestId)
    .populate('hospital', 'name city')
    .populate('acceptedDonor', 'name phone bloodGroup');

  if (!request) throw ApiError.notFound('Request not found');

  if (!isAdmin && String(request.hospital._id) !== String(hospitalId)) {
    throw ApiError.forbidden('This request does not belong to your hospital');
  }

  return request;
}

async function cancelRequest({ hospitalId, requestId }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (String(request.hospital) !== String(hospitalId)) {
    throw ApiError.forbidden('This request does not belong to your hospital');
  }

  if (!['pending', 'matched'].includes(request.status)) {
    throw ApiError.conflict(`Cannot cancel a request that is already ${request.status}`);
  }

  request.status = 'cancelled';
  await request.save();
  return request;
}

/**
 * A donor accepts a request that was matched to them. First donor to
 * accept wins - status must still be 'matched' at the moment of accept,
 * which prevents two donors both being confirmed for the same request.
 */
async function acceptRequestAsDonor({ donorId, requestId, io }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (request.status !== 'matched') {
    throw ApiError.conflict(
      request.status === 'accepted'
        ? 'Another donor has already accepted this request'
        : `This request is not currently open for acceptance (status: ${request.status})`
    );
  }

  request.status = 'accepted';
  request.acceptedDonor = donorId;
  request.acceptedAt = new Date();
  await request.save();

  await notificationService.notifyUsers({
    userIds: [request.hospital],
    recipientModel: 'Hospital',
    title: 'Donor accepted your request',
    message: `A donor has accepted your ${request.bloodGroup} blood request and is on the way.`,
    io,
    event: 'request:accepted',
  });

  return request;
}

// ─────────────────────────────────────────────
// QR VERIFICATION
// ─────────────────────────────────────────────

async function generateQrForRequest({ hospitalId, requestId }) {
  return qrService.generateQrCode({ hospitalId, requestId });
}

async function verifyQrAsDonor({ donorId, requestId, code }) {
  return qrService.verifyQrCode({ donorId, requestId, code });
}

// ─────────────────────────────────────────────
// COMPLETION - rewards + cooldown applied together
// ─────────────────────────────────────────────

/**
 * Hospital confirms the donation actually happened. Requires the QR step
 * to have already been verified - a hospital can't complete a donation
 * that was never scanned. On completion: request -> 'completed', donor
 * gets reward points/badges, donor enters the 60-day cooldown.
 */
async function completeRequest({ hospitalId, requestId, io }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (String(request.hospital) !== String(hospitalId)) {
    throw ApiError.forbidden('This request does not belong to your hospital');
  }
  if (request.status !== 'accepted') {
    throw ApiError.conflict(`Request must be accepted before it can be completed (status: ${request.status})`);
  }
  if (!request.qrVerifiedAt) {
    throw ApiError.conflict('Donor must complete QR verification before the donation can be confirmed');
  }

  const donor = await Donor.findById(request.acceptedDonor);
  if (!donor) throw ApiError.notFound('Accepted donor not found');

  const { pointsAwarded, newBadges } = await rewardService.grantReward(donor);
  cooldownService.applyCooldownToDonor(donor);
  await donor.save();

  request.status = 'completed';
  request.completedAt = new Date();
  await request.save();

  await notificationService.notifyUsers({
    userIds: [donor._id],
    recipientModel: 'Donor',
    title: 'Donation completed - thank you!',
    message: `You earned ${pointsAwarded} points${newBadges.length ? ` and the badge(s): ${newBadges.join(', ')}` : ''}. You're in cooldown for the next 60 days.`,
    io,
    event: 'donation:completed',
  });

  return { request, donor, pointsAwarded, newBadges };
}

module.exports = {
  createRequest,
  listRequestsForHospital,
  getRequestById,
  cancelRequest,
  acceptRequestAsDonor,
  generateQrForRequest,
  verifyQrAsDonor,
  completeRequest,
};
