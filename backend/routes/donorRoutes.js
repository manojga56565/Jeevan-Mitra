const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const donorController = require('../controllers/donorController');
const hospitalController = require('../controllers/hospitalController');
const { auth } = require('../middleware/auth');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `donor-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, matches the frontend's own check
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

// Leaderboard is public-ish but still requires a logged-in donor to view, consistent with the rest of the donor app
router.get('/leaderboard', auth('donor'), donorController.getLeaderboard);

router.get('/feed', auth('donor'), donorController.getFeed);
router.get('/history', auth('donor'), donorController.getHistory);
router.get('/profile', auth('donor'), donorController.getProfile);
router.put('/profile', auth('donor'), donorController.updateProfile);
router.post('/photo', auth('donor'), upload.single('photo'), donorController.uploadPhoto);
router.put('/change-password', auth('donor'), donorController.changePassword);
router.put('/deactivate', auth('donor'), donorController.deactivate);
router.patch('/accept/:requestId', auth('donor'), donorController.acceptRequest);

// QR scan verification — hospital scans a donor's QR (which encodes only an
// opaque token), needs the donor's real record back. Hospital-protected.
router.get('/verify/:token', auth('hospital'), hospitalController.verifyDonorForScan);

module.exports = router;
