const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { adminAuth } = require("../middleware/auth");

router.use(adminAuth);

router.get("/dashboard", adminController.dashboard);

router.get("/stats", adminController.stats);

router.get("/donors", adminController.getDonors);

router.get("/hospitals", adminController.getHospitals);

router.get("/requests", adminController.getRequests);

router.get("/pending-hospitals", adminController.pendingHospitals);

router.patch("/hospital/:id/approve", adminController.approveHospital);

router.patch("/hospital/:id/reject", adminController.rejectHospital);

router.put("/hospital/:id/suspend", adminController.suspendHospital);

router.put("/donor/:id/suspend", adminController.suspendDonor);

router.delete("/hospital/:id", adminController.deleteHospital);

router.delete("/donor/:id", adminController.deleteDonor);

router.post("/broadcast", adminController.broadcastNotification);

module.exports = router;