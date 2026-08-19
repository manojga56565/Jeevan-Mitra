const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.adminLogin);

router.get('/hospitals', auth('admin'), adminController.getHospitals);
router.post('/hospitals/add', auth('admin'), adminController.addHospital);
router.put('/hospitals/:id', auth('admin'), adminController.updateHospital);
router.put('/hospitals/:id/toggle', auth('admin'), adminController.toggleHospital);
router.put('/hospitals/:id/reset-password', auth('admin'), adminController.resetHospitalPassword);
router.delete('/hospitals/:id', auth('admin'), adminController.deleteHospital);

router.get('/donors', auth('admin'), adminController.getDonors);
router.put('/donors/:id', auth('admin'), adminController.updateDonor);
router.put('/donors/:id/toggle', auth('admin'), adminController.toggleDonor);
router.put('/donors/:id/reset-password', auth('admin'), adminController.resetDonorPassword);
router.delete('/donors/:id', auth('admin'), adminController.deleteDonor);

router.get('/requests', auth('admin'), adminController.getAllRequests);

router.post('/broadcast', auth('admin'), adminController.broadcast);
router.post('/create-admin', auth('admin'), adminController.createAdmin);
router.get('/logs', auth('admin'), adminController.getLogs);

module.exports = router;
