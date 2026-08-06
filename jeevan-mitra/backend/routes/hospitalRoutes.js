const express = require("express");
const router = express.Router();

const hospitalController = require("../controllers/hospitalController");
const { auth } = require("../middleware/auth");

// Public
router.post("/register", hospitalController.register);

router.post("/login", hospitalController.login);

// Protected
router.use(auth("hospital"));

router.get("/profile", hospitalController.getProfile);

router.put("/profile", hospitalController.updateProfile);

router.get("/dashboard", hospitalController.dashboard);

router.post("/requests", hospitalController.createRequest);

router.get("/requests", hospitalController.getRequests);

router.get("/requests/:id", hospitalController.getRequest);

router.patch("/complete/:requestId", hospitalController.completeDonation);

router.patch("/cancel/:requestId", hospitalController.cancelRequest);

router.delete("/requests/:id", hospitalController.deleteRequest);

module.exports = router;