const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { protect, authorize } = require("../middleware/auth");
const Feedback     = require("../models/Feedback");
const Registration = require("../models/Registration");

// ── POST /api/feedback ────────────────────────────────────────────────────────
// Participant submits feedback for an event they attended
router.post("/", protect, authorize("participant"), async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    if (!eventId || !rating) {
      return res.status(400).json({ success: false, message: "eventId and rating required." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be 1–5." });
    }

    // Verify participant attended this event
    const reg = await Registration.findOne({
      participant: req.user._id,
      event:       eventId,
      attended:    true,
    });
    if (!reg) {
      return res.status(403).json({ success: false, message: "You can only review events you attended." });
    }

    // Anonymous hash: SHA-256 of userId + eventId
    const participantHash = crypto
      .createHash("sha256")
      .update(`${req.user._id}${eventId}`)
      .digest("hex");

    // Upsert: update if already submitted, create if not
    const feedback = await Feedback.findOneAndUpdate(
      { event: eventId, participantHash },
      { rating, comment: comment?.trim() || "" },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error("feedback submit error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/feedback/event/:eventId ──────────────────────────────────────────
// Organizer views aggregated feedback for their event
router.get("/event/:eventId", protect, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ event: req.params.eventId }).sort({ createdAt: -1 });

    const total   = feedbacks.length;
    const average = total ? (feedbacks.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : 0;
    const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    feedbacks.forEach(f => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

    // Filter by rating if query param provided
    const { rating } = req.query;
    const filtered = rating ? feedbacks.filter(f => f.rating === Number(rating)) : feedbacks;

    res.status(200).json({
      success: true,
      total,
      average: Number(average),
      distribution,
      feedbacks: filtered.map(f => ({
        _id:       f._id,
        rating:    f.rating,
        comment:   f.comment,
        createdAt: f.createdAt,
        // participant identity is NOT returned — only the hash
      })),
    });
  } catch (err) {
    console.error("feedback/event error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/feedback/my/:eventId ─────────────────────────────────────────────
// Check if participant already submitted feedback for this event
router.get("/my/:eventId", protect, authorize("participant"), async (req, res) => {
  try {
    const participantHash = require("crypto")
      .createHash("sha256")
      .update(`${req.user._id}${req.params.eventId}`)
      .digest("hex");

    const feedback = await Feedback.findOne({ event: req.params.eventId, participantHash });
    res.status(200).json({ success: true, feedback: feedback || null });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;