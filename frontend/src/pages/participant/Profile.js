import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import ParticipantNavbar from "../../components/ParticipantNavBar";

const API_URL = "http://localhost:5000/api";

const INTERESTS = [
  "Technical","Cultural","Sports","Music","Dance",
  "Photography","Robotics","Finance","Entrepreneurship","Other",
];

const Profile = () => {
  const { user } = useAuth();

  const [formData,  setFormData]  = useState({ firstName:"", lastName:"", contactNumber:"", collegeOrOrgName:"" });
  const [interests, setInterests] = useState([]);
  const [clubs,     setClubs]     = useState([]);
  const [followed,  setFollowed]  = useState([]);
  const [pwData,    setPwData]    = useState({ current:"", newPw:"", confirm:"" });

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [prefSave, setPrefSave] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [prefMsg,  setPrefMsg]  = useState(null);
  const [pwMsg,    setPwMsg]    = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/participants/profile`),
      axios.get(`${API_URL}/organizers`),
    ]).then(([profRes, clubsRes]) => {
      const p = profRes.data.participant;
      setFormData({
        firstName:        p.firstName        || "",
        lastName:         p.lastName         || "",
        contactNumber:    p.contactNumber    || "",
        collegeOrOrgName: p.collegeOrOrgName || "",
      });
      setInterests(p.preferences?.areasOfInterest    || []);
      const followedIds = (p.preferences?.followedOrganizers || []).map(o => o._id || o);
      setFollowed(followedIds);
      setClubs(clubsRes.data.organizers || []);
    }).catch(() => {
      setMsg({ type: "err", text: "Failed to load profile." });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await axios.patch(`${API_URL}/participants/profile`, formData);
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Save failed." });
    } finally { setSaving(false); }
  };

  const handlePrefSave = async () => {
    setPrefSave(true); setPrefMsg(null);
    try {
      await axios.patch(`${API_URL}/participants/preferences`, {
        areasOfInterest:    interests,
        followedOrganizers: followed,
      });
      setPrefMsg({ type: "ok", text: "Preferences saved." });
    } catch (err) {
      setPrefMsg({ type: "err", text: "Failed to save preferences." });
    } finally { setPrefSave(false); }
  };

  const handlePwChange = async () => {
    if (pwData.newPw !== pwData.confirm) { setPwMsg({ type:"err", text:"Passwords don't match." }); return; }
    if (pwData.newPw.length < 8)         { setPwMsg({ type:"err", text:"Min 8 characters." }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await axios.put(`${API_URL}/auth/change-password`, {
        currentPassword: pwData.current,
        newPassword:     pwData.newPw,
      });
      setPwMsg({ type:"ok", text:"Password changed." });
      setPwData({ current:"", newPw:"", confirm:"" });
    } catch (err) {
      setPwMsg({ type:"err", text: err.response?.data?.message || "Failed." });
    } finally { setPwSaving(false); }
  };

  const toggleInterest = (val) =>
    setInterests(p => p.includes(val) ? p.filter(i => i !== val) : [...p, val]);

  const toggleFollow = (id) =>
    setFollowed(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const Banner = ({ m }) => !m ? null : (
    <div style={{ ...s.banner, ...(m.type==="ok" ? s.bannerOk : s.bannerErr) }}>
      {m.type==="ok" ? "✓" : "⚠"} {m.text}
    </div>
  );

  if (loading) return (
    <div style={s.page}><ParticipantNavbar />
      <div style={s.center}><div style={s.spinner} /></div>
    </div>
  );

  return (
    <div style={s.page}>
      <ParticipantNavbar />
      <div style={s.wrap}>
        <h1 style={s.pageTitle}>My Profile</h1>

        <div style={s.grid}>
          {/* ── Personal Info ── */}
          <div style={s.section}>
            <h2 style={s.sTitle}>Personal Information</h2>
            <Banner m={msg} />

            <div style={s.field}>
              <label style={s.lbl}>Email <span style={s.locked}>locked</span></label>
              <input style={{ ...s.input, ...s.inputLocked }} value={user?.email || ""} readOnly />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Participant Type <span style={s.locked}>locked</span></label>
              <input style={{ ...s.input, ...s.inputLocked }}
                value={user?.participantType === "IIIT" ? "IIIT Student" : "External Participant"} readOnly />
            </div>

            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.lbl}>First Name</label>
                <input style={s.input} value={formData.firstName}
                  onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div style={s.field}>
                <label style={s.lbl}>Last Name</label>
                <input style={s.input} value={formData.lastName}
                  onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.lbl}>Contact Number</label>
              <input style={s.input} value={formData.contactNumber}
                onChange={e => setFormData(p => ({ ...p, contactNumber: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.lbl}>College / Organization</label>
              <input style={s.input} value={formData.collegeOrOrgName}
                onChange={e => setFormData(p => ({ ...p, collegeOrOrgName: e.target.value }))} />
            </div>

            <div style={s.btnRow}>
              <button style={{ ...s.btn, ...(saving ? s.btnOff : {}) }}
                onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </div>

          {/* ── Change Password ── */}
          <div style={s.section}>
            <h2 style={s.sTitle}>Change Password</h2>
            <Banner m={pwMsg} />
            {[
              { label:"Current Password", key:"current",  ph:"Current password"   },
              { label:"New Password",     key:"newPw",    ph:"Min 8 characters"   },
              { label:"Confirm Password", key:"confirm",  ph:"Repeat new password"},
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.lbl}>{f.label}</label>
                <input style={{
                    ...s.input,
                    ...(f.key==="confirm" && pwData.newPw && pwData.confirm && pwData.newPw !== pwData.confirm
                      ? { borderColor:"#ef4444" } : {})
                  }}
                  type="password" placeholder={f.ph}
                  value={pwData[f.key]}
                  onChange={e => { setPwData(p => ({ ...p, [f.key]: e.target.value })); setPwMsg(null); }} />
              </div>
            ))}
            <div style={s.btnRow}>
              <button style={{ ...s.btn, ...(pwSaving ? s.btnOff : {}) }}
                onClick={handlePwChange} disabled={pwSaving}>
                {pwSaving ? "Changing…" : "Change Password"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div style={s.section}>
          <h2 style={s.sTitle}>Preferences</h2>
          <p style={s.sSub}>These influence event recommendations and ordering on your dashboard.</p>
          <Banner m={prefMsg} />

          <div style={s.prefGrid}>
            {/* Interests */}
            <div>
              <label style={s.lbl}>Areas of Interest</label>
              <div style={s.chips}>
                {INTERESTS.map(i => (
                  <button key={i}
                    style={{ ...s.chip, ...(interests.includes(i) ? s.chipOn : {}) }}
                    onClick={() => toggleInterest(i)}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Followed clubs */}
            <div>
              <label style={s.lbl}>Followed Clubs</label>
              <div style={s.chips}>
                {clubs.map(club => (
                  <button key={club._id}
                    style={{ ...s.chip, ...(followed.includes(club._id) ? s.chipOn : {}) }}
                    onClick={() => toggleFollow(club._id)}>
                    {club.organizerName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...(prefSave ? s.btnOff : {}) }}
              onClick={handlePrefSave} disabled={prefSave}>
              {prefSave ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const s = {
  page:       { background:"#0f172a", minHeight:"100vh", width:"100vw", color:"#f1f5f9", fontFamily:"'DM Sans', system-ui, sans-serif" },
  wrap:       { maxWidth:1000, margin:"0 auto", padding:"2rem" },
  center:     { display:"flex", justifyContent:"center", alignItems:"center", height:"60vh" },
  spinner:    { width:30, height:30, border:"3px solid #1e293b", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  pageTitle:  { fontSize:"1.5rem", fontWeight:700, color:"#f8fafc", marginBottom:"1.5rem" },

  grid:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem", marginBottom:"1.25rem" },
  section:    { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"1.5rem" },
  sTitle:     { fontSize:"1rem", fontWeight:700, color:"#e2e8f0", margin:"0 0 1rem" },
  sSub:       { color:"#64748b", fontSize:"0.85rem", margin:"-0.5rem 0 1rem" },

  prefGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem", marginBottom:"1rem" },
  chips:      { display:"flex", flexWrap:"wrap", gap:"0.5rem", marginTop:"0.5rem" },
  chip:       { padding:"0.3rem 0.85rem", borderRadius:999, border:"1px solid #334155", background:"transparent", color:"#64748b", cursor:"pointer", fontSize:"0.8rem", fontWeight:500 },
  chipOn:     { background:"rgba(99,102,241,0.15)", borderColor:"#6366f1", color:"#818cf8" },

  row2:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" },
  field:      { display:"flex", flexDirection:"column", gap:"0.3rem", marginBottom:"0.75rem" },
  lbl:        { fontSize:"0.78rem", fontWeight:600, color:"#94a3b8", display:"flex", alignItems:"center", gap:"0.4rem" },
  locked:     { background:"rgba(255,255,255,0.05)", color:"#475569", fontSize:"0.65rem", padding:"0.1rem 0.4rem", borderRadius:4 },
  input:      { padding:"0.6rem 0.85rem", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontSize:"0.875rem", fontFamily:"'DM Sans',sans-serif", width:"100%", boxSizing:"border-box" },
  inputLocked:{ color:"#475569", cursor:"not-allowed" },

  btnRow:     { display:"flex", justifyContent:"flex-end", marginTop:"0.5rem" },
  btn:        { padding:"0.6rem 1.5rem", background:"#6366f1", color:"#fff", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:"0.875rem" },
  btnOff:     { opacity:0.5, cursor:"not-allowed" },

  banner:     { padding:"0.6rem 0.9rem", borderRadius:8, fontSize:"0.85rem", marginBottom:"1rem" },
  bannerOk:   { background:"rgba(34,197,94,0.1)",  border:"1px solid rgba(34,197,94,0.2)",  color:"#4ade80" },
  bannerErr:  { background:"rgba(239,68,68,0.1)",  border:"1px solid rgba(239,68,68,0.2)",  color:"#f87171" },
};

export default Profile;