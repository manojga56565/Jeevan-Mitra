const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const requestController = require('../controllers/requestController');
const { auth } = require('../middleware/auth');

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

module.exports = router;
