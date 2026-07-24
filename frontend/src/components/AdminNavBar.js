import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminNavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const navLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/manage-clubs", label: "Manage Clubs/Organizers" },
    { path: "/admin/password-requests", label: "Password Reset Requests" },
  ];

  return (
    <nav style={s.nav}>
      {/* Brand Section */}
      <div style={s.brand}>
        <span style={s.title}>Felicity</span>
      </div>

      {/* Navigation Links (Spec 11.1) */}
      <div style={s.links}>
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            style={{
              ...s.link,
              ...(location.pathname === link.path ? s.linkActive : {}),
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Actions */}
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
    boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginRight: "1rem",
  },
  title: {
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "1.1rem",
  },
  role: {
    background: "#ef4444", // Red for Admin to distinguish from Organizer Purple
    color: "#fff",
    fontSize: "0.7rem",
    padding: "0.15rem 0.5rem",
    borderRadius: 999,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  links: {
    display: "flex",
    gap: "0.5rem",
    flex: 1,
  },
  link: {
    color: "#94a3b8",
    padding: "0.45rem 0.85rem",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: "0.875rem",
    transition: "all 0.2s ease",
  },
  linkActive: {
    color: "#fff",
    background: "rgba(255,255,255,0.08)",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
  },
  userEmail: {
    color: "#64748b",
    fontSize: "0.85rem",
  },
  logoutBtn: {
    background: "#ef4444",      
    color: "#ffffff",           
    border: "none",
    borderRadius: 6,
    padding: "0.4rem 1rem",
    cursor: "pointer",
    fontSize: "0.825rem",
    fontWeight: 600,
    transition: "opacity 0.2s ease",
  },
};

export default AdminNavBar;