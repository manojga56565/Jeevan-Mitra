const adminService = require('../services/adminService');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  success(res, { stats });
});

// ═══ HOSPITALS ═══
exports.listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await adminService.listHospitals();
  success(res, { hospitals });
});

exports.listPendingHospitals = asyncHandler(async (req, res) => {
  const hospitals = await adminService.listPendingHospitals();
  success(res, { hospitals });
});

exports.verifyHospital = asyncHandler(async (req, res) => {
  const result = await adminService.verifyHospital(req.user, req.params.id, req.body.action);
  success(res, {}, result.message);
});

exports.addHospital = asyncHandler(async (req, res) => {
  const hospital = await adminService.addHospital(req.user, req.body);
  res.status(201).json({ success: true, message: 'Hospital added — pending verification', hospital });
});

exports.editHospital = asyncHandler(async (req, res) => {
  const hospital = await adminService.editHospital(req.user, req.params.id, req.body);
  success(res, { hospital }, 'Hospital updated');
});

exports.toggleHospital = asyncHandler(async (req, res) => {
  const isActive = await adminService.toggleHospitalActive(req.user, req.params.id);
  success(res, { isActive }, `Hospital ${isActive ? 'activated' : 'suspended'}`);
});

exports.deleteHospital = asyncHandler(async (req, res) => {
  await adminService.deleteHospital(req.user, req.params.id);
  success(res, {}, 'Hospital deleted');
});

exports.resetHospitalPassword = asyncHandler(async (req, res) => {
  await adminService.resetHospitalPassword(req.user, req.params.id, req.body.password);
  success(res, {}, 'Hospital password reset successfully');
});

// ═══ DONORS ═══
exports.listDonors = asyncHandler(async (req, res) => {
  const donors = await adminService.listDonors();
  success(res, { donors });
});

exports.editDonor = asyncHandler(async (req, res) => {
  const donor = await adminService.editDonor(req.user, req.params.id, req.body);
  success(res, { donor }, 'Donor updated');
});

exports.toggleDonor = asyncHandler(async (req, res) => {
  const isActive = await adminService.toggleDonorActive(req.user, req.params.id);
  success(res, { isActive }, `Donor ${isActive ? 'activated' : 'suspended'}`);
});

exports.deleteDonor = asyncHandler(async (req, res) => {
  await adminService.deleteDonor(req.user, req.params.id);
  success(res, {}, 'Donor deleted');
});

exports.resetDonorPassword = asyncHandler(async (req, res) => {
  await adminService.resetDonorPassword(req.user, req.params.id, req.body.password);
  success(res, {}, 'Donor password reset successfully');
});

exports.resetDonorCooldown = asyncHandler(async (req, res) => {
  const donor = await adminService.resetDonorCooldown(req.user, req.params.id);
  success(res, { donor }, 'Cooldown reset');
});

// ═══ ADMIN ACCOUNTS ═══
exports.createAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.createAdmin(req.user, req.body);
  res.status(201).json({ success: true, message: 'Admin account created', admin });
});

// ═══ LOGS & BROADCAST ═══
exports.getLogs = asyncHandler(async (req, res) => {
  const logs = await adminService.getLogs();
  success(res, { logs });
});

exports.broadcast = asyncHandler(async (req, res) => {
  const delivered = await adminService.broadcast(req.user, req.body.target, req.body.message);
  success(res, { delivered }, 'Broadcast sent');
});
