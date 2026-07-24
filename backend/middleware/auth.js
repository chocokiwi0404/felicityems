// middleware/auth.js
// Two middleware functions used to protect routes:
//
//   protect     — verifies the JWT, fetches the user, sets req.user
//   authorize   — checks req.user.role matches the allowed roles

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── protect ───────────────────────────────────────────────────────────────────
// Reads "Authorization: Bearer <token>" from the request header,
// verifies the JWT signature and expiry, fetches the user from DB,
// checks isActive, then puts the user on req.user for controllers to use.
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authenticated. Please log in." });
    }

    // "Bearer eyJhbG..." → split on space → take index 1
    const token = authHeader.split(" ")[1];

    // jwt.verify throws if: signature is wrong, token is expired, or token is malformed
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id: "64abc...", role: "participant", iat: ..., exp: ... }

    // Re-fetch the user so we always have current data
    // (e.g. if admin deactivated the account after token was issued)
    // "-password" excludes the hashed password from the result
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account has been deactivated. Contact admin." });
    }

    req.user = user; // make user available to all subsequent middleware and controllers
    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token. Please log in again." });
  }
};

// ── authorize ─────────────────────────────────────────────────────────────────
// Returns a middleware function (closure) that checks req.user.role.
// Must run AFTER protect so that req.user is already set.
//
// Usage: authorize("admin") or authorize("organizer", "admin")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
