const adminService = require("../services/adminService");

// Dashboard
exports.dashboard = async (req, res) => {
    try {
        const result = await adminService.dashboard();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Statistics
exports.stats = async (req, res) => {
    try {
        const result = await adminService.stats();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Donors
exports.getDonors = async (req, res) => {
    try {
        const result = await adminService.getDonors();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Hospitals
exports.getHospitals = async (req, res) => {
    try {
        const result = await adminService.getHospitals();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Requests
exports.getRequests = async (req, res) => {
    try {
        const result = await adminService.getRequests();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Pending Hospitals
exports.pendingHospitals = async (req, res) => {
    try {
        const result = await adminService.pendingHospitals();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Approve Hospital
exports.approveHospital = async (req, res) => {
    try {
        const result = await adminService.approveHospital(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Reject Hospital
exports.rejectHospital = async (req, res) => {
    try {
        const result = await adminService.rejectHospital(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Suspend Hospital
exports.suspendHospital = async (req, res) => {
    try {
        const result = await adminService.suspendHospital(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Suspend Donor
exports.suspendDonor = async (req, res) => {
    try {
        const result = await adminService.suspendDonor(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Delete Hospital
exports.deleteHospital = async (req, res) => {
    try {
        const result = await adminService.deleteHospital(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Delete Donor
exports.deleteDonor = async (req, res) => {
    try {
        const result = await adminService.deleteDonor(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Broadcast
exports.broadcastNotification = async (req, res) => {
    try {
        const result = await adminService.broadcastNotification(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};