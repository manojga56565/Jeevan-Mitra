const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { auth } = require('../middleware/auth');

// Matches the blueprint frontend's exact call shape: /requests/:id and
// /requests/:id/cancel — both admin-only actions on any request in the system.
router.put('/:id/cancel', auth('admin'), requestController.adminCancel);
router.delete('/:id', auth('admin'), requestController.adminDelete);

module.exports = router;
