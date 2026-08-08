const hospitalService = require('../services/hospitalService');
const requestService = require('../services/requestService');
const qrService = require('../services/qrService');
const notificationService = require('../services/notificationService');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.getProfile(req.user.id);
  success(res, { hospital });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const hospital = await hospitalService.updateProfile(req.user.id, req.body);
  success(res, { hospital }, 'Profile updated successfully');
});

exports.changePassword = asyncHandler(async (req, res) => {
  await hospitalService.changePassword(req.user.id, req.body.password);
  success(res, {}, 'Password updated successfully');
});

exports.createRequest = asyncHandler(async (req, res) => {
  const result = await requestService.createRequest(req.user.id, req.body);
  res.status(201).json({ success: true, message: `Request posted! ${result.matchedDonors} eligible donor(s) notified.`, request: result.request });
});

exports.getMyRequests = asyncHandler(async (req, res) => {
  const requests = await requestService.getHospitalRequests(req.user.id);
  success(res, { requests });
});

exports.deleteRequest = asyncHandler(async (req, res) => {
  await requestService.deleteRequest(req.user.id, req.params.id);
  success(res, {}, 'Request deleted');
});

// ═══ QR VERIFICATION — hospital scans donor's QR ═══
exports.scanDonorQR = asyncHandler(async (req, res) => {
  const result = await qrService.scanDonorQR(req.body.qrToken);
  success(res, result);
});

// ═══ DONATION COMPLETION — after QR verification, hospital confirms ═══
exports.completeDonation = asyncHandler(async (req, res) => {
  const result = await requestService.completeDonation(req.params.requestId, req.body.donorId);
  success(res, result, 'Donation completed successfully');
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForUser('hospital', req.user.id);
  success(res, { notifications });
});

exports.lookupDonorByPhone = asyncHandler(async (req, res) => {
  const donor = await hospitalService.lookupDonorByPhone(req.params.phone);
  success(res, { donor });
});
