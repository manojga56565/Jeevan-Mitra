const Donor = require("../models/Donor");

// ========================================
// BLOOD GROUP COMPATIBILITY
// ========================================
const compatibility = {

    "O-": ["O-"],

    "O+": ["O+", "O-"],

    "A-": ["A-", "O-"],

    "A+": ["A+", "A-", "O+", "O-"],

    "B-": ["B-", "O-"],

    "B+": ["B+", "B-", "O+", "O-"],

    "AB-": ["AB-", "A-", "B-", "O-"],

    "AB+": [
        "AB+",
        "AB-",
        "A+",
        "A-",
        "B+",
        "B-",
        "O+",
        "O-"
    ]

};

// ========================================
// GET COMPATIBLE BLOOD GROUPS
// ========================================
exports.compatibleBloodGroups = (bloodGroup) => {

    return compatibility[bloodGroup] || [];

};

// ========================================
// FIND ELIGIBLE DONORS
// ========================================
exports.findEligibleDonors = async (request) => {

    const compatibleGroups =
        exports.compatibleBloodGroups(request.bloodGroup);

    const donors = await Donor.find({

        bloodGroup: {
            $in: compatibleGroups
        },

        isActive: true,

        isVerified: true,

        availabilityStatus: "available"

    });

    return donors.filter(donor => donor.isEligibleToDonate());

};

// ========================================
// FILTER BY CITY
// ========================================
exports.filterByCity = (donors, city) => {

    return donors.filter(donor => donor.city === city);

};

// ========================================
// FILTER BY DISTRICT
// ========================================
exports.filterByDistrict = (donors, district) => {

    return donors.filter(
        donor => donor.district === district
    );

};

// ========================================
// PRIORITY SCORE
// ========================================
exports.calculatePriority = (donor) => {

    let score = 0;

    score += donor.points;

    score += donor.totalDonations * 5;

    if (donor.isVerified)
        score += 20;

    if (donor.availabilityStatus === "available")
        score += 20;

    return score;

};

// ========================================
// SORT DONORS
// ========================================
exports.sortDonors = (donors) => {

    return donors.sort((a, b) => {

        return (
            exports.calculatePriority(b) -
            exports.calculatePriority(a)
        );

    });

};

// ========================================
// TOP MATCHES
// ========================================
exports.getTopMatches = async (request) => {

    let donors =
        await exports.findEligibleDonors(request);

    donors =
        exports.filterByCity(
            donors,
            request.hospitalCity
        );

    donors =
        exports.sortDonors(donors);

    return donors;

};