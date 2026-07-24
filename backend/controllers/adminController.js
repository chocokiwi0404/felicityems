const crypto = require("crypto");
const User = require("../models/User");
const Organizer = require("../models/Organizer");
const PasswordResetRequest = require("../models/PasswordResetRequest");


const generatePassword = () => crypto.randomBytes(9).toString("base64");


const generateOrganizerEmail = (name) => {
  const adminDomain = process.env.ADMIN_EMAIL_DOMAIN || "admin.com";
  const slug = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  return `${slug}@${adminDomain}`;
};

// Creates a User (role=organizer) and linked Organizer profile.
// Returns plaintext credentials ONCE — admin copies and shares them with the club.
const createOrganizer = async (req, res) => {
  try {
    const { organizerName, category, description, contactEmail } = req.body;

    if (!organizerName || !category) {
      return res.status(400).json({ success: false, message: "organizerName and category are required." });
    }

    const loginEmail = generateOrganizerEmail(organizerName);
    const plainPassword = generatePassword();

    const existing = await User.findOne({ email: loginEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Email ${loginEmail} is already taken. Try a different organizer name.`,
      });
    }

    const user = await User.create({
      firstName: organizerName,
      lastName: "",
      email: loginEmail,
      password: plainPassword,
      role: "organizer",
    });

    // Create the Organizer profile linked to that User
    const organizer = await Organizer.create({
      user: user._id,
      organizerName,
      category,
      description: description || "",
      // contactEmail is the club's public-facing email (can differ from login email)
      contactEmail: contactEmail || loginEmail,
    });

    // Return plaintext password — ONLY time it will ever be accessible in plaintext
    res.status(201).json({
      success: true,
      message: "Organizer account created. Share these credentials with the club.",
      credentials: {
        loginEmail,
        password: plainPassword,
      },
      organizer,
    });

  } catch (err) {
    console.error("createOrganizer error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── GET /api/admin/organizers ─────────────────────────────────────────────────
// Returns all organizer accounts for the admin dashboard.
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find()
      .populate("user", "-password") // include linked User data, exclude password hash
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: organizers.length, organizers });
  } catch (err) {
    console.error("getAllOrganizers error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── PATCH /api/admin/organizers/:id/toggle ────────────────────────────────────
// Flips isActive on the linked User. A deactivated organizer can't log in because
// the protect middleware checks isActive and rejects the request before any controller runs.
const toggleOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).populate("user");
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer not found." });
    }

    organizer.user.isActive = !organizer.user.isActive;
    await organizer.user.save();

    res.status(200).json({
      success: true,
      message: `Organizer ${organizer.user.isActive ? "activated" : "deactivated"}.`,
      isActive: organizer.user.isActive,
    });
  } catch (err) {
    console.error("toggleOrganizer error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// Toggles isArchived on the Organizer profile.
// Archived organizers are hidden from public listings but all data is preserved.
// Calling the same endpoint again unarchives them.
const archiveOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer not found." });
    }

    organizer.isArchived = !organizer.isArchived;
    await organizer.save();

    const action = organizer.isArchived ? "archived" : "unarchived";
    res.status(200).json({
      success: true,
      message: `Organizer ${action} successfully.`,
      isArchived: organizer.isArchived,
    });
  } catch (err) {
    console.error("archiveOrganizer error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const deleteOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ success: false, message: "Organizer not found." });
    }

    const Event = require("../models/Event");
    const Registration = require("../models/Registration");
    const Team = require("../models/Team");
    const ChatMessage = require("../models/ChatMessage");
    const Feedback = require("../models/Feedback");
    const ForumMessage = require("../models/ForumMessage");

    // 1. Find all events belonging to this organizer
    const events = await Event.find({ organizer: organizer._id }).select("_id");
    const eventIds = events.map(e => e._id);

    if (eventIds.length > 0) {
      // 2. Find all registrations for those events
      const registrations = await Registration.find({ event: { $in: eventIds } }).select("_id");
      const registrationIds = registrations.map(r => r._id);

      // 3. Find all teams for those events
      const teams = await Team.find({ event: { $in: eventIds } }).select("_id");
      const teamIds = teams.map(t => t._id);

      // 4. Delete in dependency order (children before parents)
      await ChatMessage.deleteMany({ team: { $in: teamIds } });          // chat messages
      await Feedback.deleteMany({ event: { $in: eventIds } });           // anonymous feedback
      await ForumMessage.deleteMany({ event: { $in: eventIds } });       // forum messages
      await Registration.deleteMany({ _id: { $in: registrationIds } });  // registrations/tickets
      await Team.deleteMany({ _id: { $in: teamIds } });                  // teams
      await Event.deleteMany({ _id: { $in: eventIds } });                // events
    }

    // 5. Delete password reset requests for this organizer
    await PasswordResetRequest.deleteMany({ organizer: organizer._id });

    // 6. Delete the organizer profile and user account
    await Organizer.findByIdAndDelete(organizer._id);
    await User.findByIdAndDelete(organizer.user);

    res.status(200).json({
      success: true,
      message: "Organizer and all associated data permanently deleted.",
      deleted: {
        events: eventIds.length,
      },
    });
  } catch (err) {
    console.error("deleteOrganizer error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};


// ── GET /api/admin/stats ──────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const Event = require("../models/Event");
    const [totalUsers, totalOrganizers, totalEvents, pendingResets] = await Promise.all([
      User.countDocuments({ role: "participant" }),
      Organizer.countDocuments({ isArchived: false }),
      Event.countDocuments({ isArchived: { $ne: true } }),
      PasswordResetRequest.countDocuments({ status: "Pending" }),
    ]);
    res.status(200).json({ success: true, totalUsers, totalOrganizers, totalEvents, pendingResets });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── GET /api/admin/password-resets ───────────────────────────────────────────
const getPasswordResets = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate({ path: "organizer", select: "organizerName loginEmail" })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── PATCH /api/admin/password-resets/:id ─────────────────────────────────────
// Approve → generate new password, share with admin. Reject → update status.
const handlePasswordReset = async (req, res) => {
  try {
    const { action, adminComment } = req.body; // action: "approve" | "reject"
    const request = await PasswordResetRequest.findById(req.params.id)
      .populate({ path: "organizer", populate: { path: "user" } });

    if (!request) return res.status(404).json({ success: false, message: "Request not found." });
    if (request.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Request already handled." });
    }

    if (action === "approve") {
      const newPassword = generatePassword();

      // Step 1: get the user ID safely whether populated or not
      const userId = request.organizer.user?._id || request.organizer.user;

      // Step 2: use findById + .save() so User pre-save bcrypt hook fires
      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ success: false, message: "Organizer user account not found." });
      userDoc.password = newPassword;
      await userDoc.save();

      // Step 3: update request using findByIdAndUpdate (avoids populated-doc save issues)
      await PasswordResetRequest.findByIdAndUpdate(request._id, {
        status: "Approved",
        adminComment: adminComment || "",
        newPassword: newPassword,
        resolvedAt: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Request approved. Share the new password with the organizer.",
        newPassword,
      });
    }

    if (action === "reject") {
      request.status = "Rejected";
      request.adminComment = adminComment || "";
      request.resolvedAt = new Date();
      await request.save();
      return res.status(200).json({ success: true, message: "Request rejected.", request });
    }

    res.status(400).json({ success: false, message: "Invalid action. Use approve or reject." });
  } catch (err) {
    console.error("handlePasswordReset error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { createOrganizer, getAllOrganizers, toggleOrganizer, archiveOrganizer, deleteOrganizer, getStats, getPasswordResets, handlePasswordReset };