const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Helper: sign a JWT and send it in the response ───────────────────────────
const createAndSendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  const userResponse = user.toObject();
  delete userResponse.password; // never send the hash to the client

  res.status(statusCode).json({ success: true, token, user: userResponse });
};

// Centralising these here means if you change the domain, you change it in
// one place (.env) and both register and login validation pick it up.
const getIIITDomains = () => {
  return (process.env.IIIT_EMAIL_DOMAINS || "student.iiit.ac.in")
    .split(",")
    .map(domain => domain.trim());
};
const getAdminDomain = () => process.env.ADMIN_EMAIL_DOMAIN || "admin.com";

// Public. Only PARTICIPANTS self-register.
// Organizers and admins are provisioned by the admin — they never hit this endpoint.
const registerParticipant = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      participantType, collegeOrOrgName, contactNumber,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !participantType) {
      return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }

    const emailLower = email.toLowerCase();

    if (participantType === "IIIT") {
      const allowedDomains = [
        "student.iiit.ac.in",
        "research.iiit.ac.in"
      ];
    
      const isValidDomain = allowedDomains.some(domain =>
        emailLower.endsWith(`@${domain}`)
      );
    
      if (!isValidDomain) {
        return res.status(400).json({
          success: false,
          message:
            "IIIT participants must use a @student.iiit.ac.in or @research.iiit.ac.in email address.",
        });
      }
    }

    const adminDomain = getAdminDomain();
    if (emailLower.endsWith(`@${adminDomain}`)) {
      return res.status(400).json({
        success: false,
        message: `@${adminDomain} email addresses are reserved for system accounts. Please use a personal email.`,
      });
    }

    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const user = await User.create({
      firstName, lastName,
      email: emailLower,
      password,
      role: "participant",
      participantType, collegeOrOrgName, contactNumber,
    });

    createAndSendToken(user, 201, res);

  } catch (err) {
    console.error("registerParticipant error:", err);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Contact the administrator.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    createAndSendToken(user, 200, res);

  } catch (err) {
    console.error("loginUser error:", err);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Protected. Returns the currently logged-in user.
// Called on page refresh to restore the session.
// protect middleware already fetched and set req.user, so no extra DB call needed.
const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
// Protected. Requires current password before allowing the change.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Provide both current and new password." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = newPassword; // pre-save hook hashes automatically
    await user.save();

    createAndSendToken(user, 200, res);

  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Server error while changing password." });
  }
};

module.exports = { registerParticipant, loginUser, getMe, changePassword };