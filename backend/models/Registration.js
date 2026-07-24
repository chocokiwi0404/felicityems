const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Stores one answer to a custom form field
const formAnswerSchema = new mongoose.Schema({
  fieldLabel: { type: String },
  answer:     { type: mongoose.Schema.Types.Mixed }, // string, array, file URL etc.
});

const registrationSchema = new mongoose.Schema(
  {
    // Auto-generated unique ticket ID shown to the participant
    ticketId: {
      type:    String,
      unique:  true,
      default: () => "TKT-" + uuidv4().split("-")[0].toUpperCase(),
    },

    participant: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    event:       { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    registrationType: {
      type:     String,
      enum:     ["Normal", "Merchandise"],
      required: true,
    },

    status: {
      type:    String,
      enum:    ["Pending", "Confirmed", "Cancelled", "Rejected"],
      default: "Confirmed",
    },

    // Normal event: answers to the custom registration form
    formAnswers: [formAnswerSchema],

    // Merchandise event: which variant was selected and how many
    selectedVariant: {
      size:  { type: String },
      color: { type: String },
    },
    quantity: { type: Number, default: 1 },

    // Payment proof upload (Tier A Feature 2 — Merchandise Payment Approval Workflow)
    paymentProofUrl: { type: String },
    paymentStatus: {
      type:    String,
      enum:    ["Not Required", "Pending", "Approved", "Rejected"],
      default: "Not Required",
    },
    paymentReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentReviewedAt: { type: Date },

    // QR code stored as a data URL (base64 image string)
    // Only generated after payment is approved for merchandise
    qrCode: { type: String },

    // Attendance tracking (Tier A Feature 3 — QR Scanner)
    attended:           { type: Boolean, default: false },
    attendedAt:         { type: Date },
    attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manualOverride:     { type: Boolean, default: false }, // true = manually marked by organizer

    // Team link (Tier A Feature 1 — Hackathon Team Registration)
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  },
  { timestamps: true }
);

registrationSchema.index({ participant: 1, event: 1 });
registrationSchema.index({ ticketId: 1 });

module.exports = mongoose.model("Registration", registrationSchema);
