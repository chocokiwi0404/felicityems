# Felicity — Event Management System

**Full-stack web application for IIIT Hyderabad's annual cultural fest.**  
Built with React (frontend) and Node.js + Express + MongoDB (backend).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Library Justifications](#2-tech-stack--library-justifications)
   - [Frontend](#21-frontend)
   - [Backend](#22-backend)
3. [Architecture & Design Decisions](#3-architecture--design-decisions)
4. [Features Implemented](#4-features-implemented)
   - [Core Features](#41-core-features)
   - [Tier A — Advanced Features](#42-tier-a--advanced-features)
   - [Tier B — Advanced Features](#43-tier-b--advanced-features)
   - [Tier C — Advanced Features](#44-tier-c--advanced-features)
5. [Setup & Installation](#5-setup--installation)
6. [Environment Variables](#6-environment-variables)
7. [API Reference](#7-api-reference)
8. [Project Structure](#8-project-structure)

---

## 1. Project Overview

Felicity is a multi-role event management platform serving three user types:

| Role | Responsibilities |
|---|---|
| **Admin** | Creates organizer accounts, manages platform users, monitors all events |
| **Organizer** | Creates and publishes events (Normal + Merchandise), manages registrations, approves payments, views analytics and feedback |
| **Participant** | Browses and registers for events, forms hackathon teams, purchases merchandise, submits anonymous feedback |

The system handles two distinct event types with different registration flows:

- **Normal Events** — custom form-based registration, optional team (hackathon) mode, ticket generation with QR code
- **Merchandise Events** — variant-based purchase (size/colour), payment proof upload, manual organizer approval before fulfilment

---

## 2. Tech Stack & Library Justifications

### 2.1 Frontend

| Library / Framework | Version | Justification |
|---|---|---|
| **React** | 18.x | Component-based architecture maps cleanly to the three role-based views (Admin/Organizer/Participant). Virtual DOM ensures fast re-renders for dashboard analytics and live chat polling. Hooks (useState, useEffect, useCallback) provide state management without introducing Redux overhead for a project of this scale. |
| **React Router DOM** | v6 | Declarative client-side routing with nested route support. `ProtectedRoute` wrapper enforces role-based access control — a user with `role: "organizer"` cannot navigate to `/participant/*` routes. `useParams` is used extensively in event detail and team chat pages. |
| **Axios** | ^1.x | Promise-based HTTP client. Chosen over `fetch` because it automatically serialises request bodies to JSON, handles response error codes as exceptions (making try/catch flows clean), and allows a single `Authorization` header to be set globally via `axios.defaults.headers.common`. |
| **React Context API** | (built-in) | `AuthContext` stores the JWT token, decoded user object, and login/logout helpers. Chosen over Redux because auth state is read-mostly and does not require complex reducers — Context with a single provider at the root is sufficient and avoids adding a dependency. |
| **CSS-in-JS (inline style objects)** | (built-in) | All styling uses plain JavaScript style objects co-located with components. This was chosen deliberately to keep the project dependency-free on the styling side — no Tailwind build step, no CSS modules configuration, no class name collisions across role-specific pages. Each component defines its own `const s = { ... }` object, making it self-contained and easy to hand off or modify. |

#### Why no UI component library?

Material UI, Ant Design, and similar libraries add significant bundle weight and enforce design conventions that conflict with the custom dark-mode aesthetic required. Building from primitives (div, button, input) with explicit style objects gave full control over the visual language — the consistent `#0f172a` background, `#6366f1` indigo accent, and card-based layouts are intentional design decisions that would have required substantial overriding in any third-party component library.

---

### 2.2 Backend

| Library / Package | Version | Justification |
|---|---|---|
| **Node.js + Express** | ^4.19 | Minimal, un-opinionated HTTP framework. REST API design maps naturally to Express router middleware. The `router.use(protect, authorize("role"))` pattern means every route file gets authentication and RBAC applied in one line. |
| **MongoDB + Mongoose** | ^8.3 | Document database chosen because event data is schema-flexible (Normal events have `customFormFields`, Merchandise events have `variants` — both live in the same `Event` collection controlled by `eventType`). Mongoose schemas enforce required fields and enums at the application layer, providing structure without migrations. |
| **bcrypt** | ^5.1 | Industry-standard password hashing. `saltRounds: 12` (2¹² = 4096 iterations) provides strong resistance to brute-force attacks. Pre-save hook on the User model ensures passwords are always hashed before persisting, even if a developer bypasses the controller. |
| **jsonwebtoken** | ^9.0 | Stateless authentication. JWTs are signed with `JWT_SECRET` and carry `{ id, role }` in the payload. The `protect` middleware verifies the signature on every request — no session store or database lookup needed for auth. Token expiry is set to `7d`. |
| **dotenv** | ^16.4 | Loads `.env` into `process.env` before any other module is required. Keeps secrets (DB URI, JWT secret, Gmail credentials) out of source code entirely. |
| **cors** | ^2.8 | Configures Access-Control headers so the React dev server (port 3000) can call the Express API (port 5000). `origin` is set to `FRONTEND_URL` from `.env` — not `*` — to prevent other origins from calling the API in production. |
| **uuid** | ^9.0 | Generates unique identifiers for ticket IDs (`TKT-{8 hex chars}`) and team invite codes (`{8 uppercase chars}`). UUID v4 is cryptographically random, ensuring no collisions across millions of registrations. |
| **nodemailer** | ^6.x | Sends transactional emails (ticket confirmation, team invites, payment approval). Configured with Gmail + App Password — no third-party email SaaS account required. All emails are HTML-formatted with inline styles for maximum email client compatibility. |
| **qrcode** | ^1.5 | Generates QR codes as base64 PNG data URLs. The QR payload is a JSON string containing `{ ticketId, eventId, userId }`. The base64 string is stored directly on the `Registration` document and embedded in confirmation emails — no file storage required. |
| **nodemon** | ^3.1 (dev) | Watches for file changes and restarts the server automatically during development. Listed under `devDependencies` — not used in production. |

---

## 3. Architecture & Design Decisions

### Authentication & RBAC

```
Request → protect middleware (verifies JWT) → authorize("role") → Route handler
```

The `protect` middleware extracts the Bearer token from `Authorization` header, verifies it, fetches the user from MongoDB (excluding the password field via `select: false`), and attaches them to `req.user`. The `authorize(...roles)` middleware then checks `req.user.role` against the allowed roles for that route group.

**Why not session-based auth?** Sessions require server-side storage that would need to be shared across instances in a multi-server deployment. JWTs are self-contained and stateless.

### Single Collection for Event Types

Both Normal and Merchandise events live in the `Event` collection. The `eventType` field (`"Normal" | "Merchandise"`) acts as a discriminator:

- Normal events use `customFormFields[]` and `formLocked`
- Merchandise events use `variants[]` and `purchaseLimitPerUser`

This avoids collection joins and simplifies queries like "show me all events from this organizer" regardless of type.

### Payment Proof as Base64 in MongoDB

Payment proof images are stored as base64 strings in the `Registration.paymentProofUrl` field rather than using S3/Cloudinary. This was a deliberate simplification: no third-party storage account needed, no pre-signed URL complexity, and image sizes are bounded by a 4MB client-side check before upload. The `express.json({ limit: "10mb" })` limit accommodates the base64 overhead (~33% larger than binary).

### QR Code Strategy

QR codes are generated server-side using the `qrcode` package and stored as base64 data URLs on the `Registration` document. They are:
- Generated immediately for free Normal event registrations
- Generated only after organizer approval for paid Merchandise orders
- Embedded directly in confirmation emails (no external image hosting)
- Available in the participant's Participation History page

### HTTP Polling for Team Chat

Real-time messaging is implemented via HTTP polling (2-second interval) rather than WebSockets/Socket.io. This was chosen because:
1. Socket.io is not installed in the project environment
2. Polling is simpler to debug, deploy, and reason about
3. For a hackathon team of 2–8 people, 2-second message latency is acceptable
4. The polling endpoint uses a `?since=<ISO timestamp>` query param so only new messages are fetched each cycle, keeping bandwidth minimal

### Event Status State Machine

Events follow a strict lifecycle enforced on both the PUT (edit) and PATCH (status) endpoints:

```
Draft → Published → Ongoing → Completed
                 ↘           
                  Closed (from Published or Ongoing)
```

- **Draft**: All fields editable, not visible to participants
- **Published**: Only `description`, `registrationDeadline`, `registrationLimit` editable; visible and open for registration
- **Ongoing / Completed / Closed**: No edits allowed; organizer can only change status

### Anonymous Feedback

Participant identity is never stored with feedback. Instead, a SHA-256 hash of `userId + eventId` is stored as `participantHash`. This allows:
- Duplicate prevention (same participant can't submit twice for the same event)
- Updating a previous submission
- Without ever being reversible to reveal who wrote the feedback

---

## 4. Features Implemented

### 4.1 Core Features

#### Authentication System
- JWT-based login for all three roles
- Role-gated frontend routes via `ProtectedRoute` component
- Participant registration with `participantType` (IIIT / Non-IIIT) selection
- Organizer onboarding flow post-login
- Password change endpoint; admin-initiated password reset request workflow

#### Admin Dashboard
- Create organizer accounts (name, email, temporary password)
- View and manage all organizer accounts (activate/deactivate)
- View platform-wide statistics
- Process organizer password reset requests

#### Organizer Dashboard
- Event carousel showing all events with status badges
- Analytics overview: total registrations, revenue, event counts
- Create events (Normal and Merchandise types)
- Full event lifecycle management

#### Organizer Event Detail Page
- Three-tab layout: Overview, Analytics, Participants
- Inline editing with status-based field locking (spec §10.4)
- Status transition buttons based on valid transitions
- Participant table with search, attendance filter, CSV export
- Analytics: registration count, attendance rate, revenue, cancellations

#### Participant Dashboard
- Upcoming registrations with ticket status
- Recommended events based on followed organizers and interests
- Quick links to browse, teams, feedback, orders

#### Browse Events
- Search by name, filter by type/eligibility/date/fee
- Trending events (by registration count)
- Event detail page with registration form (custom fields for Normal, variant picker for Merchandise)
- Out-of-stock variant blocking for Merchandise

#### Participant Profile
- Edit personal info (firstName, lastName, contactNumber, collegeOrOrgName)
- Locked fields (email, participantType) displayed as badges
- Interest preferences with chip UI (10 categories)
- Followed clubs management
- Change password section

#### Clubs / Organizers
- Browse all organizers
- Follow/unfollow organizers
- View organizer event listings

---

### 4.2 Tier A — Advanced Features

#### Tier A Feature 1: Hackathon Team Registration (8 marks)

**Justification for selection:** Team-based registration directly supports the hackathon use case central to Felicity. It is the most complex feature in Tier A, demonstrating mastery of relational data modeling within MongoDB, invite-based flows, and conditional ticket generation.

**Implementation approach:**

The `Team` model stores a `members[]` array of `{ user, status, joinedAt }` sub-documents. The `status` field on each member tracks individual acceptance: `Pending → Accepted | Rejected`. The team's own `status` field tracks collective state: `Forming → Complete`.

```
Leader creates team → inviteCode generated (UUID-based 8-char code)
  → Leader invites by email → backend looks up User by email, pushes Pending member
  → Invite email sent with code + deep link
  → Invitee visits /participant/teams/join/:code → POSTs to /api/teams/join/:code
  → Backend sets member.status = "Accepted"
  → If acceptedCount === maxSize → team.status = "Complete"
     → Registration documents created for all accepted members
     → Ticket confirmation email with QR sent to each member
```

**Design choices:**
- Invite codes are UUID-derived 8-character uppercase strings — short enough to share verbally, unique enough to avoid collision
- The join endpoint is idempotent: calling it twice does nothing if already accepted
- Registration creation on team completion happens in a loop with individual try/catch per member so one failed email doesn't block others getting their tickets
- The `TeamDashboard` page shows a live capacity bar and per-member status (Invited / Joined / Declined)
- The team detail page shows the invite code with a one-click copy button and a "Open Team Chat" button once the team is complete

**Technical decisions:**
- Leader is always index 0 in `members[]` with `status: "Accepted"` on creation, so capacity counting is consistent
- `checkMember()` helper in chat routes verifies the user is an Accepted member before allowing any chat access

---

#### Tier A Feature 2: Merchandise Payment Approval Workflow (8 marks)

**Justification for selection:** The payment workflow demonstrates a complete async approval loop — a pattern common in real-world SaaS (expense approvals, KYC verification, etc.). It also directly integrates with QR generation and email, showing cross-feature integration.

**Implementation approach:**

```
Participant purchases merchandise → Registration created with:
  status: "Pending", paymentStatus: "Pending" (if fee > 0)
  OR
  status: "Confirmed", paymentStatus: "Not Required" (if free)

Participant uploads proof image → POST /api/payments/upload-proof
  → base64 stored in Registration.paymentProofUrl
  → paymentStatus set to "Pending"

Organizer opens /organizer/payments → sees all Pending orders
  → clicks "View Proof" → full-size image shown in modal
  → Approve: paymentStatus → "Approved", status → "Confirmed"
     → stock decremented from Event.variants[]
     → QR code generated and stored on Registration
     → Confirmation email with QR sent to participant
  → Reject: paymentStatus → "Rejected", status → "Rejected"
     → Participant sees rejection and can re-upload
```

**Design choices:**
- No QR code is generated until payment is `Approved` — the `qrCode` field on Registration stays `null` for Pending/Rejected orders
- The `MyOrders` participant page shows contextual UI based on status: upload prompt for new orders, "re-upload" for rejected, QR display for approved
- Stock decrement happens at approval time (not purchase time) for paid merchandise — this ensures stock isn't reserved by unpaid orders
- Free merchandise decrements stock immediately at purchase (no proof required)
- File size is validated client-side (4MB limit) before upload to avoid sending large payloads

---

#### Tier A Feature 3: QR Code Tickets + Email Confirmation

**Justification for selection:** Ticket generation and email delivery are explicitly required in the spec for both Normal and Merchandise events. This feature ties together the `qrcode`, `nodemailer`, and `Registration` systems.

**Implementation approach:**

All email and QR logic is centralised in `backend/utils/mailer.js`. Three email types are implemented:

| Function | Trigger | QR Included |
|---|---|---|
| `sendTicketEmail` | Normal event registration confirmed | Yes |
| `sendMerchandiseApprovedEmail` | Organizer approves merchandise payment | Yes |
| `sendTeamInviteEmail` | Leader invites a member | No (invite code only) |

QR payload format:
```json
{ "ticketId": "TKT-A1B2C3D4", "eventId": "...", "userId": "..." }
```

The QR is generated as a base64 PNG, saved to `Registration.qrCode`, and embedded as a `<img src="data:image/png;base64,...">` in the HTML email. This avoids any dependency on external image hosting for email delivery.

Tickets are also accessible in the participant's Participation History page, where the stored `qrCode` base64 is rendered directly in the UI.

---

### 4.3 Tier B — Advanced Features

#### Tier B Feature: Team Chat (6 marks)

**Justification for selection:** After teams are formed, members need a communication channel. This feature builds directly on Tier A Feature 1 — it is only accessible to teams with `status: "Complete"`.

**Implementation approach:**

Chat uses HTTP polling rather than WebSockets. The frontend polls `GET /api/chat/:teamId/messages?since=<ISO>` every 2 seconds. Only messages newer than the client's newest known timestamp are returned, keeping each poll response small.

The `ChatMessage` model:
```javascript
{ team, sender, content, fileUrl, createdAt }
```

**Key UX features:**
- Optimistic message sending — message appears immediately in the UI, then gets replaced with the server-confirmed version (with real `_id`)
- If sending fails, the optimistic message is removed and the input is restored
- Messages are grouped by date (Today / Yesterday / date string)
- Sender name shown only on first message in a consecutive run from the same person
- Own messages shown right-aligned in indigo, others left-aligned in dark
- Own messages show a delete button (×) on hover
- File/link sharing via a `fileUrl` field — participant pastes a URL and it renders as a clickable link

**Technical decisions:**
- The `since` query param uses ISO timestamp comparison in MongoDB: `{ createdAt: { $gt: new Date(since) } }` — no custom indexing needed beyond the existing `{ team: 1, createdAt: -1 }` index
- `checkMember()` verifies the requesting user is an Accepted member of the team before serving any messages or accepting posts

---

### 4.4 Tier C — Advanced Features

#### Tier C Feature: Anonymous Feedback System (2 marks)

**Justification for selection:** Quickest Tier C feature to implement, and it demonstrates a meaningful anonymity design pattern (hash-based identity) rather than just omitting a participant ID field.

**Implementation approach:**

Participants can only submit feedback for events where `attended: true` on their Registration. This is enforced server-side by checking the Registration collection before accepting any feedback.

Anonymity is achieved via SHA-256 hashing:
```javascript
const participantHash = crypto
  .createHash("sha256")
  .update(`${req.user._id}${eventId}`)
  .digest("hex");
```

This hash is stored on the `Feedback` document. It allows:
- Duplicate prevention without storing identity
- Upsert (participant can update their feedback)
- Aggregate queries (count, average) without ever knowing who said what

The organizer `EventFeedback` page shows:
- Overall average rating (1 decimal place)
- Star distribution bar chart (5★ → 1★)
- Individual anonymous comments
- Filter by star rating (1–5 or All)

The participant `FeedbackPage` shows an event selector (attended events only), 5-star interactive rating widget, text area, and confirms if feedback was already submitted (with option to update).

---

## 5. Setup & Installation

### Prerequisites

| Tool | Required Version |
|---|---|
| Node.js | v18 or later |
| npm | v9 or later |
| MongoDB Atlas account | Free tier is sufficient |
| Gmail account with App Password | For email delivery |

---

### Step 1 — Clone / unzip the project

```bash
# If using git:
git clone <repo-url>
cd felicity

# Or unzip and navigate:
unzip felicity.zip && cd felicity
```

---

### Step 2 — Backend setup

```bash
cd backend
npm install
```

This installs all base dependencies. Then install the additional packages required for advanced features:

```bash
npm install nodemailer qrcode
```

Create the environment file:

```bash
cp .env.example .env
# Then edit .env with your actual values (see Section 6)
```

---

### Step 3 — Frontend setup

```bash
cd ../frontend
npm install
```

No additional frontend packages are required — `socket.io-client` is **not** needed since chat uses HTTP polling.

---

### Step 4 — Gmail App Password

The mailer uses Gmail SMTP with an App Password (not your regular Gmail password).

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Ensure 2-Step Verification is **enabled**
3. Search for "App passwords" in the security page
4. Create a new App Password → select "Mail" → copy the 16-character code
5. Paste this code as `GMAIL_APP_PASS` in your `.env` file

---

### Step 5 — Seed the database (optional)

```bash
cd backend
node seed.js
```

This creates:
- 1 admin account: `admin@admin.com` / `Admin@1234`
- 3 sample organizer accounts
- 5 sample events (mix of Normal and Merchandise, various statuses)

---

### Step 6 — Run the project

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev       # nodemon (auto-restart on changes)
# OR
npm start         # plain node
```
Server starts on `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
React dev server starts on `http://localhost:3000`

---

### Step 7 — Verify it's working

Open `http://localhost:3000/login` and log in with:

| Role | Email | Password |
|---|---|---|
| Admin | admin@admin.com | Admin@1234 |
| Organizer | (created by admin) | (set by admin) |
| Participant | (self-registered) | (set on registration) |

---

## 6. Environment Variables

Create `backend/.env` with the following:

```env
# MongoDB connection string from Atlas
# Format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/felicity

# JWT signing secret — use a long random string in production
JWT_SECRET=your_super_secret_jwt_key_change_this

# JWT expiry
JWT_EXPIRES_IN=7d

# Frontend URL — used for CORS origin and invite email links
FRONTEND_URL=http://localhost:3000

# Server port
PORT=5000

# Gmail credentials for transactional emails
# GMAIL_APP_PASS must be a 16-char App Password, NOT your regular Gmail password
GMAIL_USER=your@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
```

---

## 7. API Reference

### Authentication — `/api/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register as participant |
| POST | `/login` | Public | Login (all roles) |
| GET | `/me` | Any authenticated | Get current user |
| PUT | `/change-password` | Any authenticated | Change password |

### Admin — `/api/admin`

| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Platform statistics |
| GET | `/organizers` | All organizer accounts |
| POST | `/organizers` | Create organizer account |
| PATCH | `/organizers/:id/toggle-active` | Activate / deactivate |
| GET | `/password-reset-requests` | View pending requests |
| PATCH | `/password-reset-requests/:id` | Approve / reject request |

### Participant — `/api/participants`

| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Get own profile |
| PATCH | `/profile` | Update profile |
| GET/PATCH | `/preferences` | Interests + followed clubs |
| POST | `/follow/:organizerId` | Follow organizer |
| POST | `/unfollow/:organizerId` | Unfollow organizer |
| GET | `/events` | Browse events (search + filters) |
| GET | `/events/trending` | Trending events |
| GET | `/events/recommended` | Personalised recommendations |
| GET | `/events/:id` | Event detail |
| POST | `/events/:id/register` | Register / purchase |
| GET | `/registrations/mine` | All own registrations |
| GET | `/registrations/:id` | Single registration + ticket |

### Organizer — `/api/organizer`

| Method | Path | Description |
|---|---|---|
| GET/PATCH | `/profile` | Organizer profile |
| GET | `/analytics` | Dashboard analytics |
| GET | `/events` | All own events |
| POST | `/events` | Create event |
| GET | `/events/:id` | Single event detail |
| PUT | `/events/:id` | Edit event (status-gated) |
| PATCH | `/events/:id/status` | Change event status |
| GET | `/events/:id/registrations` | All registrations for event |

### Teams — `/api/teams`

| Method | Path | Description |
|---|---|---|
| POST | `/create` | Create team (leader) |
| POST | `/invite` | Invite member by email |
| GET | `/invite/:code` | Get team info from code |
| POST | `/join/:code` | Accept invite |
| POST | `/decline/:code` | Decline invite |
| GET | `/my` | All my teams |
| GET | `/:id` | Single team detail |

### Payments — `/api/payments`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/upload-proof` | Participant | Upload payment proof image |
| GET | `/organizer/orders` | Organizer | All merchandise orders |
| PATCH | `/organizer/orders/:id/approve` | Organizer | Approve payment |
| PATCH | `/organizer/orders/:id/reject` | Organizer | Reject payment |

### Chat — `/api/chat`

| Method | Path | Description |
|---|---|---|
| GET | `/:teamId/messages` | Fetch messages (supports `?since=` for polling) |
| POST | `/:teamId/messages` | Send message |
| DELETE | `/:teamId/messages/:msgId` | Delete own message |

### Feedback — `/api/feedback`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | Participant | Submit feedback |
| GET | `/event/:eventId` | Any authenticated | Aggregated feedback for event |
| GET | `/my/:eventId` | Participant | Check own submission |

---

## 8. Project Structure

```
felicity/
├── backend/
│   ├── middleware/
│   │   └── auth.js               # protect + authorize middleware
│   ├── models/
│   │   ├── User.js               # Auth model (all roles)
│   │   ├── Organizer.js          # Organizer profile (linked to User)
│   │   ├── Event.js              # Normal + Merchandise events
│   │   ├── Registration.js       # Ticket + payment + QR
│   │   ├── Team.js               # Hackathon team + invite code
│   │   ├── ChatMessage.js        # Team chat messages
│   │   ├── Feedback.js           # Anonymous feedback
│   │   ├── ForumMessage.js       # Event discussion forum
│   │   └── PasswordResetRequest.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── organizerRoutes.js    # Public club listing
│   │   ├── eventRoutes.js        # Organizer event management
│   │   ├── participantRoutes.js  # All participant actions
│   │   ├── teamRoutes.js         # Team registration flow
│   │   ├── paymentRoutes.js      # Payment approval workflow
│   │   ├── chatRoutes.js         # Team chat (polling)
│   │   └── feedbackRoutes.js     # Anonymous feedback
│   ├── utils/
│   │   └── mailer.js             # nodemailer + QR generation
│   ├── db.js
│   ├── seed.js
│   ├── server.js
│   └── .env
│
└── frontend/
    └── src/
        ├── context/
        │   └── AuthContext.js    # JWT storage + user state
        ├── components/
        │   ├── ProtectedRoute.js
        │   ├── ParticipantNavBar.js
        │   ├── OrganizerNavBar.js
        │   └── AdminNavBar.js
        └── pages/
            ├── LoginPage.js
            ├── RegisterPage.js
            ├── OnboardingPage.js
            ├── UnauthorizedPage.js
            ├── admin/
            │   ├── AdminDashboard.js
            │   └── ManageOrganizers.js
            ├── organizer/
            │   ├── Dashboard.js
            │   ├── OrganizerProfile.js
            │   ├── CreateEvent.js
            │   ├── OrganizerEventDetail.js
            │   ├── PaymentApproval.js    ← Tier A Feature 2
            │   └── EventFeedback.js      ← Tier C Feature 1
            └── participant/
                ├── ParticipantDashboard.js
                ├── BrowseEvents.js
                ├── EventDetail.js
                ├── OrganizerDetailPage.js
                ├── Profile.js
                ├── Clubs.js
                ├── TeamDashboard.js      ← Tier A Feature 1
                ├── TeamChat.js           ← Tier B Feature 1
                ├── MyOrders.js           ← Tier A Feature 2
                └── FeedbackPage.js       ← Tier C Feature 1
```






Disable (isActive: false on the User)
The organizer's account still exists in the database with all their events and data intact. They simply cannot log in — the protect middleware rejects their token with "Account is inactive." Their events remain visible to participants, their analytics are preserved, and an admin can re-enable them instantly. This is a reversible, soft action — used when you want to temporarily suspend someone (e.g. they violated a rule, or their tenure is paused).

Archive (isArchived: true on their Events)
This doesn't touch the organizer's account at all — it targets their events specifically. Archived events are hidden from participant browsing and dashboards but the organizer can still log in, create new events, and their profile remains public. The registration history and analytics for those events are preserved in the database. This is used when old events clutter the organizer's dashboard but you don't want to destroy the data.

Delete (remove the User + Organizer documents from MongoDB)
This is permanent and destructive. The organizer account, their profile, and potentially their events are gone. Any Registration documents that reference their events now have a dangling event reference. This is the nuclear option — typically you'd never actually delete in a production system; you'd disable instead. Hard deletes make analytics, audit trails, and dispute resolution impossible.



[event status ]
Published → Closed
Ongoing   → Closed
Ongoing   → Completed





router.get("/preferences", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("preferences")
      .populate("preferences.followedOrganizers", "organizerName category _id");
    res.status(200).json({ success: true, preferences: user.preferences });
  } catch (err) {
    console.error("getPreferences error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});
