const POINTS_PER_DONATION = 50;

// Badge thresholds by lifetime donation count. Checked after each donation;
// any threshold newly crossed is awarded (usually just one, but a donor
// could in theory jump if donationCount was corrected manually).
const BADGE_THRESHOLDS = [
  { count: 1, badge: 'First Drop' },
  { count: 5, badge: 'Regular Hero' },
  { count: 10, badge: 'Blood Legend' },
  { count: 25, badge: 'Lifesaver Elite' },
];

function determineNewBadges({ previousCount, newCount, existingBadges }) {
  return BADGE_THRESHOLDS.filter(
    (t) => newCount >= t.count && previousCount < t.count && !existingBadges.includes(t.badge)
  ).map((t) => t.badge);
}

/**
 * Called once a hospital confirms a donation is complete. Awards points,
 * increments donation count, and appends any newly-earned badges.
 * Cooldown is applied separately (cooldownService) since it's a distinct
 * concern that also matters outside the rewards context.
 */
async function grantReward(donor) {
  const previousCount = donor.donationCount;
  const newCount = previousCount + 1;

  const newBadges = determineNewBadges({
    previousCount,
    newCount,
    existingBadges: donor.badges || [],
  });

  donor.points += POINTS_PER_DONATION;
  donor.donationCount = newCount;
  if (newBadges.length) donor.badges.push(...newBadges);

  return { pointsAwarded: POINTS_PER_DONATION, newBadges };
}

module.exports = { grantReward, POINTS_PER_DONATION, BADGE_THRESHOLDS };
