const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { auth } = require('../middleware/auth');

// Feed is public-readable in the sense that a logged-in donor sees it, but still requires auth
router.get('/feed', auth('donor'), donorController.getFeed);
router.patch('/accept/:id', auth('donor'), donorController.acceptRequest);

router.get('/profile', auth('donor'), donorController.getProfile);
router.put('/profile', auth('donor'), donorController.updateProfile);
router.put('/change-password', auth('donor'), donorController.changePassword);
router.put('/availability', auth('donor'), donorController.toggleAvailability);
router.put('/deactivate', auth('donor'), donorController.deactivate);

router.get('/history', auth('donor'), donorController.getHistory);
router.get('/leaderboard', donorController.getLeaderboard); // public — anyone can view rankings
router.get('/rewards', auth('donor'), donorController.getRewardsCatalog);
router.post('/rewards/:rewardId/redeem', auth('donor'), donorController.redeemReward);

router.get('/qr', auth('donor'), donorController.getMyQR);

router.get('/notifications', auth('donor'), donorController.getNotifications);
router.put('/notifications/:id/read', auth('donor'), donorController.markNotificationRead);

module.exports = router;
