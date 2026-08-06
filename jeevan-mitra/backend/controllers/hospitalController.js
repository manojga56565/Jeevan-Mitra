const hospitalService = require("../services/hospitalService");

exports.register = async (req, res) => {

    try {

        const result =
            await hospitalService.registerHospital(req.body);

        res.json(result);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const result =
            await hospitalService.loginHospital(email, password);

        res.json(result);

    } catch (err) {

        res.status(401).json({
            success: false,
            message: err.message
        });

    }

};

exports.dashboard = async (req, res) => {

    try {

        const dashboard =
            await hospitalService.getDashboard(req.user.id);

        res.json({
            success: true,
            dashboard
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.createRequest = async (req, res) => {

    try {

        const result =
            await hospitalService.createBloodRequest(
                req.user.id,
                req.body
            );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.completeDonation = async (req, res) => {

    try {

        const result =
            await hospitalService.completeDonation(
                req.params.requestId
            );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};