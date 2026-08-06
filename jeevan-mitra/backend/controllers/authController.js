const authService = require("../services/authService");

exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.adminLogin(email, password);
        res.json(result);
    } catch (err) {
        res.status(401).json({
            success: false,
            message: err.message
        });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const result = await authService.sendOTP(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const result = await authService.verifyOTP(phone, otp);
        res.json(result);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const result = await authService.logout();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};