const authService = require('../services/authService');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

exports.sendDonorOTP = asyncHandler(async (req, res) => {
  const result = await authService.sendDonorOTP(req.body);
  success(res, result, 'OTP sent successfully');
});

exports.verifyDonorOTP = asyncHandler(async (req, res) => {
  const result = await authService.verifyDonorOTP(req.body);
  success(res, result, 'OTP verified successfully');
});

exports.hospitalLogin = asyncHandler(async (req, res) => {
  const result = await authService.hospitalLogin(req.body);
  success(res, result, 'Login successful');
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.adminLogin(req.body);
  success(res, result, 'Welcome back, Administrator!');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.sendPasswordResetCode(req.body);
  success(res, result, 'Reset code sent');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  success(res, {}, 'Password reset successfully');
});
