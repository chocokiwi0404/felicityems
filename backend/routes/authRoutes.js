const express = require("express");
const router  = express.Router();

const { registerParticipant, loginUser, getMe, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public — no token required
router.post("/register", registerParticipant);
router.post("/login",    loginUser);

// Protected — protect runs first; if it fails, controller never runs
router.get("/me",               protect, getMe);
router.put("/change-password",  protect, changePassword);

module.exports = router;
