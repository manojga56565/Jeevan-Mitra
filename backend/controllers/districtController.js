const Donor = require('../models/Donor');

// GET /api/districts — returns only distinct, non-empty district names.
// No donor identifiers or profile information are exposed.
exports.getDistricts = async (req, res, next) => {
  try {
    const districts = await Donor.distinct('district', {
      district: { $exists: true, $ne: '' },
      isActive: true
    });
    res.json({
      success: true,
      districts: districts.filter(Boolean).sort((a, b) => a.localeCompare(b))
    });
  } catch (err) {
    next(err);
  }
};