const jwt = require("jsonwebtoken");
const Hospital = require("../models/Hospital");
const Request = require("../models/Request");
const Donor = require("../models/Donor");

// ======================================
// REGISTER HOSPITAL
// ======================================
exports.registerHospital = async (data) => {

    const exists = await Hospital.findOne({
        email: data.email
    });

    if (exists) {
        throw new Error("Hospital already exists");
    }

    const hospital = await Hospital.create(data);

    return {
        success: true,
        message: "Hospital registered successfully. Waiting for Admin approval.",
        hospital
    };
};

// ======================================
// HOSPITAL LOGIN
// ======================================
exports.loginHospital = async (email, password) => {

    const hospital = await Hospital.findOne({ email });

    if (!hospital) {
        throw new Error("Hospital not found");
    }

    const match = await hospital.comparePassword(password);

    if (!match) {
        throw new Error("Invalid password");
    }

    if (!hospital.isVerified) {
        throw new Error("Hospital is waiting for Admin approval");
    }

    const token = jwt.sign(
        {
            id: hospital._id,
            role: "hospital"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );

    return {
        success: true,
        token,
        hospital
    };
};

// ======================================
// HOSPITAL DASHBOARD
// ======================================
exports.getDashboard = async (hospitalId) => {

    const hospital = await Hospital.findById(hospitalId)
        .select("-password");

    const requests = await Request.find({
        hospitalId
    }).sort({
        createdAt: -1
    });

    return {
        hospital,
        requests
    };
};

// ======================================
// CREATE BLOOD REQUEST
// ======================================
exports.createBloodRequest = async (hospitalId, data) => {

    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
        throw new Error("Hospital not found");
    }

    const request = await Request.create({

        hospitalId: hospital._id,

        hospitalName: hospital.hospitalName,

        hospitalCity: hospital.city,

        hospitalPhone: hospital.phone,

        bloodGroup: data.bloodGroup,

        urgency: data.urgency,

        quantity: data.quantity,

        patientName: data.patientName,

        patientReason: data.patientReason,

        doctorRefNo: data.doctorRefNo,

        location: data.location

    });

    hospital.totalRequests += 1;

    await hospital.save();

    return {
        success: true,
        message: "Blood request created successfully.",
        request
    };
};

// ======================================
// GET HOSPITAL REQUESTS
// ======================================
exports.getRequests = async (hospitalId) => {

    return await Request.find({
        hospitalId
    }).sort({
        createdAt: -1
    });

};

// ======================================
// COMPLETE DONATION
// ======================================
exports.completeDonation = async (requestId) => {

    const request = await Request.findById(requestId);

    if (!request) {
        throw new Error("Request not found");
    }

    if (!request.acceptedBy) {
        throw new Error("No donor has accepted this request");
    }

    const donor = await Donor.findById(request.acceptedBy);

    request.status = "completed";
    request.completedAt = new Date();

    await request.save();

    donor.totalDonations += 1;

    donor.addPoints(request.pointsEarned);

    donor.startCooldown();

    await donor.save();

    const hospital = await Hospital.findById(request.hospitalId);

    hospital.fulfilledRequests += 1;

    await hospital.save();

    return {

        success: true,

        message: "Donation completed successfully.",

        donor,

        request

    };

};