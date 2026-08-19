const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');

router.post('/donor/send-otp', otpLimiter, authController.donorSendOTP);
router.post('/donor/verify-otp', loginLimiter, authController.donorVerifyOTP);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', loginLimiter, authController.resetPassword);

module.exports = router;
