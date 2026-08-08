const donorService = require('../services/donorService');
const requestService = require('../services/requestService');
const rewardService = require('../services/rewardService');
const qrService = require('../services/qrService');
const notificationService = require('../services/notificationService');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const result = await donorService.getProfile(req.user.id);
  success(res, result);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const donor = await donorService.updateProfile(req.user.id, req.body);
  success(res, { donor }, 'Profile updated successfully');
});

exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw Object.assign(new Error('No photo uploaded'), { statusCode: 400 });
  const profilePhotoUrl = `/uploads/donors/${req.file.filename}`;
  const donor = await donorService.updateProfile(req.user.id, { profilePhotoUrl });
  success(res, { donor, profilePhotoUrl }, 'Photo uploaded successfully');
});

exports.changePassword = asyncHandler(async (req, res) => {
  await donorService.changePassword(req.user.id, req.body.password);
  success(res, {}, 'Password updated successfully');
});

exports.toggleAvailability = asyncHandler(async (req, res) => {
  const availabilityStatus = await donorService.toggleAvailability(req.user.id);
  success(res, { availabilityStatus });
});

exports.deactivate = asyncHandler(async (req, res) => {
  await donorService.deactivateAccount(req.user.id);
  success(res, {}, 'Account deactivated successfully');
});

exports.getHistory = asyncHandler(async (req, res) => {
  const history = await donorService.getHistory(req.user.id);
  success(res, { total: history.length, history });
});

exports.getFeed = asyncHandler(async (req, res) => {
  const requests = await requestService.getDonorFeed(req.user.id, req.query);
  success(res, { count: requests.length, requests, data: requests });
});

exports.acceptRequest = asyncHandler(async (req, res) => {
  const result = await requestService.acceptRequest(req.user.id, req.params.id);
  success(res, {
    googleMapsUrl: result.navigationUrl,
    hospitalName: result.hospitalName,
    request: result.request
  }, 'Blood request accepted successfully');
});

exports.getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await rewardService.getLeaderboard();
  success(res, { leaderboard });
});

exports.getRewardsCatalog = asyncHandler(async (req, res) => {
  const rewards = await rewardService.listRewards();
  success(res, { rewards });
});

exports.redeemReward = asyncHandler(async (req, res) => {
  const result = await rewardService.redeemReward(req.user.id, req.params.rewardId);
  success(res, result, 'Reward redeemed successfully');
});

exports.getMyQR = asyncHandler(async (req, res) => {
  const result = await qrService.issueDonorQR(req.user.id);
  success(res, result);
});

exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForUser('donor', req.user.id);
  success(res, { notifications });
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const notif = await notificationService.markRead(req.params.id, req.user.id);
  success(res, { notification: notif });
});
