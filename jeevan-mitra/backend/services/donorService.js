const Donor = require("../models/Donor");
const Request = require("../models/Request");

// =============================
// GET DONOR PROFILE
// =============================
exports.getProfile = async (donorId) => {

    const donor = await Donor.findById(donorId).select("-password");

    if (!donor) {
        throw new Error("Donor not found");
    }

    return donor;
};

// =============================
// UPDATE PROFILE
// =============================
exports.updateProfile = async (donorId, data) => {

    const donor = await Donor.findByIdAndUpdate(
        donorId,
        data,
        {
            new: true,
            runValidators: true
        }
    ).select("-password");

    return donor;
};

// =============================
// GET DONOR FEED
// =============================
exports.getFeed = async (donor) => {

    if (!donor.isEligibleToDonate()) {

        return {
            cooldown: true,
            remainingDays: donor.remainingCooldownDays(),
            requests: []
        };

    }

    const requests = await Request.find({

        status: "pending",

        bloodGroup: donor.bloodGroup,

        expiresAt: { $gt: new Date() }

    }).sort({

        createdAt: -1

    });

    return {

        cooldown: false,

        requests

    };
};

// =============================
// ACCEPT REQUEST
// =============================
exports.acceptRequest = async (requestId, donor) => {

    if (!donor.isEligibleToDonate()) {

        throw new Error(
            `You are in cooldown for ${donor.remainingCooldownDays()} days`
        );

    }

    const request = await Request.findById(requestId);

    if (!request) {

        throw new Error("Request not found");

    }

    if (request.status !== "pending") {

        throw new Error("Request already accepted");

    }

    request.status = "accepted";

    request.acceptedBy = donor._id;

    request.acceptedAt = new Date();

    request.navigationUrl =
        `https://www.google.com/maps/search/?api=1&query=${request.location.coordinates[1]},${request.location.coordinates[0]}`;

    await request.save();

    return {

        success: true,

        message: "Request accepted",

        googleMapsUrl: request.navigationUrl

    };

};

// =============================
// DONATION HISTORY
// =============================
exports.getHistory = async (donorId) => {

    return await Request.find({

        acceptedBy: donorId,

        status: "completed"

    }).sort({

        completedAt: -1

    });

};

// =============================
// GET POINTS
// =============================
exports.getPoints = async (donorId) => {

    const donor = await Donor.findById(donorId);

    return {

        points: donor.points,

        totalDonations: donor.totalDonations

    };

};

// =============================
// LEADERBOARD
// =============================
exports.getLeaderboard = async () => {

    return await Donor.find()

        .select("name bloodGroup points totalDonations")

        .sort({

            points: -1,

            totalDonations: -1

        })

        .limit(20);

};