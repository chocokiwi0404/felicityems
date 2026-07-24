import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API = "http://localhost:5000/api";

const STATUS_CONFIG = {
  Draft:     { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24", dot: "#f59e0b" },
  Published: { bg: "rgba(34,197,94,0.15)",   color: "#4ade80", dot: "#22c55e" },
  Ongoing:   { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", dot: "#3b82f6" },
  Completed: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", dot: "#9ca3af" },
  Closed:    { bg: "rgba(239,68,68,0.15)",   color: "#f87171", dot: "#ef4444" },
};

const TYPE_ICON = { Normal: "🎫", Merchandise: "🛍️" };

const OrganizerDashboard = () => {
  const [events,      setEvents]      = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("All");
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/organizer/events"
        );
  
        console.log("EVENTS RESPONSE:", res.data);
  
        if (res.data.success) {
          setEvents(res.data.events || []);
        } else {
          setEvents([]);
        }
  
      } catch (err) {
        console.error("FETCH ERROR:", err.response?.data || err.message);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
  
    fetchEvents();
  }, []);

  const FILTERS = ["All", "Draft", "Published", "Ongoing", "Completed", "Closed"];
  const filtered = filter === "All" ? events : events.filter(e => e.status === filter);

  const CARDS_PER_PAGE = 3;
  const maxIdx      = Math.max(0, filtered.length - CARDS_PER_PAGE);
  const visibleCards = filtered.slice(carouselIdx, carouselIdx + CARDS_PER_PAGE);

  const prev = () => setCarouselIdx(i => Math.max(0, i - 1));
  const next = () => setCarouselIdx(i => Math.min(maxIdx, i + 1));

  useEffect(() => { setCarouselIdx(0); }, [filter]);

  const fmt = d => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={s.page}>
      <OrganizerNavBar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.content}>
        {/* ── Header ── */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Dashboard</h1>
            <p style={s.pageSubtitle}>Manage your events and track performance</p>
          </div>
          <Link to="/organizer/create-event">
            <button style={s.createBtn}>+ Create New Event</button>
          </Link>
        </div>

        {loading ? (
          <div style={s.loadingBox}>
            <div style={{ ...s.spinner, animation: "spin 0.7s linear infinite" }} />
            <p style={{ color: "#64748b", marginTop: "1rem" }}>Loading your dashboard…</p>
          </div>
        ) : (
          <>
            {/* ── Stats strip ── */}
            <div style={s.statsStrip}>
              {[
                { label: "Total Events",        value: analytics?.totalEvents        ?? events.length,  color: "#818cf8" },
                { label: "Registrations",        value: analytics?.totalRegistrations ?? 0,     color: "#34d399" },
                { label: "Revenue",              value: `₹${analytics?.totalRevenue  ?? 0}`,     color: "#fbbf24" },
                { label: "Published",            value: analytics?.byStatus?.Published ?? 0,      color: "#4ade80" },
                { label: "Ongoing",              value: analytics?.byStatus?.Ongoing   ?? 0,       color: "#60a5fa" },
                { label: "Drafts",               value: analytics?.byStatus?.Draft     ?? 0,        color: "#94a3b8" },
              ].map(stat => (
                <div key={stat.label} style={s.statCard}>
                  <span style={s.statIcon}>{stat.icon}</span>
                  <div>
                    <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Events section ── */}
            <section style={s.section}>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>My Events</h2>
                <div style={s.filterTabs}>
                  {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}) }}>
                      {f}
                      <span style={{ ...s.filterCount, ...(filter === f ? s.filterCountActive : {}) }}>
                        {f === "All" ? events.length : events.filter(e => e.status === f).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={s.emptyState}>
                  <h3 style={s.emptyTitle}>No {filter === "All" ? "" : filter} events yet</h3>
                  <p style={s.emptyText}>
                    {filter === "All"
                      ? "Create your first event to get started."
                      : `No events with status "${filter}".`}
                  </p>
                  {filter === "All" && (
                    <Link to="/organizer/create-event">
                      <button style={{ ...s.createBtn, marginTop: "1rem" }}>+ Create Event</button>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div style={s.carouselWrapper}>
                    <button onClick={prev} disabled={carouselIdx === 0}
                      style={{ ...s.carouselArrow, opacity: carouselIdx === 0 ? 0.25 : 1 }}>
                      ‹
                    </button>

                    <div style={s.carouselTrack}>
                      {visibleCards.map(ev => {
                        const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.Draft;
                        return (
                          <Link key={ev._id} to={`/organizer/events/${ev._id}`}
                            style={{ textDecoration: "none", flex: "1 1 0", minWidth: 0 }}>
                            <div style={s.eventCard}>
                              <div style={s.cardTopBar}>
                                <span style={{ ...s.statusBadge, background: cfg.bg, color: cfg.color }}>
                                  <span style={{ ...s.statusDot, background: cfg.dot }} />
                                  {ev.status}
                                </span>
                                <span style={s.typeBadge}>
                                  {TYPE_ICON[ev.eventType] || "🎫"} {ev.eventType}
                                </span>
                              </div>

                              <h3 style={s.cardTitle}>{ev.eventName}</h3>
                              <div style={s.cardMeta}> {fmt(ev.eventStartDate)}</div>

                              <div style={s.cardFooter}>
                                <span style={s.cardStat}> {ev.registrationCount || 0} registered</span>
                                {ev.registrationFee > 0 && (
                                  <span style={s.cardStat}>₹{ev.registrationFee}</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {/* Pad empty slots so cards don't stretch */}
                      {visibleCards.length < CARDS_PER_PAGE &&
                        Array.from({ length: CARDS_PER_PAGE - visibleCards.length }).map((_, i) => (
                          <div key={`pad-${i}`} style={{ flex: "1 1 0" }} />
                        ))}
                    </div>

                    <button onClick={next} disabled={carouselIdx >= maxIdx}
                      style={{ ...s.carouselArrow, opacity: carouselIdx >= maxIdx ? 0.25 : 1 }}>
                      ›
                    </button>
                  </div>

                  {/* Pagination dots */}
                  {filtered.length > CARDS_PER_PAGE && (
                    <div style={s.paginationDots}>
                      {Array.from({ length: maxIdx + 1 }).map((_, i) => (
                        <button key={i} onClick={() => setCarouselIdx(i)}
                          style={{ ...s.dot, ...(carouselIdx === i ? s.dotActive : {}) }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

          </>
        )}
      </div>
    </div>
  );
};

const s = {
  page:             { minHeight: "100vh", width: "100vw", background: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e2e8f0" },
  content:          { maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" },
  pageHeader:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  pageTitle:        { fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.2rem", color: "#f8fafc" },
  pageSubtitle:     { color: "#64748b", fontSize: "0.875rem", margin: 0 },
  createBtn:        { padding: "0.6rem 1.25rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
  loadingBox:       { display: "flex", flexDirection: "column", alignItems: "center", padding: "5rem 0" },
  spinner:          { width: 34, height: 34, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%" },

  statsStrip:       { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" },
  statCard:         { background: "#1e293b", padding: "1rem", borderRadius: 12, border: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.75rem" },
  statIcon:         { fontSize: "1.4rem", flexShrink: 0 },
  statValue:        { fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 },
  statLabel:        { fontSize: "0.67rem", color: "#64748b", marginTop: "0.2rem" },

  section:          { background: "#1e293b", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #334155" },
  sectionHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" },
  sectionTitle:     { fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", margin: 0 },
  sectionSubtitle:  { color: "#475569", fontSize: "0.8rem" },

  filterTabs:       { display: "flex", gap: "0.35rem", flexWrap: "wrap" },
  filterTab:        { padding: "0.3rem 0.75rem", borderRadius: 999, background: "transparent", border: "1px solid #334155", cursor: "pointer", fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" },
  filterTabActive:  { background: "rgba(99,102,241,0.15)", borderColor: "#6366f1", color: "#818cf8" },
  filterCount:      { fontSize: "0.68rem", color: "#475569" },
  filterCountActive:{ color: "#818cf8" },

  emptyState:       { textAlign: "center", padding: "3rem 1rem" },
  emptyIcon:        { fontSize: "3rem", marginBottom: "0.75rem" },
  emptyTitle:       { fontWeight: 700, color: "#f8fafc", margin: "0 0 0.4rem" },
  emptyText:        { color: "#475569", fontSize: "0.875rem" },

  carouselWrapper:  { display: "flex", alignItems: "center", gap: "0.75rem" },
  carouselArrow:    { width: 34, height: 34, background: "#0f172a", border: "1px solid #334155", borderRadius: "50%", cursor: "pointer", color: "#94a3b8", fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  carouselTrack:    { display: "flex", gap: "1rem", flex: 1 },
  paginationDots:   { display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "1rem" },
  dot:              { width: 6, height: 6, borderRadius: "50%", background: "#334155", border: "none", cursor: "pointer", padding: 0 },
  dotActive:        { background: "#6366f1" },

  eventCard:        { background: "#0f172a", borderRadius: 12, padding: "1rem", border: "1px solid #334155", boxSizing: "border-box" },
  cardTopBar:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  statusBadge:      { display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600 },
  statusDot:        { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  typeBadge:        { fontSize: "0.72rem", color: "#64748b" },
  cardTitle:        { fontWeight: 700, color: "#f8fafc", margin: "0 0 0.4rem", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardMeta:         { fontSize: "0.78rem", color: "#64748b", marginBottom: "0.5rem" },
  cardFooter:       { display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid #1e293b" },
  cardStat:         { fontSize: "0.72rem", color: "#475569" },

  analyticsGrid:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" },
  analyticsCard:    { background: "#0f172a", borderRadius: 10, padding: "1rem", border: "1px solid #334155", textAlign: "center" },
  analyticsValue:   { fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.2rem" },
  analyticsLabel:   { fontSize: "0.68rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
};

export default OrganizerDashboard;