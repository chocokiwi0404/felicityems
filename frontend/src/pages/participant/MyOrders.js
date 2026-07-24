import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

const STATUS_STYLE = {
  "Not Required": { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  Pending: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  Approved: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
  Rejected: { bg: "rgba(239,68,68,0.12)", color: "#f87171" },
};

export default function MyOrders() {
  const { loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // orderId being uploaded
  const [msg, setMsg] = useState(null);
  const [showQR, setShowQR] = useState(null); // registration with QR
  const fileInputRef = useRef(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API}/participants/registrations/mine`)
      .then(res => {
        const merch = (res.data.registrations || []).filter(r => r.registrationType === "Merchandise");
        setOrders(merch);
      })
      .catch(() => setMsg({ type: "err", text: "Failed to load orders." }))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const handleFileSelect = (orderId) => {
    setPendingOrderId(orderId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingOrderId) return;

    // Max 4MB
    if (file.size > 4 * 1024 * 1024) {
      setMsg({ type: "err", text: "File too large. Max 4MB." });
      return;
    }

    setUploading(pendingOrderId);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const proofBase64 = reader.result; // data:image/...;base64,...
        const res = await axios.post(`${API}/payments/upload-proof`, {
          registrationId: pendingOrderId,
          proofBase64,
        });
        setOrders(prev => prev.map(o => o._id === pendingOrderId ? { ...o, ...res.data.registration } : o));
        setMsg({ type: "ok", text: "Payment proof uploaded! Waiting for organizer approval." });
      } catch (err) {
        setMsg({ type: "err", text: err.response?.data?.message || "Upload failed." });
      } finally {
        setUploading(null);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div style={s.wrap}>
        <h1 style={s.pageTitle}>My Orders</h1>
        <p style={s.pageSub}>Merchandise orders — upload payment proof to get your order confirmed</p>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.text}
            <button style={s.bannerX} onClick={() => setMsg(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div style={s.center}><div style={s.spinner} /></div>
        ) : orders.length === 0 ? (
          <div style={s.empty}>
            <p>No merchandise orders yet.</p>
          </div>
        ) : (
          <div style={s.orderList}>
            {orders.map(order => {
              const ss = STATUS_STYLE[order.paymentStatus] || STATUS_STYLE.Pending;
              const variant = order.selectedVariant;
              const variantText = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : null;
              const isUploading = uploading === order._id;

              return (
                <div key={order._id} style={s.orderCard}>
                  {/* Header row */}
                  <div style={s.orderHeader}>
                    <div>
                      <div style={s.orderEventName}>{order.event?.eventName || "Merchandise"}</div>
                      <div style={s.orderTicketId}>{order.ticketId}</div>
                    </div>
                    <span style={{ ...s.pill, background: ss.bg, color: ss.color }}>
                      {order.paymentStatus}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={s.orderDetails}>
                    {variantText && (
                      <div style={s.detailRow}>
                        <span style={s.detailLabel}>Variant</span>
                        <span>{variantText}</span>
                      </div>
                    )}
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Qty</span>
                      <span>{order.quantity}</span>
                    </div>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Amount</span>
                      <span>₹{(order.event?.registrationFee || 0) * (order.quantity || 1)}</span>
                    </div>
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Ordered</span>
                      <span>{fmt(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Payment proof section */}
                  {order.paymentStatus === "Not Required" && (
                    <div style={s.freeNote}>✓ Free item — no payment required</div>
                  )}

                  {order.paymentStatus === "Pending" && (
                    <div style={s.pendingNote}>
                      <span>⏳ Payment proof uploaded. Awaiting organizer approval.</span>
                      <button style={s.reuploadBtn} onClick={() => handleFileSelect(order._id)}>
                        Re-upload Proof
                      </button>
                    </div>
                  )}

                  {order.paymentStatus === "Rejected" && (
                    <div style={s.rejectedNote}>
                      <span>✕ Payment rejected. Please upload a clear proof image.</span>
                      <button style={s.uploadBtn} onClick={() => handleFileSelect(order._id)} disabled={isUploading}>
                        {isUploading ? "Uploading…" : "Upload Proof"}
                      </button>
                    </div>
                  )}

                  {(order.paymentStatus === "Pending" || order.paymentStatus === "Not Required")
                    && !order.paymentProofUrl && order.event?.registrationFee > 0 && (
                      <div style={s.uploadSection}>
                        <p style={s.uploadHint}>
                          📸 Upload a screenshot of your UPI/bank payment to get your order approved.
                        </p>
                        <button style={s.uploadBtn} onClick={() => handleFileSelect(order._id)} disabled={isUploading}>
                          {isUploading ? "Uploading…" : "Upload Payment Proof"}
                        </button>
                      </div>
                    )}

                  {order.paymentStatus === "Approved" && (
                    <div style={s.approvedSection}>
                      <div style={s.approvedNote}>Order confirmed</div>
                      {order.qrCode ? (
                        <div style={s.qrRow}>
                          <img src={order.qrCode} alt="QR Code" style={s.qrImg} />
                          <div>
                            <p style={s.qrHint}>Show this QR code at pickup</p>
                            <button style={s.viewQrBtn} onClick={() => setShowQR(order)}>
                              View Full Ticket
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", fontSize: "0.82rem" }}>QR code will appear here after approval.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR / Ticket modal */}
      {showQR && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Your Ticket</h3>
              <button style={s.modalClose} onClick={() => setShowQR(null)}>×</button>
            </div>
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={s.ticketEvent}>{showQR.event?.eventName}</div>
              <div style={s.ticketId}>{showQR.ticketId}</div>
              {showQR.selectedVariant && (
                <div style={s.ticketVariant}>
                  {[showQR.selectedVariant.size, showQR.selectedVariant.color].filter(Boolean).join(" / ")}
                  {" × "}{showQR.quantity}
                </div>
              )}
              {showQR.qrCode && (
                <img src={showQR.qrCode} alt="QR" style={{ width: 200, height: 200, margin: "1rem auto", display: "block", borderRadius: 8 }} />
              )}
              <p style={{ color: "#64748b", fontSize: "0.78rem" }}>Show this at the pickup desk</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 800, margin: "0 auto", padding: "2rem" },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  pageSub: { color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 1.5rem" },
  banner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1rem" },
  bannerOk: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
  bannerErr: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },
  bannerX: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem", padding: 0 },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", color: "#64748b", padding: "4rem" },
  orderList: { display: "flex", flexDirection: "column", gap: "1rem" },
  orderCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem" },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" },
  orderEventName: { fontWeight: 700, color: "#f8fafc", fontSize: "1rem" },
  orderTicketId: { fontFamily: "monospace", color: "#818cf8", fontSize: "0.78rem", marginTop: "0.2rem" },
  pill: { padding: "0.2rem 0.7rem", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600 },
  orderDetails: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", marginBottom: "0.75rem" },
  detailRow: { display: "flex", gap: "0.5rem", fontSize: "0.82rem" },
  detailLabel: { color: "#64748b" },
  freeNote: { color: "#4ade80", fontSize: "0.82rem", padding: "0.5rem 0.75rem", background: "rgba(74,222,128,0.07)", borderRadius: 6 },
  pendingNote: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fbbf24", fontSize: "0.82rem", padding: "0.5rem 0.75rem", background: "rgba(251,191,36,0.07)", borderRadius: 6, gap: "1rem" },
  rejectedNote: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f87171", fontSize: "0.82rem", padding: "0.5rem 0.75rem", background: "rgba(239,68,68,0.07)", borderRadius: 6, gap: "1rem" },
  uploadSection: { marginTop: "0.75rem", padding: "0.75rem", background: "rgba(99,102,241,0.05)", borderRadius: 8, border: "1px dashed #334155" },
  uploadHint: { color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 0.75rem" },
  uploadBtn: { padding: "0.5rem 1.25rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" },
  reuploadBtn: { padding: "0.35rem 0.85rem", background: "transparent", color: "#fbbf24", border: "1px solid #fbbf24", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem" },
  approvedSection: { marginTop: "0.75rem" },
  approvedNote: { color: "#4ade80", fontSize: "0.82rem", marginBottom: "0.75rem" },
  qrRow: { display: "flex", alignItems: "center", gap: "1rem" },
  qrImg: { width: 80, height: 80, borderRadius: 6 },
  qrHint: { color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 0.5rem" },
  viewQrBtn: { padding: "0.35rem 0.85rem", background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid #6366f1", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem", width: "100%", maxWidth: 380 },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  modalTitle: { color: "#f1f5f9", fontWeight: 700, margin: 0 },
  modalClose: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 },
  ticketEvent: { fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.25rem" },
  ticketId: { fontFamily: "monospace", color: "#818cf8", fontWeight: 700, fontSize: "1rem" },
  ticketVariant: { color: "#94a3b8", fontSize: "0.82rem", marginTop: "0.4rem" },
};