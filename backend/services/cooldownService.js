const { COOLDOWN_DAYS } = require('../utils/constants');

/**
 * A donor is eligible to be matched against a request if:
 * - not suspended
 * - has availability toggled on
 * - not currently inside their post-donation cooldown window
 */
function isEligible(donor) {
  if (donor.isSuspended) return false;
  if (!donor.isAvailable) return false;
  if (donor.cooldownUntil && donor.cooldownUntil > new Date()) return false;
  return true;
}

function remainingCooldownDays(donor) {
  if (!donor.cooldownUntil) return 0;
  const diffMs = donor.cooldownUntil.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Called after a donation is marked complete (Feature: QR Verification).
 * Mutates an already-loaded Donor document directly - donationCount is
 * handled separately by rewardService, this only starts the cooldown.
 */
function applyCooldownToDonor(donor) {
  donor.lastDonationDate = new Date();
  donor.cooldownUntil = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  donor.isAvailable = false;
  return donor;
}

module.exports = { isEligible, remainingCooldownDays, applyCooldownToDonor, COOLDOWN_DAYS };
