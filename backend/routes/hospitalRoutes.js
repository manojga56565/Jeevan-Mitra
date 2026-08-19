const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.hospitalLogin);

router.get('/profile', auth('hospital'), hospitalController.getProfile);
router.put('/profile', auth('hospital'), hospitalController.updateProfile);
router.put('/change-password', auth('hospital'), hospitalController.changePassword);

router.get('/requests', auth('hospital'), hospitalController.getMyRequests);
router.get('/requests/mine', auth('hospital'), hospitalController.getMyRequests); // alias used for session-validation ping
router.post('/requests', auth('hospital'), hospitalController.createRequest);
router.patch('/requests/:requestId/complete', auth('hospital'), hospitalController.completeDonation);

router.get('/phone/:phone', auth('hospital'), hospitalController.lookupDonorByPhone);

module.exports = router;
