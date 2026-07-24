// models/Feedback.js
// Tier C Feature 1 — Anonymous Feedback System
// Participants rate events they attended. Organizers see aggregated stats only.
//
// Anonymity implementation:
//   We store a HASH of the participant's ID (not the ID itself).
//   This means organizers cannot identify who left feedback,
//   but we can still prevent the same participant submitting twice
//   by checking if the hash already exists for that event.

const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    event:  { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    // SHA hash of participantId + eventId — identifies the submission without
    // revealing who the participant is. Generated in the controller.
    participantHash: { type: String, required: true },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

// Compound unique index: one feedback per participant per event
feedbackSchema.index({ event: 1, participantHash: 1 }, { unique: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
