import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://localhost:5000/api";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [regInfo, setRegInfo] = useState(null); // existing registration if any
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState({});
  const [variant, setVariant] = useState({ size: "", color: "" });
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    axios.get(`${API_URL}/participants/events/${id}`)
      .then(res => {
        setEvent(res.data.event);
        setRegInfo(res.data.registration || null);
        // Pre-fill first variant
        if (res.data.event?.variants?.length) {
          const v = res.data.event.variants[0];
          setVariant({ size: v.size, color: v.color });
        }
      })
      .catch(() => setMsg({ type: "err", text: "Failed to load event." }))
      .finally(() => setLoading(false));
  }, [id, authLoading]);

  const now = new Date();
  const deadlinePassed = event?.registrationDeadline && now > new Date(event.registrationDeadline);
  const limitReached = event?.registrationLimit && event.registrationCount >= event.registrationLimit;
  const alreadyReg = !!regInfo;
  const notOpen = !["Published", "Ongoing"].includes(event?.status);

  const getBlockReason = () => {
    if (alreadyReg) return "✓ Already Registered";
    if (notOpen) return "Registrations Not Open";
    if (deadlinePassed) return "Registration Deadline Passed";
    if (limitReached) return "Registration Full";
    return null;
  };
  const blocked = getBlockReason();

  const handleRegister = async () => {
    setRegLoading(true); setMsg(null);
    try {
      const payload = event.eventType === "Normal"
        ? { formAnswers: Object.entries(answers).map(([fieldLabel, answer]) => ({ fieldLabel, answer })) }
        : { selectedVariant: variant, quantity: qty };

      const res = await axios.post(`${API_URL}/participants/events/${id}/register`, payload);
      setRegInfo(res.data.registration);
      setMsg({ type: "ok", text: "Registration successful! Check your dashboard for your ticket." });
      setShowForm(false);
      // Refresh event for updated count
      const evRes = await axios.get(`${API_URL}/participants/events/${id}`);
      setEvent(evRes.data.event);
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Registration failed." });
    } finally { setRegLoading(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  if (!event) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.wrap}><p style={s.muted}>Event not found.</p></div>
    </div>
  );

  const isFree = !event.registrationFee || event.registrationFee === 0;
  const selectedVariantData = event.variants?.find(v => v.size === variant.size && v.color === variant.color);

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <Link to="/participant/browse-events" style={s.breadLink}>← Browse Events</Link>
        </div>

        <div style={s.layout}>
          {/* Left: Main info */}
          <div style={s.main}>
            <div style={s.topRow}>
              <span style={s.typeBadge}>{event.eventType}</span>
              <span style={{ ...s.statusBadge, ...(event.status === "Ongoing" ? s.statusOngoing : event.status === "Published" ? s.statusPublished : {}) }}>
                {event.status}
              </span>
            </div>

            <h1 style={s.title}>{event.eventName}</h1>
            <p style={s.organizer}>
              by <Link to={`/participant/clubs/${event.organizer?._id}`} style={s.orgLink}>
                {event.organizer?.organizerName}
              </Link>
            </p>

            {msg && (
              <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
                {msg.type === "ok" ? "✓" : "⚠"} {msg.text}
              </div>
            )}

            <div style={s.section}>
              <h2 style={s.sTitle}>About</h2>
              <p style={s.desc}>{event.description || "No description provided."}</p>
            </div>

            {/* Event details grid */}
            <div style={s.section}>
              <h2 style={s.sTitle}>Details</h2>
              <div style={s.detailGrid}>
                {[
                  { label: "Eligibility", val: event.eligibility },
                  { label: "Fee", val: isFree ? "Free" : `₹${event.registrationFee}` },
                  { label: "Start Date", val: fmt(event.eventStartDate) },
                  { label: "End Date", val: fmt(event.eventEndDate) },
                  { label: "Reg Deadline", val: fmt(event.registrationDeadline) },
                  { label: "Reg Limit", val: event.registrationLimit ? `${event.registrationCount}/${event.registrationLimit}` : "Unlimited" },
                ].map(d => (
                  <div key={d.label} style={s.detailRow}>
                    <span style={s.detailLabel}>{d.label}</span>
                    <span style={s.detailVal}>{d.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div style={s.section}>
                <h2 style={s.sTitle}>Tags</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {event.tags.map(t => <span key={t} style={s.tag}>{t}</span>)}
                </div>
              </div>
            )}

            {/* Merchandise variants */}
            {event.eventType === "Merchandise" && event.variants?.length > 0 && (
              <div style={s.section}>
                <h2 style={s.sTitle}>Available Variants</h2>
                <div style={s.variantGrid}>
                  {event.variants.map((v, i) => (
                    <div key={i} style={{
                      ...s.variantCard,
                      ...(variant.size === v.size && variant.color === v.color ? s.variantSelected : {}),
                      ...(v.stockQuantity === 0 ? s.variantOos : {}),
                    }}
                      onClick={() => v.stockQuantity > 0 && setVariant({ size: v.size, color: v.color })}>
                      <div style={s.variantName}>{v.size} / {v.color}</div>
                      <div style={s.variantStock}>
                        {v.stockQuantity > 0 ? `${v.stockQuantity} left` : "Out of Stock"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Normal event: registration form preview */}
            {showForm && event.eventType === "Normal" && event.customFormFields?.length > 0 && (
              <div style={s.section}>
                <h2 style={s.sTitle}>Registration Form</h2>
                {event.customFormFields.map((field, i) => (
                  <div key={i} style={s.formField}>
                    <label style={s.lbl}>
                      {field.label}
                      {field.required && <span style={s.required}>*</span>}
                    </label>
                    {field.type === "text" && (
                      <input style={s.input} value={answers[field.label] || ""}
                        onChange={e => setAnswers(p => ({ ...p, [field.label]: e.target.value }))} />
                    )}
                    {field.type === "textarea" && (
                      <textarea style={{ ...s.input, minHeight: 80, resize: "vertical" }} value={answers[field.label] || ""}
                        onChange={e => setAnswers(p => ({ ...p, [field.label]: e.target.value }))} />
                    )}
                    {field.type === "dropdown" && (
                      <select style={s.input} value={answers[field.label] || ""}
                        onChange={e => setAnswers(p => ({ ...p, [field.label]: e.target.value }))}>
                        <option value="">Select…</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {field.type === "checkbox" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                        {field.options?.map(o => (
                          <label key={o} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer" }}>
                            <input type="checkbox"
                              checked={(answers[field.label] || []).includes(o)}
                              onChange={e => {
                                const cur = answers[field.label] || [];
                                setAnswers(p => ({ ...p, [field.label]: e.target.checked ? [...cur, o] : cur.filter(x => x !== o) }));
                              }} />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === "radio" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                        {field.options?.map(o => (
                          <label key={o} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer" }}>
                            <input type="radio" name={field.label} value={o}
                              checked={answers[field.label] === o}
                              onChange={() => setAnswers(p => ({ ...p, [field.label]: o }))} />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Registration card */}
          <div style={s.sidebar}>
            <div style={s.regCard}>
              <div style={s.regFee}>
                {isFree ? <span style={{ color: "#34d399" }}>Free</span> : `₹${event.registrationFee}`}
              </div>

              {event.eventType === "Merchandise" && !blocked && (
                <div style={s.qtyRow}>
                  <span style={s.lbl}>Quantity</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <span style={{ color: "#f1f5f9", fontWeight: 700 }}>{qty}</span>
                    <button style={s.qtyBtn} onClick={() => setQty(q => Math.min(event.purchaseLimitPerUser || 5, q + 1))}>+</button>
                  </div>
                  {selectedVariantData && (
                    <span style={s.stockHint}>{selectedVariantData.stockQuantity} in stock</span>
                  )}
                </div>
              )}

              {blocked ? (
                <div style={s.blockedBtn}>{blocked}</div>
              ) : showForm ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button style={s.regBtn} onClick={handleRegister} disabled={regLoading}>
                    {regLoading ? "Submitting…" : event.eventType === "Merchandise" ? "Confirm Purchase" : "Submit Registration"}
                  </button>
                  <button style={s.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              ) : (
                <button style={s.regBtn} onClick={() => setShowForm(true)}>
                  {event.eventType === "Merchandise" ? "Purchase" : "Register Now"}
                </button>
              )}

              {deadlinePassed && !alreadyReg && !limitReached && (
                <p style={s.deadlineWarn}>Registration deadline passed</p>
              )}
            </div>

            {/* Organizer info */}
            <div style={s.orgCard}>
              <h3 style={s.orgCardTitle}>Organizer</h3>
              <p style={s.orgCardName}>{event.organizer?.organizerName}</p>
              <p style={s.orgCardCat}>{event.organizer?.category}</p>
              {event.organizer?.contactEmail && (
                <a href={`mailto:${event.organizer.contactEmail}`} style={s.orgEmail}>
                  {event.organizer.contactEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 1100, margin: "0 auto", padding: "2rem" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  spinner: { width: 30, height: 30, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  breadcrumb: { marginBottom: "1.25rem" },
  breadLink: { color: "#64748b", textDecoration: "none", fontSize: "0.875rem" },
  layout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "flex-start" },
  main: {},
  topRow: { display: "flex", gap: "0.5rem", marginBottom: "0.75rem" },
  typeBadge: { background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: "0.75rem", padding: "0.2rem 0.7rem", borderRadius: 6, fontWeight: 600 },
  statusBadge: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "0.75rem", padding: "0.2rem 0.7rem", borderRadius: 6 },
  statusOngoing: { background: "rgba(96,165,250,0.15)", color: "#60a5fa" },
  statusPublished: { background: "rgba(74,222,128,0.15)", color: "#4ade80" },
  title: { fontSize: "1.75rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 0.4rem" },
  organizer: { color: "#64748b", fontSize: "0.9rem", marginBottom: "1.25rem" },
  orgLink: { color: "#6366f1", textDecoration: "none" },
  banner: { padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1.25rem" },
  bannerOk: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" },
  bannerErr: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" },
  section: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" },
  sTitle: { fontSize: "0.9rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 0.75rem" },
  desc: { color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.7 },
  detailGrid: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  detailLabel: { color: "#64748b", fontSize: "0.82rem" },
  detailVal: { color: "#e2e8f0", fontSize: "0.875rem", fontWeight: 500 },
  tag: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "0.75rem", padding: "0.2rem 0.65rem", borderRadius: 999 },
  variantGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "0.5rem" },
  variantCard: { padding: "0.7rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", textAlign: "center" },
  variantSelected: { borderColor: "#6366f1", background: "rgba(99,102,241,0.1)" },
  variantOos: { opacity: 0.4, cursor: "not-allowed" },
  variantName: { color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 600 },
  variantStock: { color: "#64748b", fontSize: "0.72rem", marginTop: "0.2rem" },
  formField: { marginBottom: "0.75rem" },
  lbl: { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.3rem" },
  required: { color: "#f87171" },
  input: { padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.875rem", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif" },
  muted: { color: "#64748b" },

  // Sidebar
  sidebar: {},
  regCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem", marginBottom: "1rem", position: "sticky", top: 80 },
  regFee: { fontSize: "2rem", fontWeight: 800, color: "#f8fafc", marginBottom: "1rem" },
  qtyRow: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" },
  qtyBtn: { width: 28, height: 28, background: "rgba(255,255,255,0.06)", border: "1px solid #334155", borderRadius: 6, color: "#f1f5f9", cursor: "pointer", fontSize: "1rem" },
  stockHint: { color: "#64748b", fontSize: "0.75rem" },
  regBtn: { width: "100%", padding: "0.8rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" },
  cancelBtn: { width: "100%", padding: "0.6rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem" },
  blockedBtn: { width: "100%", padding: "0.8rem", background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid #1e293b", borderRadius: 8, textAlign: "center", fontSize: "0.875rem", fontWeight: 600 },
  deadlineWarn: { color: "#f87171", fontSize: "0.78rem", textAlign: "center", marginTop: "0.5rem" },
  orgCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.25rem" },
  orgCardTitle: { color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem" },
  orgCardName: { color: "#e2e8f0", fontWeight: 700, fontSize: "0.95rem", margin: "0 0 0.2rem" },
  orgCardCat: { color: "#6366f1", fontSize: "0.8rem", margin: "0 0 0.5rem" },
  orgEmail: { color: "#64748b", fontSize: "0.8rem", textDecoration: "none" },
};

export default EventDetail;