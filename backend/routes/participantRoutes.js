const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { protect, authorize } = require("../middleware/auth");
const User = require("../models/User");
const Organizer = require("../models/Organizer");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Team = require("../models/Team");
const Feedback = require("../models/Feedback");

// Safe require — server won't crash if optional packages not installed yet
const tryRequire = (pkg) => { try { return require(pkg); } catch { return null; } };

router.use(protect, authorize("participant"));

// ── GET /api/participants/profile ─────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("preferences.followedOrganizers", "organizerName category _id");
    res.status(200).json({ success: true, participant: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── PATCH /api/participants/profile ───────────────────────────────────────────
router.patch("/profile", async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeOrOrgName } = req.body;
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (contactNumber !== undefined) updates.contactNumber = contactNumber;
    if (collegeOrOrgName !== undefined) updates.collegeOrOrgName = collegeOrOrgName;
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select("-password");
    res.status(200).json({ success: true, participant: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET/PATCH /api/participants/preferences ───────────────────────────────────
router.get("/preferences", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("preferences")
      .populate("preferences.followedOrganizers", "organizerName category _id");
    res.status(200).json({ success: true, preferences: user.preferences });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.patch("/preferences", async (req, res) => {
  try {
    const { areasOfInterest, followedOrganizers } = req.body;
    const updateFields = {};
    if (areasOfInterest !== undefined) updateFields["preferences.areasOfInterest"] = areasOfInterest;
    if (followedOrganizers !== undefined) updateFields["preferences.followedOrganizers"] = followedOrganizers;
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updateFields }, { new: true }).select("-password");
    res.status(200).json({ success: true, preferences: user.preferences });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── Follow / Unfollow ─────────────────────────────────────────────────────────
router.post("/follow/:organizerId", async (req, res) => {
  try {
    const org = await Organizer.findById(req.params.organizerId);
    if (!org) return res.status(404).json({ success: false, message: "Organizer not found." });
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { "preferences.followedOrganizers": req.params.organizerId },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/unfollow/:organizerId", async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { "preferences.followedOrganizers": req.params.organizerId },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/participants/registrations/mine ──────────────────────────────────
router.get("/registrations/mine", async (req, res) => {
  try {
    const registrations = await Registration.find({ participant: req.user._id })
      .populate({
        path: "event",
        select: "eventName eventType status eventStartDate eventEndDate organizer registrationFee",
        populate: { path: "organizer", select: "organizerName" },
      })
      .populate("team", "teamName status isComplete inviteCode")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, registrations });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/participants/registrations/:id ───────────────────────────────────
router.get("/registrations/:id", async (req, res) => {
  try {
    const reg = await Registration.findOne({ _id: req.params.id, participant: req.user._id })
      .populate({ path: "event", populate: { path: "organizer", select: "organizerName contactEmail" } })
      .populate("team", "teamName members inviteCode status");
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found." });
    res.status(200).json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/participants/registrations/:id/upload-payment ──────────────────
router.post("/registrations/:id/upload-payment", async (req, res) => {
  try {
    const reg = await Registration.findOne({ _id: req.params.id, participant: req.user._id });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found." });
    if (reg.registrationType !== "Merchandise")
      return res.status(400).json({ success: false, message: "Only merchandise orders need payment proof." });
    const { paymentProofUrl } = req.body;
    if (!paymentProofUrl) return res.status(400).json({ success: false, message: "No proof provided." });
    await Registration.findByIdAndUpdate(reg._id, { paymentProofUrl, paymentStatus: "Pending" });
    res.status(200).json({ success: true, message: "Payment proof uploaded. Awaiting approval." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── Events list ───────────────────────────────────────────────────────────────
// ── Events list ───────────────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  try {
    const { search, type, eligibility, from, to, followed } = req.query;
    const query = { status: { $in: ["Published", "Ongoing"] }, isArchived: { $ne: true } };
    if (type && type !== "All") query.eventType = type;
    if (eligibility && eligibility !== "All") query.eligibility = eligibility;
    if (from || to) {
      query.eventStartDate = {};
      if (from) query.eventStartDate.$gte = new Date(from);
      if (to) query.eventStartDate.$lte = new Date(to);
    }
    if (followed === "true") {
      const user = await User.findById(req.user._id).select("preferences.followedOrganizers");
      const ids = user.preferences?.followedOrganizers || [];
      const orgs = await Organizer.find({ _id: { $in: ids } }).select("_id");
      query.organizer = { $in: orgs.map(o => o._id) };
    }
    let events;
    if (search) {
      events = await Event.find({ ...query, $text: { $search: search } })
        .populate("organizer", "organizerName category")
        .sort({ score: { $meta: "textScore" } });
    } else {
      events = await Event.find(query).populate("organizer", "organizerName category").sort({ createdAt: -1 });
    }
    res.status(200).json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// FIXED: Added missing closing braces and catch block for trending route
router.get("/events/trending", async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRegs = await Registration.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$event", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const trendingIds = recentRegs.map(r => r._id);

    const events = await Event.find({
      _id: { $in: trendingIds },
      status: { $in: ["Published", "Ongoing"] }
    })
      .populate({
        path: "organizer",
        match: { isArchived: false },
        select: "organizerName category"
      });

    const filteredEvents = events.filter(e => e.organizer !== null);
    res.status(200).json({ success: true, events: filteredEvents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/events/recommended", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("preferences");
    const interests = user.preferences?.areasOfInterest || [];
    const followed = user.preferences?.followedOrganizers || [];
    if (!interests.length && !followed.length) return res.status(200).json({ success: true, events: [] });
    const orgs = followed.length ? await Organizer.find({ _id: { $in: followed } }).select("_id") : [];
    const orClauses = [];
    if (interests.length) orClauses.push({ tags: { $in: interests } });
    if (orgs.length) orClauses.push({ organizer: { $in: orgs.map(o => o._id) } });
    const events = await Event.find({
      status: { $in: ["Published", "Ongoing"] }, isArchived: { $ne: true }, $or: orClauses,
    }).populate("organizer", "organizerName").sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});
router.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, isArchived: { $ne: true } })
      .populate("organizer", "organizerName category contactEmail description");
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    const existing = await Registration.findOne({ participant: req.user._id, event: req.params.id });
    const myTeam = await Team.findOne({
      event: req.params.id,
      $or: [{ leader: req.user._id }, { "members.user": req.user._id }],
    });
    res.status(200).json({ success: true, event, alreadyRegistered: !!existing, registration: existing, myTeam });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/participants/events/:id/register ────────────────────────────────
router.post("/events/:id/register", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    if (!["Published", "Ongoing"].includes(event.status))
      return res.status(400).json({ success: false, message: "Registrations not open." });
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline))
      return res.status(400).json({ success: false, message: "Deadline passed." });
    if (event.registrationLimit && event.registrationCount >= event.registrationLimit)
      return res.status(400).json({ success: false, message: "Registration limit reached." });
    const existing = await Registration.findOne({ participant: req.user._id, event: req.params.id });
    if (existing) return res.status(400).json({ success: false, message: "Already registered." });

    const { formAnswers, selectedVariant, quantity } = req.body;
    const isMerch = event.eventType === "Merchandise";
    const hasFee = event.registrationFee > 0;
    const regStatus = isMerch && hasFee ? "Pending" : "Confirmed";
    const paymentStatus = isMerch ? (hasFee ? "Pending" : "Not Required") : "Not Required";

    if (isMerch && selectedVariant) {
      const variant = event.variants?.find(v => v.size === selectedVariant.size && v.color === selectedVariant.color);
      if (!variant) return res.status(400).json({ success: false, message: "Variant not found." });
      if (variant.stockQuantity < (quantity || 1))
        return res.status(400).json({ success: false, message: "Insufficient stock." });
      if (!hasFee) { // Free merch: decrement immediately
        variant.stockQuantity -= (quantity || 1);
        await event.save();
      }
    }

    const reg = await Registration.create({
      participant: req.user._id,
      event: req.params.id,
      registrationType: event.eventType,
      status: regStatus,
      paymentStatus,
      formAnswers: formAnswers || [],
      selectedVariant: selectedVariant || undefined,
      quantity: quantity || 1,
    });

    // Generate QR + send email for immediately confirmed registrations
    if (reg.status === "Confirmed") {
      try {
        const mailer = require("../utils/mailer");
        const participant = await User.findById(req.user._id).select("firstName lastName email");
        // Generate QR and save to registration
        const qrData = JSON.stringify({
          ticketId: reg.ticketId,
          eventId: String(event._id),
          userId: String(req.user._id),
        });
        const qrCode = await mailer.generateQR(qrData);
        if (qrCode) {
          await Registration.findByIdAndUpdate(reg._id, { qrCode });
          reg.qrCode = qrCode;
        }
        // Send confirmation email — non-blocking
        if (process.env.GMAIL_USER) {
          mailer.sendTicketEmail({ registration: reg, user: participant, event })
            .catch(e => console.error("Ticket email error:", e));
        }
      } catch (e) {
        // QR/email failure must never block registration from completing
        console.error("QR/email error (non-fatal):", e.message);
      }
      await Event.findByIdAndUpdate(req.params.id, {
        $inc: { registrationCount: 1, revenue: event.registrationFee || 0 },
      });
    } else {
      // Pending paid merch — QR generated only after payment approval
      await Event.findByIdAndUpdate(req.params.id, { $inc: { registrationCount: 1 } });
    }

    res.status(201).json({ success: true, registration: reg });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/participants/events/:id/feedback ────────────────────────────────
router.post("/events/:id/feedback", async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: "Rating must be 1–5." });
    const reg = await Registration.findOne({ participant: req.user._id, event: req.params.id, attended: true });
    if (!reg) return res.status(403).json({ success: false, message: "You can only review events you attended." });
    const participantHash = crypto.createHash("sha256").update(`${req.user._id}${req.params.id}`).digest("hex");
    const feedback = await Feedback.create({ event: req.params.id, participantHash, rating: Number(rating), comment: comment || "" });
    res.status(201).json({ success: true, feedback });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: "Already submitted feedback." });
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/events/:id/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ event: req.params.id }).select("-participantHash");
    const avg = feedbacks.length ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length : 0;
    res.status(200).json({ success: true, feedbacks, averageRating: Math.round(avg * 10) / 10, count: feedbacks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TEAM ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.post("/teams/create", async (req, res) => {
  try {
    const { eventId, teamName, maxSize, memberEmails } = req.body;
    if (!eventId || !teamName || !maxSize)
      return res.status(400).json({ success: false, message: "eventId, teamName, maxSize required." });
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    const existingTeam = await Team.findOne({ event: eventId, $or: [{ leader: req.user._id }, { "members.user": req.user._id }] });
    if (existingTeam) return res.status(400).json({ success: false, message: "Already in a team for this event." });

    const members = [];
    const invitedUsers = [];
    for (const email of (memberEmails || [])) {
      const u = await User.findOne({ email: email.toLowerCase().trim() }).select("_id firstName lastName email");
      if (u && u._id.toString() !== req.user._id.toString()) {
        members.push({ user: u._id, status: "Pending" });
        invitedUsers.push(u);
      }
    }

    const team = await Team.create({ event: eventId, teamName, leader: req.user._id, maxSize: Number(maxSize), members });
    await Registration.create({ participant: req.user._id, event: eventId, registrationType: "Normal", status: "Pending", team: team._id });

    const leader = await User.findById(req.user._id).select("firstName lastName");
    const mailer = tryRequire("../utils/mailer");
    if (mailer?.sendTeamInviteEmail && process.env.MAIL_USER) {
      for (const u of invitedUsers) {
        mailer.sendTeamInviteEmail(u.email, {
          inviteeName: u.firstName, teamName, eventName: event.eventName,
          inviteCode: team.inviteCode, leaderName: `${leader.firstName} ${leader.lastName}`,
        }).catch(e => console.error("Invite email error:", e));
      }
    }
    res.status(201).json({ success: true, team });
  } catch (err) {
    console.error("team create error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.post("/teams/join", async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ success: false, message: "Invite code required." });
    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!team) return res.status(404).json({ success: false, message: "Invalid invite code." });
    if (team.status !== "Forming") return res.status(400).json({ success: false, message: "Team no longer accepting members." });

    const memberEntry = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!memberEntry) return res.status(403).json({ success: false, message: "You were not invited to this team." });
    if (memberEntry.status === "Accepted") return res.status(400).json({ success: false, message: "Already joined." });

    memberEntry.status = "Accepted";
    memberEntry.joinedAt = new Date();

    const existingReg = await Registration.findOne({ participant: req.user._id, event: team.event });
    if (!existingReg) {
      await Registration.create({ participant: req.user._id, event: team.event, registrationType: "Normal", status: "Pending", team: team._id });
    }

    // Check if complete
    const acceptedCount = team.members.filter(m => m.status === "Accepted").length + 1; // +1 leader
    if (acceptedCount >= team.maxSize) {
      team.isComplete = true;
      team.status = "Complete";
      const generateQR = tryRequire("../utils/generateQR");
      const mailer = tryRequire("../utils/mailer");
      const allIds = [team.leader, ...team.members.map(m => m.user)];
      for (const uid of allIds) {
        const reg = await Registration.findOne({ participant: uid, event: team.event, team: team._id });
        if (reg && reg.status !== "Confirmed") {
          let qrCode = null;
          if (generateQR) qrCode = await generateQR({ ticketId: reg.ticketId, eventId: String(team.event), participantId: String(uid) });
          await Registration.findByIdAndUpdate(reg._id, { status: "Confirmed", qrCode });
          if (mailer?.sendTicketEmail && process.env.MAIL_USER) {
            const u = await User.findById(uid).select("firstName lastName email");
            const event = await Event.findById(team.event).select("eventName eventStartDate");
            mailer.sendTicketEmail(u.email, { eventName: event.eventName, ticketId: reg.ticketId, qrCode, participantName: `${u.firstName} ${u.lastName}`, eventDate: event.eventStartDate, registrationType: "Normal" }).catch(() => { });
          }
        }
      }
      await Event.findByIdAndUpdate(team.event, { $inc: { registrationCount: allIds.length } });
    }
    await team.save();
    res.status(200).json({ success: true, team, complete: team.status === "Complete" });
  } catch (err) {
    console.error("team join error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/teams/my", async (req, res) => {
  try {
    const teams = await Team.find({ $or: [{ leader: req.user._id }, { "members.user": req.user._id }] })
      .populate("event", "eventName eventStartDate eventType")
      .populate("leader", "firstName lastName email")
      .populate("members.user", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

router.get("/teams/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("event", "eventName eventStartDate eventType")
      .populate("leader", "firstName lastName email")
      .populate("members.user", "firstName lastName email");
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });
    const isMember = String(team.leader._id) === String(req.user._id)
      || team.members.some(m => String(m.user._id) === String(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: "Not a team member." });
    res.status(200).json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;