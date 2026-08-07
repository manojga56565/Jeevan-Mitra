const Donor = require('../models/Donor');
const notificationService = require('./notificationService');
const { COMPATIBLE_DONORS } = require('../config/constants');

/**
 * Finds donors eligible for a request:
 *  - Blood group: exact match, or compatible donor groups if matchingType is 'compatible'
 *  - Same city as the hospital (radius/geo search is a further enhancement —
 *    city match is what the current data model reliably supports)
 *  - isActive, availabilityStatus === 'available'
 *  - Not currently in cooldown
 */
async function findEligibleDonors(request) {
  const eligibleGroups = request.matchingType === 'compatible'
    ? (COMPATIBLE_DONORS[request.bloodGroup] || [request.bloodGroup])
    : [request.bloodGroup];

  const donors = await Donor.find({
    bloodGroup: { $in: eligibleGroups },
    city: request.hospitalCity,
    isActive: true,
    availabilityStatus: 'available',
    $or: [{ cooldownUntil: null }, { cooldownUntil: { $lte: new Date() } }]
  });

  return donors;
}

/**
 * Runs immediately after a request is created — finds eligible donors and
 * sends each one a notification/alert.
 */
async function matchAndNotify(request) {
  const donors = await findEligibleDonors(request);

  await Promise.all(donors.map(donor =>
    notificationService.create({
      recipientType: 'donor',
      recipientId: donor._id,
      type: 'blood_request',
      title: `🩸 ${request.urgency === 'emergency' ? 'EMERGENCY' : 'Blood'} request nearby`,
      message: `${request.hospitalName} needs ${request.bloodGroup} blood (${request.quantity} unit${request.quantity > 1 ? 's' : ''})`,
      relatedRequest: request._id,
      relatedHospital: request.hospitalId,
      responseStatus: 'pending'
    })
  ));

  return { matchedCount: donors.length, donors };
}

module.exports = { findEligibleDonors, matchAndNotify };
