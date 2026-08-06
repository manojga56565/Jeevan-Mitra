const donorService = require("../services/donorService");

exports.getProfile = async (req, res) => {
    try {
        const donor = await donorService.getProfile(req.user.id);
        res.json({
            success: true,
            donor
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const donor = await donorService.updateProfile(req.user.id, req.body);
        res.json({
            success: true,
            donor
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const feed = await donorService.getFeed(req.user);
        res.json(feed);
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const result = await donorService.acceptRequest(
            req.params.requestId,
            req.user
        );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }
};

exports.getHistory = async (req, res) => {

    try {

        const history =
            await donorService.getHistory(req.user.id);

        res.json({
            success: true,
            history
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

exports.getLeaderboard = async (req, res) => {

    try {

        const leaderboard =
            await donorService.getLeaderboard();

        res.json({
            success: true,
            leaderboard
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};