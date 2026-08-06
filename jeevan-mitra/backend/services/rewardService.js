const Donor = require("../models/Donor");

// ========================================
// ADD REWARD POINTS
// ========================================
exports.addPoints = async (donorId, points) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    donor.points += points;

    donor.totalDonations += 1;

    await donor.save();

    return donor;

};

// ========================================
// DEDUCT POINTS
// ========================================
exports.deductPoints = async (donorId, points) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    donor.points = Math.max(0, donor.points - points);

    await donor.save();

    return donor;

};

// ========================================
// GET DONOR POINTS
// ========================================
exports.getPoints = async (donorId) => {

    const donor = await Donor.findById(donorId)
        .select("points totalDonations");

    return donor;

};

// ========================================
// GET BADGE
// ========================================
exports.getBadge = (points) => {

    if (points >= 1000)
        return "Diamond";

    if (points >= 700)
        return "Platinum";

    if (points >= 500)
        return "Gold";

    if (points >= 250)
        return "Silver";

    return "Bronze";

};

// ========================================
// GET DONOR RANK
// ========================================
exports.getRank = async (donorId) => {

    const leaderboard = await Donor.find()
        .sort({
            points: -1,
            totalDonations: -1
        })
        .select("_id");

    const rank =
        leaderboard.findIndex(
            donor => donor._id.toString() === donorId.toString()
        ) + 1;

    return rank;

};

// ========================================
// LEADERBOARD
// ========================================
exports.getLeaderboard = async () => {

    const donors = await Donor.find()
        .select("name bloodGroup points totalDonations")
        .sort({
            points: -1,
            totalDonations: -1
        })
        .limit(20);

    return donors.map(donor => ({
        name: donor.name,
        bloodGroup: donor.bloodGroup,
        points: donor.points,
        donations: donor.totalDonations,
        badge: exports.getBadge(donor.points)
    }));

};