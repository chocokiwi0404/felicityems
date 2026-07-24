const express = require("express");
const router = express.Router();
const Organizer = require("../models/Organizer");

// GET /api/organizers
// All active (non-archived) organizers — used on Clubs page and onboarding
router.get("/", async (req, res) => {
  try {
    const organizers = await Organizer.find({ isArchived: false })
      .select("organizerName category description contactEmail")
      .sort({ organizerName: 1 });

    res.status(200).json({ success: true, organizers });
  } catch (err) {
    console.error("GET /api/organizers error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /api/organizers/:id
// Single organizer with their published/ongoing events
router.get("/:id", async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select("organizerName category description contactEmail contactNumber events isArchived");

    if (!organizer || organizer.isArchived) {
      return res.status(404).json({ success: false, message: "Organizer not found." });
    }

    // Populate events separately with null-safe filter
    // This avoids crashes when an event ID in the array no longer exists in DB
    const Event = require("../models/Event");
    const events = await Event.find({
      _id: { $in: organizer.events },
      isArchived: { $ne: true },
      status: { $in: ["Published", "Ongoing", "Completed"] },
    }).select("eventName eventType status eventStartDate eventEndDate registrationFee");

    res.status(200).json({
      success: true,
      organizer: {
        ...organizer.toObject(),
        events,
      },
    });
  } catch (err) {
    console.error("GET /api/organizers/:id error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;