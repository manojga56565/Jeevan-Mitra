const Request = require('../models/Request');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const matchingService = require('./matchingService');
const notificationService = require('./notificationService');
const rewardService = require('./rewardService');
const cooldownService = require('./cooldownService');
const mapsService = require('./mapsService');
const {
  DEFAULT_REQUEST_EXPIRY_HOURS, MIN_REQUEST_EXPIRY_HOURS, MAX_REQUEST_EXPIRY_HOURS,
  DEFAULT_MAP_COORDS
} = require('../config/constants');

// ═══ CREATE ═══
async function createRequest(hospitalId, data) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });

  // Don't let a hospital create unlimited duplicate requests for the same
  // patient — if there's already an open request for this exact patient
  // reference + blood group, point them at updating that one instead.
  if (data.patientReference) {
    const existingActive = await Request.findOne({
      hospitalId: hospital._id,
      patientReference: data.patientReference,
      bloodGroup: data.bloodGroup,
      status: { $in: ['pending', 'accepted'] }
    });
    if (existingActive) {
      throw Object.assign(new Error('Active Request Already Exists — there is already an open request for this patient and blood group. View or update it instead of creating a new one.'), {
        statusCode: 409, code: 'ACTIVE_REQUEST_EXISTS', existingRequestId: existingActive._id
      });
    }
  }

  const rawHours = parseInt(data.expiryHours);
  const expiryHours = (!isNaN(rawHours) && rawHours >= MIN_REQUEST_EXPIRY_HOURS && rawHours <= MAX_REQUEST_EXPIRY_HOURS)
    ? rawHours : DEFAULT_REQUEST_EXPIRY_HOURS;

  const lat = data.lat !== undefined ? parseFloat(data.lat) : DEFAULT_MAP_COORDS.lat;
  const lng = data.lng !== undefined ? parseFloat(data.lng) : DEFAULT_MAP_COORDS.lng;

  const request = await Request.create({
    hospitalId: hospital._id,
    hospitalName: hospital.hospitalName,
    hospitalCity: hospital.city,
    hospitalPhone: hospital.phone,
    bloodGroup: data.bloodGroup,
    matchingType: data.matchingType === 'compatible' ? 'compatible' : 'exact',
    urgency: data.urgency || 'normal',
    quantity: data.quantity || 1,
    patientName: data.patientName || '',
    patientAge: data.patientAge || null,
    patientGender: data.patientGender || '',
    patientReason: data.patientReason || '',
    patientReference: data.patientReference || '',
    department: data.department || '',
    contactPerson: data.contactPerson || '',
    contactNumber: data.contactNumber || '',
    doctorRefNo: data.doctorRefNo || '',
    doctorName: data.doctorName || '',
    districts: data.districts || [],
    searchRadiusKm: data.searchRadiusKm || 20,
    requiredBefore: data.requiredBefore || null,
    expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    location: { type: 'Point', coordinates: [lng, lat] }
  });

  // findByIdAndUpdate with $inc, not hospital.save() — saving the full
  // document here would re-validate every field on the hospital's profile
  // (contactPerson, address, etc.), which has nothing to do with posting
  // a request and would wrongly fail if that profile is incomplete.
  await Hospital.findByIdAndUpdate(hospital._id, { $inc: { totalRequests: 1 } });

  const { matchedCount } = await matchingService.matchAndNotify(request);

  return { request, matchedDonors: matchedCount };
}

// ═══ DONOR FEED ═══
async function getDonorFeed(donorId, { bloodGroup } = {}) {
  const filter = {
    status: 'pending',
    expiresAt: { $gt: new Date() } // expired requests auto-excluded, not just visually marked
  };
  if (bloodGroup) filter.bloodGroup = bloodGroup;

  const requests = await Request.find(filter).sort({ urgency: -1, createdAt: -1 });

  // Exclude requests this donor already accepted, and ones with no open slots
  const visible = requests.filter(r => {
    const alreadyAccepted = r.acceptedDonors.some(a => String(a.donor) === String(donorId));
    return !alreadyAccepted && r.remainingSlots > 0;
  });

  return visible.map(r => ({
    ...r.toObject(),
    acceptedCount: r.acceptedDonors.filter(a => a.status !== 'no_show').length,
    mapsLink: mapsService.buildSearchLink(r.location.coordinates[1], r.location.coordinates[0])
  }));
}

// ═══ ACCEPT (multi-unit aware) ═══
async function acceptRequest(donorId, requestId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });

  await cooldownService.refreshCooldownIfElapsed(donor);
  if (!donor.isEligibleToDonate()) {
    throw Object.assign(new Error(`You can donate again after ${donor.remainingCooldownDays()} day(s).`), {
      statusCode: 400, cooldown: true, remainingDays: donor.remainingCooldownDays()
    });
  }

  const request = await Request.findById(requestId);
  if (!request) throw Object.assign(new Error('Blood request not found'), { statusCode: 404 });
  if (request.status !== 'pending') throw Object.assign(new Error('This request is no longer accepting donors'), { statusCode: 400 });
  if (request.remainingSlots <= 0) throw Object.assign(new Error('All slots for this request are already filled'), { statusCode: 400 });

  const alreadyAccepted = request.acceptedDonors.some(a => String(a.donor) === String(donorId));
  if (alreadyAccepted) throw Object.assign(new Error('You have already accepted this request'), { statusCode: 400 });

  const [lng, lat] = request.location.coordinates;
  const navigationUrl = mapsService.buildDirectionsLink(lat, lng);

  request.acceptedDonors.push({ donor: donor._id, navigationUrl });
  if (request.remainingSlots - 1 <= 0) request.status = 'accepted'; // all slots now filled
  await request.save();

  await notificationService.create({
    recipientType: 'hospital',
    recipientId: request.hospitalId,
    type: 'request_accepted',
    title: '✅ Donor accepted your request',
    message: `${donor.name} (${donor.bloodGroup}) accepted your blood request`,
    relatedRequest: request._id,
    relatedDonor: donor._id
  });

  return { request, navigationUrl, hospitalName: request.hospitalName };
}

// ═══ COMPLETE (per-donor, via QR scan) ═══
async function completeDonation(requestId, donorId) {
  const request = await Request.findById(requestId);
  if (!request) throw Object.assign(new Error('Blood request not found'), { statusCode: 404 });

  const entry = request.acceptedDonors.find(a => String(a.donor) === String(donorId) && a.status === 'accepted');
  if (!entry) throw Object.assign(new Error('This donor has not accepted this request, or has already completed it'), { statusCode: 400 });

  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });

  entry.status = 'completed';
  entry.completedAt = new Date();

  donor.startCooldown();
  donor.totalDonations += 1;
  await rewardService.awardPoints(donor, request.pointsEarned || 10);

  const allDone = request.acceptedDonors.every(a => a.status === 'completed' || a.status === 'no_show');
  if (allDone) request.status = 'completed';

  await Promise.all([request.save(), donor.save()]);

  await notificationService.create({
    recipientType: 'donor',
    recipientId: donor._id,
    type: 'donation_completed',
    title: '🎉 Donation completed!',
    message: `Thank you for donating at ${request.hospitalName}. You earned ${request.pointsEarned} points. Your next eligible date is ${donor.nextEligibleDate.toDateString()}.`,
    relatedRequest: request._id,
    relatedHospital: request.hospitalId
  });

  return { request, donor };
}

// ═══ HOSPITAL'S OWN REQUESTS ═══
async function getHospitalRequests(hospitalId) {
  const requests = await Request.find({ hospitalId }).populate('acceptedDonors.donor', 'name phone bloodGroup').sort({ createdAt: -1 });
  return requests;
}

// ═══ DELETE (hospital, own pending request only) ═══
async function deleteRequest(hospitalId, requestId) {
  const request = await Request.findById(requestId);
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  if (String(request.hospitalId) !== String(hospitalId)) {
    throw Object.assign(new Error('You can only delete your own requests'), { statusCode: 403 });
  }
  await Request.findByIdAndDelete(requestId);
  return true;
}

// ═══ ADMIN — all requests ═══
async function getAllRequests() {
  return Request.find().populate('hospitalId', 'hospitalName city').sort({ createdAt: -1 });
}

async function adminDeleteRequest(requestId) {
  const deleted = await Request.findByIdAndDelete(requestId);
  if (!deleted) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  return true;
}

async function adminCancelRequest(requestId) {
  const request = await Request.findByIdAndUpdate(requestId, { $set: { status: 'cancelled' } }, { new: true });
  if (!request) throw Object.assign(new Error('Request not found'), { statusCode: 404 });
  return request;
}

module.exports = {
  createRequest, getDonorFeed, acceptRequest, completeDonation,
  getHospitalRequests, deleteRequest, getAllRequests, adminDeleteRequest, adminCancelRequest
};
