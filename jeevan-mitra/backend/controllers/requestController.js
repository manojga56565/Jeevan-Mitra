const requestService = require("../services/requestService");

exports.getAll = async (req, res) => {

    try {

        const requests =
            await requestService.getActiveRequests();

        res.json({
            success: true,
            requests
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

exports.getOne = async (req, res) => {

    try {

        const request =
            await requestService.getRequest(req.params.id);

        res.json({
            success: true,
            request
        });

    } catch (err) {

        res.status(404).json({
            success: false,
            message: err.message
        });

    }

};

exports.update = async (req, res) => {

    try {

        const request =
            await requestService.updateRequest(
                req.params.id,
                req.body
            );

        res.json({
            success: true,
            request
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.cancel = async (req, res) => {

    try {

        const request =
            await requestService.cancelRequest(req.params.id);

        res.json({
            success: true,
            request
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.delete = async (req, res) => {

    try {

        const result =
            await requestService.deleteRequest(req.params.id);

        res.json(result);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};