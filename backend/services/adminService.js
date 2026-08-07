const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const Request = require('../models/Request');
const SystemLog = require('../models/SystemLog');
const notificationService = require('./notificationService');

async function logAction(admin, action, target, targetId, details) {
  try {
    await SystemLog.create({
      adminId: admin?.id,
      adminEmail: admin?.email || 'system',
      action, target, targetId, details
    });
  } catch (e) { /* logging failure should never break the actual action */ }
}

// ═══ STATS ═══
async function getStats() {
  const [donors, verifiedHospitals, pendingHospitals, totalRequests, completedRequests] = await Promise.all([
    Donor.countDocuments(),
    Hospital.countDocuments({ isVerified: true }),
    Hospital.countDocuments({ isVerified: false }),
    Request.countDocuments(),
    Request.countDocuments({ status: 'completed' })
  ]);
  return { donors, activeHospitals: verifiedHospitals, pendingHospitals, requests: totalRequests, completed: completedRequests };
}

// ═══ HOSPITALS ═══
async function listHospitals() {
  return Hospital.find().select('-password').sort({ createdAt: -1 });
}

async function listPendingHospitals() {
  return Hospital.find({ isVerified: false }).select('-password');
}

async function verifyHospital(admin, hospitalId, action) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });

  if (action === 'approve') {
    hospital.isVerified = true;
    await hospital.save();
    await logAction(admin, 'approve_hospital', 'hospital', hospital._id, hospital.hospitalName);
    await notificationService.create({
      recipientType: 'hospital', recipientId: hospital._id, type: 'hospital_approved',
      title: '✅ Account approved', message: 'Your hospital account has been verified. You can now log in and create requests.'
    });
    return { message: 'Hospital approved' };
  }
  if (action === 'reject') {
    await Hospital.findByIdAndDelete(hospitalId);
    await logAction(admin, 'reject_hospital', 'hospital', hospitalId, hospital.hospitalName);
    return { message: 'Hospital rejected and removed' };
  }
  throw Object.assign(new Error('Invalid action — use approve or reject'), { statusCode: 400 });
}

async function addHospital(admin, data) {
  const existing = await Hospital.findOne({ $or: [{ email: data.email }, { registrationNumber: data.registrationNumber }] });
  if (existing) throw Object.assign(new Error('A hospital with this email or registration number already exists'), { statusCode: 409 });

  const hospital = await Hospital.create({ ...data, isVerified: false, isActive: true });
  await logAction(admin, 'add_hospital', 'hospital', hospital._id, hospital.hospitalName);
  const safe = hospital.toObject();
  delete safe.password;
  return safe;
}

async function editHospital(admin, hospitalId, data) {
  const hospital = await Hospital.findByIdAndUpdate(hospitalId, data, { new: true, runValidators: true }).select('-password');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  await logAction(admin, 'edit_hospital', 'hospital', hospital._id, hospital.hospitalName);
  return hospital;
}

async function toggleHospitalActive(admin, hospitalId) {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  hospital.isActive = !hospital.isActive;
  await hospital.save();
  await logAction(admin, hospital.isActive ? 'activate_hospital' : 'suspend_hospital', 'hospital', hospital._id, hospital.hospitalName);
  return hospital.isActive;
}

async function deleteHospital(admin, hospitalId) {
  const hospital = await Hospital.findByIdAndDelete(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  await logAction(admin, 'delete_hospital', 'hospital', hospitalId, hospital.hospitalName);
  return true;
}

async function resetHospitalPassword(admin, hospitalId, newPassword) {
  if (!newPassword || newPassword.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  hospital.password = newPassword; // pre-save hook hashes it
  await hospital.save();
  await logAction(admin, 'reset_hospital_password', 'hospital', hospital._id, hospital.hospitalName);
  return true;
}

// ═══ DONORS ═══
async function listDonors() {
  return Donor.find().select('-password').sort({ createdAt: -1 });
}

async function editDonor(admin, donorId, data) {
  const donor = await Donor.findByIdAndUpdate(donorId, data, { new: true, runValidators: true }).select('-password');
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  await logAction(admin, 'edit_donor', 'donor', donor._id, donor.name);
  return donor;
}

async function toggleDonorActive(admin, donorId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  donor.isActive = !donor.isActive;
  await donor.save();
  await logAction(admin, donor.isActive ? 'activate_donor' : 'suspend_donor', 'donor', donor._id, donor.name);
  return donor.isActive;
}

async function deleteDonor(admin, donorId) {
  const donor = await Donor.findByIdAndDelete(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  await logAction(admin, 'delete_donor', 'donor', donorId, donor.name);
  return true;
}

async function resetDonorPassword(admin, donorId, newPassword) {
  if (!newPassword || newPassword.length < 6) throw Object.assign(new Error('Password must be at least 6 characters'), { statusCode: 400 });
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  donor.password = newPassword;
  await donor.save();
  await logAction(admin, 'reset_donor_password', 'donor', donor._id, donor.name);
  return true;
}

async function resetDonorCooldown(admin, donorId) {
  const donor = await Donor.findById(donorId);
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  donor.cooldownUntil = null;
  donor.nextEligibleDate = null;
  donor.availabilityStatus = 'available';
  await donor.save();
  await logAction(admin, 'reset_donor_cooldown', 'donor', donor._id, donor.name);
  return donor;
}

// ═══ ADMIN ACCOUNTS ═══
async function createAdmin(requestingAdmin, { name, email, password, role }) {
  if (!name || !email || !password) throw Object.assign(new Error('Name, email, and password are required'), { statusCode: 400 });
  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) throw Object.assign(new Error('An admin with this email already exists'), { statusCode: 409 });

  const admin = await Admin.create({ name, email, password, role: role === 'super_admin' ? 'super_admin' : 'moderator' });
  await logAction(requestingAdmin, 'create_admin', 'admin', admin._id, email);
  return { id: admin._id, name: admin.name, email: admin.email, role: admin.role };
}

// ═══ LOGS & BROADCAST ═══
async function getLogs(limit = 200) {
  return SystemLog.find().sort({ createdAt: -1 }).limit(limit);
}

async function broadcast(admin, target, message) {
  if (!message) throw Object.assign(new Error('Message is required'), { statusCode: 400 });
  const delivered = notificationService.broadcast(target, message);
  await logAction(admin, 'broadcast', undefined, undefined, `[${target || 'all'}] ${message}`);
  return delivered;
}

module.exports = {
  getStats, listHospitals, listPendingHospitals, verifyHospital, addHospital, editHospital,
  toggleHospitalActive, deleteHospital, resetHospitalPassword,
  listDonors, editDonor, toggleDonorActive, deleteDonor, resetDonorPassword, resetDonorCooldown,
  createAdmin, getLogs, broadcast
};
