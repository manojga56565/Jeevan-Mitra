const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const requestController = require('../controllers/requestController');
const { auth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Alias matching the blueprint frontend's exact expected path — same handler
// as POST /api/auth/admin/login. Must stay ABOVE the router.use(auth('admin'))
// blanket protection below, or this route would require a token to log in with.
router.post('/login', loginLimiter, authController.adminLogin);

router.use(auth('admin')); // every route below requires a valid admin token — no bypass

router.get('/stats', adminController.getStats);

router.get('/hospitals', adminController.listHospitals);
router.get('/hospitals/pending', adminController.listPendingHospitals);
router.put('/hospitals/:id/verify', adminController.verifyHospital);
router.post('/hospitals/add', adminController.addHospital);
router.put('/hospitals/:id', adminController.editHospital);
router.put('/hospitals/:id/toggle', adminController.toggleHospital);
router.delete('/hospitals/:id', adminController.deleteHospital);
router.put('/hospitals/:id/reset-password', adminController.resetHospitalPassword);

router.get('/donors', adminController.listDonors);
router.put('/donors/:id', adminController.editDonor);
router.put('/donors/:id/toggle', adminController.toggleDonor);
router.delete('/donors/:id', adminController.deleteDonor);
router.put('/donors/:id/reset-password', adminController.resetDonorPassword);
router.put('/donors/:id/reset-cooldown', adminController.resetDonorCooldown);

router.get('/requests', requestController.listAll);
router.delete('/requests/:id', requestController.adminDelete);

router.post('/create-admin', adminController.createAdmin);
router.get('/logs', adminController.getLogs);
router.post('/broadcast', adminController.broadcast);

router.get('/donations', adminController.listDonations);
router.get('/donations/stats', adminController.getDonationStats);

router.get('/qr-activity', adminController.listQRActivity);

router.get('/rewards', adminController.getRewardsOverview);

router.get('/notifications', adminController.listNotifications);

router.get('/districts', adminController.listDistricts);
router.post('/districts', adminController.addDistrict);
router.put('/districts/:id/toggle', adminController.toggleDistrict);
router.delete('/districts/:id', adminController.deleteDistrict);

router.get('/analytics', adminController.getAnalytics);

router.get('/reports/:type', adminController.exportReport);

router.get('/search', adminController.globalSearch);

module.exports = router;
