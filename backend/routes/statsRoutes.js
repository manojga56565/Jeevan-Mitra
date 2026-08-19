const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { auth } = require('../middleware/auth');

router.get('/', auth('admin'), statsController.getStats);

module.exports = router;
