const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { Alert } = require('../models/Other');

const { auth } = require('../middleware/auth');

// =====================================================
// DONOR FEED (Radius + Blood Group Filter)
// =====================================================
router.get('/feed', async (req, res) => {

    try {

        const {
            lat,
            lng,
            radiusKm,
            bloodGroup
        } = req.query;

        let filter = {
            status: 'pending'
        };

        if (bloodGroup) {
            filter.bloodGroup = bloodGroup;
        }

        if (lat && lng) {

            const radius =
                (parseFloat(radiusKm) || 20) / 6378.1;

            filter.location = {
                $geoWithin: {
                    $centerSphere: [
                        [
                            parseFloat(lng),
                            parseFloat(lat)
                        ],
                        radius
                    ]
                }
            };

        }

        const requests = await Request.find(filter)
            .populate('hospitalId')
            .sort({
                createdAt: -1
            });

        const response = requests.map(r => {

            const obj = r.toObject();

            if (!obj.hospitalId || typeof obj.hospitalId !== 'object') {

                obj.hospitalId = {

                    hospitalName:
                        obj.hospitalName || 'Emergency Hospital',

                    city:
                        obj.hospitalCity || 'Unknown',

                    phone:
                        obj.hospitalPhone || 'N/A'

                };

            }

            obj.hospitalName =
                obj.hospitalName ||
                obj.hospitalId.hospitalName;

            obj.hospitalCity =
                obj.hospitalCity ||
                obj.hospitalId.city;

            obj.hospitalPhone =
                obj.hospitalPhone ||
                obj.hospitalId.phone;

            return obj;

        });

        return res.json({

            success: true,

            count: response.length,

            requests: response,

            data: response

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});
// =====================================================
// ACCEPT BLOOD REQUEST
// =====================================================
router.patch('/accept/:id', auth('donor'), async (req, res) => {

    try {

        const donorId = req.user.id;
        const requestId = req.params.id;

        // Find donor
        const donor = await Donor.findById(donorId);

        if (!donor) {

            return res.status(404).json({

                success: false,

                message: "Donor not found."

            });

        }

        // ============================
        // CHECK 60 DAY COOLDOWN
        // ============================

        if (
            donor.cooldownUntil &&
            donor.cooldownUntil > new Date()
        ) {

            const remainingDays = Math.ceil(

                (donor.cooldownUntil.getTime() - Date.now())

                /

                (1000 * 60 * 60 * 24)

            );

            return res.status(400).json({

                success: false,

                cooldown: true,

                remainingDays,

                message:
                    `You can donate again after ${remainingDays} day(s).`

            });

        }

        // ============================
        // FIND REQUEST
        // ============================

        const request = await Request.findById(requestId);

        if (!request) {

            return res.status(404).json({

                success: false,

                message: "Blood request not found."

            });

        }

        // ============================
        // ALREADY ACCEPTED ?
        // ============================

        if (request.status !== "pending") {

            return res.status(400).json({

                success: false,

                message:
                    "This blood request has already been accepted."

            });

        }

        // ============================
        // ACCEPT REQUEST
        // ============================

        request.status = "accepted";

        request.acceptedBy = donor._id;

        request.acceptedAt = new Date();

        // ============================
        // GOOGLE MAPS LINK
        // ============================

        let googleMapsUrl = "";

        if (

            request.location &&

            request.location.coordinates &&

            request.location.coordinates.length === 2

        ) {

            const longitude = request.location.coordinates[0];

            const latitude = request.location.coordinates[1];

            googleMapsUrl =

                `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

            request.navigationUrl = googleMapsUrl;

        }

        await request.save();

        return res.json({

            success: true,

            message: "Blood request accepted successfully.",

            googleMapsUrl,

            hospitalName: request.hospitalName,

            request

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});
// =====================================================
// DONOR PROFILE
// =====================================================
router.get('/profile', auth('donor'), async (req, res) => {

    try {

        const donor = await Donor.findById(req.user.id)
            .select('-password -otpCode -otpExpiresAt');

        if (!donor) {

            return res.status(404).json({

                success: false,

                message: "Donor not found."

            });

        }

        return res.json({

            success: true,

            donor,

            eligible: donor.cooldownUntil
                ? donor.cooldownUntil <= new Date()
                : true,

            cooldownUntil: donor.cooldownUntil,

            remainingDays:
                donor.cooldownUntil &&
                donor.cooldownUntil > new Date()

                    ? Math.ceil(

                        (donor.cooldownUntil.getTime() - Date.now())

                        /

                        (1000 * 60 * 60 * 24)

                    )

                    : 0

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});


// =====================================================
// UPDATE PROFILE
// =====================================================
router.put('/profile', auth('donor'), async (req, res) => {

    try {

        const {

            fullName,

            email,

            city,

            availabilityStatus,

            dob

        } = req.body;

        const donor = await Donor.findById(req.user.id);

        if (!donor) {

            return res.status(404).json({

                success: false,

                message: "Donor not found."

            });

        }

        if (fullName)
            donor.name = fullName;

        if (email)
            donor.email = email;

        if (city)
            donor.city = city;

        if (availabilityStatus)
            donor.availabilityStatus = availabilityStatus;

        if (dob)
            donor.dob = dob;

        await donor.save();

        return res.json({

            success: true,

            message: "Profile updated successfully.",

            donor

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});


// =====================================================
// CHANGE PASSWORD
// =====================================================
router.put('/change-password', auth('donor'), async (req, res) => {

    try {

        const { password } = req.body;

        if (!password || password.length < 6) {

            return res.status(400).json({

                success: false,

                message: "Password must contain at least 6 characters."

            });

        }

        const hash = await bcrypt.hash(password, 10);

        await Donor.findByIdAndUpdate(

            req.user.id,

            {

                password: hash

            }

        );

        return res.json({

            success: true,

            message: "Password updated successfully."

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});
// =====================================================
// DONATION HISTORY
// =====================================================
router.get('/history', auth('donor'), async (req, res) => {
    try {

        const history = await Request.find({
            acceptedBy: req.user.id,
            status: {
                $in: ['accepted', 'completed', 'fulfilled']
            }
        })
        .populate('hospitalId', 'hospitalName city phone')
        .sort({ createdAt: -1 });

        return res.json({
            success: true,
            total: history.length,
            history
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
});


// =====================================================
// DONOR POINTS
// =====================================================
router.get('/points', auth('donor'), async (req, res) => {

    try {

        const donor = await Donor.findById(req.user.id)
            .select('name points totalDonations cooldownUntil');

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: 'Donor not found.'
            });
        }

        return res.json({
            success: true,
            donor
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


// =====================================================
// LEADERBOARD
// =====================================================
router.get('/leaderboard', async (req, res) => {

    try {

        const leaderboard = await Donor.find({
            isActive: true
        })
        .select('name city bloodGroup points totalDonations')
        .sort({
            points: -1,
            totalDonations: -1
        })
        .limit(100);

        return res.json({
            success: true,
            leaderboard
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


// =====================================================
// CHANGE DONOR AVAILABILITY
// =====================================================
router.put('/availability', auth('donor'), async (req, res) => {

    try {

        const donor = await Donor.findById(req.user.id);

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: 'Donor not found.'
            });
        }

        donor.availabilityStatus =
            donor.availabilityStatus === 'available'
                ? 'not available'
                : 'available';

        await donor.save();

        return res.json({
            success: true,
            availabilityStatus: donor.availabilityStatus
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


// =====================================================
// DEACTIVATE ACCOUNT
// =====================================================
router.put('/deactivate', auth('donor'), async (req, res) => {

    try {

        await Donor.findByIdAndUpdate(req.user.id, {
            isActive: false
        });

        return res.json({
            success: true,
            message: 'Account deactivated successfully.'
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

module.exports = router;