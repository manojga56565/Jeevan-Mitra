const { generateDonorQR, verifyDonorQR } = require('../utils/qrGenerator');
const Donor = require('../models/Donor');

async function issueDonorQR(donorId) {
  const { qrToken, dataUrl } = await generateDonorQR(donorId);
  await Donor.findByIdAndUpdate(donorId, { qrIssuedAt: new Date() });
  return { qrToken, dataUrl };
}

/**
 * Called when a hospital scans a donor's QR — returns full, LIVE donor
 * details (not cached), so hospital staff always see current eligibility,
 * cooldown, and donation history at the moment of scanning.
 */
async function scanDonorQR(qrToken) {
  let donorId;
  try {
    donorId = verifyDonorQR(qrToken);
  } catch (e) {
    throw Object.assign(new Error('Invalid or corrupted QR code'), { statusCode: 400 });
  }

  const donor = await Donor.findById(donorId).select('-password -otpCode -otpExpiresAt');
  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });

  return {
    donor,
    eligible: donor.isEligibleToDonate(),
    remainingCooldownDays: donor.remainingCooldownDays()
  };
}

module.exports = { issueDonorQR, scanDonorQR };
