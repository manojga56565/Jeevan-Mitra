const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { auth } = require('../middleware/auth');

router.get('/profile', auth('hospital'), hospitalController.getProfile);
router.put('/profile', auth('hospital'), hospitalController.updateProfile);
router.put('/change-password', auth('hospital'), hospitalController.changePassword);

router.post('/requests', auth('hospital'), hospitalController.createRequest);
router.get('/requests', auth('hospital'), hospitalController.getMyRequests);
router.delete('/requests/:id', auth('hospital'), hospitalController.deleteRequest);

router.post('/scan-qr', auth('hospital'), hospitalController.scanDonorQR);
router.patch('/requests/:requestId/complete', auth('hospital'), hospitalController.completeDonation);

router.get('/notifications', auth('hospital'), hospitalController.getNotifications);

module.exports = router;
