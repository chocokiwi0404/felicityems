// frontend/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }    from "./context/AuthContext";
import ProtectedRoute      from "./components/ProtectedRoute";

// Public Pages
import LoginPage           from "./pages/LoginPage";
import RegisterPage        from "./pages/RegisterPage";
import OnboardingPage      from "./pages/OnboardingPage";
import UnauthorizedPage    from "./pages/UnauthorizedPage";

// Participant Pages
import ParticipantDashboard from "./pages/participant/ParticipantDashboard";
import ParticipantEvents    from "./pages/participant/BrowseEvents";  
import ParticipantProfile   from "./pages/participant/Profile";
import ParticipantClubs from "./pages/participant/Clubs";
import EventDetail         from "./pages/participant/EventDetail";
import OrganizerDetailPage from "./pages/participant/OrganizerDetailPage";
import TeamDashboard  from "./pages/participant/TeamDashboard";
import TeamChat       from "./pages/participant/TeamChat";
import MyOrders       from "./pages/participant/MyOrders";
import FeedbackPage   from "./pages/participant/FeedbackPage";
import ParticipationHistory from "./pages/participant/ParticipationHistory";
import TicketPage           from "./pages/participant/TicketPage";

// Admin Pages
import AdminDashboard         from "./pages/admin/AdminDashboard";
import ManageOrganizers       from "./pages/admin/ManageOrganizers";
import PasswordResetRequests  from "./pages/admin/PasswordResetRequests";


// Organizer Pages
import OrganizerDashboard from "./pages/organizer/Dashboard";
import CreateEvent from "./pages/organizer/CreateEvent";
import OngoingEvents from "./pages/organizer/OngoinEvents";
import OrganizerProfile from "./pages/organizer/OrganizerProfile";
import OrganizerEventDetail from "./pages/organizer/OrganizerEventDetail";
import PaymentApproval from "./pages/organizer/PaymentApproval";
import EventFeedback  from "./pages/organizer/EventFeedback";


const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public Routes ────────────────────────────────────────── */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Onboarding (Post-Registration) ───────────────────────── */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />

          {/* ── Participant Routes  ─────────────────────────── */}
          <Route path="/participant/dashboard" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipantDashboard />
            </ProtectedRoute>
          } /> 
          {/* Participant Events */}
          <Route path="/participant/browse-events" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipantEvents />
            </ProtectedRoute>
          } />

          {/* Participant Profile */}
          <Route path="/participant/profile" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipantProfile />
            </ProtectedRoute>
          } />
          <Route path="/participant/clubs" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipantClubs />
            </ProtectedRoute>
          } />

          <Route path="/participant/events/:id"  element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <EventDetail />
              </ProtectedRoute>
          } />

          <Route path="/participant/clubs/:id"   element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <OrganizerDetailPage />
              </ProtectedRoute>
          } />

          <Route path="/participant/teams" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <TeamDashboard />
              </ProtectedRoute>
          } />
          <Route path="/participant/teams/:teamId/chat" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <TeamChat />
              </ProtectedRoute>
          } />
          <Route path="/participant/orders" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <MyOrders />
              </ProtectedRoute>
          } />
          <Route path="/participant/feedback" element={
            <ProtectedRoute allowedRoles={["participant"]}>
            <FeedbackPage />
            </ProtectedRoute>
          } />
          <Route path="/participant/history" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipationHistory />
              </ProtectedRoute>
          } />
          <Route path="/participant/ticket/:id" element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <TicketPage />
              </ProtectedRoute>
          } />


          {/* ── Organizer Routes  ───────────────────────────── */}
            <Route path="/organizer/dashboard" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <OrganizerDashboard />
            </ProtectedRoute>
            } /> 
          
            <Route path="/organizer/create-event" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <CreateEvent />
            </ProtectedRoute>
          } />

          <Route path="/organizer/ongoing" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <OngoingEvents />
            </ProtectedRoute>
           } />

          <Route path="/organizer/profile" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <OrganizerProfile />
            </ProtectedRoute>
          } />

          <Route path="/organizer/events/:id" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <OrganizerEventDetail />
            </ProtectedRoute>
          } />

          <Route path="/organizer/payments" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <PaymentApproval />
            </ProtectedRoute>
          } />
          <Route path="/organizer/feedback" element={
            <ProtectedRoute allowedRoles={["organizer"]}>
              <EventFeedback />
              </ProtectedRoute>
          } />

          {/* ── Admin Routes ──────────────────────────────────────────── */}
          <Route path="/admin/dashboard"         element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
              </ProtectedRoute>
          } />
          <Route path="/admin/manage-clubs"      element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ManageOrganizers />
              </ProtectedRoute>
          } />
          <Route path="/admin/password-requests" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PasswordResetRequests />
              </ProtectedRoute>
          } />

          {/* ── Default Redirects ────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Fallback for 404s */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;