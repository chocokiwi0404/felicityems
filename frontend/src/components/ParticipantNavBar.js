import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ParticipantNavbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={s.nav}>
      <div style={s.logo}>FELICITY</div>
      <div style={s.links}>
        <Link to="/participant/dashboard" style={s.link}>Home</Link>
        <Link to="/participant/browse-events" style={s.link}>Events</Link>
        <Link to="/participant/clubs" style={s.link}>Clubs</Link>
        <Link to="/participant/teams" style={s.link}>Team Dashboard</Link>
        <Link to="/participant/orders" style={s.link}>My Orders</Link>
        <Link to="/participant/feedback" style={s.link}>Feedback</Link>
        <Link to="/participant/profile" style={s.link}>Profile</Link>

        <button onClick={handleLogout} style={s.logout}>Logout</button>
      </div>
    </nav>
  );
};

const s = {
  nav: { display: "flex", justifyContent: "space-between", padding: "1rem 5%", background: "#1e293b", alignItems: "center", borderBottom: "1px solid #334155" },
  logo: { color: "#6366f1", fontWeight: "bold", fontSize: "1.5rem" },
  links: { display: "flex", gap: "2rem", alignItems: "center" },
  link: { color: "#cbd5e1", textDecoration: "none", fontSize: "0.95rem" },
  logout: { background: "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }
};

export default ParticipantNavbar;