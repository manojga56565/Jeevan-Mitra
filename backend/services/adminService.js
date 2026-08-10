const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');
const Request = require('../models/Request');
const SystemLog = require('../models/SystemLog');
const Reward = require('../models/Reward');
const Notification = require('../models/Notification');
const District = require('../models/District');
const notificationService = require('./notificationService');
const rewardService = require('./rewardService');

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
  const hospital = await Hospital.findById(hospitalId).select('hospitalName isVerified');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });

  if (action === 'approve') {
    // $set via findByIdAndUpdate, not hospital.save() — see the note in
    // toggleHospitalActive above; same full-document revalidation issue.
    await Hospital.findByIdAndUpdate(hospitalId, { $set: { isVerified: true } });
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

  // Admin-created hospitals are verified by definition — the admin adding
  // them IS the verification step. The "pending → approve" flow only makes
  // sense for hospitals that self-register, which this app doesn't
  // currently support (all hospitals are added by admin).
  const hospital = await Hospital.create({ ...data, isVerified: true, isActive: true });
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
  const hospital = await Hospital.findById(hospitalId).select('isActive hospitalName');
  if (!hospital) throw Object.assign(new Error('Hospital not found'), { statusCode: 404 });
  const newStatus = !hospital.isActive;
  // $set via findByIdAndUpdate, not hospital.save() — same reasoning as
  // requestService's totalRequests increment: toggling one flag shouldn't
  // re-validate every required field on hospitals with incomplete profiles.
  await Hospital.findByIdAndUpdate(hospitalId, { $set: { isActive: newStatus } });
  await logAction(admin, newStatus ? 'activate_hospital' : 'suspend_hospital', 'hospital', hospitalId, hospital.hospitalName);
  return newStatus;
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

// ═══ DONATIONS — real events: donors whose acceptedDonors entry is 'completed' ═══
// There's no separate Donation model; a completed donation IS a completed
// acceptance on a Request, verified via QR at hospital check-in.
async function listDonations() {
  const requests = await Request.find({ 'acceptedDonors.status': 'completed' })
    .select('bloodGroup hospitalName acceptedDonors createdAt')
    .populate('acceptedDonors.donor', 'name phone bloodGroup');

  const donations = [];
  requests.forEach(r => {
    r.acceptedDonors.forEach(ad => {
      if (ad.status === 'completed') {
        donations.push({
          requestId: r._id,
          hospitalName: r.hospitalName,
          bloodGroup: r.bloodGroup,
          donor: ad.donor,
          acceptedAt: ad.acceptedAt,
          completedAt: ad.completedAt
        });
      }
    });
  });
  donations.sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  return donations;
}

async function getDonationStats() {
  const all = await listDonations();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    total: all.length,
    today: all.filter(d => d.completedAt && new Date(d.completedAt) >= startOfDay).length,
    thisMonth: all.filter(d => d.completedAt && new Date(d.completedAt) >= startOfMonth).length
  };
}

// ═══ QR VERIFICATION ACTIVITY ═══
// Same underlying event as a completed donation — a QR scan at hospital
// check-in is what marks an acceptedDonors entry 'completed' in the first
// place, so this reuses that real data rather than a separate fake log.
async function listQRActivity() {
  return listDonations();
}

// ═══ REWARDS OVERVIEW ═══
async function getRewardsOverview() {
  const [leaderboard, rewards, pointsAgg] = await Promise.all([
    rewardService.getLeaderboard(50),
    Reward.find().sort({ pointsCost: 1 }),
    Donor.aggregate([{ $group: { _id: null, totalPoints: { $sum: '$points' } } }])
  ]);
  const totalRedemptions = rewards.reduce((sum, r) => sum + r.redemptions.length, 0);
  return {
    leaderboard,
    rewards,
    totalPointsIssued: pointsAgg[0]?.totalPoints || 0,
    totalRedemptions
  };
}

// ═══ NOTIFICATIONS FEED — admin-wide view across all recipients ═══
async function listNotifications(limit = 100) {
  return Notification.find().sort({ createdAt: -1 }).limit(limit);
}

// ═══ DISTRICTS ═══
async function listDistricts() {
  return District.find().sort({ name: 1 });
}
async function addDistrict(admin, name, state) {
  if (!name) throw Object.assign(new Error('District name is required'), { statusCode: 400 });
  const exists = await District.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (exists) throw Object.assign(new Error('That district already exists'), { statusCode: 409 });
  const district = await District.create({ name, state: state || 'Telangana' });
  await logAction(admin, 'district_add', 'district', district._id, name);
  return district;
}
async function toggleDistrict(admin, id) {
  const district = await District.findById(id);
  if (!district) throw Object.assign(new Error('District not found'), { statusCode: 404 });
  district.isActive = !district.isActive;
  await district.save();
  await logAction(admin, 'district_toggle', 'district', id, `now ${district.isActive ? 'enabled' : 'disabled'}`);
  return district.isActive;
}
async function deleteDistrict(admin, id) {
  const district = await District.findByIdAndDelete(id);
  if (!district) throw Object.assign(new Error('District not found'), { statusCode: 404 });
  await logAction(admin, 'district_delete', 'district', id, district.name);
}

// ═══ ANALYTICS — real aggregations over existing data ═══
async function getAnalytics() {
  const [donationsByMonth, requestsByMonth, bloodGroupDemand, bloodGroupSupply, districtDonors] = await Promise.all([
    Request.aggregate([
      { $unwind: '$acceptedDonors' },
      { $match: { 'acceptedDonors.status': 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$acceptedDonors.completedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Request.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Request.aggregate([{ $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]),
    Donor.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]),
    Donor.aggregate([{ $group: { _id: '$district', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  ]);
  return { donationsByMonth, requestsByMonth, bloodGroupDemand, bloodGroupSupply, districtDonors };
}

// ═══ REPORTS — CSV export (real data, no PDF/Excel libs installed yet) ═══
function toCSV(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map(row => columns.map(c => {
    const v = row[c] ?? '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(','));
  return [header, ...lines].join('\n');
}
async function exportReport(type) {
  if (type === 'donors') {
    const donors = await Donor.find().select('name phone email bloodGroup city district points totalDonations isActive createdAt').lean();
    return toCSV(donors, ['name', 'phone', 'email', 'bloodGroup', 'city', 'district', 'points', 'totalDonations', 'isActive', 'createdAt']);
  }
  if (type === 'hospitals') {
    const hospitals = await Hospital.find().select('hospitalName email phone city district isVerified isActive createdAt').lean();
    return toCSV(hospitals, ['hospitalName', 'email', 'phone', 'city', 'district', 'isVerified', 'isActive', 'createdAt']);
  }
  if (type === 'requests') {
    const requests = await Request.find().select('bloodGroup hospitalName quantity status urgency createdAt').lean();
    return toCSV(requests, ['bloodGroup', 'hospitalName', 'quantity', 'status', 'urgency', 'createdAt']);
  }
  if (type === 'donations') {
    const donations = await listDonations();
    const rows = donations.map(d => ({
      requestId: d.requestId, hospitalName: d.hospitalName, bloodGroup: d.bloodGroup,
      donorName: d.donor?.name || '', donorPhone: d.donor?.phone || '', completedAt: d.completedAt
    }));
    return toCSV(rows, ['requestId', 'hospitalName', 'bloodGroup', 'donorName', 'donorPhone', 'completedAt']);
  }
  throw Object.assign(new Error('Unknown report type — use donors, hospitals, requests, or donations'), { statusCode: 400 });
}

// ═══ GLOBAL SEARCH ═══
async function globalSearch(q) {
  if (!q || q.trim().length < 2) return { donors: [], hospitals: [], requests: [] };
  const regex = new RegExp(q.trim(), 'i');
  const [donors, hospitals, requests] = await Promise.all([
    Donor.find({ $or: [{ name: regex }, { phone: regex }, { email: regex }] }).select('name phone email bloodGroup city').limit(10),
    Hospital.find({ $or: [{ hospitalName: regex }, { email: regex }, { phone: regex }] }).select('hospitalName email phone city').limit(10),
    Request.find({ $or: [{ hospitalName: regex }, { bloodGroup: regex }] }).select('hospitalName bloodGroup status').limit(10)
  ]);
  return { donors, hospitals, requests };
}

module.exports = {
  getStats, listHospitals, listPendingHospitals, verifyHospital, addHospital, editHospital,
  toggleHospitalActive, deleteHospital, resetHospitalPassword,
  listDonors, editDonor, toggleDonorActive, deleteDonor, resetDonorPassword, resetDonorCooldown,
  createAdmin, getLogs, broadcast,
  listDonations, getDonationStats, listQRActivity, getRewardsOverview, listNotifications,
  listDistricts, addDistrict, toggleDistrict, deleteDistrict,
  getAnalytics, exportReport, globalSearch
};
