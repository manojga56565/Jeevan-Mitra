// ========================================
// SEND NOTIFICATION TO DONOR
// ========================================
exports.notifyDonor = async (donorId, title, message) => {

    console.log("================================");
    console.log("DONOR NOTIFICATION");
    console.log("Donor ID :", donorId);
    console.log("Title    :", title);
    console.log("Message  :", message);
    console.log("================================");

    return {
        success: true,
        receiver: "donor",
        donorId,
        title,
        message
    };

};

// ========================================
// SEND NOTIFICATION TO HOSPITAL
// ========================================
exports.notifyHospital = async (hospitalId, title, message) => {

    console.log("================================");
    console.log("HOSPITAL NOTIFICATION");
    console.log("Hospital ID :", hospitalId);
    console.log("Title       :", title);
    console.log("Message     :", message);
    console.log("================================");

    return {
        success: true,
        receiver: "hospital",
        hospitalId,
        title,
        message
    };

};

// ========================================
// SEND NOTIFICATION TO ADMIN
// ========================================
exports.notifyAdmin = async (title, message) => {

    console.log("================================");
    console.log("ADMIN NOTIFICATION");
    console.log("Title   :", title);
    console.log("Message :", message);
    console.log("================================");

    return {
        success: true,
        receiver: "admin",
        title,
        message
    };

};

// ========================================
// BLOOD REQUEST CREATED
// ========================================
exports.newBloodRequest = async (donorId, request) => {

    return exports.notifyDonor(

        donorId,

        "🩸 New Blood Request",

        `${request.bloodGroup} blood is required at ${request.hospitalName}.`

    );

};

// ========================================
// DONOR ACCEPTED REQUEST
// ========================================
exports.requestAccepted = async (hospitalId, donor) => {

    return exports.notifyHospital(

        hospitalId,

        "✅ Donor Accepted",

        `${donor.name} has accepted your blood request.`

    );

};

// ========================================
// DONATION COMPLETED
// ========================================
exports.donationCompleted = async (donorId) => {

    return exports.notifyDonor(

        donorId,

        "🎉 Donation Completed",

        "Thank you for donating blood. Your reward points have been added."

    );

};

// ========================================
// COOLDOWN STARTED
// ========================================
exports.cooldownStarted = async (donorId, nextEligibleDate) => {

    return exports.notifyDonor(

        donorId,

        "⏳ Cooldown Started",

        `You can donate again after ${new Date(nextEligibleDate).toDateString()}.`

    );

};

// ========================================
// COOLDOWN COMPLETED
// ========================================
exports.cooldownCompleted = async (donorId) => {

    return exports.notifyDonor(

        donorId,

        "✅ Cooldown Completed",

        "You are now eligible to donate blood again."

    );

};

// ========================================
// HOSPITAL APPROVED
// ========================================
exports.hospitalApproved = async (hospitalId) => {

    return exports.notifyHospital(

        hospitalId,

        "🏥 Registration Approved",

        "Your hospital has been approved by the administrator."

    );

};

// ========================================
// HOSPITAL REJECTED
// ========================================
exports.hospitalRejected = async (hospitalId) => {

    return exports.notifyHospital(

        hospitalId,

        "❌ Registration Rejected",

        "Your hospital registration was rejected. Please contact the administrator."

    );

};