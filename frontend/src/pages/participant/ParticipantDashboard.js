import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://localhost:5000/api";

const TABS = [
  { key: "Upcoming", label: "Upcoming" },
  { key: "Normal", label: "Normal Events" },
  { key: "Merchandise", label: "Merchandise" },
  { key: "Completed", label: "Completed" },
  { key: "Cancelled/Rejected", label: "Cancelled/Rejected" },
];

const STATUS_COLORS = {
  Confirmed: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  Attended: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  Cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  Rejected: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  Pending: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
};

const ParticipantDashboard = () => {
  const { loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Upcoming");

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        const [regRes, recRes] = await Promise.all([
          axios.get(`${API_URL}/participants/registrations/mine`),
          axios.get(`${API_URL}/participants/events/recommended`).catch(() => ({ data: { events: [] } })),
        ]);
        setRegistrations(regRes.data.registrations || []);
        setRecommendations(recRes.data.events || []);
      } catch (err) {
        setError("Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading]);

  const now = new Date();

  const byTab = {
    "Upcoming": registrations.filter(r => r.status === "Confirmed" && r.event?.eventStartDate && new Date(r.event.eventStartDate) > now),
    "Normal": registrations.filter(r => r.event?.eventType === "Normal"),
    "Merchandise": registrations.filter(r => r.event?.eventType === "Merchandise"),
    "Completed": registrations.filter(r => r.event?.status === "Completed" || r.attended),
    "Cancelled/Rejected": registrations.filter(r => ["Cancelled", "Rejected"].includes(r.status)),
  };

  const rows = byTab[tab] || [];

  return (
    <div style={ds.page}>
      <ParticipantNavbar />

      <div style={ds.container}>
        <div style={ds.hdr}>
          <h1 style={ds.heading}>Participant Dashboard</h1>
        </div>

        {loading && <p style={ds.muted}>Loading dashboard…</p>}
        {error && <p style={ds.error}>{error}</p>}

        {!loading && !error && (
          <>
            {/* Stats row */}
            <div style={ds.statsRow}>
              {[
                { label: "Registered", val: registrations.length },
                { label: "Upcoming", val: byTab["Upcoming"].length },
                { label: "Attended", val: registrations.filter(r => r.attended).length },
                { label: "Merchandise", val: byTab["Merchandise"].length },
              ].map(s => (
                <div key={s.label} style={ds.statCard}>
                  <div style={ds.statVal}>{s.val}</div>
                  <div style={ds.statLbl}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* History tabs */}
            <h2 style={ds.sectionTitle}>My Events</h2>
            <div style={ds.tabBar}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ ...ds.tab, ...(tab === t.key ? ds.tabOn : {}) }}>
                  {t.label}
                  <span style={{ ...ds.tabBadge, ...(tab === t.key ? ds.tabBadgeOn : {}) }}>
                    {byTab[t.key]?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            <div style={ds.tableCard}>
              {rows.length === 0 ? (
                <div style={ds.empty}>
                  <p style={ds.emptyTtl}>No {tab.toLowerCase()} events</p>
                  {tab === "Upcoming" && (
                    <Link to="/participant/browse-events">
                      <button style={ds.browseBtn}>Browse Events</button>
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={ds.table}>
                    <thead>
                      <tr>
                        {["Event", "Type", "Organizer", "Date", "Status", "Ticket ID"].map(h => (
                          <th key={h} style={ds.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(reg => {
                        const st = STATUS_COLORS[reg.attended ? "Attended" : reg.status] || STATUS_COLORS.Pending;
                        return (
                          <tr key={reg._id} style={ds.tr}>
                            <td style={ds.td}>
                              <Link to={`/participant/events/${reg.event?._id}`} style={ds.evLink}>
                                {reg.event?.eventName || "—"}
                              </Link>
                              {reg.teamName && <div style={ds.teamName}>Team: {reg.teamName}</div>}
                            </td>
                            <td style={ds.td}>{reg.event?.eventType || "—"}</td>
                            <td style={ds.td}>{reg.event?.organizer?.organizerName || "—"}</td>
                            <td style={{ ...ds.td, whiteSpace: "nowrap" }}>
                              {reg.event?.eventStartDate ? new Date(reg.event.eventStartDate).toLocaleDateString("en-IN") : "—"}
                            </td>
                            <td style={ds.td}>
                              <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.65rem", borderRadius: 999, fontSize: "0.73rem", fontWeight: 700 }}>
                                {reg.attended ? "Attended" : reg.status}
                              </span>
                            </td>
                            <td style={ds.td}>
                              <Link to={`/participant/ticket/${reg._id}`} style={ds.ticketId}>
                                {reg.ticketId || "—"}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <>
                <h2 style={{ ...ds.sectionTitle, marginTop: "2.5rem" }}>Recommended for You</h2>
                <div style={ds.grid}>
                  {recommendations.map(ev => (
                    <Link key={ev._id} to={`/participant/events/${ev._id}`} style={{ textDecoration: "none" }}>
                      <div style={ds.card}>
                        <span style={ds.cardBadge}>{ev.eventType}</span>
                        <h3 style={ds.cardTitle}>{ev.eventName}</h3>
                        <p style={ds.cardOrg}>by {ev.organizer?.organizerName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ds = {
  page: { background: "#0f172a", width: "100vw", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" },
  container: { maxWidth: 1200, margin: "0 auto", padding: "2rem" },
  hdr: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  heading: { fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: 0 },
  browseBtn: { padding: "0.6rem 1.25rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" },
  muted: { color: "#64748b" },
  error: { color: "#ef4444" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" },
  statCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem 1.5rem" },
  statVal: { fontSize: "2rem", fontWeight: 800, color: "#6366f1", lineHeight: 1 },
  statLbl: { color: "#64748b", fontSize: "0.8rem", marginTop: "0.4rem" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.75rem" },
  tabBar: { display: "flex", gap: "0.15rem", borderBottom: "1px solid #1e293b", overflowX: "auto", marginBottom: 0 },
  tab: { padding: "0.6rem 1rem", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, borderBottom: "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" },
  tabOn: { color: "#6366f1", borderBottomColor: "#6366f1" },
  tabBadge: { background: "#1e293b", color: "#64748b", fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: 999, fontWeight: 700 },
  tabBadgeOn: { background: "rgba(99,102,241,0.15)", color: "#6366f1" },
  tableCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: "0 0 12px 12px", overflow: "hidden" },
  empty: { textAlign: "center", padding: "3rem 1rem" },
  emptyTtl: { color: "#475569", fontWeight: 600, marginBottom: "1rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "0.75rem 1.25rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid #334155", textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.875rem", color: "#cbd5e1" },
  tr: {},
  evLink: { color: "#e2e8f0", textDecoration: "none", fontWeight: 500 },
  teamName: { color: "#64748b", fontSize: "0.75rem", marginTop: "0.2rem" },
  ticketId: { fontFamily: "monospace", fontSize: "0.8rem", color: "#818cf8", textDecoration: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: "1rem" },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem" },
  cardBadge: { background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: "0.72rem", padding: "0.18rem 0.6rem", borderRadius: 6, fontWeight: 600 },
  cardTitle: { color: "#e2e8f0", fontWeight: 600, fontSize: "0.95rem", margin: "0.5rem 0 0.25rem" },
  cardOrg: { color: "#64748b", fontSize: "0.8rem", margin: 0 },
};

export default ParticipantDashboard;