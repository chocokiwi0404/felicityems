import React, { useState, useEffect } from "react";
import axios from "axios";
import ParticipantNavbar from "../../components/ParticipantNavBar";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

export default function FeedbackPage() {
  const { loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // eventId
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [existing, setExisting] = useState(null); // already submitted feedback
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    // Load attended registrations
    axios.get(`${API}/participants/registrations/mine`)
      .then(res => {
        const attended = (res.data.registrations || []).filter(r => r.attended);
        setRegistrations(attended);
        if (attended.length) setSelected(attended[0].event?._id);
      })
      .catch(() => setMsg({ type: "err", text: "Failed to load registrations." }))
      .finally(() => setLoading(false));
  }, [authLoading]);

  // Load existing feedback when event selected
  useEffect(() => {
    if (!selected) return;
    setExisting(null); setRating(0); setComment("");
    axios.get(`${API}/feedback/my/${selected}`)
      .then(res => {
        if (res.data.feedback) {
          setExisting(res.data.feedback);
          setRating(res.data.feedback.rating);
          setComment(res.data.feedback.comment || "");
        }
      }).catch(() => { });
  }, [selected]);

  const handleSubmit = async () => {
    if (!rating) return setMsg({ type: "err", text: "Please select a star rating." });
    setSaving(true); setMsg(null);
    try {
      await axios.post(`${API}/feedback`, { eventId: selected, rating, comment });
      setExisting({ rating, comment });
      setMsg({ type: "ok", text: "Feedback submitted anonymously. Thank you!" });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Failed to submit." });
    } finally { setSaving(false); }
  };

  const selectedReg = registrations.find(r => r.event?._id === selected);

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        <h1 style={s.pageTitle}>Event Feedback</h1>
        <p style={s.pageSub}>Your feedback is completely anonymous. Only star ratings and text are shared — no identity.</p>

        {msg && (
          <div style={{ ...s.banner, ...(msg.type === "ok" ? s.bannerOk : s.bannerErr) }}>
            {msg.text}
            <button style={s.bannerX} onClick={() => setMsg(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div style={s.center}><div style={s.spinner} /></div>
        ) : registrations.length === 0 ? (
          <div style={s.empty}>
            <h3 style={{ color: "#f8fafc", margin: "0 0 0.5rem" }}>No attended events</h3>
            <p style={{ color: "#64748b" }}>Feedback is available for events where your attendance was marked.</p>
          </div>
        ) : (
          <div style={s.layout}>
            {/* Event selector */}
            <div style={s.eventList}>
              <div style={s.sideTitle}>Attended Events</div>
              {registrations.map(r => (
                <div key={r._id}
                  style={{ ...s.eventItem, ...(selected === r.event?._id ? s.eventItemOn : {}) }}
                  onClick={() => setSelected(r.event?._id)}>
                  <div style={s.eventItemName}>{r.event?.eventName || "Event"}</div>
                  <div style={s.eventItemDate}>
                    {r.event?.eventStartDate ? new Date(r.event.eventStartDate).toLocaleDateString("en-IN") : ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback form */}
            <div style={s.formCard}>
              {selectedReg && (
                <>
                  <h2 style={s.eventName}>{selectedReg.event?.eventName}</h2>
                  <p style={s.eventOrg}>by {selectedReg.event?.organizer?.organizerName || "—"}</p>

                  {existing && (
                    <div style={s.submittedBadge}>
                      ✓ You already submitted feedback for this event.
                      You can update it below.
                    </div>
                  )}

                  {/* Star rating */}
                  <div style={s.ratingSection}>
                    <label style={s.lbl}>Overall Rating *</label>
                    <div style={s.stars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star}
                          style={{ ...s.star, color: star <= (hover || rating) ? "#fbbf24" : "#334155" }}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHover(star)}
                          onMouseLeave={() => setHover(0)}>
                          ★
                        </span>
                      ))}
                    </div>
                    <div style={s.ratingLabel}>
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hover || rating] || "Select a rating"}
                    </div>
                  </div>

                  {/* Comment */}
                  <div style={s.field}>
                    <label style={s.lbl}>Comments (optional)</label>
                    <textarea style={s.textarea}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Share your thoughts about the event…"
                      rows={5}
                    />
                  </div>

                  <div style={s.anonNote}>
                    Your identity is never shared. Organizers only see aggregated ratings and anonymous comments.
                  </div>

                  <button style={{ ...s.submitBtn, ...(saving ? s.submitBtnOff : {}) }}
                    onClick={handleSubmit} disabled={saving}>
                    {saving ? "Submitting…" : existing ? "Update Feedback" : "Submit Feedback"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0f172a", minHeight: "100vh", width: "100vw", color: "#f1f5f9", fontFamily: "'DM Sans',system-ui,sans-serif" },
  wrap: { maxWidth: 900, margin: "0 auto", padding: "2rem" },
  pageTitle: { fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", margin: 0 },
  pageSub: { color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 1.5rem", maxWidth: 600 },
  banner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1rem" },
  bannerOk: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
  bannerErr: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },
  bannerX: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.2rem", padding: 0 },
  center: { display: "flex", justifyContent: "center", padding: "4rem" },
  spinner: { width: 32, height: 32, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", color: "#64748b", padding: "4rem" },
  layout: { display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.25rem", alignItems: "flex-start" },
  eventList: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1rem" },
  sideTitle: { color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" },
  eventItem: { padding: "0.65rem 0.75rem", borderRadius: 8, cursor: "pointer", marginBottom: "0.35rem", border: "1px solid transparent" },
  eventItemOn: { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" },
  eventItemName: { fontWeight: 600, color: "#e2e8f0", fontSize: "0.875rem" },
  eventItemDate: { color: "#64748b", fontSize: "0.75rem", marginTop: "0.2rem" },
  formCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.75rem" },
  eventName: { fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 0.25rem" },
  eventOrg: { color: "#64748b", fontSize: "0.85rem", margin: "0 0 1.25rem" },
  submittedBadge: { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", padding: "0.6rem 0.85rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1.25rem" },
  ratingSection: { marginBottom: "1.25rem" },
  lbl: { display: "block", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.5rem" },
  stars: { display: "flex", gap: "0.25rem" },
  star: { fontSize: "2.5rem", cursor: "pointer", transition: "color 0.1s", lineHeight: 1 },
  ratingLabel: { color: "#94a3b8", fontSize: "0.82rem", marginTop: "0.4rem", height: "1.2em" },
  field: { marginBottom: "1.25rem" },
  textarea: { width: "100%", padding: "0.75rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans',sans-serif", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" },
  anonNote: { color: "#475569", fontSize: "0.78rem", margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.4rem" },
  submitBtn: { width: "100%", padding: "0.75rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  submitBtnOff: { opacity: 0.5, cursor: "not-allowed" },
};