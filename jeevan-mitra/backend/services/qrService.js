const QRCode = require("qrcode");
const Donor = require("../models/Donor");

// ========================================
// GENERATE DONOR QR
// ========================================
exports.generateQR = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {
        throw new Error("Donor not found");
    }

    const qrData = JSON.stringify({

        donorId: donor._id,

        name: donor.name,

        bloodGroup: donor.bloodGroup,

        phone: donor.phone

    });

    const qrCode = await QRCode.toDataURL(qrData);

    donor.qrCode = qrCode;

    await donor.save();

    return {

        success: true,

        qrCode

    };

};

// ========================================
// VERIFY QR
// ========================================
exports.verifyQR = async (donorId) => {

    const donor = await Donor.findById(donorId)
        .select("-password");

    if (!donor) {

        throw new Error("Donor not found");

    }

    return {

        success: true,

        donor: {

            id: donor._id,

            name: donor.name,

            bloodGroup: donor.bloodGroup,

            phone: donor.phone,

            city: donor.city,

            points: donor.points,

            totalDonations: donor.totalDonations,

            eligible: donor.isEligibleToDonate(),

            remainingCooldown:
                donor.remainingCooldownDays()

        }

    };

};

// ========================================
// REGENERATE QR
// ========================================
exports.regenerateQR = async (donorId) => {

    return await exports.generateQR(donorId);

};

// ========================================
// GET QR
// ========================================
exports.getQR = async (donorId) => {

    const donor = await Donor.findById(donorId);

    if (!donor) {

        throw new Error("Donor not found");

    }

    if (!donor.qrCode) {

        return await exports.generateQR(donorId);

    }

    return {

        success: true,

        qrCode: donor.qrCode

    };

};