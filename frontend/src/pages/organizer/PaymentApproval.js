import React, { useState, useEffect } from "react";
import axios from "axios";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API = "http://localhost:5000/api";

const STATUS_STYLE = {
  "Not Required": { bg:"rgba(148,163,184,0.12)", color:"#94a3b8" },
  Pending:        { bg:"rgba(251,191,36,0.12)",  color:"#fbbf24" },
  Approved:       { bg:"rgba(74,222,128,0.12)",  color:"#4ade80" },
  Rejected:       { bg:"rgba(239,68,68,0.12)",   color:"#f87171" },
};

export default function PaymentApproval() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("Pending");
  const [selected,   setSelected]   = useState(null); // order being viewed
  const [actionLoading, setActionLoading] = useState(false);
  const [msg,        setMsg]        = useState(null);

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/payments/organizer/orders?status=${filter}`);
      setOrders(res.data.orders || []);
    } catch { setMsg({ type:"err", text:"Failed to load orders." }); }
    finally  { setLoading(false); }
  };

  const handleApprove = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API}/payments/organizer/orders/${orderId}/approve`);
      setOrders(p => p.map(o => o._id === orderId ? res.data.registration : o));
      setSelected(null);
      setMsg({ type:"ok", text:"Payment approved! QR + confirmation email sent to participant." });
    } catch (err) {
      setMsg({ type:"err", text: err.response?.data?.message || "Approval failed." });
    } finally { setActionLoading(false); }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm("Reject this payment?")) return;
    setActionLoading(true);
    try {
      const res = await axios.patch(`${API}/payments/organizer/orders/${orderId}/reject`);
      setOrders(p => p.map(o => o._id === orderId ? res.data.registration : o));
      setSelected(null);
      setMsg({ type:"ok", text:"Payment rejected." });
    } catch (err) {
      setMsg({ type:"err", text: err.response?.data?.message || "Rejection failed." });
    } finally { setActionLoading(false); }
  };

  const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";

  const FILTERS = ["All","Pending","Approved","Rejected","Not Required"];

  return (
    <div style={s.page}>
      <OrganizerNavBar />
      <div style={s.wrap}>
        <h1 style={s.pageTitle}>Payment Approval</h1>
        <p style={s.pageSub}>Review merchandise orders and approve payment proofs</p>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type==="ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.text}
            <button style={s.bannerX} onClick={() => setMsg(null)}>×</button>
          </div>
        )}

        {/* Filter tabs */}
        <div style={s.tabs}>
          {FILTERS.map(f => (
            <button key={f}
              style={{ ...s.tab, ...(filter===f ? s.tabOn : {}) }}
              onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.center}><div style={s.spinner}/></div>
        ) : orders.length === 0 ? (
          <div style={s.empty}>
            <p>No {filter.toLowerCase()} orders.</p>
          </div>
        ) : (
          <div style={s.table}>
            <div style={s.thead}>
              <div style={s.th}>Participant</div>
              <div style={s.th}>Event / Item</div>
              <div style={s.th}>Variant</div>
              <div style={s.th}>Qty</div>
              <div style={s.th}>Amount</div>
              <div style={s.th}>Ordered</div>
              <div style={s.th}>Status</div>
              <div style={s.th}>Actions</div>
            </div>
            {orders.map(order => {
              const ss = STATUS_STYLE[order.paymentStatus] || STATUS_STYLE.Pending;
              const variant = order.selectedVariant;
              const variantText = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : "—";
              return (
                <div key={order._id} style={s.row}>
                  <div style={s.td}>
                    <div style={s.pName}>{order.participant?.firstName} {order.participant?.lastName}</div>
                    <div style={s.pEmail}>{order.participant?.email}</div>
                  </div>
                  <div style={s.td}>
                    <div style={s.eventName}>{order.event?.eventName}</div>
                    <div style={s.ticketId}>{order.ticketId}</div>
                  </div>
                  <div style={s.td}>{variantText}</div>
                  <div style={s.td}>{order.quantity}</div>
                  <div style={s.td}>₹{(order.event?.registrationFee || 0) * (order.quantity || 1)}</div>
                  <div style={s.td}>{fmt(order.createdAt)}</div>
                  <div style={s.td}>
                    <span style={{ ...s.pill, background: ss.bg, color: ss.color }}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div style={s.td}>
                    {order.paymentProofUrl ? (
                      <button style={s.viewBtn} onClick={() => setSelected(order)}>View Proof</button>
                    ) : (
                      <span style={{ color:"#475569", fontSize:"0.78rem" }}>No proof</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Payment Proof Modal ── */}
      {selected && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Payment Proof</h3>
              <button style={s.modalClose} onClick={() => setSelected(null)}>×</button>
            </div>

            <div style={s.proofInfo}>
              <div style={s.proofRow}><span style={s.proofLabel}>Participant</span>
                <span>{selected.participant?.firstName} {selected.participant?.lastName}</span></div>
              <div style={s.proofRow}><span style={s.proofLabel}>Email</span>
                <span style={{ color:"#94a3b8" }}>{selected.participant?.email}</span></div>
              <div style={s.proofRow}><span style={s.proofLabel}>Ticket</span>
                <span style={{ fontFamily:"monospace", color:"#818cf8" }}>{selected.ticketId}</span></div>
              <div style={s.proofRow}><span style={s.proofLabel}>Amount</span>
                <span>₹{(selected.event?.registrationFee || 0) * (selected.quantity || 1)}</span></div>
              <div style={s.proofRow}><span style={s.proofLabel}>Status</span>
                <span style={{ color: STATUS_STYLE[selected.paymentStatus]?.color }}>{selected.paymentStatus}</span></div>
            </div>

            {/* Payment proof image */}
            <div style={s.proofImgWrap}>
              {selected.paymentProofUrl?.startsWith("data:") || selected.paymentProofUrl?.startsWith("http") ? (
                <img src={selected.paymentProofUrl} alt="Payment proof"
                  style={s.proofImg} />
              ) : (
                <div style={s.noProof}>No image available</div>
              )}
            </div>

            {selected.paymentStatus === "Pending" && (
              <div style={s.modalActions}>
                <button style={s.rejectBtn} onClick={() => handleReject(selected._id)} disabled={actionLoading}>
                  ✕ Reject
                </button>
                <button style={s.approveBtn} onClick={() => handleApprove(selected._id)} disabled={actionLoading}>
                  {actionLoading ? "Processing…" : "✓ Approve"}
                </button>
              </div>
            )}
            {selected.paymentStatus !== "Pending" && (
              <p style={{ color:"#64748b", fontSize:"0.82rem", textAlign:"center", marginTop:"1rem" }}>
                This order has already been {selected.paymentStatus.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { background:"#0f172a", minHeight:"100vh", width:"100vw", color:"#f1f5f9", fontFamily:"'DM Sans',system-ui,sans-serif" },
  wrap:       { maxWidth:1100, margin:"0 auto", padding:"2rem" },
  pageTitle:  { fontSize:"1.5rem", fontWeight:800, color:"#f8fafc", margin:0 },
  pageSub:    { color:"#64748b", fontSize:"0.875rem", margin:"0.25rem 0 1.5rem" },
  banner:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.75rem 1rem", borderRadius:8, fontSize:"0.875rem", marginBottom:"1rem" },
  bannerOk:   { background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80" },
  bannerErr:  { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" },
  bannerX:    { background:"none", border:"none", color:"inherit", cursor:"pointer", fontSize:"1.2rem", padding:0 },
  tabs:       { display:"flex", gap:"0.35rem", marginBottom:"1.25rem", flexWrap:"wrap" },
  tab:        { padding:"0.45rem 1rem", background:"transparent", border:"1px solid #334155", borderRadius:999, color:"#64748b", cursor:"pointer", fontSize:"0.8rem", fontWeight:500 },
  tabOn:      { background:"rgba(99,102,241,0.15)", borderColor:"#6366f1", color:"#818cf8" },
  center:     { display:"flex", justifyContent:"center", padding:"3rem" },
  spinner:    { width:32, height:32, border:"3px solid #1e293b", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  empty:      { textAlign:"center", color:"#64748b", padding:"4rem" },
  table:      { background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
  thead:      { display:"grid", gridTemplateColumns:"2fr 2fr 1fr 0.5fr 1fr 1.2fr 1.2fr 1.2fr", padding:"0.65rem 1rem", background:"rgba(255,255,255,0.02)", borderBottom:"1px solid #334155" },
  th:         { color:"#64748b", fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" },
  row:        { display:"grid", gridTemplateColumns:"2fr 2fr 1fr 0.5fr 1fr 1.2fr 1.2fr 1.2fr", padding:"0.85rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.04)", alignItems:"center" },
  td:         { fontSize:"0.85rem", color:"#cbd5e1" },
  pName:      { fontWeight:600, color:"#e2e8f0", fontSize:"0.875rem" },
  pEmail:     { color:"#64748b", fontSize:"0.75rem" },
  eventName:  { fontWeight:600, color:"#e2e8f0", fontSize:"0.85rem" },
  ticketId:   { fontFamily:"monospace", color:"#818cf8", fontSize:"0.75rem" },
  pill:       { padding:"0.15rem 0.65rem", borderRadius:999, fontSize:"0.72rem", fontWeight:600 },
  viewBtn:    { padding:"0.35rem 0.85rem", background:"rgba(99,102,241,0.15)", color:"#818cf8", border:"1px solid #6366f1", borderRadius:6, cursor:"pointer", fontSize:"0.78rem", fontWeight:600 },
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:      { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.5rem", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" },
  modalHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" },
  modalTitle: { color:"#f1f5f9", fontWeight:700, margin:0 },
  modalClose: { background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"1.4rem", lineHeight:1 },
  proofInfo:  { background:"#0f172a", borderRadius:8, padding:"0.75rem 1rem", marginBottom:"1rem" },
  proofRow:   { display:"flex", justifyContent:"space-between", padding:"0.4rem 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"0.85rem" },
  proofLabel: { color:"#64748b" },
  proofImgWrap:{ background:"#0f172a", borderRadius:8, padding:"0.75rem", marginBottom:"1rem", textAlign:"center", minHeight:200, display:"flex", alignItems:"center", justifyContent:"center" },
  proofImg:   { maxWidth:"100%", maxHeight:350, borderRadius:6, objectFit:"contain" },
  noProof:    { color:"#475569", fontSize:"0.875rem" },
  modalActions:{ display:"flex", gap:"0.75rem" },
  approveBtn: { flex:1, padding:"0.65rem", background:"#4ade80", color:"#052e16", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:"0.9rem" },
  rejectBtn:  { flex:1, padding:"0.65rem", background:"transparent", color:"#f87171", border:"1px solid #f87171", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:"0.9rem" },
};