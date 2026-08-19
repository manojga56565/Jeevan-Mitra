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

// GET /api/stats/public — no auth; powers the landing page counters
// (districts / donors / hospitals / lives saved). The frontend was calling
// this exact path already, but the route never existed, so the counters
// silently sat at "—" forever. This is real data, not placeholders.
exports.getPublicStats = async (req, res, next) => {
  try {
    const [donors, hospitals, districtList, livesSaved] = await Promise.all([
      Donor.countDocuments(),
      Hospital.countDocuments({ isVerified: true }),
      Donor.distinct('district'),
      Request.countDocuments({ status: 'completed' })
    ]);
    const districts = districtList.filter(Boolean).length;

    res.json({
      success: true,
      stats: { districts, donors, hospitals, livesSaved }
    });
  } catch (err) { next(err); }
};
