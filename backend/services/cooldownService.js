const Donor = require('../models/Donor');

/**
 * Call this whenever a donor's data is fetched (profile, feed check, etc.)
 * so a cooldown that has already elapsed is reflected immediately —
 * "Cooldown Ends -> Availability ON -> Eligible Again" from the flow doc —
 * without needing a separate cron job for a project this size.
 */
async function refreshCooldownIfElapsed(donor) {
  if (donor.cooldownUntil && new Date() >= donor.cooldownUntil && donor.availabilityStatus === 'not available') {
    donor.availabilityStatus = 'available';
    await donor.save();
  }
  return donor;
}

function getCooldownInfo(donor) {
  return {
    eligible: donor.isEligibleToDonate(),
    cooldownUntil: donor.cooldownUntil,
    remainingDays: donor.remainingCooldownDays()
  };
}

module.exports = { refreshCooldownIfElapsed, getCooldownInfo };
