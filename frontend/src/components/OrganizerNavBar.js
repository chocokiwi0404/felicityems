import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OrganizerNavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav style={s.nav}>
      <div style={s.navBrand}>
        <span style={s.navTitle}>Felicity</span>
      </div>

      <div style={s.navLinks}>
        <Link to="/organizer/dashboard" style={s.navLink}>Dashboard</Link>
        <Link to="/organizer/create-event" style={s.navLink}>Create Event</Link>
        <Link to="/organizer/ongoing" style={s.navLink}>Ongoing Events</Link>
        <Link to="/organizer/feedback" style={s.navLink}>Event Feedback</Link>
        <Link to="/organizer/payments" style={s.navLink}>Payment Approval</Link>
        <Link to="/organizer/profile" style={s.navLink}>Profile</Link>
      </div>

      <div style={s.navRight}>
        <button style={s.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

const s = {
  nav: {
    background: "#0f172a",
    padding: "0 2rem",
    display: "flex",
    alignItems: "center",
    height: 60,
    gap: "2rem",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 0 rgba(255,255,255,0.06)"
  },
  navBrand: { display: "flex", alignItems: "center", gap: "0.5rem" },
  navLogo: { fontSize: "1.4rem" },
  navTitle: { color: "#f8fafc", fontWeight: 700 },
  navRole: {
    background: "#4f46e5",
    color: "#fff",
    fontSize: "0.7rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 999,
    fontWeight: 600
  },
  navLinks: { display: "flex", gap: "0.5rem", flex: 1 },
  navLink: {
    color: "#94a3b8",
    padding: "0.4rem 0.85rem",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: "0.875rem"
  },
  navRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  navUser: { color: "#94a3b8", fontSize: "0.85rem" },
  logoutBtn: {
    padding: "0.35rem 0.9rem",
    background: "rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.85rem"
  }
};

export default OrganizerNavBar;