const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Request = require('../models/Request');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/stats/public — real, aggregate-only numbers for the landing page.
// No auth: nothing here reveals any individual donor, hospital, or request.
router.get('/public', asyncHandler(async (req, res) => {
  const [donorCount, hospitalCount, districts, livesSaved] = await Promise.all([
    Donor.countDocuments({ isActive: true }),
    Hospital.countDocuments({ isVerified: true, isActive: true }),
    Donor.distinct('district', { district: { $nin: [null, ''] } }),
    Request.aggregate([
      { $unwind: '$acceptedDonors' },
      { $match: { 'acceptedDonors.status': 'completed' } },
      { $count: 'total' }
    ])
  ]);

  res.json({
    success: true,
    stats: {
      donors: donorCount,
      hospitals: hospitalCount,
      districts: districts.length,
      livesSaved: livesSaved[0]?.total || 0
    }
  });
}));

module.exports = router;
