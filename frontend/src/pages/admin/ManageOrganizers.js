import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavBar from "../../components/AdminNavBar";

const API_URL = "http://localhost:5000/api";

const ManageOrganizers = () => {
  const [organizers,     setOrganizers]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [formData,       setFormData]       = useState({ organizerName: "", category: "Technical", description: "", contactEmail: "" });
  const [generatedCreds, setGeneratedCreds] = useState(null);
  const [actioning,      setActioning]      = useState(null);
  const [filter,         setFilter]         = useState("all"); // "all" | "active" | "archived"
  const [msg,            setMsg]            = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/organizers`);
      setOrganizers(res.data.organizers || []);
    } catch {
      setMsg({ type: "err", text: "Failed to load organizers." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/organizers`, formData);
      setGeneratedCreds(res.data.credentials);
      setShowForm(false);
      setFormData({ organizerName: "", category: "Technical", description: "", contactEmail: "" });
      fetchData();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed to create organizer." });
    }
  };

  const handleToggle = async (org) => {
    setActioning(org._id);
    try {
      await axios.patch(`${API_URL}/admin/organizers/${org._id}/toggle`);
      setMsg({ type: "ok", text: `${org.organizerName} ${org.user?.isActive !== false ? "disabled" : "enabled"}.` });
      fetchData();
    } catch {
      setMsg({ type: "err", text: "Action failed." });
    } finally {
      setActioning(null);
    }
  };

  const handleArchive = async (org) => {
    const isCurrentlyArchived = org.isArchived;
    const action  = isCurrentlyArchived ? "Unarchive" : "Archive";
    const message = isCurrentlyArchived
      ? `Unarchive "${org.organizerName}"? They will reappear in public listings.`
      : `Archive "${org.organizerName}"? They will be hidden from public listings but all data is preserved.`;

    if (!window.confirm(message)) return;
    setActioning(org._id);
    try {
      const res = await axios.patch(`${API_URL}/admin/organizers/${org._id}/archive`);
      setMsg({ type: "ok", text: `${org.organizerName} ${res.data.isArchived ? "archived" : "unarchived"} successfully.` });
      fetchData();
    } catch {
      setMsg({ type: "err", text: `${action} failed.` });
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (org) => {
    if (!window.confirm(
      `Permanently delete "${org.organizerName}"?\n\nThis will also delete ALL their events, registrations, teams, tickets, chat messages, and feedback.\n\nThis CANNOT be undone.`
    )) return;
    setActioning(org._id);
    try {
      const res = await axios.delete(`${API_URL}/admin/organizers/${org._id}`);
      setMsg({ type: "ok", text: `${org.organizerName} and all associated data deleted. (${res.data.deleted?.events ?? 0} events removed)` });
      fetchData();
    } catch {
      setMsg({ type: "err", text: "Delete failed." });
    } finally {
      setActioning(null);
    }
  };

  // Filter organizers based on selected tab
  const filtered = organizers.filter(org => {
    if (filter === "active")   return !org.isArchived;
    if (filter === "archived") return  org.isArchived;
    return true;
  });

  const archivedCount = organizers.filter(o =>  o.isArchived).length;
  const activeCount   = organizers.filter(o => !o.isArchived).length;

  if (loading) return (
    <div style={s.page}>
      <AdminNavBar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  return (
    <div style={s.page}>
      <AdminNavBar />
      <div style={s.container}>

        <header style={s.header}>
          <h1 style={s.heading}>Manage Clubs / Organizers</h1>
          <p style={s.sub}>Create accounts, disable logins, archive or permanently delete clubs</p>
        </header>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.type === "ok" ? "✓" : "⚠"} {msg.text}
            <button style={s.bannerClose} onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        {/* ── Add organizer ── */}
        <div style={s.section}>
          <div style={s.sectionHdr}>
            <h2 style={s.sectionTitle}>Add New Club Account</h2>
            {!showForm && (
              <button style={s.primaryBtn} onClick={() => setShowForm(true)}>+ Add Organizer</button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.grid3}>
                <div style={s.field}>
                  <label style={s.lbl}>Club Name *</label>
                  <input style={s.input} placeholder="e.g. Tech Club"
                    value={formData.organizerName}
                    onChange={e => setFormData(p => ({ ...p, organizerName: e.target.value }))} required />
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Category</label>
                  <select style={s.input} value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                    {["Technical","Cultural","Sports","Music","Dance","Photography","Robotics","Finance","Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.lbl}>Contact Email</label>
                  <input style={s.input} type="email" placeholder="club@iiit.ac.in"
                    value={formData.contactEmail}
                    onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.lbl}>Description</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }}
                  placeholder="Brief description of the club"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={s.formBtns}>
                <button type="submit" style={s.greenBtn}>Generate Credentials</button>
                <button type="button" style={s.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* ── Credentials modal ── */}
        {generatedCreds && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></div>
              <h2 style={{ color: "#22c55e", margin: "0 0 0.5rem" }}>Account Created!</h2>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                Share these credentials with the club. The password will not be shown again.
              </p>
              <div style={s.credsBox}>
                <div style={s.credRow}>
                  <span style={s.credKey}>Login Email</span>
                  <code style={s.credVal}>{generatedCreds.loginEmail}</code>
                </div>
                <div style={s.credRow}>
                  <span style={s.credKey}>Temporary Password</span>
                  <code style={s.credVal}>{generatedCreds.password}</code>
                </div>
              </div>
              <button style={s.primaryBtn} onClick={() => setGeneratedCreds(null)}>Done</button>
            </div>
          </div>
        )}

        {/* ── Organizer directory ── */}
        <div style={s.section}>
          <div style={s.sectionHdr}>
            <h2 style={s.sectionTitle}>Organizer Directory</h2>
            {/* Filter tabs */}
            <div style={s.tabs}>
              {[
                { key: "all",      label: "All",      count: organizers.length },
                { key: "active",   label: "Active",   count: activeCount },
                { key: "archived", label: "Archived", count: archivedCount },
              ].map(t => (
                <button key={t.key}
                  style={{ ...s.tab, ...(filter === t.key ? s.tabOn : {}) }}
                  onClick={() => setFilter(t.key)}>
                  {t.label}
                  <span style={{ ...s.tabCount, ...(filter === t.key ? s.tabCountOn : {}) }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p style={s.hint}>
              {filter === "archived" ? "No archived organizers." : "No organizers in the database yet."}
            </p>
          ) : (
            <div style={s.table}>
              <div style={s.tableHead}>
                <span style={{ flex: 2 }}>Club Name</span>
                <span style={{ flex: 1 }}>Category</span>
                <span style={{ flex: 2 }}>Login Email</span>
                <span style={{ flex: 1 }}>Status</span>
                <span style={{ flex: 2, textAlign: "right" }}>Actions</span>
              </div>

              {filtered.map(org => {
                const isActive   = org.user?.isActive !== false;
                const isArchived = org.isArchived;
                const busy       = actioning === org._id;

                return (
                  <div key={org._id}
                    style={{ ...s.tableRow, ...(isArchived ? s.rowArchived : {}) }}>

                    {/* Club name */}
                    <span style={{ flex: 2, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {org.organizerName}
                      {isArchived && <span style={s.archivedTag}>archived</span>}
                    </span>

                    {/* Category */}
                    <span style={{ flex: 1 }}>
                      <span style={s.catBadge}>{org.category}</span>
                    </span>

                    {/* Login email */}
                    <span style={{ flex: 2, fontFamily: "monospace", fontSize: "0.82rem", color: "#818cf8" }}>
                      {org.loginEmail || org.user?.email || "—"}
                    </span>

                    {/* Active / Disabled badge */}
                    <span style={{ flex: 1 }}>
                      <span style={{ ...s.statusBadge, ...(isActive ? s.badgeActive : s.badgeInactive) }}>
                        {isActive ? "Active" : "Disabled"}
                      </span>
                    </span>

                    {/* Actions */}
                    <div style={{ flex: 2, display: "flex", gap: "0.4rem", justifyContent: "flex-end", flexWrap: "wrap" }}>

                      {/* Disable / Enable — only for non-archived organizers */}
                      {!isArchived && (
                        <button
                          style={{ ...s.actionBtn, ...(isActive ? s.btnDisable : s.btnEnable) }}
                          onClick={() => handleToggle(org)}
                          disabled={busy}>
                          {busy ? "…" : isActive ? "Disable" : "Enable"}
                        </button>
                      )}

                      {/* Archive / Unarchive — always shown, label flips */}
                      <button
                        style={{ ...s.actionBtn, ...(isArchived ? s.btnUnarchive : s.btnArchive) }}
                        onClick={() => handleArchive(org)}
                        disabled={busy}>
                        {busy ? "…" : isArchived ? "Unarchive" : "Archive"}
                      </button>

                      {/* Permanent delete — always shown */}
                      <button
                        style={{ ...s.actionBtn, ...s.btnDelete }}
                        onClick={() => handleDelete(org)}
                        disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const s = {
  page:         { minHeight: "100vh", width: "100vw", background: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f1f5f9" },
  container:    { maxWidth: 1100, margin: "0 auto", padding: "2.5rem 2rem" },
  center:       { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  spinner:      { width: 30, height: 30, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  header:       { marginBottom: "2rem" },
  heading:      { fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", margin: 0 },
  sub:          { color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" },

  banner:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1.5rem" },
  bannerOk:     { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" },
  bannerErr:    { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" },
  bannerClose:  { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1rem" },

  section:      { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" },
  sectionHdr:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", margin: 0 },

  // Filter tabs
  tabs:         { display: "flex", gap: "0.35rem" },
  tab:          { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.85rem", background: "transparent", border: "1px solid #334155", borderRadius: 999, color: "#64748b", cursor: "pointer", fontSize: "0.78rem", fontWeight: 500 },
  tabOn:        { background: "rgba(99,102,241,0.12)", borderColor: "#6366f1", color: "#818cf8" },
  tabCount:     { background: "#0f172a", color: "#475569", fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: 999, fontWeight: 700 },
  tabCountOn:   { background: "rgba(99,102,241,0.2)", color: "#818cf8" },

  form:         { display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" },
  grid3:        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  field:        { display: "flex", flexDirection: "column", gap: "0.3rem" },
  lbl:          { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" },
  input:        { padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" },
  formBtns:     { display: "flex", gap: "0.75rem" },
  primaryBtn:   { padding: "0.6rem 1.4rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
  greenBtn:     { padding: "0.6rem 1.4rem", background: "#22c55e", color: "#0f172a", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" },
  ghostBtn:     { padding: "0.6rem 1.25rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem" },

  // Table
  table:        { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" },
  tableHead:    { display: "flex", gap: "1rem", padding: "0.5rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  tableRow:     { display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem 1rem", background: "#0f172a", borderRadius: 10, border: "1px solid #334155", fontSize: "0.875rem" },
  rowArchived:  { opacity: 0.55, borderStyle: "dashed" },

  catBadge:     { background: "#334155", color: "#94a3b8", fontSize: "0.72rem", padding: "0.15rem 0.55rem", borderRadius: 4 },
  archivedTag:  { background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: 4, fontWeight: 700 },
  statusBadge:  { fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 999 },
  badgeActive:  { background: "rgba(34,197,94,0.12)",  color: "#4ade80" },
  badgeInactive:{ background: "rgba(239,68,68,0.12)",  color: "#f87171" },

  actionBtn:    { padding: "0.3rem 0.7rem", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, border: "1px solid transparent" },
  btnDisable:   { background: "rgba(239,68,68,0.1)",   color: "#f87171", borderColor: "rgba(239,68,68,0.2)" },
  btnEnable:    { background: "rgba(34,197,94,0.1)",   color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
  btnArchive:   { background: "rgba(251,191,36,0.1)",  color: "#fbbf24", borderColor: "rgba(251,191,36,0.2)" },
  btnUnarchive: { background: "rgba(99,102,241,0.1)",  color: "#818cf8", borderColor: "rgba(99,102,241,0.2)" },
  btnDelete:    { background: "rgba(239,68,68,0.08)",  color: "#f87171", borderColor: "rgba(239,68,68,0.15)" },

  // Credentials modal
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:        { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: "2rem", maxWidth: 440, width: "90%", textAlign: "center" },
  credsBox:     { background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "1rem", margin: "1rem 0", textAlign: "left", display: "flex", flexDirection: "column", gap: "0.75rem" },
  credRow:      { display: "flex", flexDirection: "column", gap: "0.2rem" },
  credKey:      { fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  credVal:      { color: "#22c55e", fontWeight: 700, fontSize: "0.95rem", wordBreak: "break-all" },
  hint:         { color: "#64748b", fontSize: "0.875rem" },
};

export default ManageOrganizers;