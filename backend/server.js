require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const connectDB = require("./db");

const authRoutes        = require("./routes/authRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const participantRoutes = require("./routes/participantRoutes");
const organizerRoutes   = require("./routes/organizerRoutes");
const eventRoutes       = require("./routes/eventRoutes");
const teamRoutes        = require("./routes/teamRoutes");
const paymentRoutes     = require("./routes/paymentRoutes");
const feedbackRoutes    = require("./routes/feedbackRoutes");
const chatRoutes        = require("./routes/chatRoutes");

connectDB();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth",         authRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/participants",  participantRoutes);
app.use("/api/organizers",   organizerRoutes);
app.use("/api/organizer",    eventRoutes);
app.use("/api/teams",        teamRoutes);
app.use("/api/payments",     paymentRoutes);
app.use("/api/feedback",     feedbackRoutes);
app.use("/api/chat",         chatRoutes);

app.get("/", (req, res) => res.json({ success: true, message: "Felicity API is running." }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));