const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Alias matching the blueprint frontend's exact expected path — same handler
// as POST /api/auth/hospital/login. No blanket auth middleware on this router,
// so no reordering needed like adminRoutes.
router.post('/login', authController.hospitalLogin);

router.get('/profile', auth('hospital'), hospitalController.getProfile);
router.get('/phone/:phone', auth('hospital'), hospitalController.lookupDonorByPhone);
router.put('/profile', auth('hospital'), hospitalController.updateProfile);
router.put('/change-password', auth('hospital'), hospitalController.changePassword);

router.post('/requests', auth('hospital'), hospitalController.createRequest);
router.get('/requests', auth('hospital'), hospitalController.getMyRequests);
router.delete('/requests/:id', auth('hospital'), hospitalController.deleteRequest);

router.post('/scan-qr', auth('hospital'), hospitalController.scanDonorQR);
router.patch('/requests/:requestId/complete', auth('hospital'), hospitalController.completeDonation);

router.get('/notifications', auth('hospital'), hospitalController.getNotifications);

module.exports = router;
