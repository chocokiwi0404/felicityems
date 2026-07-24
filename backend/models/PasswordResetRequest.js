const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: "Organizer", required: true },
  reason:    { type: String, required: true },
  status:    { type: String, enum: ["Pending","Approved","Rejected"], default: "Pending" },
  adminComment: { type: String, default: "" },
  newPassword:  { type: String, default: "" },
  resolvedAt:   { type: Date },
}, { timestamps: true });
module.exports = mongoose.model("PasswordResetRequest", schema);