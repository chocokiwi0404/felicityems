const mongoose = require("mongoose");
const bcrypt   = require("bcrypt");

const participantPreferencesSchema = new mongoose.Schema({
  areasOfInterest:    [{ type: String }],
  followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Organizer" }],
});

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, trim: true, default: "" },

    // lowercase: true — Mongoose lowercases before saving so email lookups are case-insensitive
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    password: {
      type:     String,
      required: true,
      select:   false,
    },

    role: {
      type:     String,
      enum:     ["participant", "organizer", "admin"],
      required: true,
    },

    // Participant-only fields — undefined/null for organizers and admins
    participantType: {
      type:     String,
      enum:     ["IIIT", "Non-IIIT"],
      required: function () { return this.role === "participant"; },
    },
    collegeOrOrgName: { type: String, trim: true },
    contactNumber:    { type: String, trim: true },

    // Preferences — only used by participants (interests + followed clubs)
    preferences: {
      type:    participantPreferencesSchema,
      default: () => ({}),
    },

    // isActive lets admin disable an account without deleting it.
    // The protect middleware rejects requests from inactive accounts.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // auto-adds createdAt and updatedAt
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
