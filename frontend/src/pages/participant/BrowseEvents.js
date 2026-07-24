import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://localhost:5000/api";

const BrowseEvents = () => {
  const { loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFollowed, setShowFollowed] = useState(false);
  const [followedClubs, setFollowedClubs] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/participants/events`),
      axios.get(`${API_URL}/participants/events/trending`).catch(() => ({ data: { events: [] } })),
      // Use your existing preferences endpoint
      axios.get(`${API_URL}/participants/preferences`).catch(() => ({ data: { preferences: { followedOrganizers: [] } } }))
    ])
      .then(([evRes, trRes, prefRes]) => {
        setEvents(evRes.data.events || evRes.data || []);
        setTrending((trRes.data.events || []).slice(0, 5));

        // Extract the array from preferences.followedOrganizers
        const followed = prefRes.data.preferences?.followedOrganizers || [];
        setFollowedClubs(followed);
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const filtered = events.filter(e => {
    const nameMatch =
      e.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      e.organizer?.organizerName?.toLowerCase().includes(search.toLowerCase());

    const typeMatch =
      filterType === "All" || e.eventType === filterType;

    const eligibilityMatch =
      eligibility === "All" || e.eligibility === eligibility;

    const dateMatch =
      (!dateFrom || new Date(e.eventStartDate) >= new Date(dateFrom)) &&
      (!dateTo || new Date(e.eventStartDate) <= new Date(dateTo));

    const followedMatch =
      !showFollowed ||
      followedClubs.some(club => String(club._id) === String(e.organizer?._id));

    return nameMatch && typeMatch && eligibilityMatch && dateMatch && followedMatch;
  });

  return (
    <div style={s.page}>
      <ParticipantNavbar />

      <div style={s.wrap}>
        <h1 style={s.title}>Browse Events</h1>

        {/* Trending */}
        {trending.length > 0 && (
          <div style={s.trendBar}>
            <span style={s.trendLabel}> Trending</span>
            {trending.map(ev => (
              <Link key={ev._id} to={`/participant/events/${ev._id}`} style={s.trendChip}>
                {ev.eventName}
              </Link>
            ))}
          </div>
        )}

        {/* Search & filter */}
        <div style={s.controls}>
          <input
            style={s.input}
            placeholder="Search events or clubs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={s.input} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Normal">Normal</option>
            <option value="Merchandise">Merchandise</option>
          </select>
          <select
            style={s.input}
            value={eligibility}
            onChange={e => setEligibility(e.target.value)}
          >
            <option value="All">All Events</option>
            <option value="IIIT Only">IIIT Only</option>
            <option value="Open to All">Open to All</option>
            <option value="Non-IIIT Only">Non-IIIT Only</option>
          </select>
          <input
            type="date"
            style={s.input}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            style={s.input}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <input
              type="checkbox"
              checked={showFollowed}
              onChange={() => setShowFollowed(prev => !prev)}
            />
            Followed Clubs Only
          </label>
        </div>

        {loading ? (
          <p style={s.muted}>Loading events…</p>
        ) : filtered.length === 0 ? (
          <p style={s.muted}>No events found matching your criteria.</p>
        ) : (
          <div style={s.grid}>
            {filtered.map(ev => {
              const isFree = !ev.registrationFee || ev.registrationFee === 0;
              return (
                <div key={ev._id} style={s.card}>
                  <div style={s.cardTop}>
                    <span style={s.badge}>{ev.eventType}</span>
                    <span style={{ ...s.fee, ...(isFree ? s.feeFree : {}) }}>
                      {isFree ? "Free" : `₹${ev.registrationFee}`}
                    </span>
                  </div>
                  <h3 style={s.cardTitle}>{ev.eventName}</h3>
                  <p style={s.cardOrg}>by {ev.organizer?.organizerName || "Unknown"}</p>
                  <p style={s.cardDesc}>
                    {ev.description?.slice(0, 90)}{ev.description?.length > 90 ? "…" : ""}
                  </p>
                  <div style={s.cardFooter}>
                    {ev.eventStartDate && (
                      <span style={s.cardDate}>
                        {new Date(ev.eventStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <Link to={`/participant/events/${ev._id}`} style={s.viewBtn}>
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  page: { background: "#0f172a", width: "100vw", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 1200, margin: "0 auto", padding: "2rem" },
  title: { fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "1.25rem" },
  trendBar: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, marginBottom: "1.25rem", flexWrap: "wrap" },
  trendLabel: { color: "#6366f1", fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" },
  trendChip: { color: "#94a3b8", fontSize: "0.8rem", textDecoration: "none", padding: "0.18rem 0.6rem", background: "rgba(255,255,255,0.04)", borderRadius: 999 },
  controls: { display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  input: { padding: "0.65rem 0.9rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.9rem", minWidth: 200, flex: 1 },
  muted: { color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "1.25rem" },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: "0.72rem", padding: "0.18rem 0.65rem", borderRadius: 6, fontWeight: 600 },
  fee: { fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0", background: "rgba(255,255,255,0.06)", padding: "0.18rem 0.6rem", borderRadius: 6 },
  feeFree: { color: "#34d399", background: "rgba(52,211,153,0.1)" },
  cardTitle: { color: "#e2e8f0", fontWeight: 700, fontSize: "1rem", margin: 0 },
  cardOrg: { color: "#64748b", fontSize: "0.8rem", margin: 0 },
  cardDesc: { color: "#475569", fontSize: "0.82rem", margin: 0, lineHeight: 1.5, flex: 1 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" },
  cardDate: { color: "#64748b", fontSize: "0.8rem" },
  viewBtn: { color: "#6366f1", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 },
};

export default BrowseEvents;