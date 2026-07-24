import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API = "http://localhost:5000/api";

const STATUS_COLORS = {
  Draft:     { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "#fbbf24" },
  Published: { bg: "rgba(74,222,128,0.12)",  color: "#4ade80", border: "#4ade80" },
  Ongoing:   { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa", border: "#60a5fa" },
  Completed: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "#94a3b8" },
  Closed:    { bg: "rgba(239,68,68,0.12)",   color: "#f87171", border: "#f87171" },
};

const VALID_TRANSITIONS = {
  Draft:     ["Published"],
  Published: ["Ongoing", "Closed"],
  Ongoing:   ["Completed", "Closed"],
  Completed: [],
  Closed:    [],
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";
const fmtInput = (d) => d ? new Date(d).toISOString().split("T")[0] : "";

export default function OrganizerEventDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [event,         setEvent]         = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [regLoading,    setRegLoading]    = useState(true);
  const [tab,           setTab]           = useState("overview");
  const [editing,       setEditing]       = useState(false);
  const [editData,      setEditData]      = useState({});
  const [saving,        setSaving]        = useState(false);
  const [statusSaving,  setStatusSaving]  = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [search,        setSearch]        = useState("");
  const [attFilter,     setAttFilter]     = useState("All");

  const loadEvent = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/organizer/events/${id}`);
      setEvent(res.data.event);
      setEditData(res.data.event);
    } catch { setMsg({ type:"err", text:"Failed to load event." }); }
    finally  { setLoading(false); }
  }, [id]);

  const loadRegistrations = useCallback(async () => {
    setRegLoading(true);
    try {
      const res = await axios.get(`${API}/organizer/events/${id}/registrations`);
      setRegistrations(res.data.registrations || []);
    } catch { setRegistrations([]); }
    finally  { setRegLoading(false); }
  }, [id]);

  useEffect(() => { loadEvent(); loadRegistrations(); }, [loadEvent, loadRegistrations]);

  // ── Edit save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const payload = {};
      // Draft: all fields editable; Published: only description, deadline, limit
      if (event.status === "Draft") {
        ["eventName","description","eligibility","registrationDeadline",
         "eventStartDate","eventEndDate","registrationLimit","registrationFee","tags"]
          .forEach(k => { payload[k] = editData[k]; });
      } else {
        ["description","registrationDeadline","registrationLimit"].forEach(k => {
          payload[k] = editData[k];
        });
      }
      // Convert date strings back
      ["registrationDeadline","eventStartDate","eventEndDate"].forEach(k => {
        if (payload[k]) payload[k] = new Date(payload[k]).toISOString();
      });
      const res = await axios.put(`${API}/organizer/events/${id}`, payload);
      setEvent(res.data.event);
      setEditData(res.data.event);
      setEditing(false);
      setMsg({ type:"ok", text:"Event updated successfully." });
    } catch (err) {
      setMsg({ type:"err", text: err.response?.data?.message || "Save failed." });
    } finally { setSaving(false); }
  };

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    setStatusSaving(true); setMsg(null);
    try {
      const res = await axios.patch(`${API}/organizer/events/${id}/status`, { status: newStatus });
      setEvent(res.data.event);
      setMsg({ type:"ok", text:`Status changed to ${newStatus}.` });
    } catch (err) {
      setMsg({ type:"err", text: err.response?.data?.message || "Failed." });
    } finally { setStatusSaving(false); }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["Name","Email","Reg Date","Status","Payment","Attended","Team"];
    const rows = filteredRegs.map(r => [
      `${r.participant?.firstName || ""} ${r.participant?.lastName || ""}`.trim(),
      r.participant?.email || "",
      r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "",
      r.status || "",
      r.paymentStatus || "",
      r.attended ? "Yes" : "No",
      r.team?.name || "",
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${event?.eventName || "event"}_participants.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Filtered registrations ─────────────────────────────────────────────────
  const filteredRegs = registrations.filter(r => {
    const name  = `${r.participant?.firstName} ${r.participant?.lastName}`.toLowerCase();
    const email = (r.participant?.email || "").toLowerCase();
    const q     = search.toLowerCase();
    const matchSearch  = !q || name.includes(q) || email.includes(q);
    const matchFilter  = attFilter === "All"
      || (attFilter === "Attended" && r.attended)
      || (attFilter === "Not Attended" && !r.attended);
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div style={s.page}><OrganizerNavBar />
      <div style={s.center}><div style={s.spinner}/></div>
    </div>
  );

  if (!event) return (
    <div style={s.page}><OrganizerNavBar />
      <div style={s.wrap}><p style={s.muted}>Event not found.</p></div>
    </div>
  );

  const sc         = STATUS_COLORS[event.status] || STATUS_COLORS.Draft;
  const transitions= VALID_TRANSITIONS[event.status] || [];
  const isDraft    = event.status === "Draft";
  const canEdit    = ["Draft","Published"].includes(event.status);

  // Analytics derived from registrations
  const attended  = registrations.filter(r => r.attended).length;
  const revenue   = registrations.filter(r => r.status === "Confirmed").length * (event.registrationFee || 0);

  const Banner = () => !msg ? null : (
    <div style={{ ...s.banner, ...(msg.type==="ok" ? s.bannerOk : s.bannerErr) }}>
      {msg.type==="ok" ? "✓" : "⚠"} {msg.text}
      <button style={s.bannerClose} onClick={() => setMsg(null)}>×</button>
    </div>
  );

  return (
    <div style={s.page}>
      <OrganizerNavBar />
      <div style={s.wrap}>

        {/* ── Breadcrumb ── */}
        <Link to="/organizer/dashboard" style={s.back}>← Back to Dashboard</Link>

        <Banner />

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerMeta}>
              <span style={{ ...s.statusBadge, background: sc.bg, color: sc.color, borderColor: sc.border }}>
                {event.status}
              </span>
              <span style={s.typePill}>{event.eventType}</span>
            </div>
            <h1 style={s.eventTitle}>{event.eventName}</h1>
            <p style={s.eventDesc}>{event.description || "No description."}</p>
          </div>

          <div style={s.headerActions}>
            {/* Status transitions */}
            {transitions.map(st => (
              <button key={st} style={s.transBtn} onClick={() => handleStatusChange(st)} disabled={statusSaving}>
                → {st}
              </button>
            ))}
            {canEdit && !editing && (
              <button style={s.editBtn} onClick={() => setEditing(true)}>✏ Edit</button>
            )}
            {editing && (
              <>
                <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button style={s.cancelBtn} onClick={() => { setEditing(false); setEditData(event); }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabBar}>
          {["overview","analytics","participants"].map(t => (
            <button key={t} style={{ ...s.tab, ...(tab===t ? s.tabOn : {}) }}
              onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "participants" && (
                <span style={{ ...s.tabBadge, ...(tab===t ? s.tabBadgeOn : {}) }}>
                  {registrations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={s.tabBody}>

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          {tab === "overview" && (
            <div style={s.overviewGrid}>
              {/* Details card */}
              <div style={s.card}>
                <h2 style={s.cardTitle}>Event Details</h2>
                <div style={s.fieldList}>

                  {/* Event Name — Draft only */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Event Name</span>
                    {editing && isDraft ? (
                      <input style={s.input} value={editData.eventName || ""}
                        onChange={e => setEditData(p => ({ ...p, eventName: e.target.value }))} />
                    ) : <span style={s.fieldVal}>{event.eventName}</span>}
                  </div>

                  {/* Type — never editable */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Type</span>
                    <span style={s.fieldVal}>{event.eventType}</span>
                  </div>

                  {/* Eligibility — Draft only */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Eligibility</span>
                    {editing && isDraft ? (
                      <select style={s.input} value={editData.eligibility}
                        onChange={e => setEditData(p => ({ ...p, eligibility: e.target.value }))}>
                        <option>Open to All</option>
                        <option>IIIT Only</option>
                        <option>Non-IIIT Only</option>
                      </select>
                    ) : <span style={s.fieldVal}>{event.eligibility}</span>}
                  </div>

                  {/* Description — always editable when canEdit */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Description</span>
                    {editing ? (
                      <textarea style={{ ...s.input, minHeight:72, resize:"vertical" }}
                        value={editData.description || ""}
                        onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
                    ) : <span style={{ ...s.fieldVal, color:"#94a3b8", fontSize:"0.85rem" }}>{event.description || "—"}</span>}
                  </div>

                  {/* Registration Fee — Draft only */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Fee</span>
                    {editing && isDraft ? (
                      <input style={s.input} type="number" min="0" value={editData.registrationFee || 0}
                        onChange={e => setEditData(p => ({ ...p, registrationFee: Number(e.target.value) }))} />
                    ) : <span style={s.fieldVal}>{event.registrationFee ? `₹${event.registrationFee}` : "Free"}</span>}
                  </div>

                  {/* Reg Limit — editable (can increase when Published) */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Reg Limit</span>
                    {editing ? (
                      <input style={s.input} type="number" min="1" placeholder="Unlimited"
                        value={editData.registrationLimit || ""}
                        onChange={e => setEditData(p => ({ ...p, registrationLimit: e.target.value ? Number(e.target.value) : null }))} />
                    ) : <span style={s.fieldVal}>{event.registrationLimit || "Unlimited"}</span>}
                  </div>

                  {/* Reg Deadline — editable */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Reg Deadline</span>
                    {editing ? (
                      <input style={s.input} type="date" value={fmtInput(editData.registrationDeadline)}
                        onChange={e => setEditData(p => ({ ...p, registrationDeadline: e.target.value }))} />
                    ) : <span style={s.fieldVal}>{fmt(event.registrationDeadline)}</span>}
                  </div>

                  {/* Start / End Date — Draft only */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Start Date</span>
                    {editing && isDraft ? (
                      <input style={s.input} type="date" value={fmtInput(editData.eventStartDate)}
                        onChange={e => setEditData(p => ({ ...p, eventStartDate: e.target.value }))} />
                    ) : <span style={s.fieldVal}>{fmt(event.eventStartDate)}</span>}
                  </div>

                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>End Date</span>
                    {editing && isDraft ? (
                      <input style={s.input} type="date" value={fmtInput(editData.eventEndDate)}
                        onChange={e => setEditData(p => ({ ...p, eventEndDate: e.target.value }))} />
                    ) : <span style={s.fieldVal}>{fmt(event.eventEndDate)}</span>}
                  </div>

                  {/* Tags — Draft only */}
                  <div style={s.fieldRow}>
                    <span style={s.fieldLabel}>Tags</span>
                    {editing && isDraft ? (
                      <input style={s.input} placeholder="comma separated"
                        value={(editData.tags || []).join(", ")}
                        onChange={e => setEditData(p => ({ ...p, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} />
                    ) : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(event.tags || []).length > 0
                          ? event.tags.map(t => <span key={t} style={s.tag}>{t}</span>)
                          : <span style={s.fieldVal}>—</span>}
                      </div>
                    )}
                  </div>

                </div>

                {/* Edit rules hint */}
                {canEdit && !isDraft && (
                  <p style={s.editHint}>
                    ℹ Published events: only description, deadline, and limit are editable.
                  </p>
                )}
                {!canEdit && (
                  <p style={s.editHint}>
                    ℹ {event.status} events cannot be edited.
                  </p>
                )}
              </div>

              {/* Quick stats */}
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                {[
                  { label:"Registrations", value: registrations.length, icon:"👥" },
                  { label:"Attended",      value: attended,              icon:"✅" },
                  { label:"Revenue",       value: `₹${revenue}`,         icon:"💰" },
                  { label:"Spots Left",    value: event.registrationLimit
                      ? Math.max(0, event.registrationLimit - event.registrationCount)
                      : "∞",              icon:"🎫" },
                ].map(stat => (
                  <div key={stat.label} style={s.statCard}>
                    <span style={s.statIcon}>{stat.icon}</span>
                    <div>
                      <div style={s.statVal}>{stat.value}</div>
                      <div style={s.statLbl}>{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════ ANALYTICS TAB ══════════════ */}
          {tab === "analytics" && (
            <div style={s.analyticsGrid}>
              {[
                { label:"Total Registrations", value: registrations.length,                                           icon:"📋", color:"#6366f1" },
                { label:"Confirmed",           value: registrations.filter(r=>r.status==="Confirmed").length,         icon:"✅", color:"#4ade80" },
                { label:"Attendance Rate",     value: registrations.length ? `${Math.round(attended/registrations.length*100)}%` : "0%", icon:"🎯", color:"#f59e0b" },
                { label:"Total Revenue",       value: `₹${revenue}`,                                                 icon:"💰", color:"#34d399" },
                { label:"Pending Payment",     value: registrations.filter(r=>r.paymentStatus==="Pending").length,   icon:"⏳", color:"#fbbf24" },
                { label:"Cancelled",           value: registrations.filter(r=>r.status==="Cancelled").length,        icon:"❌", color:"#f87171" },
              ].map(stat => (
                <div key={stat.label} style={s.analyticsCard}>
                  <div style={{ ...s.analyticsIcon, color: stat.color }}>{stat.icon}</div>
                  <div style={{ ...s.analyticsVal, color: stat.color }}>{stat.value}</div>
                  <div style={s.analyticsLbl}>{stat.label}</div>
                </div>
              ))}

              {/* Attendance bar */}
              {registrations.length > 0 && (
                <div style={{ ...s.barCard, gridColumn:"1/-1" }}>
                  <h3 style={s.cardTitle}>Attendance Progress</h3>
                  <div style={s.barTrack}>
                    <div style={{
                      ...s.barFill,
                      width: `${Math.round(attended / registrations.length * 100)}%`
                    }}/>
                  </div>
                  <p style={s.barLabel}>
                    {attended} of {registrations.length} registered participants attended
                    ({Math.round(attended / registrations.length * 100)}%)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ PARTICIPANTS TAB ══════════════ */}
          {tab === "participants" && (
            <div>
              {/* Controls */}
              <div style={s.pControls}>
                <input style={s.searchInput} placeholder="Search name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <div style={s.filterGroup}>
                  {["All","Attended","Not Attended"].map(f => (
                    <button key={f}
                      style={{ ...s.filterBtn, ...(attFilter===f ? s.filterBtnOn : {}) }}
                      onClick={() => setAttFilter(f)}>{f}</button>
                  ))}
                </div>
                <button style={s.exportBtn} onClick={exportCSV}>⬇ Export CSV</button>
              </div>

              {regLoading ? (
                <div style={{ padding:"3rem", textAlign:"center", color:"#64748b" }}>Loading participants…</div>
              ) : filteredRegs.length === 0 ? (
                <div style={{ padding:"3rem", textAlign:"center", color:"#64748b" }}>
                  {registrations.length === 0 ? "No registrations yet." : "No results match your search."}
                </div>
              ) : (
                <div style={{ overflowX:"auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Name","Email","Registered","Status","Payment","Attended","Ticket ID"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegs.map(reg => (
                        <tr key={reg._id} style={s.tr}>
                          <td style={s.td}>
                            <div style={s.participantName}>
                              {reg.participant?.firstName} {reg.participant?.lastName}
                            </div>
                          </td>
                          <td style={s.td}><span style={s.email}>{reg.participant?.email || "—"}</span></td>
                          <td style={s.td}>{reg.createdAt ? new Date(reg.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                          <td style={s.td}>
                            <span style={{
                              ...s.pill,
                              ...(reg.status==="Confirmed" ? s.pillGreen :
                                  reg.status==="Cancelled" ? s.pillRed : s.pillYellow)
                            }}>{reg.status}</span>
                          </td>
                          <td style={s.td}>
                            <span style={{
                              ...s.pill,
                              ...(reg.paymentStatus==="Approved" ? s.pillGreen :
                                  reg.paymentStatus==="Rejected" ? s.pillRed :
                                  reg.paymentStatus==="Pending"  ? s.pillYellow : s.pillGray)
                            }}>{reg.paymentStatus || "N/A"}</span>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.pill, ...(reg.attended ? s.pillGreen : s.pillGray) }}>
                              {reg.attended ? "Yes" : "No"}
                            </span>
                          </td>
                          <td style={s.td}>
                            <span style={s.ticketId}>{reg.ticketId || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const s = {
  page:         { background:"#0f172a", minHeight:"100vh", width:"100vw", color:"#f1f5f9", fontFamily:"'DM Sans',system-ui,sans-serif" },
  wrap:         { maxWidth:1100, margin:"0 auto", padding:"2rem" },
  center:       { display:"flex", justifyContent:"center", alignItems:"center", height:"60vh" },
  spinner:      { width:32, height:32, border:"3px solid #1e293b", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  muted:        { color:"#64748b" },
  back:         { color:"#64748b", textDecoration:"none", fontSize:"0.85rem", display:"inline-block", marginBottom:"1.5rem" },

  banner:       { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.75rem 1rem", borderRadius:8, fontSize:"0.875rem", marginBottom:"1.25rem" },
  bannerOk:     { background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80" },
  bannerErr:    { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" },
  bannerClose:  { background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:"1.1rem", padding:0 },

  header:       { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap" },
  headerLeft:   { flex:1 },
  headerMeta:   { display:"flex", gap:"0.5rem", alignItems:"center", marginBottom:"0.5rem" },
  statusBadge:  { padding:"0.25rem 0.75rem", borderRadius:999, fontSize:"0.75rem", fontWeight:600, border:"1px solid" },
  typePill:     { background:"rgba(99,102,241,0.12)", color:"#818cf8", fontSize:"0.75rem", padding:"0.2rem 0.65rem", borderRadius:6, fontWeight:600 },
  eventTitle:   { fontSize:"1.6rem", fontWeight:800, color:"#f8fafc", margin:"0 0 0.4rem" },
  eventDesc:    { color:"#94a3b8", fontSize:"0.9rem", margin:0 },
  headerActions:{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"flex-start" },
  transBtn:     { padding:"0.5rem 1rem", background:"rgba(99,102,241,0.15)", color:"#818cf8", border:"1px solid #6366f1", borderRadius:8, cursor:"pointer", fontSize:"0.82rem", fontWeight:600 },
  editBtn:      { padding:"0.5rem 1rem", background:"#6366f1", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:"0.875rem" },
  saveBtn:      { padding:"0.5rem 1rem", background:"#4ade80", color:"#052e16", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:"0.875rem" },
  cancelBtn:    { padding:"0.5rem 1rem", background:"transparent", color:"#94a3b8", border:"1px solid #334155", borderRadius:8, cursor:"pointer", fontSize:"0.875rem" },

  tabBar:       { display:"flex", gap:0, borderBottom:"1px solid #1e293b", marginBottom:0 },
  tab:          { padding:"0.7rem 1.25rem", background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"0.875rem", fontWeight:500, borderBottom:"2px solid transparent", marginBottom:-1, display:"flex", alignItems:"center", gap:"0.4rem" },
  tabOn:        { color:"#6366f1", borderBottomColor:"#6366f1" },
  tabBadge:     { background:"#1e293b", color:"#64748b", fontSize:"0.7rem", padding:"0.1rem 0.45rem", borderRadius:999, fontWeight:700 },
  tabBadgeOn:   { background:"rgba(99,102,241,0.15)", color:"#6366f1" },
  tabBody:      { background:"#111827", border:"1px solid #1e293b", borderRadius:"0 0 12px 12px", padding:"1.5rem" },

  overviewGrid: { display:"grid", gridTemplateColumns:"1fr 260px", gap:"1.5rem", alignItems:"flex-start" },
  card:         { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.5rem" },
  cardTitle:    { fontSize:"0.9rem", fontWeight:700, color:"#e2e8f0", margin:"0 0 1rem" },
  fieldList:    { display:"flex", flexDirection:"column", gap:"0.1rem" },
  fieldRow:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.6rem 0", borderBottom:"1px solid rgba(255,255,255,0.04)", gap:"1rem", flexWrap:"wrap" },
  fieldLabel:   { color:"#64748b", fontSize:"0.8rem", fontWeight:500, minWidth:120 },
  fieldVal:     { color:"#e2e8f0", fontSize:"0.875rem" },
  input:        { padding:"0.45rem 0.75rem", background:"#0f172a", border:"1px solid #334155", borderRadius:6, color:"#f1f5f9", fontSize:"0.875rem", fontFamily:"'DM Sans',sans-serif", minWidth:180 },
  tag:          { background:"rgba(255,255,255,0.06)", color:"#94a3b8", fontSize:"0.72rem", padding:"0.15rem 0.55rem", borderRadius:999 },
  editHint:     { color:"#475569", fontSize:"0.75rem", marginTop:"1rem", fontStyle:"italic" },

  statCard:     { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.1rem 1.25rem", display:"flex", alignItems:"center", gap:"1rem" },
  statIcon:     { fontSize:"1.5rem" },
  statVal:      { fontSize:"1.4rem", fontWeight:800, color:"#f8fafc", lineHeight:1 },
  statLbl:      { color:"#64748b", fontSize:"0.75rem", marginTop:"0.2rem" },

  analyticsGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" },
  analyticsCard:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.25rem", textAlign:"center" },
  analyticsIcon:{ fontSize:"1.75rem", marginBottom:"0.5rem" },
  analyticsVal: { fontSize:"1.75rem", fontWeight:800, lineHeight:1 },
  analyticsLbl: { color:"#64748b", fontSize:"0.78rem", marginTop:"0.35rem" },
  barCard:      { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.25rem" },
  barTrack:     { background:"#0f172a", borderRadius:999, height:12, overflow:"hidden", margin:"0.75rem 0 0.5rem" },
  barFill:      { height:"100%", background:"linear-gradient(90deg,#6366f1,#4ade80)", borderRadius:999, transition:"width 0.5s ease" },
  barLabel:     { color:"#64748b", fontSize:"0.82rem", margin:0 },

  pControls:    { display:"flex", gap:"0.75rem", marginBottom:"1rem", flexWrap:"wrap", alignItems:"center" },
  searchInput:  { padding:"0.55rem 0.85rem", background:"#1e293b", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontSize:"0.875rem", flex:1, minWidth:200, fontFamily:"'DM Sans',sans-serif" },
  filterGroup:  { display:"flex", gap:"0.35rem" },
  filterBtn:    { padding:"0.45rem 0.9rem", background:"transparent", border:"1px solid #334155", borderRadius:999, color:"#64748b", cursor:"pointer", fontSize:"0.78rem", fontWeight:500 },
  filterBtnOn:  { background:"rgba(99,102,241,0.15)", borderColor:"#6366f1", color:"#818cf8" },
  exportBtn:    { padding:"0.5rem 1rem", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", borderRadius:8, cursor:"pointer", fontSize:"0.82rem", fontWeight:600 },

  table:        { width:"100%", borderCollapse:"collapse" },
  th:           { padding:"0.65rem 1rem", textAlign:"left", fontSize:"0.7rem", fontWeight:700, color:"#64748b", background:"rgba(255,255,255,0.02)", borderBottom:"1px solid #1e293b", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" },
  td:           { padding:"0.75rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"0.85rem", color:"#cbd5e1", verticalAlign:"middle" },
  tr:           {},
  participantName:{ fontWeight:600, color:"#e2e8f0" },
  email:        { color:"#64748b", fontSize:"0.8rem" },
  ticketId:     { fontFamily:"monospace", fontSize:"0.78rem", color:"#818cf8" },
  pill:         { padding:"0.15rem 0.6rem", borderRadius:999, fontSize:"0.72rem", fontWeight:600 },
  pillGreen:    { background:"rgba(74,222,128,0.12)",  color:"#4ade80" },
  pillRed:      { background:"rgba(239,68,68,0.12)",   color:"#f87171" },
  pillYellow:   { background:"rgba(251,191,36,0.12)",  color:"#fbbf24" },
  pillGray:     { background:"rgba(148,163,184,0.12)", color:"#94a3b8" },
};