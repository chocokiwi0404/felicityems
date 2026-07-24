// Tier B Feature 2: Admin views, approves, or rejects organizer password reset requests
import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavBar from "../../components/AdminNavBar";

const API_URL = "http://localhost:5000/api";

const STATUS_STYLE = {
  Pending:  { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
  Approved: { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  Rejected: { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
};

const PasswordResetRequests = () => {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("All");
  const [actioning, setActioning] = useState(null);
  const [comment,   setComment]   = useState({});   // { [id]: string }
  const [newPwModal,setNewPwModal]= useState(null); // { orgName, password }
  const [msg,       setMsg]       = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/password-resets`);
      setRequests(res.data.requests || []);
    } catch {
      setMsg({ type: "err", text: "Failed to load requests." });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (req, action) => {
    setActioning(req._id);
    setMsg(null);
    try {
      const res = await axios.patch(`${API_URL}/admin/password-resets/${req._id}`, {
        action,
        adminComment: comment[req._id] || "",
      });
      if (action === "approve" && res.data.newPassword) {
        setNewPwModal({
          orgName:  req.organizer?.organizerName || "Organizer",
          password: res.data.newPassword,
        });
      } else {
        setMsg({ type: "ok", text: `Request ${action}d successfully.` });
      }
      fetchRequests();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Action failed." });
    } finally {
      setActioning(null);
    }
  };

  const filtered = filter === "All" ? requests : requests.filter(r => r.status === filter);

  const counts = {
    All:      requests.length,
    Pending:  requests.filter(r => r.status === "Pending").length,
    Approved: requests.filter(r => r.status === "Approved").length,
    Rejected: requests.filter(r => r.status === "Rejected").length,
  };

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
          <h1 style={s.heading}>Password Reset Requests</h1>
          <p style={s.sub}>Organizers request password resets here. Approve to auto-generate a new password.</p>
        </header>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.type === "ok" ? "✓" : "⚠"} {msg.text}
            <button style={s.bannerClose} onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        {/* Summary + filter pills */}
        <div style={s.filterRow}>
          {["All","Pending","Approved","Rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...s.pill, ...(filter === f ? s.pillOn : {}) }}>
              {f} <span style={s.pillCount}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
            <p style={s.emptyText}>
              {filter === "Pending" ? "No pending requests. All clear!" : `No ${filter.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div style={s.cards}>
            {filtered.map(req => {
              const st     = STATUS_STYLE[req.status] || STATUS_STYLE.Pending;
              const isPending = req.status === "Pending";
              const busy   = actioning === req._id;

              return (
                <div key={req._id} style={s.card}>
                  {/* Card header */}
                  <div style={s.cardTop}>
                    <div>
                      <div style={s.orgName}>{req.organizer?.organizerName || "Unknown Club"}</div>
                      <div style={s.orgEmail}>{req.organizer?.loginEmail || "—"}</div>
                    </div>
                    <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>
                      {req.status}
                    </span>
                  </div>

                  {/* Reason */}
                  <div style={s.section}>
                    <div style={s.sectionLabel}>Reason</div>
                    <p style={s.reasonText}>{req.reason}</p>
                  </div>

                  {/* Dates */}
                  <div style={s.metaRow}>
                    <span style={s.meta}>
                      Submitted: {new Date(req.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                    </span>
                    {req.resolvedAt && (
                      <span style={s.meta}>
                        Resolved: {new Date(req.resolvedAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                      </span>
                    )}
                  </div>

                  {/* Admin comment (resolved) */}
                  {!isPending && req.adminComment && (
                    <div style={s.section}>
                      <div style={s.sectionLabel}>Admin Comment</div>
                      <p style={{ ...s.reasonText, color: "#94a3b8" }}>{req.adminComment}</p>
                    </div>
                  )}

                  {/* Actions (only for pending) */}
                  {isPending && (
                    <div style={s.actionArea}>
                      <div style={s.field}>
                        <label style={s.lbl}>Comment (optional)</label>
                        <input style={s.input}
                          placeholder="Add a note for the organizer…"
                          value={comment[req._id] || ""}
                          onChange={e => setComment(p => ({ ...p, [req._id]: e.target.value }))} />
                      </div>
                      <div style={s.btnRow}>
                        <button style={{ ...s.btn, ...s.btnApprove }}
                          onClick={() => handleAction(req, "approve")} disabled={busy}>
                          {busy ? "…" : "✓ Approve & Generate Password"}
                        </button>
                        <button style={{ ...s.btn, ...s.btnReject }}
                          onClick={() => handleAction(req, "reject")} disabled={busy}>
                          {busy ? "…" : "✕ Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New password modal */}
      {newPwModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></div>
            <h2 style={{ color: "#22c55e", margin: "0 0 0.4rem" }}>New Password Generated</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Share this with <strong style={{ color: "#e2e8f0" }}>{newPwModal.orgName}</strong>.
              It will not be shown again.
            </p>
            <div style={s.pwBox}>
              <div style={s.pwLabel}>Temporary Password</div>
              <code style={s.pwVal}>{newPwModal.password}</code>
            </div>
            <button style={s.primaryBtn} onClick={() => setNewPwModal(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  page:        { minHeight: "100vh", width: "100vw", background: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f1f5f9" },
  container:   { maxWidth: 900, margin: "0 auto", padding: "2.5rem 2rem" },
  center:      { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  spinner:     { width: 30, height: 30, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  header:      { marginBottom: "1.5rem" },
  heading:     { fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", margin: 0 },
  sub:         { color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" },

  banner:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1.25rem" },
  bannerOk:    { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" },
  bannerErr:   { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" },
  bannerClose: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1rem" },

  filterRow:   { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  pill:        { padding: "0.35rem 0.9rem", background: "transparent", border: "1px solid #334155", borderRadius: 999, color: "#64748b", cursor: "pointer", fontSize: "0.82rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.4rem" },
  pillOn:      { background: "rgba(99,102,241,0.15)", borderColor: "#6366f1", color: "#818cf8" },
  pillCount:   { background: "#1e293b", borderRadius: 999, padding: "0.05rem 0.4rem", fontSize: "0.72rem" },

  empty:       { textAlign: "center", padding: "5rem 1rem" },
  emptyText:   { color: "#64748b", fontSize: "0.9rem" },

  cards:       { display: "flex", flexDirection: "column", gap: "1rem" },
  card:        { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem" },
  cardTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  orgName:     { fontWeight: 700, fontSize: "1rem", color: "#e2e8f0" },
  orgEmail:    { fontSize: "0.8rem", color: "#6366f1", fontFamily: "monospace", marginTop: "0.2rem" },
  statusBadge: { fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.7rem", borderRadius: 999 },

  section:     { marginBottom: "0.75rem" },
  sectionLabel:{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" },
  reasonText:  { color: "#cbd5e1", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 },

  metaRow:     { display: "flex", gap: "1.5rem", marginBottom: "1rem" },
  meta:        { color: "#475569", fontSize: "0.78rem" },

  actionArea:  { borderTop: "1px solid #334155", paddingTop: "1rem", marginTop: "0.5rem" },
  field:       { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" },
  lbl:         { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" },
  input:       { padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", width: "100%" },
  btnRow:      { display: "flex", gap: "0.75rem" },
  btn:         { padding: "0.6rem 1.25rem", border: "1px solid transparent", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 },
  btnApprove:  { background: "rgba(34,197,94,0.12)", color: "#4ade80", borderColor: "rgba(34,197,94,0.25)" },
  btnReject:   { background: "rgba(239,68,68,0.1)",  color: "#f87171", borderColor: "rgba(239,68,68,0.2)" },

  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:       { background: "#1e293b", border: "1px solid #334155", borderRadius: 14, padding: "2rem", maxWidth: 400, width: "90%", textAlign: "center" },
  pwBox:       { background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "1rem 1.25rem", margin: "0 0 1.5rem", textAlign: "left" },
  pwLabel:     { fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" },
  pwVal:       { color: "#22c55e", fontWeight: 700, fontSize: "1.1rem", wordBreak: "break-all" },
  primaryBtn:  { padding: "0.65rem 2rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" },
};

export default PasswordResetRequests;