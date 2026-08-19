const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Request = require('../models/Request');
const ApiError = require('../utils/ApiError');
const cooldownService = require('./cooldownService');
const notificationService = require('./notificationService');

const MAX_MATCH_DISTANCE_METERS = 30000; // 30km radius
const MAX_MATCHES_TO_NOTIFY = 20; // cap notification fan-out per request

/**
 * Finds donors eligible for a request, nearest-first.
 * Availability, suspension, and cooldown are DB-level filters (fast).
 * Distance ordering comes from the $near geo query itself.
 */
async function findEligibleDonors({ bloodGroup, coordinates }) {
  const query = {
    bloodGroup,
    isAvailable: true,
    isSuspended: false,
    $or: [{ cooldownUntil: null }, { cooldownUntil: { $lte: new Date() } }],
  };

  if (coordinates && coordinates[0] !== 0 && coordinates[1] !== 0) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: MAX_MATCH_DISTANCE_METERS,
      },
    };
  }

  const donors = await Donor.find(query).limit(MAX_MATCHES_TO_NOTIFY);

  // Defense in depth: re-check eligibility in application code too, in case
  // the DB filter and cooldownService logic ever drift apart.
  return donors.filter(cooldownService.isEligible);
}

/**
 * Runs the matching engine against a freshly created request.
 * On finding donors: flips request to 'matched' and notifies them.
 * On finding none: leaves request 'pending' so it can be retried later
 * (e.g. by a scheduled re-match job - not built yet).
 */
async function matchRequest({ requestId, io }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  const hospital = await Hospital.findById(request.hospital);
  if (!hospital) throw ApiError.notFound('Hospital not found for this request');

  const donors = await findEligibleDonors({
    bloodGroup: request.bloodGroup,
    coordinates: hospital.location?.coordinates,
  });

  if (donors.length === 0) {
    return { request, matchedDonors: [] };
  }

  request.status = 'matched';
  await request.save();

  await notificationService.notifyUsers({
    userIds: donors.map((d) => d._id),
    recipientModel: 'Donor',
    title: 'Blood donation needed nearby',
    message: `${hospital.name} needs ${request.unitsNeeded} unit(s) of ${request.bloodGroup} blood (${request.urgency}).`,
    io,
    event: 'request:matched',
  });

  return { request, matchedDonors: donors };
}

module.exports = { findEligibleDonors, matchRequest, MAX_MATCH_DISTANCE_METERS };
