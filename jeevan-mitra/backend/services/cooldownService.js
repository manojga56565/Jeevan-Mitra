const Donor = require("../models/Donor");

// ========================================
// START COOLDOWN
// ========================================
exports.startCooldown = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    donor.startCooldown();

    donor.availabilityStatus = "not available";

    await donor.save();

    return donor;

};

// ========================================
// CHECK ELIGIBILITY
// ========================================
exports.isEligible = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    return {

        eligible: donor.isEligibleToDonate(),

        remainingDays: donor.remainingCooldownDays(),

        nextEligibleDate: donor.nextEligibleDate

    };

};

// ========================================
// REMAINING DAYS
// ========================================
exports.remainingDays = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    return donor.remainingCooldownDays();

};

// ========================================
// END COOLDOWN
// ========================================
exports.endCooldown = async () => {

    const donors = await Donor.find({

        cooldownUntil: {
            $lte: new Date()
        },

        availabilityStatus: "not available"

    });

    for (const donor of donors) {

        donor.cooldownUntil = null;

        donor.nextEligibleDate = null;

        donor.availabilityStatus = "available";

        await donor.save();

    }

    return donors.length;

};

// ========================================
// GET COOLDOWN STATUS
// ========================================
exports.getCooldownStatus = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    return {

        cooldown: !donor.isEligibleToDonate(),

        remainingDays: donor.remainingCooldownDays(),

        nextEligibleDate: donor.nextEligibleDate,

        availability: donor.availabilityStatus

    };

};