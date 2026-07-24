const Event = require("../models/Event");
const Organizer = require("../models/Organizer");

// Helper: get the Organizer doc for the logged-in user
const getOrganizerForUser = async (userId) => {
  return await Organizer.findOne({ user: userId });
};

// ── POST /api/organizer/events ────────────────────────────────────────────────
// Create a new event (defaults to Draft)
const createEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    const {
      eventName, description, eventType, eligibility,
      registrationDeadline, eventStartDate, eventEndDate,
      registrationLimit, registrationFee, tags,
      customFormFields, variants, purchaseLimitPerUser, status,
    } = req.body;

    const event = await Event.create({
      eventName,
      description,
      eventType,
      eligibility,
      registrationDeadline,
      eventStartDate,
      eventEndDate,
      registrationLimit: registrationLimit || null,
      registrationFee: registrationFee || 0,
      tags: tags || [],
      customFormFields: customFormFields || [],
      variants: variants || [],
      purchaseLimitPerUser: purchaseLimitPerUser || 1,
      organizer: organizer._id,
      status: status || "Draft",
    });

    // Push event ID into the organizer's events array
    await Organizer.findByIdAndUpdate(organizer._id, {
      $push: { events: event._id },
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error("createEvent error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error." });
  }
};

// ── GET /api/organizer/events ─────────────────────────────────────────────────
// Get all events belonging to the logged-in organizer
const getMyEvents = async (req, res) => {
  try {
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: "Account is archived." });
    }

    // Step 1: Find organizer profile using user id
    const organizer = await Organizer.findOne({ user: req.user._id });

    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    // Step 2: Use organizer._id to fetch events
    const events = await Event.find({ organizer: organizer._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, events });

  } catch (err) {
    console.error("getMyEvents error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


// ── GET /api/organizer/events/:id ─────────────────────────────────────────────
// Get single event (must belong to this organizer)
const getMyEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    const event = await Event.findOne({ _id: req.params.id, organizer: organizer._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    res.status(200).json({ success: true, event });
  } catch (err) {
    console.error("getMyEvent error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── PUT /api/organizer/events/:id ─────────────────────────────────────────────
// Update event — enforces editing rules based on current status
const updateEvent = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    const event = await Event.findOne({ _id: req.params.id, organizer: organizer._id });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Editing rules from spec 10.4
    if (["Ongoing", "Completed", "Closed"].includes(event.status)) {
      return res.status(403).json({
        success: false,
        message: `Cannot edit an event with status "${event.status}". Use the status endpoint instead.`,
      });
    }

    const updates = req.body;

    // Published events: only allow description, deadline, limit edits
    if (event.status === "Published") {
      const allowedFields = ["description", "registrationDeadline", "registrationLimit", "status"];
      Object.keys(updates).forEach(key => {
        if (!allowedFields.includes(key)) delete updates[key];
      });
    }

    // Don't let the form be edited if it's locked (has registrations)
    if (event.formLocked && updates.customFormFields) {
      delete updates.customFormFields;
    }

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, event: updated });
  } catch (err) {
    console.error("updateEvent error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error." });
  }
};

// ── PATCH /api/organizer/events/:id/status ────────────────────────────────────
// Change event status only
const updateEventStatus = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    const { status } = req.body;
    const validStatuses = ["Draft", "Published", "Ongoing", "Completed", "Closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, organizer: organizer._id },
      { $set: { status } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    res.status(200).json({ success: true, event });
  } catch (err) {
    console.error("updateEventStatus error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── GET /api/organizer/analytics ─────────────────────────────────────────────
// Aggregate analytics for the organizer's dashboard
const getAnalytics = async (req, res) => {
  try {
    const organizer = await getOrganizerForUser(req.user._id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer profile not found." });
    }

    const events = await Event.find({ organizer: organizer._id, isArchived: { $ne: true } });

    const analytics = {
      totalEvents: events.length,
      totalRegistrations: events.reduce((sum, e) => sum + (e.registrationCount || 0), 0),
      totalRevenue: events.reduce((sum, e) => sum + (e.revenue || 0), 0),
      byStatus: {
        Draft: events.filter(e => e.status === "Draft").length,
        Published: events.filter(e => e.status === "Published").length,
        Ongoing: events.filter(e => e.status === "Ongoing").length,
        Completed: events.filter(e => e.status === "Completed").length,
        Closed: events.filter(e => e.status === "Closed").length,
      },
    };

    res.status(200).json({ success: true, analytics });
  } catch (err) {
    console.error("getAnalytics error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


// ── GET /api/organizer/profile ────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ user: req.user._id });
    if (!organizer) return res.status(404).json({ success: false, message: "Organizer profile not found." });
    res.status(200).json({ success: true, organizer });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── PATCH /api/organizer/profile ──────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const allowed = ["organizerName", "category", "description", "contactEmail", "contactNumber", "discordWebhookUrl"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const organizer = await Organizer.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!organizer) return res.status(404).json({ success: false, message: "Profile not found." });
    res.status(200).json({ success: true, organizer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Server error." });
  }
};

module.exports = { createEvent, getMyEvents, getMyEvent, updateEvent, updateEventStatus, getAnalytics, getProfile, updateProfile };