import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API_URL = "http://localhost:5000/api";

const CATEGORIES = [
  "Technical","Cultural","Sports","Other",
];

const OrganizerProfile = () => {
  const { user } = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [pwMsg,    setPwMsg]    = useState(null);
  const [wMsg,     setWMsg]     = useState(null);

  const [form, setForm] = useState({
    organizerName: "", category: "Technical",
    description: "", contactEmail: "",
  });
  const [pwReason,   setPwReason]   = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/organizer/profile`)
      .then(res => {
        const o = res.data.organizer;
        setForm({
          organizerName: o.organizerName || "",
          category:      o.category      || "Technical",
          description:   o.description   || "",
          contactEmail:  o.contactEmail  || "",
        });
        setWebhookUrl(o.discordWebhookUrl || "");
      })
      .catch(() => setMsg({ type: "err", text: "Failed to load profile." }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.organizerName.trim()) { setMsg({ type: "err", text: "Name is required." }); return; }
    setSaving(true); setMsg(null);
    try {
      await axios.patch(`${API_URL}/organizer/profile`, form);
      setMsg({ type: "ok", text: "Profile saved." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Save failed." });
    } finally { setSaving(false); }
  };

  const handlePwRequest = async () => {
    if (!pwReason.trim()) { setPwMsg({ type: "err", text: "Please provide a reason for the reset." }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await axios.post(`${API_URL}/organizer/password-reset-request`, { reason: pwReason });
      setPwMsg({ type: "ok", text: "Request sent! The admin will review and share a new password with you." });
      setPwReason("");
    } catch (err) {
      setPwMsg({ type: "err", text: err.response?.data?.message || "Failed to send request." });
    } finally { setPwSaving(false); }
  };

  const handleSaveWebhook = async () => {
    setWMsg(null);
    try {
      await axios.patch(`${API_URL}/organizer/profile`, { discordWebhookUrl: webhookUrl });
      setWMsg({ type: "ok", text: "Webhook URL saved." });
    } catch { setWMsg({ type: "err", text: "Save failed." }); }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) { setWMsg({ type: "err", text: "Enter a webhook URL first." }); return; }
    setWMsg(null);
    try {
      await axios.post(webhookUrl, {
        embeds: [{
          title:       "🎪 Felicity — Webhook Test",
          description: `Connected successfully for **${form.organizerName}**!`,
          color:       0x6366f1,
        }],
      });
      setWMsg({ type: "ok", text: "Test message sent! Check your Discord channel." });
    } catch { setWMsg({ type: "err", text: "Failed. Check the webhook URL." }); }
  };

  const Banner = ({ m }) => !m ? null : (
    <div style={{ ...s.banner, ...(m.type === "ok" ? s.bannerOk : s.bannerErr) }}>
      {m.type === "ok" ? "✓" : "⚠"} {m.text}
    </div>
  );

  if (loading) return (
    <div style={s.page}>
      <OrganizerNavBar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  return (
    <div style={s.page}>
      <OrganizerNavBar />
      <div style={s.wrap}>
        <h1 style={s.pageTitle}>Profile</h1>

        {/* ── Club Info ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Club Information</h2>
          <Banner m={msg} />

          <div style={s.row}>
            <div style={s.field}>
              <label style={s.lbl}>Login Email <span style={s.locked}>locked</span></label>
              <input style={{ ...s.input, ...s.inputLocked }} value={user?.email || ""} readOnly />
            </div>
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.lbl}>Club Name *</label>
              <input style={s.input} value={form.organizerName}
                onChange={e => setForm(p => ({ ...p, organizerName: e.target.value }))}
                placeholder="e.g. Tech Club" />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Category</label>
              <select style={s.input} value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.lbl}>Description</label>
            <textarea style={s.textarea} rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What does your club do?" />
          </div>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.lbl}>Contact Email</label>
              <input style={s.input} type="email" value={form.contactEmail}
                onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                placeholder="club@iiit.ac.in" />
            </div>
            
          </div>

          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...(saving ? s.btnDisabled : {}) }}
              onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>

        {/* ── Password Reset Request ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Request Password Reset</h2>
          <p style={s.sectionSub}>
            Organizer passwords are managed by the Admin. Submit a request below and the Admin will generate a new password for you.
          </p>
          <Banner m={pwMsg} />
          <div style={s.field}>
            <label style={s.lbl}>Reason for Reset *</label>
            <textarea style={s.textarea} rows={3}
              value={pwReason}
              onChange={e => { setPwReason(e.target.value); setPwMsg(null); }}
              placeholder="e.g. Forgot current password, security concern, routine rotation…" />
          </div>
          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...(pwSaving ? s.btnDisabled : {}) }}
              onClick={handlePwRequest} disabled={pwSaving}>
              {pwSaving ? "Sending…" : "Send Reset Request"}
            </button>
          </div>
        </div>

        {/* ── Discord Webhook ── */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Discord Webhook</h2>
          <p style={s.sectionSub}>Auto-post new events to your Discord server when you publish them.</p>
          <Banner m={wMsg} />
          <div style={s.field}>
            <label style={s.lbl}>Webhook URL</label>
            <input style={s.input} value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..." />
          </div>
          <div style={s.btnRow}>
            <button style={s.btnGhost} onClick={handleTestWebhook} disabled={!webhookUrl}>
              Test Webhook
            </button>
            <button style={s.btn} onClick={handleSaveWebhook}>
              Save Webhook
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const s = {
  page:        { background: "#0f172a", minHeight: "100vh", width: "100vw", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f1f5f9" },
  wrap:        { maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" },
  center:      { display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" },
  spinner:     { width: 30, height: 30, border: "3px solid #1e293b", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  pageTitle:   { fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 1.5rem" },

  section:     { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" },
  sectionTitle:{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.35rem" },
  sectionSub:  { fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem" },

  grid2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  grid3:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  row:         { marginBottom: "1rem" },
  field:       { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" },
  lbl:         { fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.4rem" },
  locked:      { background: "#0f172a", color: "#475569", fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: 4 },
  input:       { padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", width: "100%" },
  inputLocked: { color: "#475569", cursor: "not-allowed" },
  textarea:    { padding: "0.6rem 0.85rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif", width: "100%", resize: "vertical" },

  btnRow:      { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" },
  btn:         { padding: "0.6rem 1.5rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif" },
  btnGhost:    { padding: "0.6rem 1.25rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },

  banner:      { padding: "0.65rem 1rem", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" },
  bannerOk:    { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" },
  bannerErr:   { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" },
};

export default OrganizerProfile;