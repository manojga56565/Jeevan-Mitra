const Donor = require('../models/Donor');
const Reward = require('../models/Reward');
const { REWARD_TIERS } = require('../config/constants');

function getTier(points) {
  let tier = REWARD_TIERS[0];
  for (const t of REWARD_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  const currentIndex = REWARD_TIERS.indexOf(tier);
  const next = REWARD_TIERS[currentIndex + 1] || null;
  return { ...tier, nextTier: next };
}

async function awardPoints(donor, points) {
  donor.addPoints(points);
  await donor.save();
  return donor;
}

async function getLeaderboard(limit = 100) {
  return Donor.find({ isActive: true })
    .select('name city bloodGroup points totalDonations')
    .sort({ points: -1, totalDonations: -1 })
    .limit(limit);
}

async function listRewards() {
  return Reward.find({ isActive: true }).sort({ pointsCost: 1 });
}

async function redeemReward(donorId, rewardId) {
  const [donor, reward] = await Promise.all([
    Donor.findById(donorId),
    Reward.findById(rewardId)
  ]);

  if (!donor) throw Object.assign(new Error('Donor not found'), { statusCode: 404 });
  if (!reward || !reward.isActive) throw Object.assign(new Error('Reward not available'), { statusCode: 404 });
  if (reward.stock !== null && reward.stock <= 0) throw Object.assign(new Error('Reward out of stock'), { statusCode: 409 });
  if (donor.points < reward.pointsCost) throw Object.assign(new Error('Not enough points'), { statusCode: 400 });

  donor.deductPoints(reward.pointsCost);
  reward.redemptions.push({ donor: donor._id, pointsSpent: reward.pointsCost });
  if (reward.stock !== null) reward.stock -= 1;

  await Promise.all([donor.save(), reward.save()]);
  return { donor, reward };
}

module.exports = { getTier, awardPoints, getLeaderboard, listRewards, redeemReward };
