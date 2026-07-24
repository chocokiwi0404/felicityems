// backend/seed.js
//
// Populates the database with sample data matching the exact schemas in:
//   models/User.js, Organizer.js, Event.js, Registration.js, Team.js, Feedback.js
//
// Run from the backend/ folder:
//   node seed.js
//
// WARNING: this wipes the collections listed below before reseeding.

require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");

const User = require("./models/User");
const Organizer = require("./models/Organizer");
const Event = require("./models/Event");
const Registration = require("./models/Registration");
const Team = require("./models/Team");
const Feedback = require("./models/Feedback");
const ChatMessage = require("./models/ChatMessage");

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set. Check your .env file.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected for seeding:", mongoose.connection.host);

  // ---------------------------------------------------------------------
  // 1. Wipe existing data (comment out any line you don't want cleared)
  // ---------------------------------------------------------------------
  await Promise.all([
    User.deleteMany({}),
    Organizer.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
    Team.deleteMany({}),
    Feedback.deleteMany({}),
    ChatMessage.deleteMany({}),
  ]);
  console.log("🧹 Cleared existing collections");

  // ---------------------------------------------------------------------
  // 2. Admin
  // ---------------------------------------------------------------------
  const admin = await User.create({
    firstName: "System",
    lastName: "Admin",
    email: "admin@admin.com",
    password: "Admin@1234", // hashed automatically by the pre-save hook
    role: "admin",
  });
  console.log("👑 Admin created:", admin.email);

  // ---------------------------------------------------------------------
  // 3. Organizers (User with role="organizer" + linked Organizer profile)
  // ---------------------------------------------------------------------
  const organizerDefs = [
    {
      firstName: "Tech",
      lastName: "Club",
      email: "techclub@felicity.com",
      organizerName: "Technology Club",
      category: "Technical",
      description: "Hosts hackathons, coding contests, and workshops.",
      contactEmail: "techclub.contact@felicity.com",
      contactNumber: "9000000001",
    },
    {
      firstName: "Music",
      lastName: "Club",
      email: "musicclub@felicity.com",
      organizerName: "Music Club",
      category: "Cultural",
      description: "Runs jam sessions, open mics, and concerts.",
      contactEmail: "musicclub.contact@felicity.com",
      contactNumber: "9000000002",
    },
    {
      firstName: "Merch",
      lastName: "Team",
      email: "merchteam@felicity.com",
      organizerName: "Felicity Merch Team",
      category: "Fest Team",
      description: "Handles official fest merchandise sales.",
      contactEmail: "merchteam.contact@felicity.com",
      contactNumber: "9000000003",
    },
  ];

  const organizers = [];
  for (const def of organizerDefs) {
    const orgUser = await User.create({
      firstName: def.firstName,
      lastName: def.lastName,
      email: def.email,
      password: "Organizer@123",
      role: "organizer",
    });

    const organizerProfile = await Organizer.create({
      user: orgUser._id,
      organizerName: def.organizerName,
      category: def.category,
      description: def.description,
      loginEmail: def.email,
      contactEmail: def.contactEmail,
      contactNumber: def.contactNumber,
    });

    organizers.push({ user: orgUser, profile: organizerProfile });
  }
  console.log(`🏢 ${organizers.length} organizers created`);

  // ---------------------------------------------------------------------
  // 4. Participants
  // ---------------------------------------------------------------------
  const participantDefs = [
    { firstName: "Kavya", lastName: "Reddy", email: "kavya@students.iiit.ac.in", participantType: "IIIT", collegeOrOrgName: "IIIT Hyderabad", contactNumber: "9111111111" },
    { firstName: "Rahul", lastName: "Sharma", email: "rahul@students.iiit.ac.in", participantType: "IIIT", collegeOrOrgName: "IIIT Hyderabad", contactNumber: "9111111112" },
    { firstName: "Ananya", lastName: "Iyer", email: "ananya@gmail.com", participantType: "Non-IIIT", collegeOrOrgName: "BITS Pilani", contactNumber: "9111111113" },
    { firstName: "Vikram", lastName: "Rao", email: "vikram@students.iiit.ac.in", participantType: "IIIT", collegeOrOrgName: "IIIT Hyderabad", contactNumber: "9111111114" },
    { firstName: "Sneha", lastName: "Patel", email: "sneha@gmail.com", participantType: "Non-IIIT", collegeOrOrgName: "VNIT Nagpur", contactNumber: "9111111115" },
  ];

  const participants = [];
  for (const def of participantDefs) {
    const p = await User.create({
      firstName: def.firstName,
      lastName: def.lastName,
      email: def.email,
      password: "Participant@123",
      role: "participant",
      participantType: def.participantType,
      collegeOrOrgName: def.collegeOrOrgName,
      contactNumber: def.contactNumber,
      preferences: {
        areasOfInterest: ["Technical", "Music"],
        followedOrganizers: [organizers[0].profile._id],
      },
    });
    participants.push(p);
  }
  console.log(`🧑‍🎓 ${participants.length} participants created`);

  // ---------------------------------------------------------------------
  // 5. Events
  // ---------------------------------------------------------------------
  const now = Date.now();
  const daysFromNow = (n) => new Date(now + n * 24 * 60 * 60 * 1000);

  // --- Normal event 1: Published, custom form, hackathon-style (team-enabled downstream) ---
  const hackathon = await Event.create({
    eventName: "CodeStorm Hackathon",
    description: "24-hour team hackathon open to all participants.",
    eventType: "Normal",
    eligibility: "Open to All",
    registrationDeadline: daysFromNow(5),
    eventStartDate: daysFromNow(10),
    eventEndDate: daysFromNow(11),
    registrationLimit: 200,
    registrationFee: 0,
    organizer: organizers[0].profile._id,
    tags: ["hackathon", "coding", "technical"],
    status: "Published",
    customFormFields: [
      { label: "Team Name Preference", fieldType: "text", isRequired: false, order: 1 },
      { label: "Experience Level", fieldType: "dropdown", options: ["Beginner", "Intermediate", "Advanced"], isRequired: true, order: 2 },
    ],
  });

  // --- Normal event 2: Published, simple workshop ---
  const workshop = await Event.create({
    eventName: "Intro to Web Development Workshop",
    description: "Hands-on workshop covering HTML, CSS, and JavaScript basics.",
    eventType: "Normal",
    eligibility: "Open to All",
    registrationDeadline: daysFromNow(3),
    eventStartDate: daysFromNow(6),
    eventEndDate: daysFromNow(6),
    registrationLimit: 60,
    registrationFee: 0,
    organizer: organizers[0].profile._id,
    tags: ["workshop", "web-dev"],
    status: "Published",
    customFormFields: [
      { label: "Laptop Available?", fieldType: "radio", options: ["Yes", "No"], isRequired: true, order: 1 },
    ],
  });

  // --- Normal event 3: Draft (not visible to participants yet) ---
  const openMic = await Event.create({
    eventName: "Open Mic Night",
    description: "An evening of music, poetry, and stand-up.",
    eventType: "Normal",
    eligibility: "Open to All",
    registrationDeadline: daysFromNow(8),
    eventStartDate: daysFromNow(15),
    eventEndDate: daysFromNow(15),
    registrationLimit: 100,
    registrationFee: 0,
    organizer: organizers[1].profile._id,
    tags: ["music", "cultural"],
    status: "Draft",
    customFormFields: [
      { label: "Performance Type", fieldType: "dropdown", options: ["Music", "Poetry", "Comedy"], isRequired: true, order: 1 },
    ],
  });

  // --- Merchandise event 1: Published, in stock ---
  const tshirt = await Event.create({
    eventName: "Felicity 2026 Official T-Shirt",
    description: "Limited edition fest t-shirt, available in multiple sizes.",
    eventType: "Merchandise",
    eligibility: "Open to All",
    registrationDeadline: daysFromNow(20),
    eventStartDate: daysFromNow(1),
    eventEndDate: daysFromNow(20),
    registrationLimit: null,
    registrationFee: 499,
    organizer: organizers[2].profile._id,
    tags: ["merchandise", "apparel"],
    status: "Published",
    variants: [
      { size: "S", color: "Black", stockQuantity: 30 },
      { size: "M", color: "Black", stockQuantity: 50 },
      { size: "L", color: "Black", stockQuantity: 40 },
      { size: "XL", color: "Black", stockQuantity: 20 },
    ],
    purchaseLimitPerUser: 2,
  });

  // --- Merchandise event 2: Published, low/no stock on one variant ---
  const hoodie = await Event.create({
    eventName: "Felicity 2026 Hoodie",
    description: "Premium fleece hoodie with fest branding.",
    eventType: "Merchandise",
    eligibility: "Open to All",
    registrationDeadline: daysFromNow(20),
    eventStartDate: daysFromNow(1),
    eventEndDate: daysFromNow(20),
    registrationLimit: null,
    registrationFee: 899,
    organizer: organizers[2].profile._id,
    tags: ["merchandise", "apparel"],
    status: "Published",
    variants: [
      { size: "M", color: "Grey", stockQuantity: 0 }, // out of stock, for testing blocking logic
      { size: "L", color: "Grey", stockQuantity: 15 },
    ],
    purchaseLimitPerUser: 1,
  });

  console.log("🎫 5 events created (3 Normal, 2 Merchandise)");

  // Bump viewCount / registrationCount a bit so trending/analytics have something to show
  await Event.updateOne({ _id: hackathon._id }, { $set: { viewCount: 42, registrationCount: 2 } });
  await Event.updateOne({ _id: tshirt._id }, { $set: { viewCount: 30, registrationCount: 1, revenue: 499 } });

  // ---------------------------------------------------------------------
  // 6. Team (for the hackathon event)
  // ---------------------------------------------------------------------
  const team = await Team.create({
    event: hackathon._id,
    teamName: "Byte Me",
    leader: participants[0]._id,
    maxSize: 3,
    members: [
      { user: participants[0]._id, status: "Accepted", joinedAt: new Date() },
      { user: participants[1]._id, status: "Accepted", joinedAt: new Date() },
      { user: participants[2]._id, status: "Pending" },
    ],
    status: "Forming",
  });
  console.log("👥 Team created:", team.teamName, "| invite code:", team.inviteCode);

  // A couple of chat messages between the accepted members
  await ChatMessage.create([
    { team: team._id, sender: participants[0]._id, content: "Hey team, excited for the hackathon!" },
    { team: team._id, sender: participants[1]._id, content: "Same! Let's plan our idea tonight." },
  ]);

  // ---------------------------------------------------------------------
  // 7. Registrations
  // ---------------------------------------------------------------------

  // Normal event registration (hackathon, team leader) — Confirmed, ticket already "issued"
  const reg1 = await Registration.create({
    participant: participants[0]._id,
    event: hackathon._id,
    registrationType: "Normal",
    status: "Confirmed",
    formAnswers: [
      { fieldLabel: "Team Name Preference", answer: "Byte Me" },
      { fieldLabel: "Experience Level", answer: "Intermediate" },
    ],
    team: team._id,
    attended: false,
  });

  // Normal event registration (hackathon, second member)
  await Registration.create({
    participant: participants[1]._id,
    event: hackathon._id,
    registrationType: "Normal",
    status: "Confirmed",
    formAnswers: [
      { fieldLabel: "Team Name Preference", answer: "Byte Me" },
      { fieldLabel: "Experience Level", answer: "Beginner" },
    ],
    team: team._id,
    attended: false,
  });

  // Normal event registration (workshop, no team) — already attended, for feedback testing
  const reg3 = await Registration.create({
    participant: participants[2]._id,
    event: workshop._id,
    registrationType: "Normal",
    status: "Confirmed",
    formAnswers: [{ fieldLabel: "Laptop Available?", answer: "Yes" }],
    attended: true,
    attendedAt: new Date(),
    manualOverride: true,
  });

  // Merchandise registration — Confirmed & paid (payment already approved)
  await Registration.create({
    participant: participants[3]._id,
    event: tshirt._id,
    registrationType: "Merchandise",
    status: "Confirmed",
    selectedVariant: { size: "M", color: "Black" },
    quantity: 1,
    paymentStatus: "Approved",
    paymentReviewedBy: organizers[2].user._id,
    paymentReviewedAt: new Date(),
  });

  // Merchandise registration — Pending payment approval (proof uploaded, awaiting review)
  await Registration.create({
    participant: participants[4]._id,
    event: hoodie._id,
    registrationType: "Merchandise",
    status: "Pending",
    selectedVariant: { size: "L", color: "Grey" },
    quantity: 1,
    paymentProofUrl: "data:image/png;base64,PLACEHOLDER_BASE64_STRING",
    paymentStatus: "Pending",
  });

  console.log("📝 5 registrations created");

  // ---------------------------------------------------------------------
  // 8. Feedback (only for the attended workshop registration, reg3)
  // ---------------------------------------------------------------------
  const participantHash = crypto
    .createHash("sha256")
    .update(`${participants[2]._id}${workshop._id}`)
    .digest("hex");

  await Feedback.create({
    event: workshop._id,
    participantHash,
    rating: 5,
    comment: "Really well organized, learned a lot in a short time!",
  });
  console.log("💬 1 feedback entry created");

  // ---------------------------------------------------------------------
  // Done
  // ---------------------------------------------------------------------
  console.log("\n✅ Seeding complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:       admin@admin.com / Admin@1234");
  console.log("  Organizer:   techclub@felicity.com / Organizer@123");
  console.log("  Organizer:   musicclub@felicity.com / Organizer@123");
  console.log("  Organizer:   merchteam@felicity.com / Organizer@123");
  console.log("  Participant: kavya@students.iiit.ac.in / Participant@123");
  console.log("  Participant: rahul@students.iiit.ac.in / Participant@123");
  console.log("  Participant: ananya@gmail.com / Participant@123");
  console.log("  Participant: vikram@students.iiit.ac.in / Participant@123");
  console.log("  Participant: sneha@gmail.com / Participant@123");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});