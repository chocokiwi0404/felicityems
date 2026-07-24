const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema(
  {
    // Link to the corresponding User document (the one with role="organizer")
    // unique: true enforces one-to-one — one User = one Organizer profile
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      unique:   true,
    },

    organizerName: { type: String, required: true, trim: true },
    category:      { type: String, required: true, trim: true }, // e.g. "Technical", "Cultural"
    description:   { type: String, trim: true, default: "" },

    // Public-facing contact email — different from the auto-generated login email
    loginEmail:    { type: String, lowercase: true, trim: true },
    // Auto-generated login email stored for admin reference (e.g. techclub@admin.com)
    contactEmail:  { type: String, lowercase: true, trim: true },
    contactNumber: { type: String, trim: true },

    // Optional — not all clubs have a Discord server
    discordWebhookUrl: { type: String, trim: true },

    // Array of Event IDs that belong to this organizer.
    // When a new event is created, push its _id here.
    // Use .populate("events") to get full event documents.
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organizer", organizerSchema);