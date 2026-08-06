const Request = require("../models/Request");
const Hospital = require("../models/Hospital");

// ========================================
// CREATE REQUEST
// ========================================
exports.createRequest = async (hospitalId, data) => {

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

    return request;

};

// ========================================
// GET REQUEST BY ID
// ========================================
exports.getRequest = async (requestId) => {

    const request = await Request.findById(requestId)
        .populate("acceptedBy", "name phone bloodGroup");

    if (!request) {
        throw new Error("Request not found");
    }

    return request;

};

// ========================================
// GET ALL REQUESTS OF HOSPITAL
// ========================================
exports.getHospitalRequests = async (hospitalId) => {

    return await Request.find({
        hospitalId
    }).sort({
        createdAt: -1
    });

};

// ========================================
// UPDATE REQUEST
// ========================================
exports.updateRequest = async (requestId, data) => {

    const request = await Request.findByIdAndUpdate(

        requestId,

        data,

        {
            new: true,
            runValidators: true
        }

    );

    if (!request) {
        throw new Error("Request not found");
    }

    return request;

};

// ========================================
// CANCEL REQUEST
// ========================================
exports.cancelRequest = async (requestId) => {

    const request = await Request.findById(requestId);

    if (!request) {
        throw new Error("Request not found");
    }

    request.status = "cancelled";

    await request.save();

    return request;

};

// ========================================
// EXPIRE REQUEST
// ========================================
exports.expireRequest = async () => {

    await Request.updateMany(

        {

            expiresAt: {
                $lt: new Date()
            },

            status: "pending"

        },

        {

            $set: {
                status: "expired"
            }

        }

    );

};

// ========================================
// CLOSE REQUEST
// ========================================
exports.closeRequest = async (requestId) => {

    const request = await Request.findById(requestId);

    if (!request) {
        throw new Error("Request not found");
    }

    request.status = "completed";

    request.completedAt = new Date();

    await request.save();

    return request;

};

// ========================================
// DELETE REQUEST
// ========================================
exports.deleteRequest = async (requestId) => {

    await Request.findByIdAndDelete(requestId);

    return {

        success: true,

        message: "Request deleted successfully."

    };

};

// ========================================
// GET ACTIVE REQUESTS
// ========================================
exports.getActiveRequests = async () => {

    return await Request.find({

        status: "pending",

        expiresAt: {
            $gt: new Date()
        }

    }).sort({

        urgency: -1,

        createdAt: -1

    });

};