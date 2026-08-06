const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Admin
router.post("/admin/login", authController.adminLogin);

// Donor
router.post("/donor/send-otp", authController.sendOTP);
router.post("/donor/verify-otp", authController.verifyOTP);

// Logout
router.post("/logout", authController.logout);

module.exports = router;