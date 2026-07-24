// models/Event.js
// Covers both event types from the assignment:
//   Normal      — workshops, talks, competitions (custom form builder)
//   Merchandise — T-shirts, hoodies, kits (variants + stock)
//
// Both types live in one collection. The eventType field determines
// which extra fields are relevant.

const mongoose = require("mongoose");

// Sub-schema: one field in the custom registration form (Normal events only)
const formFieldSchema = new mongoose.Schema({
  label:      { type: String, required: true },
  fieldType:  {
    type:    String,
    enum:    ["text", "textarea", "dropdown", "checkbox", "radio", "file"],
    required: true,
  },
  options:    [{ type: String }], // for dropdown / checkbox / radio choices
  isRequired: { type: Boolean, default: false },
  order:      { type: Number, default: 0 },   // controls display order in the form
});

// Sub-schema: one size/colour variant for a merchandise item
const variantSchema = new mongoose.Schema({
  size:          { type: String },
  color:         { type: String },
  description:   { type: String },
  stockQuantity: { type: Number, required: true, min: 0 },
});

const eventSchema = new mongoose.Schema(
  {
    eventName:   { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    eventType: {
      type:     String,
      enum:     ["Normal", "Merchandise"],
      required: true,
    },

    eligibility: {
      type:    String,
      enum:    ["IIIT Only", "Open to All", "Non-IIIT Only"],
      default: "Open to All",
    },

    registrationDeadline: { type: Date, required: true },
    eventStartDate:       { type: Date, required: true },
    eventEndDate:         { type: Date, required: true },

    registrationLimit: { type: Number, default: null }, // null = no limit
    registrationFee:   { type: Number, default: 0, min: 0 },

    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "Organizer", required: true },

    tags: [{ type: String }],

    // Event lifecycle: Draft → Published → Ongoing → Completed / Closed
    status: {
      type:    String,
      enum:    ["Draft", "Published", "Ongoing", "Completed", "Closed"],
      default: "Draft",
    },

    // Normal event: custom registration form fields
    customFormFields: [formFieldSchema],
    formLocked:       { type: Boolean, default: false },

    // Merchandise event: product variants and per-user purchase limit
    variants:             [variantSchema],
    purchaseLimitPerUser: { type: Number, default: 1 },

    // Counters updated on every registration — used for analytics and trending
    registrationCount: { type: Number, default: 0 },
    viewCount:         { type: Number, default: 0 }, // incremented on event detail page view
    revenue:           { type: Number, default: 0 },

  },
  { timestamps: true }
);

eventSchema.index({ eventName: "text", description: "text", tags: "text" });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1, eventStartDate: 1 });

module.exports = mongoose.model("Event", eventSchema);
