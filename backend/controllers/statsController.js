const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const Request = require('../models/Request');

// GET /api/stats — used by the admin dashboard's stat cards
exports.getStats = async (req, res, next) => {
  try {
    const [totalHospitals, verifiedHospitals, totalDonors, activeDonors, totalRequests, openRequests, completedRequests] = await Promise.all([
      Hospital.countDocuments(),
      Hospital.countDocuments({ isVerified: true }),
      Donor.countDocuments(),
      Donor.countDocuments({ isActive: true }),
      Request.countDocuments(),
      Request.countDocuments({ status: 'open' }),
      Request.countDocuments({ status: 'completed' })
    ]);

    res.json({
      success: true,
      stats: { totalHospitals, verifiedHospitals, totalDonors, activeDonors, totalRequests, openRequests, completedRequests }
    });
  } catch (err) { next(err); }
};
