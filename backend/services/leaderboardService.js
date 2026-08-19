const Donor = require('../models/Donor');

async function getLeaderboard(limit = 20) {
  return Donor.find({ isSuspended: false })
    .select('name city bloodGroup points donationCount badges')
    .sort({ points: -1, donationCount: -1 })
    .limit(limit);
}

module.exports = { getLeaderboard };
