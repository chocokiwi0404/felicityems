const express = require("express");
const router  = express.Router();

const {
  createEvent, getMyEvents, getMyEvent,
  updateEvent, updateEventStatus, getAnalytics,
  getProfile, updateProfile,
} = require("../controllers/eventController");

const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("organizer"));

router.route("/profile")
  .get(getProfile)
  .patch(updateProfile);

router.get("/analytics", getAnalytics);

router.route("/events")
  .get(getMyEvents)
  .post(createEvent);

router.route("/events/:id")
  .get(getMyEvent)
  .put(updateEvent);

router.patch("/events/:id/status", updateEventStatus);

// GET /api/organizer/events/:id/registrations
// Returns all registrations for a specific event (must belong to this organizer)
router.get("/events/:id/registrations", async (req, res) => {
  try {
    const Organizer    = require("../models/Organizer");
    const Registration = require("../models/Registration");
    const Event        = require("../models/Event");

    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const event = await Event.findOne({ _id: req.params.id, organizer: organizer._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const registrations = await Registration.find({ event: req.params.id })
      .populate("participant", "firstName lastName email contactNumber")
      .populate("team", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, registrations });
  } catch (err) {
    console.error("event registrations error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /api/organizer/password-reset-request
router.post("/password-reset-request", async (req, res) => {
  try {
    const Organizer            = require("../models/Organizer");
    const PasswordResetRequest = require("../models/PasswordResetRequest");

    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Reason is required." });

    // Check if there's already a pending request
    const existing = await PasswordResetRequest.findOne({ organizer: organizer._id, status: "Pending" });
    if (existing) return res.status(400).json({ success: false, message: "You already have a pending reset request. Please wait for the admin to process it." });

    await PasswordResetRequest.create({ organizer: organizer._id, reason });
    res.status(201).json({ success: true, message: "Request submitted successfully." });
  } catch (err) {
    console.error("password-reset-request error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;

// ── GET /api/organizer/events/:id/payments ────────────────────────────────────
// Organizer views all pending payment proofs for a merchandise event
router.get("/events/:id/payments", async (req, res) => {
  try {
    const Organizer    = require("../models/Organizer");
    const Registration = require("../models/Registration");
    const Event        = require("../models/Event");

    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const event = await Event.findOne({ _id: req.params.id, organizer: organizer._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const registrations = await Registration.find({
      event: req.params.id,
      registrationType: "Merchandise",
      paymentStatus: { $in: ["Pending", "Approved", "Rejected"] },
    }).populate("participant", "firstName lastName email").sort({ createdAt: -1 });

    res.status(200).json({ success: true, registrations });
  } catch (err) {
    console.error("payments error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── PATCH /api/organizer/events/:id/payments/:regId ───────────────────────────
// Organizer approves or rejects a payment
router.patch("/events/:id/payments/:regId", async (req, res) => {
  try {
    const Organizer    = require("../models/Organizer");
    const Registration = require("../models/Registration");
    const Event        = require("../models/Event");
    const User         = require("../models/User");
    const generateQR   = (() => { try { return require("../utils/generateQR"); } catch { return null; } })();
    const mailer       = (() => { try { return require("../utils/mailer"); }    catch { return null; } })();

    const { action } = req.body; // "approve" or "reject"
    if (!["approve","reject"].includes(action))
      return res.status(400).json({ success: false, message: "action must be approve or reject." });

    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer not found." });

    const event = await Event.findOne({ _id: req.params.id, organizer: organizer._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const reg = await Registration.findOne({ _id: req.params.regId, event: req.params.id })
      .populate("participant", "firstName lastName email");
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found." });
    if (reg.paymentStatus !== "Pending")
      return res.status(400).json({ success: false, message: "Payment is not in Pending state." });

    if (action === "reject") {
      await Registration.findByIdAndUpdate(reg._id, {
        paymentStatus: "Rejected",
        paymentReviewedAt: new Date(),
        paymentReviewedBy: req.user._id,
      });
      return res.status(200).json({ success: true, message: "Payment rejected." });
    }

    // APPROVE: generate QR, decrement stock, send email
    let qrCode = null;
    if (generateQR) {
      qrCode = await generateQR({ ticketId: reg.ticketId, eventId: String(event._id), participantId: String(reg.participant._id) });
    }

    // Decrement stock
    if (reg.selectedVariant?.size) {
      const variant = event.variants?.find(
        v => v.size === reg.selectedVariant.size && v.color === reg.selectedVariant.color
      );
      if (variant) {
        variant.stockQuantity = Math.max(0, variant.stockQuantity - (reg.quantity || 1));
        await event.save();
      }
    }

    await Registration.findByIdAndUpdate(reg._id, {
      paymentStatus:     "Approved",
      status:            "Confirmed",
      qrCode,
      paymentReviewedAt: new Date(),
      paymentReviewedBy: req.user._id,
    });

    await Event.findByIdAndUpdate(event._id, {
      $inc: { revenue: event.registrationFee * (reg.quantity || 1) },
    });

    // Send confirmation email
    if (mailer?.sendPaymentApprovedEmail && process.env.MAIL_USER) {
      mailer.sendPaymentApprovedEmail(reg.participant.email, {
        participantName: `${reg.participant.firstName} ${reg.participant.lastName}`,
        eventName: event.eventName,
        ticketId:  reg.ticketId,
        qrCode,
      }).catch(e => console.error("Payment approval email error:", e));
    }

    res.status(200).json({ success: true, message: "Payment approved. Ticket generated." });
  } catch (err) {
    console.error("payment approval error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});