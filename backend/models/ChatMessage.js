// models/ChatMessage.js
// Stores team chat messages for real-time team chat feature
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    team:    { type: mongoose.Schema.Types.ObjectId, ref: "Team",  required: true },
    sender:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    content: { type: String, default: "" },
    fileUrl: { type: String, default: null }, // shared link or base64 for small files
  },
  { timestamps: true }
);

chatMessageSchema.index({ team: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);