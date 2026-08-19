const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Admin = require('../models/Admin');
const Request = require('../models/Request');
const { notifyDonors, notifyAdmins } = require('../services/notificationService');
const logger = require('../utils/logger');

// ═══ HOSPITALS ═══

// GET /api/admin/hospitals
exports.getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find().sort('-createdAt');
    res.json({ success: true, hospitals });
  } catch (err) { next(err); }
};

// POST /api/admin/hospitals/add
exports.addHospital = async (req, res, next) => {
  try {
    const { hospitalName, registrationNumber, address, city, pincode, contactPerson, designation, email, phone, password, licenseDocument } = req.body;
    if (!hospitalName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Hospital name, email, and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const hospital = await Hospital.create({
      hospitalName, registrationNumber, address, city, pincode, contactPerson,
      designation, email: email.toLowerCase(), phone, password: hashed, licenseDocument,
      isVerified: false
    });
    const safe = hospital.toObject(); delete safe.password;
    pushLog({ action: `Hospital "${hospitalName}" registered — awaiting verification` });
    res.status(201).json({ success: true, hospital: safe });
  } catch (err) { next(err); }
};

// PUT /api/admin/hospitals/:id
exports.updateHospital = async (req, res, next) => {
  try {
    const allowed = ['hospitalName', 'registrationNumber', 'address', 'city', 'pincode', 'contactPerson', 'designation', 'email', 'phone'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (err) { next(err); }
};

// PUT /api/admin/hospitals/:id/toggle — flip isVerified (active/disabled)
exports.toggleHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    hospital.isVerified = !hospital.isVerified;
    await hospital.save();
    pushLog({ action: `Hospital "${hospital.hospitalName}" ${hospital.isVerified ? 'verified' : 'unverified/disabled'}` });
    res.json({ success: true, hospital });
  } catch (err) { next(err); }
};

// PUT /api/admin/hospitals/:id/reset-password
exports.resetHospitalPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 10);
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { password: hashed }, { new: true });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    res.json({ success: true, message: 'Password reset' });
  } catch (err) { next(err); }
};

// DELETE /api/admin/hospitals/:id
exports.deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
    pushLog({ action: `Hospital "${hospital.hospitalName}" deleted` });
    res.json({ success: true, message: 'Hospital deleted' });
  } catch (err) { next(err); }
};

// ═══ DONORS ═══

// GET /api/admin/donors
exports.getDonors = async (req, res, next) => {
  try {
    const donors = await Donor.find().sort('-createdAt');
    res.json({ success: true, donors });
  } catch (err) { next(err); }
};

// PUT /api/admin/donors/:id
exports.updateDonor = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'city', 'homeTown', 'livingTown', 'district', 'bloodGroup', 'weight', 'age', 'gender'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const donor = await Donor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, donor });
  } catch (err) { next(err); }
};

// PUT /api/admin/donors/:id/toggle — flip isActive
exports.toggleDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    donor.isActive = donor.isActive === false ? true : false;
    await donor.save();
    pushLog({ action: `Donor "${donor.name}" ${donor.isActive ? 'reactivated' : 'deactivated'}` });
    res.json({ success: true, donor });
  } catch (err) { next(err); }
};

// PUT /api/admin/donors/:id/reset-password
exports.resetDonorPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const hashed = await bcrypt.hash(password, 10);
    const donor = await Donor.findByIdAndUpdate(req.params.id, { password: hashed }, { new: true });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, message: 'Password reset' });
  } catch (err) { next(err); }
};

// DELETE /api/admin/donors/:id
exports.deleteDonor = async (req, res, next) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    pushLog({ action: `Donor "${donor.name}" deleted` });
    res.json({ success: true, message: 'Donor deleted' });
  } catch (err) { next(err); }
};

// ═══ REQUESTS (admin view) ═══

// GET /api/admin/requests
exports.getAllRequests = async (req, res, next) => {
  try {
    const requests = await Request.find()
      .populate('hospital', 'hospitalName city')
      .sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) { next(err); }
};

// ═══ BROADCAST ═══

// POST /api/admin/broadcast  { target: 'donors'|'hospitals'|'all', message }
exports.broadcast = async (req, res, next) => {
  try {
    const { target, message } = req.body;
    if (!target || !message) return res.status(400).json({ success: false, message: 'Target and message are required' });

    const io = req.app.get('io');
    if (target === 'donors' || target === 'all') notifyDonors(io, 'broadcast', { message });
    if (target === 'hospitals' || target === 'all') io && io.emit('broadcast_hospitals', { message }); // hospitals aren't room-scoped by default
    notifyAdmins(io, 'broadcast_sent', { target, message });

    logger.info(`Broadcast sent to ${target}: ${message}`);
    pushLog({ action: `Broadcast sent to ${target}: "${message}"` });
    res.json({ success: true, message: 'Broadcast sent' });
  } catch (err) { next(err); }
};

// ═══ ADMIN ACCOUNTS ═══

// POST /api/admin/create-admin
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name, email: email.toLowerCase(), password: hashed });
    const safe = admin.toObject(); delete safe.password;
    res.status(201).json({ success: true, admin: safe });
  } catch (err) { next(err); }
};

// ═══ LOGS (lightweight in-memory ring buffer, good enough for an admin panel) ═══
const recentLogs = [];
function pushLog(entry) {
  // action/createdAt match what the frontend's System Logs panel reads
  recentLogs.unshift({ createdAt: new Date(), ...entry });
  if (recentLogs.length > 200) recentLogs.length = 200;
}

// GET /api/admin/logs
exports.getLogs = async (req, res, next) => {
  try {
    res.json({ success: true, logs: recentLogs });
  } catch (err) { next(err); }
};

exports._pushLog = pushLog; // exported for other controllers to record events, if wired in later
