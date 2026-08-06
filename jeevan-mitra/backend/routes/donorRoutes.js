const express = require("express");
const router = express.Router();

const donorController = require("../controllers/donorController");
const { auth } = require("../middleware/auth");

router.use(auth("donor"));

router.get("/profile", donorController.getProfile);

router.put("/profile", donorController.updateProfile);

router.put("/availability", donorController.changeAvailability);

router.put("/change-password", donorController.changePassword);

router.get("/feed", donorController.getFeed);

router.patch("/accept/:requestId", donorController.acceptRequest);

router.get("/history", donorController.getHistory);

router.get("/points", donorController.getPoints);

router.get("/leaderboard", donorController.getLeaderboard);

router.get("/qr", donorController.getQRCode);

router.put("/deactivate", donorController.deactivateAccount);

module.exports = router;