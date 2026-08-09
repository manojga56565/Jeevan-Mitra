const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { otpLimiter, loginLimiter } = require('../middleware/rateLimiter');

router.post('/donor/send-otp', otpLimiter, validate({ body: ['phone'] }), authController.sendDonorOTP);
router.post('/donor/verify-otp', loginLimiter, validate({ body: ['phone', 'otp'] }), authController.verifyDonorOTP);
router.post('/hospital/login', loginLimiter, validate({ body: ['email', 'password'] }), authController.hospitalLogin);
router.post('/admin/login', loginLimiter, validate({ body: ['email', 'password'] }), authController.adminLogin);
router.post('/forgot-password', otpLimiter, validate({ body: ['role', 'identifier'] }), authController.forgotPassword);
router.post('/reset-password', loginLimiter, validate({ body: ['role', 'identifier', 'code', 'newPassword'] }), authController.resetPassword);

module.exports = router;
