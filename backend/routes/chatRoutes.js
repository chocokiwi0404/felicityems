const express = require("express");
const router  = express.Router();
const { protect, authorize } = require("../middleware/auth");
const ChatMessage = require("../models/ChatMessage");
const Team        = require("../models/Team");

router.use(protect, authorize("participant"));

// Verify user is a member of the team
const checkMember = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) return false;
  return team.leader.toString() === userId.toString() ||
    team.members.some(m => m.user.toString() === userId.toString() && m.status === "Accepted");
};

// ── GET /api/chat/:teamId/messages?since=<ISO timestamp> ─────────────────────
// Returns messages (optionally only those after `since` for polling)
router.get("/:teamId/messages", async (req, res) => {
  try {
    const ok = await checkMember(req.params.teamId, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: "Not a team member." });

    const query = { team: req.params.teamId };
    if (req.query.since) {
      query.createdAt = { $gt: new Date(req.query.since) };
    }

    const messages = await ChatMessage.find(query)
      .populate("sender", "firstName lastName")
      .sort({ createdAt: 1 })
      .limit(100);

    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("chat GET error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── POST /api/chat/:teamId/messages ──────────────────────────────────────────
router.post("/:teamId/messages", async (req, res) => {
  try {
    const ok = await checkMember(req.params.teamId, req.user._id);
    if (!ok) return res.status(403).json({ success: false, message: "Not a team member." });

    const { content, fileUrl } = req.body;
    if (!content?.trim() && !fileUrl) {
      return res.status(400).json({ success: false, message: "Message content required." });
    }

    const msg = await ChatMessage.create({
      team:    req.params.teamId,
      sender:  req.user._id,
      content: content?.trim() || "",
      fileUrl: fileUrl || null,
    });
    await msg.populate("sender", "firstName lastName");

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error("chat POST error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ── DELETE /api/chat/:teamId/messages/:msgId ──────────────────────────────────
// Only the sender can delete their message
router.delete("/:teamId/messages/:msgId", async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found." });
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Can only delete your own messages." });
    }
    await msg.deleteOne();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;