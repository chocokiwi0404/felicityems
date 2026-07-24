const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const teamMemberSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status:   { type: String, enum: ["Pending", "Accepted", "Rejected"], default: "Pending" },
  joinedAt: { type: Date },
});

const teamSchema = new mongoose.Schema(
  {
    event:    { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    teamName: { type: String, required: true, trim: true },
    leader:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    maxSize: { type: Number, required: true, min: 2 },
    members: [teamMemberSchema],

    // Unique code shared with invitees — they use this to join the team
    inviteCode: {
      type:    String,
      unique:  true,
      default: () => uuidv4().split("-")[0].toUpperCase(),
    },

    // True when all slots are filled and all members have accepted
    isComplete: { type: Boolean, default: false },

    status: {
      type:    String,
      enum:    ["Forming", "Complete", "Cancelled"],
      default: "Forming",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
