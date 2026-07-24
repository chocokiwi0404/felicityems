import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

const STATUS_STYLE = {
  Forming: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  Complete: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
  Cancelled: { bg: "rgba(239,68,68,0.12)", color: "#f87171" },
};

const MEMBER_STATUS = {
  Pending: { color: "#fbbf24", label: "Invited" },
  Accepted: { color: "#4ade80", label: "Joined" },
  Rejected: { color: "#f87171", label: "Declined" },
};

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [msg, setMsg] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({ eventId: "", teamName: "", maxSize: 2 });
  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  // Join form
  const [joinCode, setJoinCode] = useState("");

  // My registered events (for create dropdown)
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    loadTeams();
    loadEvents();
  }, [authLoading]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/teams/my`);
      setTeams(res.data.teams || []);
      if (res.data.teams?.length && !activeTeam) setActiveTeam(res.data.teams[0]._id);
    } catch { setMsg({ type: "err", text: "Failed to load teams." }); }
    finally { setLoading(false); }
  };

  const loadEvents = async () => {
    try {
      const res = await axios.get(`${API}/participants/events`);
      setEvents((res.data.events || []).filter(e => e.isTeamEvent));
    } catch { }
  };

  const handleCreate = async () => {
    if (!createForm.teamName.trim()) return alert("Enter a team name.");
    try {
      const res = await axios.post(`${API}/teams/create`, createForm);
      setTeams(p => [res.data.team, ...p]);
      setActiveTeam(res.data.team._id);
      setShowCreate(false);
      setCreateForm({ eventId: "", teamName: "", maxSize: 2 });
      setMsg({ type: "ok", text: "Team created! Share the invite code with members." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed to create team." });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await axios.post(`${API}/teams/invite`, { teamId: activeTeam, email: inviteEmail });
      setTeams(p => p.map(t => t._id === activeTeam ? res.data.team : t));
      setInviteEmail("");
      setShowInvite(false);
      setMsg({ type: "ok", text: "Invite sent via email!" });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed to send invite." });
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await axios.post(`${API}/teams/join/${joinCode.toUpperCase().trim()}`);
      setMsg({ type: "ok", text: res.data.team.status === "Complete" ? "Team complete! Tickets sent to all members." : "Joined team!" });
      setJoinCode(""); setShowJoin(false);
      loadTeams();
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed to join." });
    }
  };

  const handleDecline = async (code) => {
    try {
      await axios.post(`${API}/teams/decline/${code}`);
      loadTeams();
      setMsg({ type: "ok", text: "Invite declined." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed." });
    }
  };

  const currentTeam = teams.find(t => t._id === activeTeam);
  const sc = currentTeam ? STATUS_STYLE[currentTeam.status] : {};

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>My Teams</h1>
            <p style={s.pageSub}>Manage hackathon team registrations</p>
          </div>
          <div style={s.topBtns}>
            <button style={s.outlineBtn} onClick={() => setShowJoin(true)}> Join with Code</button>
            <button style={s.primaryBtn} onClick={() => setShowCreate(true)}>+ Create Team</button>
          </div>
        </div>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.text}
            <button style={s.bannerX} onClick={() => setMsg(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div style={s.center}><div style={s.spinner} /></div>
        ) : teams.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👥</div>
            <h3 style={{ color: "#f8fafc", margin: "0 0 0.5rem" }}>No teams yet</h3>
            <p style={{ color: "#64748b" }}>Create a team or join one with an invite code.</p>
          </div>
        ) : (
          <div style={s.layout}>
            {/* ── Sidebar: team list ── */}
            <div style={s.sidebar}>
              {teams.map(t => (
                <div key={t._id}
                  style={{ ...s.teamTab, ...(activeTeam === t._id ? s.teamTabOn : {}) }}
                  onClick={() => setActiveTeam(t._id)}>
                  <div style={s.teamTabName}>{t.teamName}</div>
                  <div style={s.teamTabEvent}>{t.event?.eventName || "—"}</div>
                  <span style={{ ...s.pill, background: STATUS_STYLE[t.status]?.bg, color: STATUS_STYLE[t.status]?.color }}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Main: team detail ── */}
            {currentTeam && (
              <div style={s.main}>
                {/* Header */}
                <div style={s.teamHeader}>
                  <div>
                    <div style={s.teamHeaderMeta}>
                      <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{currentTeam.status}</span>
                      <span style={s.greyPill}>{currentTeam.event?.eventName}</span>
                    </div>
                    <h2 style={s.teamName}>{currentTeam.teamName}</h2>
                  </div>
                  {currentTeam.status === "Forming" &&
                    currentTeam.leader?._id === currentTeam.leader?._id && (
                      <button style={s.primaryBtn} onClick={() => setShowInvite(true)}>
                        + Invite Member
                      </button>
                    )}
                </div>

                {/* Invite code */}
                {currentTeam.status === "Forming" && (
                  <div style={s.codeBox}>
                    <span style={s.codeLabel}>Invite Code</span>
                    <span style={s.codeValue}>{currentTeam.inviteCode}</span>
                    <button style={s.copyBtn}
                      onClick={() => { navigator.clipboard.writeText(currentTeam.inviteCode); setMsg({ type: "ok", text: "Code copied!" }); }}>
                      Copy
                    </button>
                  </div>
                )}

                {/* Capacity bar */}
                <div style={s.capacityRow}>
                  <span style={s.greyText}>
                    {currentTeam.members.filter(m => m.status === "Accepted").length} / {currentTeam.maxSize} members
                  </span>
                  <div style={s.barTrack}>
                    <div style={{
                      ...s.barFill,
                      width: `${(currentTeam.members.filter(m => m.status === "Accepted").length / currentTeam.maxSize) * 100}%`
                    }} />
                  </div>
                </div>

                {/* Member list */}
                <div style={s.memberList}>
                  {currentTeam.members.map((m, i) => {
                    const ms = MEMBER_STATUS[m.status];
                    const isLeader = m.user?._id === currentTeam.leader?._id;
                    return (
                      <div key={i} style={s.memberRow}>
                        <div style={s.memberAvatar}>
                          {(m.user?.firstName?.[0] || "?").toUpperCase()}
                        </div>
                        <div style={s.memberInfo}>
                          <div style={s.memberName}>
                            {m.user?.firstName} {m.user?.lastName}
                            {isLeader && <span style={s.leaderBadge}>Leader</span>}
                          </div>
                          <div style={s.memberEmail}>{m.user?.email}</div>
                        </div>
                        <span style={{ ...s.pill, color: ms?.color, background: ms?.color + "20" }}>
                          {ms?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Team chat button if complete */}
                {currentTeam.status === "Complete" && (
                  <button style={{ ...s.primaryBtn, width: "100%", marginTop: "1rem", justifyContent: "center" }}
                    onClick={() => navigate(`/participant/teams/${currentTeam._id}/chat`)}>
                    Open Team Chat
                  </button>
                )}

                {/* Pending invites for the current user */}
                {currentTeam.members
                  .filter(m => m.status === "Pending" && m.user?._id)
                  .map((m, i) => (
                    <div key={i} style={s.inviteBanner}>
                      <span>You have a pending invite to this team.</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button style={s.acceptBtn} onClick={() => handleJoin()}>Accept</button>
                        <button style={s.rejectBtn} onClick={() => handleDecline(currentTeam.inviteCode)}>Decline</button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="Create Team" onClose={() => setShowCreate(false)}>
          <label style={s.lbl}>Team Name</label>
          <input style={s.input} value={createForm.teamName}
            onChange={e => setCreateForm(p => ({ ...p, teamName: e.target.value }))}
            placeholder="e.g. ByteBusters" />

          <label style={s.lbl}>Max Team Size</label>
          <input style={s.input} type="number" min="2" max="10" value={createForm.maxSize}
            onChange={e => setCreateForm(p => ({ ...p, maxSize: Number(e.target.value) }))} />

          <label style={s.lbl}>Event (paste Event ID for now)</label>
          <input style={s.input} value={createForm.eventId}
            onChange={e => setCreateForm(p => ({ ...p, eventId: e.target.value }))}
            placeholder="Event ID from the event page" />

          <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            onClick={handleCreate}>Create Team</button>
        </Modal>
      )}

      {/* ── Invite Modal ── */}
      {showInvite && (
        <Modal title="Invite a Member" onClose={() => setShowInvite(false)}>
          <label style={s.lbl}>Member Email</label>
          <input style={s.input} type="email" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="teammate@student.iiit.ac.in" />
          <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            onClick={handleInvite}>Send Invite</button>
        </Modal>
      )}

      {/* ── Join Modal ── */}
      {showJoin && (
        <Modal title="Join a Team" onClose={() => setShowJoin(false)}>
          <label style={s.lbl}>Invite Code</label>
          <input style={s.input} value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4" maxLength={8} />
          <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
            onClick={handleJoin}>Join Team</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{title}</h3>
          <button style={s.modalClose} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  pageSub: { color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" },
  topBtns: { display: "flex", gap: "0.75rem" },
  primaryBtn: { padding: "0.55rem 1.25rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" },
  outlineBtn: { padding: "0.55rem 1.25rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem" },
  banner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1rem" },
  bannerOk: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
  bannerErr: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },
  bannerX: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem", padding: 0 },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "5rem 0", color: "#64748b" },
  layout: { display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.25rem" },
  sidebar: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  teamTab: { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "1rem", cursor: "pointer", transition: "border-color 0.15s" },
  teamTabOn: { borderColor: "#6366f1" },
  teamTabName: { fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem", fontSize: "0.9rem" },
  teamTabEvent: { color: "#64748b", fontSize: "0.78rem", marginBottom: "0.5rem" },
  pill: { padding: "0.15rem 0.65rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600 },
  greyPill: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", padding: "0.15rem 0.65rem", borderRadius: 999, fontSize: "0.75rem" },
  main: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem" },
  teamHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  teamHeaderMeta: { display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" },
  teamName: { fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  codeBox: { display: "flex", alignItems: "center", gap: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem" },
  codeLabel: { color: "#64748b", fontSize: "0.78rem", fontWeight: 600 },
  codeValue: { fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, color: "#818cf8", letterSpacing: "2px", flex: 1 },
  copyBtn: { padding: "0.3rem 0.85rem", background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid #6366f1", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem" },
  capacityRow: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" },
  greyText: { color: "#64748b", fontSize: "0.8rem", whiteSpace: "nowrap" },
  barTrack: { flex: 1, height: 8, background: "#0f172a", borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg,#6366f1,#4ade80)", borderRadius: 999 },
  memberList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  memberRow: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "#0f172a", borderRadius: 8 },
  memberAvatar: { width: 36, height: 36, borderRadius: "50%", background: "rgba(99,102,241,0.2)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 },
  memberInfo: { flex: 1 },
  memberName: { fontWeight: 600, color: "#e2e8f0", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  memberEmail: { color: "#64748b", fontSize: "0.78rem" },
  leaderBadge: { background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.65rem", padding: "0.1rem 0.5rem", borderRadius: 999, fontWeight: 700 },
  inviteBanner: { marginTop: "1rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8", fontSize: "0.875rem" },
  acceptBtn: { padding: "0.35rem 1rem", background: "#4ade80", color: "#052e16", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" },
  rejectBtn: { padding: "0.35rem 1rem", background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 420 },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  modalTitle: { color: "#f1f5f9", fontWeight: 700, margin: 0, fontSize: "1rem" },
  modalClose: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 },
  lbl: { display: "block", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.3rem", marginTop: "0.75rem" },
  input: { width: "100%", padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" },
};