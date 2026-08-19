const bcrypt = require('bcryptjs');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { donorGroupsThatCanFulfil, requestGroupsThisDonorCanFulfil } = require('../services/matchingService');
const { isEligibleNow } = require('../services/cooldownService');
const { notifyHospital, notifyDonorsByBloodGroup } = require('../services/notificationService');

// GET /api/donors/profile
exports.getProfile = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.user.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    const { daysRemaining } = isEligibleNow(donor);
    res.json({ success: true, donor: { ...donor.toJSON(), daysRemaining } });
  } catch (err) { next(err); }
};

// PUT /api/donors/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'city', 'homeTown', 'livingTown', 'district', 'bloodGroup', 'weight', 'gender', 'emergencyContact', 'dateOfBirth'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const donor = await Donor.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) { next(err); }
};

// POST /api/donors/photo (multipart, field name "photo")
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded' });
    const url = `/uploads/${req.file.filename}`;
    const donor = await Donor.findByIdAndUpdate(req.user.id, { profilePhotoUrl: url }, { new: true });
    res.json({ success: true, profilePhotoUrl: url, donor });
  } catch (err) { next(err); }
};

// PUT /api/donors/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 10);
    await Donor.findByIdAndUpdate(req.user.id, { password: hashed });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};

// PUT /api/donors/deactivate
exports.deactivate = async (req, res, next) => {
  try {
    await Donor.findByIdAndUpdate(req.user.id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch (err) { next(err); }
};

// GET /api/donors/feed — open requests compatible with this donor's blood group.
// The compatibility check happens in the DB query itself (not a post-fetch
// filter), using the single centralized matching function — so a
// non-compatible request is never even fetched, let alone serialized into
// the response.
exports.getFeed = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.user.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

    const compatibleRequestGroups = requestGroupsThisDonorCanFulfil(donor.bloodGroup);

    const feed = await Request.find({
      status: 'open',
      bloodGroup: { $in: compatibleRequestGroups }
    })
      .populate('hospital', 'hospitalName city address latitude longitude phone')
      .sort('-createdAt')
      .limit(100);

    res.json({ success: true, requests: feed });
  } catch (err) { next(err); }
};

// GET /api/donors/history
exports.getHistory = async (req, res, next) => {
  try {
    const history = await Request.find({ completedBy: req.user.id, status: 'completed' })
      .populate('hospital', 'hospitalName city')
      .sort('-completedAt');
    res.json({ success: true, history });
  } catch (err) { next(err); }
};

// GET /api/donors/leaderboard?city=
exports.getLeaderboard = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.city) filter.city = new RegExp(`^${req.query.city}$`, 'i');
    const leaderboard = await Donor.find(filter)
      .select('name city bloodGroup points totalDonations profilePhotoUrl')
      .sort('-points')
      .limit(50);
    res.json({ success: true, leaderboard });
  } catch (err) { next(err); }
};

// PATCH /api/donors/accept/:requestId — donor accepts an open request.
// Every check here runs server-side and cannot be bypassed by a direct API
// call with a "nicer" frontend state — blood-group compatibility, account
// status, and the 90-day cooldown are all re-verified against the DB, and
// the status flip is atomic so two simultaneous accepts can't both win.
exports.acceptRequest = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.user.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    if (donor.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    const request = await Request.findById(req.params.requestId).populate('hospital', 'hospitalName city');
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'open') {
      return res.status(409).json({ success: false, message: 'This request is no longer open' });
    }

    if (!donorGroupsThatCanFulfil(request.bloodGroup).includes(donor.bloodGroup)) {
      return res.status(403).json({ success: false, message: 'Your blood group is not compatible with this request' });
    }

    const { eligible, daysRemaining } = isEligibleNow(donor);
    if (!eligible) {
      return res.status(409).json({
        success: false,
        message: `You're not yet eligible to donate — ${daysRemaining} day(s) remaining on your 90-day cooldown`
      });
    }

    // Atomic compare-and-set: only succeeds if the request is still 'open'
    // at the moment of the write, so a second donor accepting a split
    // second later (or a retried request) can never double-accept it.
    const updated = await Request.findOneAndUpdate(
      { _id: request._id, status: 'open' },
      { status: 'accepted', acceptedBy: donor._id, acceptedAt: new Date() },
      { new: true }
    ).populate('hospital', 'hospitalName city');

    if (!updated) {
      return res.status(409).json({ success: false, message: 'This request was just accepted by someone else' });
    }

    const io = req.app.get('io');
    if (updated.hospital) {
      notifyHospital(io, updated.hospital._id, 'donor_accepted', {
        requestId: updated._id, donorName: donor.name, donorId: donor._id
      });
    }
    // Tell every other donor who was shown this request to drop it —
    // covers "remove the popup once someone else has accepted."
    notifyDonorsByBloodGroup(io, donorGroupsThatCanFulfil(updated.bloodGroup), 'request_closed', { requestId: updated._id });

    res.json({ success: true, request: updated });
  } catch (err) { next(err); }
};
