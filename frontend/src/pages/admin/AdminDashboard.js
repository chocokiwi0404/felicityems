// src/pages/admin/AdminDashboard.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminNavBar from "../../components/AdminNavBar";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/admin/stats`)
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = [
    { label: "Total Participants",  key: "totalUsers",      color: "#6366f1" },
    { label: "Registered Clubs",    key: "totalOrganizers", color: "#22c55e" },
    { label: "Active Events",       key: "totalEvents",     color: "#3b82f6" },
    { label: "Pending PW Requests", key: "pendingResets",   color: "#f59e0b" },
  ];

  const ACTION_LINKS = [
    {
      to:    "/admin/manage-clubs",
      title: "Manage Clubs / Organizers",
      sub:   "Create accounts, disable or permanently delete clubs",
    },
    {
      to:    "/admin/password-requests",
      title: "Password Reset Requests",
      sub:   "Review, approve or reject organizer reset requests",
    },
  ];

  return (
    <div style={s.page}>
      <AdminNavBar />
      <div style={s.container}>
        <header style={s.header}>
          <h1 style={s.heading}>Admin Dashboard</h1>
          <p style={s.sub}>System overview and management</p>
        </header>

        {/* Stats */}
        <div style={s.statsGrid}>
          {STAT_CARDS.map(c => (
            <div key={c.key} style={s.statCard}>
              <div style={{ ...s.statVal, color: c.color }}>
                {loading ? "—" : (stats?.[c.key] ?? 0)}
              </div>
              <div style={s.statLbl}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 style={s.sectionTitle}>Administrative Tasks</h2>
        <div style={s.linkGrid}>
          {ACTION_LINKS.map(a => (
            <Link key={a.to} to={a.to} style={s.actionCard}>
              <span style={s.actionIcon}>{a.icon}</span>
              <div>
                <div style={s.actionTitle}>{a.title}</div>
                <div style={s.actionSub}>{a.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const s = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "#0f172a",
    fontFamily: "system-ui, sans-serif",
    color: "#e2e8f0",
  },

  container: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "2rem",
  },

  header: {
    marginBottom: "2rem",
  },

  heading: {
    fontSize: "1.4rem",
    fontWeight: 600,
    margin: 0,
  },

  sub: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    marginTop: "0.25rem",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },

  statCard: {
    background: "#1e293b",
    borderRadius: 8,
    padding: "1.2rem",
    textAlign: "center",
  },

  statVal: {
    fontSize: "1.8rem",
    fontWeight: 600,
  },

  statLbl: {
    color: "#94a3b8",
    fontSize: "0.75rem",
    marginTop: "0.4rem",
  },

  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: "1rem",
  },

  linkGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },

  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1.2rem",
    background: "#1e293b",
    borderRadius: 8,
    textDecoration: "none",
    color: "#e2e8f0",
  },

  actionIcon: {
    fontSize: "1.6rem",
  },

  actionTitle: {
    fontWeight: 500,
    fontSize: "0.9rem",
    marginBottom: "0.25rem",
  },

  actionSub: {
    color: "#94a3b8",
    fontSize: "0.8rem",
  },
};

export default AdminDashboard;