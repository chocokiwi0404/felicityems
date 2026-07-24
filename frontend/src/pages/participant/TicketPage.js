import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import ParticipantNavbar from "../../components/ParticipantNavBar";

const API = "http://localhost:5000/api";

const STATUS_STYLE = {
  Confirmed: { bg: "rgba(74,222,128,0.12)", color: "#4ade80", label: "✓ Confirmed" },
  Pending: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", label: "⏳ Pending" },
  Cancelled: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Cancelled" },
  Rejected: { bg: "rgba(239,68,68,0.12)", color: "#f87171", label: "✕ Rejected" },
};

const PAYMENT_STATUS_MSG = {
  "Not Required": { color: "#94a3b8", icon: "—", msg: "No payment required" },
  Pending: { color: "#fbbf24", icon: "⏳", msg: "Awaiting organizer approval" },
  Approved: { color: "#4ade80", icon: "✓", msg: "Payment approved" },
  Rejected: { color: "#f87171", icon: "✕", msg: "Payment rejected — re-upload proof" },
};

export default function TicketPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API}/participants/registrations/${id}`)
      .then(res => setReg(res.data.registration))
      .catch(() => setError("Ticket not found."))
      .finally(() => setLoading(false));
  }, [id, authLoading]);

  const handlePrint = () => window.print();

  const handleSaveQR = () => {
    if (!reg?.qrCode) return;
    const a = document.createElement("a");
    a.href = reg.qrCode;
    a.download = `${reg.ticketId}.png`;
    a.click();
  };

  const fmt = d => d
    ? new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : "—";

  if (loading) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  if (error || !reg) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.wrap}>
        <p style={{ color: "#f87171" }}>{error || "Ticket not found."}</p>
        <Link to="/participant/history" style={{ color: "#818cf8" }}>← Back to history</Link>
      </div>
    </div>
  );

  const ss = STATUS_STYLE[reg.status] || STATUS_STYLE.Pending;
  const ps = PAYMENT_STATUS_MSG[reg.paymentStatus] || PAYMENT_STATUS_MSG["Not Required"];
  const isMerch = reg.registrationType === "Merchandise";
  const variantText = reg.selectedVariant
    ? [reg.selectedVariant.size, reg.selectedVariant.color].filter(Boolean).join(" / ")
    : null;

  return (
    <div style={s.page}>
      <ParticipantNavbar />

      <div style={s.wrap}>
        <Link to="/participant/history" style={s.back}>← Participation History</Link>

        {/* Print/save actions */}
        <div style={s.actions}>
          <button style={s.actionBtn} onClick={handlePrint}>🖨 Print Ticket</button>
          {reg.qrCode && (
            <button style={s.actionBtn} onClick={handleSaveQR}>⬇ Save QR Code</button>
          )}
        </div>

        {/* ── Ticket card ── */}
        <div style={s.ticket} id="ticket-print">

          {/* Header strip */}
          <div style={s.ticketHeader}>
            <div style={s.ticketHeaderLeft}>
              <div style={s.festName}>Felicity</div>
              <div style={s.festTagline}>IIIT Hyderabad · Annual Cultural Fest</div>
            </div>
            <div style={{ ...s.statusBadge, background: ss.bg, color: ss.color }}>
              {ss.label}
            </div>
          </div>

          {/* Main content: left details + right QR */}
          <div style={s.ticketBody}>
            <div style={s.ticketLeft}>
              <div style={s.eventTitle}>{reg.event?.eventName}</div>
              <div style={s.organizerName}>by {reg.event?.organizer?.organizerName || "—"}</div>

              <div style={s.divider} />

              {/* Participant info */}
              <div style={s.infoSection}>
                <div style={s.infoSectionTitle}>Participant</div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Name</span>
                  <span style={s.infoVal}>{user?.firstName} {user?.lastName}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Email</span>
                  <span style={s.infoVal}>{user?.email}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Type</span>
                  <span style={s.infoVal}>{user?.participantType || "—"} ({user?.collegeOrOrgName || "—"})</span>
                </div>
              </div>

              <div style={s.divider} />

              {/* Event info */}
              <div style={s.infoSection}>
                <div style={s.infoSectionTitle}>Event Details</div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Date</span>
                  <span style={s.infoVal}>{fmt(reg.event?.eventStartDate)}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Type</span>
                  <span style={s.infoVal}>{reg.registrationType}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Fee</span>
                  <span style={s.infoVal}>{reg.event?.registrationFee ? `₹${reg.event.registrationFee}` : "Free"}</span>
                </div>
                {reg.event?.eligibility && (
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>Eligibility</span>
                    <span style={s.infoVal}>{reg.event.eligibility}</span>
                  </div>
                )}
              </div>

              {/* Merchandise-specific info */}
              {isMerch && (
                <>
                  <div style={s.divider} />
                  <div style={s.infoSection}>
                    <div style={s.infoSectionTitle}>Order Details</div>
                    {variantText && (
                      <div style={s.infoRow}>
                        <span style={s.infoLabel}>Variant</span>
                        <span style={s.infoVal}>{variantText}</span>
                      </div>
                    )}
                    <div style={s.infoRow}>
                      <span style={s.infoLabel}>Quantity</span>
                      <span style={s.infoVal}>{reg.quantity}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.infoLabel}>Payment</span>
                      <span style={{ ...s.infoVal, color: ps.color, fontWeight: 600 }}>
                        {ps.icon} {ps.msg}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Team info */}
              {reg.team && (
                <>
                  <div style={s.divider} />
                  <div style={s.infoSection}>
                    <div style={s.infoSectionTitle}>Team</div>
                    <div style={s.infoRow}>
                      <span style={s.infoLabel}>Team Name</span>
                      <span style={s.infoVal}>{reg.team.teamName}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span style={s.infoLabel}>Team Status</span>
                      <span style={{ ...s.infoVal, color: reg.team.status === "Complete" ? "#4ade80" : "#fbbf24" }}>
                        {reg.team.status}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Attendance */}
              {reg.attended && (
                <div style={s.attendedBadge}>✓ Attendance marked</div>
              )}
            </div>

            {/* QR code section */}
            <div style={s.ticketRight}>
              {reg.qrCode ? (
                <>
                  <div style={s.qrBox}>
                    <img src={reg.qrCode} alt="QR Code" style={s.qrImage} />
                  </div>
                  <div style={s.ticketIdDisplay}>{reg.ticketId}</div>
                  <div style={s.qrCaption}>Scan at venue for entry</div>
                </>
              ) : (
                <div style={s.noQrBox}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔒</div>
                  <div style={s.noQrTitle}>QR Pending</div>
                  <div style={s.noQrMsg}>
                    {isMerch && reg.paymentStatus !== "Approved"
                      ? "QR will be generated after your payment is approved by the organizer."
                      : "QR code is being generated. Check back shortly."}
                  </div>
                  {isMerch && !reg.paymentProofUrl && (
                    <Link to="/participant/orders" style={s.uploadLink}>
                      Upload payment proof →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ticket footer */}
          <div style={s.ticketFooter}>
            <span style={s.footerText}>Ticket ID: {reg.ticketId}</span>
            <span style={s.footerText}>Registered: {new Date(reg.createdAt).toLocaleDateString("en-IN")}</span>
            <span style={s.footerText}>Felicity {new Date().getFullYear()} · IIIT Hyderabad</span>
          </div>
        </div>

        {/* Pending payment workflow reminder */}
        {isMerch && reg.paymentStatus === "Pending" && !reg.qrCode && (
          <div style={s.workflowBox}>
            <h3 style={s.workflowTitle}> Next Steps</h3>
            <div style={s.workflowSteps}>
              {[
                { done: !!reg.paymentProofUrl, label: "Upload payment screenshot", sub: "Go to My Orders to upload your UPI/bank transfer screenshot" },
                { done: reg.paymentStatus === "Approved", label: "Organizer reviews proof", sub: "The organizer will approve or reject within 24 hours" },
                { done: false, label: "QR + confirmation email sent", sub: "Your ticket QR will appear here and be emailed to you" },
              ].map((step, i) => (
                <div key={i} style={s.workflowStep}>
                  <div style={{ ...s.stepDot, ...(step.done ? s.stepDotDone : {}) }}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <div>
                    <div style={{ ...s.stepLabel, ...(step.done ? s.stepLabelDone : {}) }}>{step.label}</div>
                    <div style={s.stepSub}>{step.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, .no-print { display: none !important; }
          #ticket-print { border: 2px solid #ccc !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 780, margin: "0 auto", padding: "2rem" },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  back: { color: "#64748b", textDecoration: "none", fontSize: "0.82rem", display: "block", marginBottom: "1rem" },
  actions: { display: "flex", gap: "0.75rem", marginBottom: "1.25rem", justifyContent: "flex-end" },
  actionBtn: { padding: "0.5rem 1.1rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
  // Ticket card
  ticket: { background: "#1e293b", border: "1px solid #334155", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  ticketHeader: { background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  ticketHeaderLeft: {},
  festName: { fontSize: "1.5rem", fontWeight: 900, color: "#a5b4fc", letterSpacing: "-0.5px" },
  festTagline: { color: "#6366f1", fontSize: "0.75rem", marginTop: "0.1rem" },
  statusBadge: { padding: "0.35rem 0.85rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700 },
  ticketBody: { display: "flex", gap: 0 },
  ticketLeft: { flex: 1, padding: "1.5rem" },
  eventTitle: { fontSize: "1.3rem", fontWeight: 800, color: "#f8fafc", marginBottom: "0.2rem" },
  organizerName: { color: "#64748b", fontSize: "0.82rem", marginBottom: "0.25rem" },
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "1rem 0" },
  infoSection: { marginBottom: "0.25rem" },
  infoSectionTitle: { color: "#6366f1", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  infoLabel: { color: "#64748b", fontSize: "0.8rem" },
  infoVal: { color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 500, textAlign: "right", maxWidth: "60%" },
  attendedBadge: { marginTop: "1rem", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", padding: "0.4rem 0.75rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, display: "inline-block" },
  // QR side
  ticketRight: { width: 220, background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", borderLeft: "1px dashed #334155" },
  qrBox: { background: "#fff", padding: 10, borderRadius: 10, marginBottom: "0.75rem" },
  qrImage: { width: 160, height: 160, display: "block" },
  ticketIdDisplay: { fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 700, color: "#818cf8", textAlign: "center", marginBottom: "0.35rem", letterSpacing: "1px" },
  qrCaption: { color: "#475569", fontSize: "0.7rem", textAlign: "center" },
  noQrBox: { textAlign: "center", padding: "1rem" },
  noQrTitle: { color: "#f87171", fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.9rem" },
  noQrMsg: { color: "#64748b", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: "0.75rem" },
  uploadLink: { color: "#818cf8", fontSize: "0.78rem", textDecoration: "underline" },
  // Footer strip
  ticketFooter: { background: "rgba(0,0,0,0.2)", padding: "0.6rem 1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" },
  footerText: { color: "#475569", fontSize: "0.7rem" },
  // Workflow box
  workflowBox: { marginTop: "1.25rem", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem" },
  workflowTitle: { color: "#f8fafc", fontWeight: 700, margin: "0 0 1rem", fontSize: "0.95rem" },
  workflowSteps: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  workflowStep: { display: "flex", alignItems: "flex-start", gap: "0.85rem" },
  stepDot: { width: 28, height: 28, borderRadius: "50%", background: "#334155", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", flexShrink: 0 },
  stepDotDone: { background: "rgba(74,222,128,0.2)", color: "#4ade80" },
  stepLabel: { color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600 },
  stepLabelDone: { color: "#4ade80" },
  stepSub: { color: "#475569", fontSize: "0.75rem", marginTop: "0.15rem" },
};