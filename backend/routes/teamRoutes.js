const express = require("express");
const router  = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Team         = require("../models/Team");
const Event        = require("../models/Event");
const Registration = require("../models/Registration");
const User         = require("../models/User");
const { sendTeamInviteEmail, sendTicketEmail } = require("../utils/mailer");

router.use(protect, authorize("participant"));

// ── POST /api/teams/create ────────────────────────────────────────────────────
// Leader creates a team for a team-enabled event
router.post("/create", async (req, res) => {
  try {
    const { eventId, teamName, maxSize } = req.body;
    if (!eventId || !teamName || !maxSize) {
      return res.status(400).json({ success: false, message: "eventId, teamName, maxSize required." });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    if (!["Published","Ongoing"].includes(event.status)) {
      return res.status(400).json({ success: false, message: "Event is not open for registration." });
    }

    // Check if leader already has a team for this event
    const existing = await Team.findOne({ event: eventId, leader: req.user._id, status: { $ne: "Cancelled" } });
    if (existing) return res.status(400).json({ success: false, message: "You already have a team for this event." });

    // Check if leader is already a member of another team
    const asMember = await Team.findOne({
      event: eventId,
      "members.user": req.user._id,
      status: { $ne: "Cancelled" },
    });
    if (asMember) return res.status(400).json({ success: false, message: "You are already in a team for this event." });

    const team = await Team.create({
      event:    eventId,
      teamName: teamName.trim(),
      leader:   req.user._id,
      maxSize:  Number(maxSize),
      members:  [{ user: req.user._id, status: "Accepted", joinedAt: new Date() }],
    });

    res.status(201).json({ success: true, team });
  } catch (err) {
    console.error("team/create error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/teams/invite ────────────────────────────────────────────────────
// Leader invites a participant by email
router.post("/invite", async (req, res) => {
  try {
    const { teamId, email } = req.body;
    const team = await Team.findById(teamId).populate("event");
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the team leader can invite members." });
    }
    if (team.status !== "Forming") {
      return res.status(400).json({ success: false, message: "Team is no longer forming." });
    }
    if (team.members.length >= team.maxSize) {
      return res.status(400).json({ success: false, message: "Team is already full." });
    }

    const invitee = await User.findOne({ email: email.toLowerCase(), role: "participant" });
    if (!invitee) return res.status(404).json({ success: false, message: "No participant found with that email." });
    if (invitee._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot invite yourself." });
    }

    // Check if already invited
    const alreadyIn = team.members.find(m => m.user.toString() === invitee._id.toString());
    if (alreadyIn) return res.status(400).json({ success: false, message: "This person is already in your team." });

    team.members.push({ user: invitee._id, status: "Pending" });
    await team.save();

    // Send invite email
    try {
      const leader = await User.findById(req.user._id);
      await sendTeamInviteEmail({
        to:         invitee.email,
        inviteeName: invitee.firstName,
        leaderName: `${leader.firstName} ${leader.lastName}`,
        teamName:   team.teamName,
        eventName:  team.event.eventName,
        inviteCode: team.inviteCode,
        inviteLink: `${process.env.FRONTEND_URL}/participant/teams/join/${team.inviteCode}`,
      });
    } catch (mailErr) {
      console.error("Invite email failed:", mailErr);
    }

    await team.populate("members.user", "firstName lastName email");
    res.status(200).json({ success: true, team });
  } catch (err) {
    console.error("team/invite error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/teams/invite/:code ───────────────────────────────────────────────
// Get team info from invite code (for the join page)
router.get("/invite/:code", async (req, res) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.code })
      .populate("event", "eventName eventStartDate")
      .populate("leader", "firstName lastName")
      .populate("members.user", "firstName lastName email");
    if (!team) return res.status(404).json({ success: false, message: "Invalid invite code." });
    res.status(200).json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/teams/join/:code ────────────────────────────────────────────────
// Invitee accepts the invite
router.post("/join/:code", async (req, res) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.code }).populate("event");
    if (!team) return res.status(404).json({ success: false, message: "Invalid invite code." });
    if (team.status !== "Forming") {
      return res.status(400).json({ success: false, message: "This team is no longer accepting members." });
    }

    const memberEntry = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!memberEntry) return res.status(403).json({ success: false, message: "You were not invited to this team." });
    if (memberEntry.status === "Accepted") {
      return res.status(400).json({ success: false, message: "You already accepted this invite." });
    }

    memberEntry.status   = "Accepted";
    memberEntry.joinedAt = new Date();

    // Check if team is now complete (all members accepted)
    const acceptedCount = team.members.filter(m => m.status === "Accepted").length;
    if (acceptedCount >= team.maxSize) {
      team.status     = "Complete";
      team.isComplete = true;

      // Create confirmed registrations for all members
      const event = team.event;
      for (const member of team.members.filter(m => m.status === "Accepted")) {
        const already = await Registration.findOne({ participant: member.user, event: event._id });
        if (!already) {
          const reg = await Registration.create({
            participant:      member.user,
            event:            event._id,
            registrationType: "Normal",
            status:           "Confirmed",
            team:             team._id,
          });
          // Send ticket email
          try {
            const memberUser = await User.findById(member.user);
            await sendTicketEmail({ registration: reg, user: memberUser, event });
          } catch (e) { console.error("ticket email error:", e); }
        }
      }

      // Increment event registration count
      await Event.findByIdAndUpdate(event._id, {
        $inc: { registrationCount: acceptedCount },
      });
    }

    await team.save();
    await team.populate("members.user", "firstName lastName email");
    res.status(200).json({ success: true, team });
  } catch (err) {
    console.error("team/join error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/teams/decline/:code ─────────────────────────────────────────────
// Invitee declines the invite
router.post("/decline/:code", async (req, res) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.code });
    if (!team) return res.status(404).json({ success: false, message: "Invalid invite code." });

    const memberEntry = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!memberEntry) return res.status(403).json({ success: false, message: "You were not invited." });

    memberEntry.status = "Rejected";
    await team.save();

    res.status(200).json({ success: true, message: "Invite declined." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/teams/my ────────────────────────────────────────────────────────
// Get all teams the logged-in participant is part of
router.get("/my", async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { leader:          req.user._id },
        { "members.user":  req.user._id },
      ],
      status: { $ne: "Cancelled" },
    })
      .populate("event", "eventName eventStartDate status")
      .populate("leader", "firstName lastName email")
      .populate("members.user", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── GET /api/teams/:id ────────────────────────────────────────────────────────
// Get single team detail
router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("event", "eventName eventStartDate eventEndDate organizer")
      .populate("leader", "firstName lastName email")
      .populate("members.user", "firstName lastName email");
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });

    // Only members/leader can view
    const isMember = team.members.some(m => m.user._id.toString() === req.user._id.toString());
    const isLeader = team.leader._id.toString() === req.user._id.toString();
    if (!isMember && !isLeader) {
      return res.status(403).json({ success: false, message: "Not a member of this team." });
    }

    res.status(200).json({ success: true, team });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;