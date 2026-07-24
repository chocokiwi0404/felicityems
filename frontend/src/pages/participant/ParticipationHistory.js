import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

const STATUS_STYLE = {
  Confirmed: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
  Pending: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  Cancelled: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  Rejected: { bg: "rgba(239,68,68,0.12)", color: "#f87171" },
};

const PAYMENT_STYLE = {
  "Not Required": { color: "#94a3b8" },
  Pending: { color: "#fbbf24" },
  Approved: { color: "#4ade80" },
  Rejected: { color: "#f87171" },
};

const TYPE_STYLE = {
  Normal: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  Merchandise: { bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
};

export default function ParticipationHistory() {
  const { loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");  // All / Confirmed / Pending / Merchandise
  const [expandedQR, setExpandedQR] = useState(null);   // reg._id whose QR is shown enlarged
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API}/participants/registrations/mine`)
      .then(res => setRegistrations(res.data.registrations || []))
      .catch(() => setMsg({ type: "err", text: "Failed to load registration history." }))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const filtered = registrations.filter(r => {
    if (filter === "All") return true;
    if (filter === "Confirmed") return r.status === "Confirmed";
    if (filter === "Pending") return r.status === "Pending";
    if (filter === "Merchandise") return r.registrationType === "Merchandise";
    if (filter === "Upcoming") return r.status === "Confirmed" && new Date(r.event?.eventStartDate) > new Date();
    return true;
  });

  const fmt = d => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const FILTERS = ["All", "Upcoming", "Confirmed", "Pending", "Merchandise"];

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>

        {/* Page header */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Participation History</h1>
            <p style={s.pageSub}>All your event registrations and merchandise orders</p>
          </div>
          <div style={s.count}>
            <span style={s.countNum}>{registrations.length}</span>
            <span style={s.countLabel}>total</span>
          </div>
        </div>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.text}
            <button style={s.bannerX} onClick={() => setMsg(null)}>×</button>
          </div>
        )}

        {/* Filter tabs */}
        <div style={s.filterRow}>
          {FILTERS.map(f => (
            <button key={f}
              style={{ ...s.filterBtn, ...(filter === f ? s.filterOn : {}) }}
              onClick={() => setFilter(f)}>
              {f}
              <span style={{ ...s.filterCount, ...(filter === f ? s.filterCountOn : {}) }}>
                {f === "All" ? registrations.length
                  : f === "Confirmed" ? registrations.filter(r => r.status === "Confirmed").length
                    : f === "Pending" ? registrations.filter(r => r.status === "Pending").length
                      : f === "Merchandise" ? registrations.filter(r => r.registrationType === "Merchandise").length
                        : f === "Upcoming" ? registrations.filter(r => r.status === "Confirmed" && new Date(r.event?.eventStartDate) > new Date()).length
                          : 0}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.center}><div style={s.spinner} /></div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎟</div>
            <h3 style={{ color: "#f8fafc", margin: "0 0 0.5rem" }}>No registrations yet</h3>
            <p style={{ color: "#64748b" }}>
              <Link to="/participant/browse-events" style={{ color: "#818cf8" }}>Browse events</Link> to get started.
            </p>
          </div>
        ) : (
          <div style={s.cardList}>
            {filtered.map(reg => {
              const ss = STATUS_STYLE[reg.status] || STATUS_STYLE.Pending;
              const ts = TYPE_STYLE[reg.registrationType] || TYPE_STYLE.Normal;
              const ps = PAYMENT_STYLE[reg.paymentStatus] || PAYMENT_STYLE.Pending;
              const qrExpanded = expandedQR === reg._id;

              return (
                <div key={reg._id} style={s.card}>
                  {/* ── Card header ── */}
                  <div style={s.cardHeader}>
                    <div style={s.cardHeaderLeft}>
                      <div style={s.cardMeta}>
                        <span style={{ ...s.typePill, background: ts.bg, color: ts.color }}>
                          {reg.registrationType}
                        </span>
                        <span style={{ ...s.statusPill, background: ss.bg, color: ss.color }}>
                          {reg.status}
                        </span>
                        {reg.team && (
                          <span style={s.teamPill}>👥 Team: {reg.team.teamName}</span>
                        )}
                      </div>
                      <h2 style={s.eventName}>{reg.event?.eventName || "Event"}</h2>
                      <div style={s.orgName}>by {reg.event?.organizer?.organizerName || "—"}</div>
                    </div>

                    {/* QR thumbnail — only if generated */}
                    {reg.qrCode && (
                      <div style={s.qrThumbWrap}>
                        <img
                          src={reg.qrCode}
                          alt="QR"
                          style={s.qrThumb}
                          onClick={() => setExpandedQR(qrExpanded ? null : reg._id)}
                          title="Click to enlarge"
                        />
                        <div style={s.qrThumbLabel}>Tap to expand</div>
                      </div>
                    )}

                    {/* Pending merch — no QR yet */}
                    {!reg.qrCode && reg.registrationType === "Merchandise" && reg.paymentStatus !== "Approved" && (
                      <div style={s.noQrBox}>
                        <div style={s.noQrIcon}>🔒</div>
                        <div style={s.noQrLabel}>QR after approval</div>
                      </div>
                    )}
                  </div>

                  {/* ── Expanded QR ── */}
                  {qrExpanded && reg.qrCode && (
                    <div style={s.qrExpanded}>
                      <div style={s.qrExpandedInner}>
                        <img src={reg.qrCode} alt="QR Code" style={s.qrLarge} />
                        <div style={s.qrExpandedInfo}>
                          <div style={s.ticketIdLarge}>{reg.ticketId}</div>
                          <div style={s.qrEventName}>{reg.event?.eventName}</div>
                          <div style={s.qrHint}>Show this at the venue for entry / pickup</div>
                          <button style={s.closeQrBtn} onClick={() => setExpandedQR(null)}>
                            Close ×
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Details grid ── */}
                  <div style={s.detailGrid}>
                    <div style={s.detailCell}>
                      <div style={s.detailLabel}>Ticket ID</div>
                      <div style={s.ticketId}>{reg.ticketId}</div>
                    </div>
                    <div style={s.detailCell}>
                      <div style={s.detailLabel}>Registered</div>
                      <div style={s.detailVal}>{fmt(reg.createdAt)}</div>
                    </div>
                    <div style={s.detailCell}>
                      <div style={s.detailLabel}>Event Date</div>
                      <div style={s.detailVal}>{fmt(reg.event?.eventStartDate)}</div>
                    </div>
                    <div style={s.detailCell}>
                      <div style={s.detailLabel}>Fee</div>
                      <div style={s.detailVal}>
                        {reg.event?.registrationFee ? `₹${reg.event.registrationFee}` : "Free"}
                      </div>
                    </div>

                    {/* Merchandise-specific */}
                    {reg.registrationType === "Merchandise" && (
                      <>
                        {reg.selectedVariant && (
                          <div style={s.detailCell}>
                            <div style={s.detailLabel}>Variant</div>
                            <div style={s.detailVal}>
                              {[reg.selectedVariant.size, reg.selectedVariant.color].filter(Boolean).join(" / ")}
                            </div>
                          </div>
                        )}
                        <div style={s.detailCell}>
                          <div style={s.detailLabel}>Qty</div>
                          <div style={s.detailVal}>{reg.quantity}</div>
                        </div>
                        <div style={s.detailCell}>
                          <div style={s.detailLabel}>Payment</div>
                          <div style={{ ...s.detailVal, color: ps.color, fontWeight: 600 }}>
                            {reg.paymentStatus}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Attendance */}
                    {reg.attended && (
                      <div style={s.detailCell}>
                        <div style={s.detailLabel}>Attended</div>
                        <div style={{ ...s.detailVal, color: "#4ade80" }}>✓ Yes</div>
                      </div>
                    )}
                  </div>

                  {/* ── Action row ── */}
                  <div style={s.actionRow}>
                    <Link to={`/participant/ticket/${reg._id}`} style={s.viewTicketBtn}>
                      🎟 View Full Ticket
                    </Link>
                    {reg.registrationType === "Merchandise" &&
                      (reg.paymentStatus === "Pending" || !reg.paymentProofUrl) &&
                      reg.paymentStatus !== "Approved" && (
                        <Link to="/participant/orders" style={s.uploadBtn}>
                          📸 Upload Payment Proof
                        </Link>
                      )}
                    {reg.status === "Confirmed" && !reg.attended && new Date(reg.event?.eventStartDate) > new Date() && (
                      <span style={s.upcomingTag}>📅 Upcoming</span>
                    )}
                    {reg.attended && (
                      <Link to={`/participant/feedback`} style={s.feedbackBtn}>
                        ⭐ Leave Feedback
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 900, margin: "0 auto", padding: "2rem" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  pageSub: { color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" },
  count: { textAlign: "center", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "0.6rem 1.25rem" },
  countNum: { display: "block", fontSize: "1.75rem", fontWeight: 900, color: "#6366f1", lineHeight: 1 },
  countLabel: { display: "block", color: "#64748b", fontSize: "0.72rem", marginTop: "0.2rem" },
  banner: { display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1rem" },
  bannerOk: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
  bannerErr: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },
  bannerX: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem", padding: 0 },
  filterRow: { display: "flex", gap: "0.35rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  filterBtn: { display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: "transparent", border: "1px solid #334155", borderRadius: 999, color: "#64748b", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500 },
  filterOn: { background: "rgba(99,102,241,0.12)", borderColor: "#6366f1", color: "#818cf8" },
  filterCount: { background: "#1e293b", color: "#475569", fontSize: "0.68rem", padding: "0.1rem 0.45rem", borderRadius: 999, fontWeight: 700 },
  filterCountOn: { background: "rgba(99,102,241,0.2)", color: "#818cf8" },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "4rem", color: "#64748b" },
  cardList: { display: "flex", flexDirection: "column", gap: "1rem" },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem", transition: "border-color 0.15s" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "1rem" },
  cardHeaderLeft: { flex: 1 },
  cardMeta: { display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.4rem" },
  typePill: { padding: "0.15rem 0.6rem", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700 },
  statusPill: { padding: "0.15rem 0.6rem", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600 },
  teamPill: { background: "rgba(251,191,36,0.1)", color: "#fbbf24", padding: "0.15rem 0.6rem", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600 },
  eventName: { fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 0.2rem" },
  orgName: { color: "#64748b", fontSize: "0.78rem" },
  // QR thumbnail (right side of card header)
  qrThumbWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", cursor: "pointer" },
  qrThumb: { width: 72, height: 72, borderRadius: 8, border: "2px solid #334155", objectFit: "contain", background: "#fff" },
  qrThumbLabel: { color: "#475569", fontSize: "0.65rem" },
  noQrBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", padding: "0.5rem 0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px dashed #334155" },
  noQrIcon: { fontSize: "1.25rem" },
  noQrLabel: { color: "#475569", fontSize: "0.65rem", textAlign: "center" },
  // Expanded QR
  qrExpanded: { background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "1.25rem", marginBottom: "1rem" },
  qrExpandedInner: { display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" },
  qrLarge: { width: 160, height: 160, borderRadius: 10, background: "#fff", objectFit: "contain", flexShrink: 0 },
  qrExpandedInfo: { flex: 1 },
  ticketIdLarge: { fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, color: "#818cf8", marginBottom: "0.3rem" },
  qrEventName: { fontSize: "0.95rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.4rem" },
  qrHint: { color: "#64748b", fontSize: "0.78rem", marginBottom: "0.75rem" },
  closeQrBtn: { padding: "0.35rem 1rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" },
  // Details grid
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 8 },
  detailCell: {},
  detailLabel: { color: "#64748b", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.15rem" },
  detailVal: { color: "#e2e8f0", fontSize: "0.85rem", fontWeight: 500 },
  ticketId: { fontFamily: "monospace", color: "#818cf8", fontSize: "0.82rem", fontWeight: 700 },
  // Action row
  actionRow: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" },
  viewTicketBtn: { padding: "0.45rem 1rem", background: "#6366f1", color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
  uploadBtn: { padding: "0.45rem 1rem", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 7, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
  feedbackBtn: { padding: "0.45rem 1rem", background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 },
  upcomingTag: { color: "#fbbf24", fontSize: "0.78rem", fontWeight: 600 },
};