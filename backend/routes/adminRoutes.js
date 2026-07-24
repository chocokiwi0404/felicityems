const express = require("express");
const router  = express.Router();

const { createOrganizer, getAllOrganizers, toggleOrganizer, archiveOrganizer, deleteOrganizer, getStats, getPasswordResets, handlePasswordReset } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

// Every route in this file requires a valid JWT AND role="admin"
router.use(protect, authorize("admin"));

router.route("/organizers")
  .post(createOrganizer)   // POST   /api/admin/organizers
  .get(getAllOrganizers);   // GET    /api/admin/organizers

router.patch("/organizers/:id/toggle",  toggleOrganizer);   // activate / deactivate
router.patch("/organizers/:id/archive", archiveOrganizer);  // archive / unarchive toggle
router.delete("/organizers/:id",        deleteOrganizer);   // permanent delete


router.get("/stats", getStats);

router.route("/password-resets")
  .get(getPasswordResets);                          // GET  /api/admin/password-resets

router.patch("/password-resets/:id", handlePasswordReset); // PATCH /api/admin/password-resets/:id

module.exports = router;