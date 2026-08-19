const COOLDOWN_DAYS = 90;

function isEligibleNow(donor) {
  if (!donor.lastDonationDate) return { eligible: true, daysRemaining: 0 };
  const daysSince = (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(COOLDOWN_DAYS - daysSince));
  return { eligible: daysSince >= COOLDOWN_DAYS, daysRemaining };
}

module.exports = { isEligibleNow, COOLDOWN_DAYS };
