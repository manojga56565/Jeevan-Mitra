const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { isEligibleNow } = require('../services/cooldownService');
const { pointsForDonation } = require('../services/rewardService');
const { donorGroupsThatCanFulfil } = require('../services/matchingService');
const { notifyDonorsByBloodGroup, notifyDonor } = require('../services/notificationService');

// GET /api/hospitals/profile
exports.getProfile = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.user.id);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (err) { next(err); }
};

// PUT /api/hospitals/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['hospitalName', 'address', 'city', 'pincode', 'contactPerson', 'designation', 'phone', 'latitude', 'longitude'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const hospital = await Hospital.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, hospital });
  } catch (err) { next(err); }
};

// PUT /api/hospitals/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 10);
    await Hospital.findByIdAndUpdate(req.user.id, { password: hashed });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};

// GET /api/hospitals/requests — this hospital's own requests
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({ hospital: req.user.id }).sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) { next(err); }
};

// POST /api/hospitals/requests — create a new blood request
exports.createRequest = async (req, res, next) => {
  try {
    const {
      bloodGroup, quantity, urgency, patientReference, patientName, doctorRefNo,
      patientReason, department, contactPerson, contactNumber, searchRadiusKm,
      requiredBefore, notifyPush, lat, lng
    } = req.body;

    if (!bloodGroup) return res.status(400).json({ success: false, message: 'Blood group is required' });

    const request = await Request.create({
      hospital: req.user.id, bloodGroup, quantity, urgency, patientReference, patientName,
      doctorRefNo, patientReason, department, contactPerson, contactNumber,
      searchRadiusKm, requiredBefore, notifyPush,
      latitude: lat, longitude: lng
    });

    const io = req.app.get('io');
    if (notifyPush !== false) {
      const hospitalDoc = await Hospital.findById(req.user.id).select('hospitalName');
      notifyDonorsByBloodGroup(io, donorGroupsThatCanFulfil(bloodGroup), 'new_request', {
        requestId: request._id,
        bloodGroup,
        quantity: request.quantity,
        urgency,
        hospitalName: hospitalDoc ? hospitalDoc.hospitalName : 'Hospital',
        status: request.status
      });
    }

    res.status(201).json({ success: true, request, matchCount: null });
  } catch (err) { next(err); }
};

// GET /api/hospitals/phone/:phone — look up a donor by phone (manual verification path)
exports.lookupDonorByPhone = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ phone: req.params.phone });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    if (donor.isActive === false) {
      return res.status(403).json({ success: false, message: 'This donor account has been deactivated' });
    }
    const { eligible, daysRemaining } = isEligibleNow(donor);
    res.json({
      success: true,
      donor: {
        id: donor._id, name: donor.name, bloodGroup: donor.bloodGroup, city: donor.city,
        phone: donor.phone, points: donor.points, totalDonations: donor.totalDonations,
        lastDonationDate: donor.lastDonationDate, nextEligibleDate: donor.nextEligibleDate,
        isActive: donor.isActive, eligibleNow: eligible, daysRemaining
      }
    });
  } catch (err) { next(err); }
};

// GET /api/donors/verify/:token — QR scan verification.
// The QR only ever encodes an opaque token (never donorId/name/bloodGroup
// directly), so this is the only path from a scan to real donor details,
// and it's hospital-authenticated. An unrecognized token means either a
// forged/tampered QR or a donor who doesn't exist — both come back as a
// generic "not found" so scanning can't be used to enumerate valid tokens.
exports.verifyDonorForScan = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ qrToken: req.params.token });
    if (!donor) return res.status(404).json({ success: false, message: 'QR code not recognized' });
    if (donor.isActive === false) {
      return res.status(403).json({ success: false, message: 'This donor account has been deactivated' });
    }

    const { eligible, daysRemaining } = isEligibleNow(donor);
    res.json({
      success: true,
      donor: {
        id: donor._id,
        name: donor.name,
        bloodGroup: donor.bloodGroup,
        city: donor.city,
        phone: donor.phone,
        points: donor.points,
        totalDonations: donor.totalDonations,
        lastDonationDate: donor.lastDonationDate,
        nextEligibleDate: donor.nextEligibleDate,
        isActive: donor.isActive,
        eligibleNow: eligible,
        daysRemaining
      }
    });
  } catch (err) { next(err); }
};

// PATCH /api/hospital/complete/:id  (server.js aliases this from requestId)
// Body: { donorId }
// This is the last gate before points/history are written, so every check
// from earlier in the lifecycle is re-verified here rather than trusted:
// the request must actually be in 'accepted' state, the donor being
// completed must be the same donor who accepted it, blood-group
// compatibility is re-checked, and the cooldown is re-checked against the
// database's lastDonationDate — never a value the client sent.
exports.completeDonation = async (req, res, next) => {
  try {
    const { donorId } = req.body;
    if (!donorId) return res.status(400).json({ success: false, message: 'donorId is required' });

    const donor = await Donor.findById(donorId);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    if (donor.isActive === false) {
      return res.status(403).json({ success: false, message: 'This donor account has been deactivated' });
    }

    const request = req.params.requestId ? await Request.findById(req.params.requestId) : null;

    if (request) {
      if (request.hospital.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'This request does not belong to your hospital' });
      }
      if (request.status !== 'accepted') {
        return res.status(409).json({ success: false, message: `Request must be in "accepted" state to complete — currently "${request.status}"` });
      }
      if (!request.acceptedBy || request.acceptedBy.toString() !== donor._id.toString()) {
        return res.status(409).json({ success: false, message: 'This donor did not accept this request' });
      }
      if (!donorGroupsThatCanFulfil(request.bloodGroup).includes(donor.bloodGroup)) {
        return res.status(403).json({ success: false, message: 'Donor blood group is not compatible with this request' });
      }
    }

    const { eligible, daysRemaining } = isEligibleNow(donor);
    if (!eligible) {
      return res.status(409).json({
        success: false,
        message: `This donor is not yet eligible — ${daysRemaining} day(s) remaining on the 90-day cooldown`
      });
    }

    const earnedPoints = pointsForDonation();
    donor.points += earnedPoints;
    donor.totalDonations += 1;
    donor.lastDonationDate = new Date();
    await donor.save();

    if (request) {
      request.status = 'completed';
      request.completedBy = donor._id;
      request.completedAt = new Date();
      await request.save();
    }

    const io = req.app.get('io');
    notifyDonor(io, donor._id, 'donation_completed', {
      requestId: request ? request._id : null,
      pointsEarned: earnedPoints,
      totalPoints: donor.points,
      totalDonations: donor.totalDonations
    });

    res.json({
      success: true,
      message: 'Donation recorded',
      donor: { id: donor._id, name: donor.name, points: donor.points, totalDonations: donor.totalDonations },
      pointsEarned: earnedPoints
    });
  } catch (err) { next(err); }
};
