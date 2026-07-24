import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API_URL = "http://localhost:5000/api";



const n = {
  nav:    { background: "#0f172a", padding: "0 2rem", display: "flex", alignItems: "center", height: 60, gap: "2rem", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(255,255,255,0.06)" },
  brand:  { display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem" },
  logo:   { fontSize: "1.4rem" },
  title:  { color: "#f8fafc", fontWeight: 700, fontSize: "1.1rem" },
  role:   { background: "#4f46e5", color: "#fff", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" },
  links:  { display: "flex", gap: "0.25rem", flex: 1 },
  link:   { color: "#94a3b8", padding: "0.4rem 0.85rem", borderRadius: 6, textDecoration: "none", fontSize: "0.875rem" },
  right:  { display: "flex", alignItems: "center", gap: "0.75rem" },
  user:   { color: "#94a3b8", fontSize: "0.85rem" },
  logout: { padding: "0.35rem 0.9rem", background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", fontSize: "0.85rem" },
};

// ── Export CSV helper ─────────────────────────────────────────────────────────
const exportCSV = (eventName, registrations) => {
  const headers = ["Name", "Email", "Reg Date", "Status", "Attended", "Ticket ID"];
  const rows = registrations.map(r => [
    `${r.participant?.firstName || ""} ${r.participant?.lastName || ""}`.trim(),
    r.participant?.email || "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "",
    r.status,
    r.attended ? "Yes" : "No",
    r.ticketId || "",
  ]);
  const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${eventName.replace(/\s+/g, "_")}_participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Single event accordion panel ──────────────────────────────────────────────
const EventPanel = ({ event: initialEvent }) => {
  const [event,        setEvent]        = useState(initialEvent);
  const [registrations, setRegs]        = useState([]);
  const [loading,       setLoading]     = useState(false);
  const [search,        setSearch]      = useState("");
  const [filterStatus,  setFilter]      = useState("All");
  const [marking,       setMarking]     = useState(null);
  const [open,          setOpen]        = useState(false);
  const [statusSaving,  setStatusSaving]= useState(false);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/organizer/events/${event._id}/registrations`);
      setRegs(res.data.registrations || []);
    } catch {
      setRegs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && registrations.length === 0) fetchRegs(); }, [open]); // eslint-disable-line

  const markAttendance = async (regId, current) => {
    setMarking(regId);
    try {
      await axios.patch(`${API_URL}/organizer/registrations/${regId}/attendance`, { attended: !current });
      setRegs(prev => prev.map(r => r._id === regId ? { ...r, attended: !current } : r));
    } catch {
      alert("Failed to update attendance.");
    } finally {
      setMarking(null);
    }
  };

  const updateStatus = async (newStatus) => {
    setStatusSaving(true);
    try {
      await axios.patch(`${API_URL}/organizer/events/${event._id}/status`, { status: newStatus });
      setEvent(prev => ({ ...prev, status: newStatus }));
    } catch {
      alert("Failed to update status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const filtered = registrations.filter(r => {
    const fullName = `${r.participant?.firstName || ""} ${r.participant?.lastName || ""}`.toLowerCase();
    const email    = r.participant?.email?.toLowerCase() || "";
    const matchSearch  = !search || fullName.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchStatus  =
      filterStatus === "All"          ? true :
      filterStatus === "Attended"     ? r.attended :
      filterStatus === "Not Attended" ? !r.attended :
      r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const attended = registrations.filter(r => r.attended).length;
  const total    = registrations.length;
  const rate     = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div style={ep.card}>
      {/* Accordion header */}
      <div style={ep.header} onClick={() => setOpen(!open)}>
        <div style={ep.headerLeft}>
          <div style={ep.eventName}>{event.eventName}</div>
          <div style={ep.meta}>
            <span style={ep.typePill}>
              {event.eventType === "Merchandise" ? "🛍️" : "🎫"} {event.eventType}
            </span>
            <span style={ep.metaItem}>
              📅 {new Date(event.eventStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              {" – "}
              {new Date(event.eventEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span style={ep.metaItem}>🎟️ {event.registrationCount || 0} registered</span>
          </div>
        </div>
        <div style={ep.headerRight}>
          <select
            style={ep.statusSelect}
            value={event.status}
            disabled={statusSaving}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); updateStatus(e.target.value); }}>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Mark Completed</option>
            <option value="Closed">Close</option>
          </select>
          <span style={ep.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={ep.body}>

          {/* Stats strip */}
          <div style={ep.statsRow}>
            {[
              { label: "Registered",   value: total,              color: "#4f46e5" },
              { label: "Attended",     value: attended,           color: "#16a34a" },
              { label: "Not Attended", value: total - attended,   color: "#9ca3af" },
              { label: "Attend Rate",  value: `${rate}%`,         color: rate > 70 ? "#16a34a" : rate > 40 ? "#d97706" : "#dc2626" },
              { label: "Revenue",      value: `₹${event.revenue || 0}`, color: "#0369a1" },
            ].map(st => (
              <div key={st.label} style={ep.statCard}>
                <div style={{ ...ep.statVal, color: st.color }}>{st.value}</div>
                <div style={ep.statLbl}>{st.label}</div>
              </div>
            ))}
          </div>

          {/* Attendance rate bar */}
          <div style={ep.rateRow}>
            <span style={ep.rateLabel}>Attendance</span>
            <div style={ep.rateTrack}>
              <div style={{
                ...ep.rateFill,
                width: `${rate}%`,
                background: rate > 70 ? "#22c55e" : rate > 40 ? "#f59e0b" : "#ef4444",
              }} />
            </div>
            <span style={ep.ratePct}>{rate}%</span>
          </div>

          {/* Controls */}
          <div style={ep.controls}>
            <input
              style={ep.searchInput}
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={ep.filterSelect} value={filterStatus} onChange={e => setFilter(e.target.value)}>
              {["All", "Confirmed", "Attended", "Not Attended", "Cancelled"].map(f => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <button style={ep.exportBtn} onClick={() => exportCSV(event.eventName, registrations)}>
              ⬇ Export CSV
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <p style={ep.loadTxt}>Loading participants…</p>
          ) : filtered.length === 0 ? (
            <div style={ep.emptyBox}>
              <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>👤</div>
              <p style={{ color: "#6b7280", fontWeight: 600, margin: 0 }}>
                {registrations.length === 0 ? "No registrations yet" : "No results match your search"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={ep.table}>
                <thead>
                  <tr>
                    {["Name", "Email", "Reg Date", "Status", "Ticket ID", "Attendance"].map(h => (
                      <th key={h} style={ep.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, i) => (
                    <tr key={reg._id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={ep.td}>
                        <span style={{ fontWeight: 600, color: "#111827" }}>
                          {reg.participant?.firstName} {reg.participant?.lastName}
                        </span>
                      </td>
                      <td style={{ ...ep.td, color: "#6b7280" }}>{reg.participant?.email || "—"}</td>
                      <td style={{ ...ep.td, color: "#6b7280", whiteSpace: "nowrap" }}>
                        {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={ep.td}>
                        <span style={{
                          ...ep.statusBadge,
                          background: reg.status === "Confirmed" ? "#dcfce7" : "#fee2e2",
                          color:      reg.status === "Confirmed" ? "#14532d" : "#7f1d1d",
                        }}>
                          {reg.status}
                        </span>
                      </td>
                      <td style={ep.td}>
                        <code style={ep.ticketId}>{reg.ticketId || "—"}</code>
                      </td>
                      <td style={ep.td}>
                        <button
                          style={{ ...ep.attendBtn, ...(reg.attended ? ep.attendBtnOn : {}) }}
                          onClick={() => markAttendance(reg._id, reg.attended)}
                          disabled={marking === reg._id}>
                          {marking === reg._id ? "…" : reg.attended ? "✓ Attended" : "Mark Present"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={ep.footer}>
            <Link to={`/organizer/events/${event._id}`} style={ep.detailLink}>
              View Full Event Details →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const OngoingEvents = () => {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/organizer/events`, { params: { status: "Ongoing" } })
      .then(res => setEvents((res.data.events || []).filter(e => e.status === "Ongoing")))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
      `}</style>

      <div style={s.page}>
        <OrganizerNavBar />
        <div style={s.wrap}>

          <div style={s.pageHdr}>
            <div>
              <h1 style={s.pageTitle}>Ongoing Events</h1>
              <p style={s.pageSub}>Track attendance and manage your live events in real time</p>
            </div>
            <Link to="/organizer/create-event">
              <button style={s.createBtn}>+ Create Event</button>
            </Link>
          </div>

          {loading ? (
            <div style={s.center}>
              <div style={s.spinner} />
              <p style={{ color: "#94a3b8", marginTop: "1rem", fontSize: "0.875rem" }}>Loading events…</p>
            </div>
          ) : events.length === 0 ? (
            <div style={s.emptyBox}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
              <h3 style={s.emptyTtl}>No ongoing events</h3>
              <p style={s.emptyTxt}>
                Events will appear here when their status is set to <strong>Ongoing</strong>.
                You can change an event's status from your Dashboard or the event detail page.
              </p>
              <Link to="/organizer/dashboard">
                <button style={s.createBtn}>Go to Dashboard</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {events.map((ev, i) => (
                <div key={ev._id} style={{ animation: `fadeUp 0.25s ease ${i * 0.06}s both` }}>
                  <EventPanel event={ev} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Event panel styles ────────────────────────────────────────────────────────
const ep = {
    card:         { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" },
    header:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", cursor: "pointer", userSelect: "none" },
    headerLeft:   { flex: 1, minWidth: 0 },
    headerRight:  { display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 },
    eventName:    { fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9", marginBottom: "0.35rem" },
    meta:         { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" },
    typePill:     { background: "#1e3a8a", color: "#bfdbfe", fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: 6, fontWeight: 600 },
    metaItem:     { color: "#94a3b8", fontSize: "0.8rem" },
    statusSelect: { padding: "0.35rem 0.65rem", border: "1px solid #334155", borderRadius: 6, background: "#1e293b", color: "#e2e8f0", fontSize: "0.82rem", cursor: "pointer" },
    chevron:      { color: "#64748b", fontSize: "0.75rem" },
    body:         { borderTop: "1px solid #1e293b", padding: "1.5rem" },
  
    statsRow:  { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0.75rem", marginBottom: "1.25rem" },
    statCard:  { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "0.9rem 1rem", textAlign: "center" },
    statVal:   { fontSize: "1.35rem", fontWeight: 800, lineHeight: 1, color: "#f8fafc" },
    statLbl:   { color: "#94a3b8", fontSize: "0.72rem", marginTop: "0.3rem" },
  
    rateRow:   { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" },
    rateLabel: { color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, minWidth: 80 },
    rateTrack: { flex: 1, height: 7, background: "#1e293b", borderRadius: 999, overflow: "hidden" },
    rateFill:  { height: "100%", borderRadius: 999, transition: "width 0.5s ease", background: "#3b82f6" },
    ratePct:   { color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700, minWidth: 36 },
  
    controls:    { display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" },
    searchInput: { flex: 1, minWidth: 200, padding: "0.6rem 0.85rem", border: "1px solid #334155", borderRadius: 8, background: "#1e293b", color: "#f1f5f9", fontSize: "0.875rem" },
    filterSelect:{ padding: "0.6rem 0.85rem", border: "1px solid #334155", borderRadius: 8, background: "#1e293b", color: "#e2e8f0", fontSize: "0.875rem" },
    exportBtn:   { padding: "0.6rem 1.1rem", background: "#1e40af", color: "#e0f2fe", border: "1px solid #1d4ed8", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, fontFamily: "inherit" },
  
    table:      { width: "100%", borderCollapse: "collapse" },
    th:         { padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", background: "#1e293b", borderBottom: "1px solid #334155", textTransform: "uppercase", letterSpacing: "0.05em" },
    td:         { padding: "0.8rem 1rem", borderBottom: "1px solid #1e293b", fontSize: "0.875rem", color: "#e2e8f0", verticalAlign: "middle" },
    statusBadge:{ padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, background: "#1e40af", color: "#dbeafe" },
    ticketId:   { fontFamily: "monospace", fontSize: "0.78rem", color: "#60a5fa" },
    attendBtn:  { padding: "0.3rem 0.75rem", border: "1px solid #334155", borderRadius: 6, background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s", fontFamily: "inherit" },
    attendBtnOn:{ background: "#064e3b", borderColor: "#065f46", color: "#6ee7b7" },
  
    loadTxt:  { color: "#64748b", fontSize: "0.875rem", textAlign: "center", padding: "2rem" },
    emptyBox: { textAlign: "center", padding: "2.5rem 1rem" },
    footer:   { marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "flex-end" },
    detailLink:{ color: "#60a5fa", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 },
  };
// ── Page styles ───────────────────────────────────────────────────────────────
const s = {
    page:     { minHeight: "100vh", width:"100vw", background: "#0b1120", fontFamily: "'DM Sans', system-ui, sans-serif" },
    wrap:     { maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" },
    pageHdr:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" },
    pageTitle:{ fontSize: "1.75rem", fontWeight: 700, color: "#f8fafc", margin: 0 },
    pageSub:  { color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.25rem" },
    createBtn:{ padding: "0.65rem 1.25rem", background: "#1d4ed8", color: "#ffffff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", fontFamily: "inherit" },
    center:   { display: "flex", flexDirection: "column", alignItems: "center", padding: "5rem 1rem" },
    spinner:  { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
    emptyBox: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "4rem 2rem", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" },
    emptyTtl: { fontWeight: 700, fontSize: "1.15rem", color: "#e2e8f0", margin: "0 0 0.5rem" },
    emptyTxt: { color: "#94a3b8", fontSize: "0.9rem", maxWidth: 420, margin: "0 auto 1.5rem", lineHeight: 1.6 },
  };

export default OngoingEvents;