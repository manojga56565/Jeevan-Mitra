const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { auth } = require('../middleware/auth');

router.put('/:id/cancel', auth('admin'), requestController.cancelRequest);
router.delete('/:id', auth('admin'), requestController.deleteRequest);

module.exports = router;
