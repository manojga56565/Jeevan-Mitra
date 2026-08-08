const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');

router.post('/donor/send-otp', validate({ body: ['phone'] }), authController.sendDonorOTP);
router.post('/donor/verify-otp', validate({ body: ['phone', 'otp'] }), authController.verifyDonorOTP);
router.post('/hospital/login', validate({ body: ['email', 'password'] }), authController.hospitalLogin);
router.post('/admin/login', validate({ body: ['email', 'password'] }), authController.adminLogin);
router.post('/forgot-password', validate({ body: ['role', 'identifier'] }), authController.forgotPassword);
router.post('/reset-password', validate({ body: ['role', 'identifier', 'code', 'newPassword'] }), authController.resetPassword);

module.exports = router;
