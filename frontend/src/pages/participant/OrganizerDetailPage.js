import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://localhost:5000/api";

const OrganizerDetailPage = () => {
  const { id } = useParams();
  const { loading: authLoading } = useAuth();
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      axios.get(`${API_URL}/organizers/${id}`),
      axios.get(`${API_URL}/participants/preferences`).catch(() => ({ data: { preferences: {} } })),
    ]).then(([orgRes, prefRes]) => {
      setOrganizer(orgRes.data.organizer);
      const followed = prefRes.data.preferences?.followedOrganizers || [];
      setFollowing(followed.some(o => (o._id || o) === id));
    }).catch(() => { })
      .finally(() => setLoading(false));
  }, [id, authLoading]);

  const handleFollowToggle = async () => {
    setToggling(true);
    try {
      const endpoint = following ? "unfollow" : "follow";
      await axios.post(`${API_URL}/participants/${endpoint}/${id}`);
      setFollowing(f => !f);
    } catch { } finally { setToggling(false); }
  };

  const now = new Date();
  const events = organizer?.events || [];
  const upcoming = events.filter(e => e.eventStartDate && new Date(e.eventStartDate) >= now && ["Published", "Ongoing"].includes(e.status));
  const past = events.filter(e => e.eventStartDate && new Date(e.eventStartDate) < now || e.status === "Completed");

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  if (!organizer) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.wrap}><p style={s.muted}>Organizer not found.</p></div>
    </div>
  );

  const shownEvents = tab === "upcoming" ? upcoming : past;

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        <Link to="/participant/clubs" style={s.back}>← All Clubs</Link>

        {/* Header card */}
        <div style={s.headerCard}>
          <div style={s.avatar}>{(organizer.organizerName?.[0] || "C").toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={s.catBadge}>{organizer.category}</div>
            <h1 style={s.orgName}>{organizer.organizerName}</h1>
            <p style={s.orgDesc}>{organizer.description || "No description provided."}</p>
            {organizer.contactEmail && (
              <a href={`mailto:${organizer.contactEmail}`} style={s.email}>
                ✉ {organizer.contactEmail}
              </a>
            )}
          </div>
          <button
            style={{ ...s.followBtn, ...(following ? s.followingBtn : {}) }}
            onClick={handleFollowToggle}
            disabled={toggling}>
            {toggling ? "…" : following ? "✓ Following" : "+ Follow"}
          </button>
        </div>

        {/* Events tabs */}
        <div style={s.tabBar}>
          <button style={{ ...s.tab, ...(tab === "upcoming" ? s.tabOn : {}) }}
            onClick={() => setTab("upcoming")}>
            Upcoming <span style={s.tabCount}>{upcoming.length}</span>
          </button>
          <button style={{ ...s.tab, ...(tab === "past" ? s.tabOn : {}) }}
            onClick={() => setTab("past")}>
            Past <span style={s.tabCount}>{past.length}</span>
          </button>
        </div>

        <div style={s.eventsArea}>
          {shownEvents.length === 0 ? (
            <p style={s.muted}>No {tab} events.</p>
          ) : (
            <div style={s.grid}>
              {shownEvents.map(ev => (
                <Link key={ev._id} to={`/participant/events/${ev._id}`} style={{ textDecoration: "none" }}>
                  <div style={s.evCard}>
                    <div style={s.evTop}>
                      <span style={s.evType}>{ev.eventType}</span>
                      <span style={s.evFee}>
                        {!ev.registrationFee || ev.registrationFee === 0 ? "Free" : `₹${ev.registrationFee}`}
                      </span>
                    </div>
                    <h3 style={s.evName}>{ev.eventName}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 900, margin: "0 auto", padding: "2rem" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  spinner: { width: 30, height: 30, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  muted: { color: "#64748b" },
  back: { color: "#64748b", textDecoration: "none", fontSize: "0.875rem", display: "inline-block", marginBottom: "1.25rem" },

  headerCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: "1.75rem", display: "flex", gap: "1.5rem", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap" },
  avatar: { width: 56, height: 56, background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.5rem", fontWeight: 800, flexShrink: 0 },
  catBadge: { background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.6rem", borderRadius: 999, display: "inline-block", marginBottom: "0.4rem" },
  orgName: { fontSize: "1.4rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 0.4rem" },
  orgDesc: { color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 0.75rem" },
  email: { color: "#6366f1", fontSize: "0.82rem", textDecoration: "none" },
  followBtn: { padding: "0.5rem 1.25rem", background: "transparent", border: "1px solid #6366f1", color: "#818cf8", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap", flexShrink: 0 },
  followingBtn: { background: "#6366f1", color: "#fff" },

  tabBar: { display: "flex", gap: "0.15rem", borderBottom: "1px solid #1e293b", marginBottom: 0 },
  tab: { padding: "0.6rem 1.1rem", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500, borderBottom: "2px solid transparent", marginBottom: -1, display: "flex", alignItems: "center", gap: "0.4rem" },
  tabOn: { color: "#6366f1", borderBottomColor: "#6366f1" },
  tabCount: { background: "#1e293b", color: "#64748b", fontSize: "0.72rem", padding: "0.1rem 0.45rem", borderRadius: 999 },

  eventsArea: { background: "#111827", border: "1px solid #1e293b", borderRadius: "0 0 12px 12px", padding: "1.5rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "1rem" },
  evCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.4rem" },
  evTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  evType: { background: "rgba(99,102,241,0.12)", color: "#818cf8", fontSize: "0.7rem", padding: "0.15rem 0.55rem", borderRadius: 4, fontWeight: 600 },
  evFee: { color: "#34d399", fontSize: "0.78rem", fontWeight: 700 },
  evName: { color: "#e2e8f0", fontWeight: 600, fontSize: "0.9rem", margin: 0 },
  evDate: { color: "#64748b", fontSize: "0.78rem" },
};

export default OrganizerDetailPage;