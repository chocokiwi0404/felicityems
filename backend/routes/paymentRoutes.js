const express = require("express");
const router  = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Registration = require("../models/Registration");
const Event        = require("../models/Event");
const User         = require("../models/User");
const Organizer    = require("../models/Organizer");
const { sendMerchandiseApprovedEmail } = require("../utils/mailer");

// ── POST /api/payments/upload-proof ──────────────────────────────────────────
// Participant uploads payment proof (base64 image) for a merchandise registration
router.post("/upload-proof", protect, authorize("participant"), async (req, res) => {
  try {
    const { registrationId, proofBase64 } = req.body;
    if (!registrationId || !proofBase64) {
      return res.status(400).json({ success: false, message: "registrationId and proofBase64 required." });
    }
    // Validate base64 size (max ~5MB)
    if (proofBase64.length > 7 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image too large. Max 5MB." });
    }

    const reg = await Registration.findOne({ _id: registrationId, participant: req.user._id });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found." });
    if (reg.registrationType !== "Merchandise") {
      return res.status(400).json({ success: false, message: "Payment proof only for merchandise orders." });
    }
    if (reg.paymentStatus === "Approved") {
      return res.status(400).json({ success: false, message: "Payment already approved." });
    }

    reg.paymentProofUrl = proofBase64;
    reg.paymentStatus   = "Pending";
    reg.status          = "Pending";
    await reg.save();

    res.status(200).json({ success: true, registration: reg });
  } catch (err) {
    console.error("upload-proof error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/payments/organizer/orders ───────────────────────────────────────
// Organizer views all merchandise orders for their events
router.get("/organizer/orders", protect, authorize("organizer"), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const events = await Event.find({ organizer: organizer._id, eventType: "Merchandise" }).select("_id eventName");
    const eventIds = events.map(e => e._id);

    const { status } = req.query; // filter by paymentStatus
    const query = { event: { $in: eventIds }, registrationType: "Merchandise" };
    if (status && status !== "All") query.paymentStatus = status;

    const orders = await Registration.find(query)
      .populate("participant", "firstName lastName email")
      .populate("event", "eventName registrationFee")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("organizer/orders error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── PATCH /api/payments/organizer/orders/:id/approve ─────────────────────────
// Organizer approves a payment → generate QR, send email, decrement stock
router.patch("/organizer/orders/:id/approve", protect, authorize("organizer"), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const reg = await Registration.findById(req.params.id).populate("event");
    if (!reg) return res.status(404).json({ success: false, message: "Order not found." });

    // Verify this event belongs to organizer
    if (reg.event.organizer.toString() !== organizer._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your event." });
    }
    if (reg.paymentStatus === "Approved") {
      return res.status(400).json({ success: false, message: "Already approved." });
    }

    // Decrement stock
    if (reg.selectedVariant?.size || reg.selectedVariant?.color) {
      const event = await Event.findById(reg.event._id);
      const variant = event.variants.find(
        v => v.size === reg.selectedVariant.size && v.color === reg.selectedVariant.color
      );
      if (variant) {
        if (variant.stockQuantity < (reg.quantity || 1)) {
          return res.status(400).json({ success: false, message: "Insufficient stock to approve." });
        }
        variant.stockQuantity -= (reg.quantity || 1);
        await event.save();
      }
    }

    reg.paymentStatus      = "Approved";
    reg.status             = "Confirmed";
    reg.paymentReviewedBy  = req.user._id;
    reg.paymentReviewedAt  = new Date();
    await reg.save();

    // Send email with QR
    const participant = await User.findById(reg.participant);
    try {
      await sendMerchandiseApprovedEmail({ registration: reg, user: participant, event: reg.event });
    } catch (mailErr) {
      console.error("Approval email failed:", mailErr);
    }

    await reg.populate("participant", "firstName lastName email");
    res.status(200).json({ success: true, registration: reg });
  } catch (err) {
    console.error("approve error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── PATCH /api/payments/organizer/orders/:id/reject ──────────────────────────
// Organizer rejects a payment
router.patch("/organizer/orders/:id/reject", protect, authorize("organizer"), async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const reg = await Registration.findById(req.params.id).populate("event");
    if (!reg) return res.status(404).json({ success: false, message: "Order not found." });
    if (reg.event.organizer.toString() !== organizer._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your event." });
    }

    reg.paymentStatus     = "Rejected";
    reg.status            = "Rejected";
    reg.paymentReviewedBy = req.user._id;
    reg.paymentReviewedAt = new Date();
    await reg.save();

    await reg.populate("participant", "firstName lastName email");
    res.status(200).json({ success: true, registration: reg });
  } catch (err) {
    console.error("reject error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;