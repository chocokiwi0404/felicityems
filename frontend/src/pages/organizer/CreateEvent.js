import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import OrganizerNavBar from "../../components/OrganizerNavBar";

const API_URL = "http://localhost:5000/api";

const n = {
  nav:        { background: "#0f172a", padding: "0 2rem", display: "flex", alignItems: "center", height: 60, gap: "2rem", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(255,255,255,0.06)", fontFamily: "'DM Sans', system-ui, sans-serif" },
  brand:      { display: "flex", alignItems: "center", gap: "0.5rem", marginRight: "1rem" },
  title:      { color: "#f8fafc", fontWeight: 700, fontSize: "1.1rem" },
  role:       { background: "#4f46e5", color: "#fff", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 999, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" },
  links:      { display: "flex", gap: "0.25rem", flex: 1 },
  link:       { color: "#94a3b8", padding: "0.4rem 0.85rem", borderRadius: 6, textDecoration: "none", fontSize: "0.875rem" },
  linkActive: { color: "#fff", background: "rgba(255,255,255,0.08)" },
  user:       { color: "#94a3b8", fontSize: "0.875rem" },
  logout:     { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.825rem", fontWeight: 600 },
};

// ── Field type options for form builder ──────────────────────────────────────
const FIELD_TYPES = [
  { value: "text",     label: "Short Text"   },
  { value: "textarea", label: "Long Text"    },
  { value: "dropdown", label: "Dropdown"     },
  { value: "checkbox", label: "Checkboxes"   },
  { value: "radio",    label: "Radio Buttons"},
  { value: "file",     label: "File Upload"  },
];

const EMPTY_FIELD = { label: "", fieldType: "text", options: [], isRequired: false };

// ── Blank event form state ────────────────────────────────────────────────────
const BLANK = {
  eventName:            "",
  description:          "",
  eventType:            "Normal",
  eligibility:          "Open to All",
  registrationDeadline: "",
  eventStartDate:       "",
  eventEndDate:         "",
  registrationLimit:    "",
  registrationFee:      "0",
  tags:                 "",
  // Normal
  customFormFields:     [],
  // Merchandise
  variants:             [],
  purchaseLimitPerUser: "1",
};

// ─────────────────────────────────────────────────────────────────────────────

const CreateEvent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id }   = useParams(); // present when editing an existing event

  const [form,    setForm]    = useState(BLANK);
  const [step,    setStep]    = useState(1);    // 1=basics, 2=form builder / variants, 3=review
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);  // { type:"ok"|"err", text }
  const [existingStatus, setExistingStatus] = useState(null); // for edit mode
  const [formLocked,     setFormLocked]     = useState(false);

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  // Load existing event if editing
  useEffect(() => {
    if (!id) return;
    axios.get(`${API_URL}/organizer/events/${id}`)
      .then(res => {
        const e = res.data.event;
        setExistingStatus(e.status);
        setFormLocked(e.formLocked || false);
        setForm({
          eventName:            e.eventName            || "",
          description:          e.description          || "",
          eventType:            e.eventType            || "Normal",
          eligibility:          e.eligibility          || "Open to All",
          registrationDeadline: e.registrationDeadline ? e.registrationDeadline.slice(0,10) : "",
          eventStartDate:       e.eventStartDate       ? e.eventStartDate.slice(0,10)       : "",
          eventEndDate:         e.eventEndDate         ? e.eventEndDate.slice(0,10)         : "",
          registrationLimit:    e.registrationLimit    ?? "",
          registrationFee:      e.registrationFee      ?? "0",
          tags:                 (e.tags || []).join(", "),
          customFormFields:     e.customFormFields     || [],
          variants:             e.variants             || [],
          purchaseLimitPerUser: e.purchaseLimitPerUser ?? "1",
        });
      })
      .catch(() => setMsg({ type: "err", text: "Failed to load event." }));
  }, [id]);

  // Editing rules from spec 10.4
  const isEditing      = !!id;
  const isDraft        = !existingStatus || existingStatus === "Draft";
  const isPublished    = existingStatus === "Published";
  const isLocked       = isEditing && !isDraft && !isPublished; // Ongoing/Completed/Closed = no edits

  // Which fields are editable at each status
  const canEdit = (field) => {
    if (!isEditing || isDraft) return true;
    if (isPublished) return ["description", "registrationDeadline", "registrationLimit"].includes(field);
    return false;
  };

  const set = (field, val) => {
    if (!canEdit(field)) return;
    setForm(prev => ({ ...prev, [field]: val }));
    setMsg(null);
  };

  // ── Form builder helpers ─────────────────────────────────────────────────
  const addField = () => {
    if (formLocked) return;
    setForm(prev => ({
      ...prev,
      customFormFields: [...prev.customFormFields, { ...EMPTY_FIELD, order: prev.customFormFields.length }],
    }));
  };

  const updateField = (idx, key, val) => {
    if (formLocked) return;
    setForm(prev => {
      const fields = [...prev.customFormFields];
      fields[idx] = { ...fields[idx], [key]: val };
      return { ...prev, customFormFields: fields };
    });
  };

  const removeField = (idx) => {
    if (formLocked) return;
    setForm(prev => ({
      ...prev,
      customFormFields: prev.customFormFields.filter((_, i) => i !== idx),
    }));
  };

  const moveField = (idx, dir) => {
    if (formLocked) return;
    setForm(prev => {
      const fields = [...prev.customFormFields];
      const target = idx + dir;
      if (target < 0 || target >= fields.length) return prev;
      [fields[idx], fields[target]] = [fields[target], fields[idx]];
      return { ...prev, customFormFields: fields };
    });
  };

  // ── Variant helpers (Merchandise) ────────────────────────────────────────
  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      variants: [...prev.variants, { size: "", color: "", description: "", stockQuantity: 0 }],
    }));
  };

  const updateVariant = (idx, key, val) => {
    setForm(prev => {
      const variants = [...prev.variants];
      variants[idx] = { ...variants[idx], [key]: val };
      return { ...prev, variants };
    });
  };

  const removeVariant = (idx) => {
    setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
  };

  // ── Save as Draft ────────────────────────────────────────────────────────
  const saveDraft = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = buildPayload("Draft");
      if (id) {
        await axios.put(`${API_URL}/organizer/events/${id}`, payload);
      } else {
        const res = await axios.post(`${API_URL}/organizer/events`, payload);
        navigate(`/organizer/events/${res.data.event._id}/edit`, { replace: true });
      }
      setMsg({ type: "ok", text: "Saved as Draft." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────
  const publish = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = buildPayload("Published");
      if (id) {
        await axios.put(`${API_URL}/organizer/events/${id}`, payload);
      } else {
        await axios.post(`${API_URL}/organizer/events`, payload);
      }
      setMsg({ type: "ok", text: "Event published successfully!" });
      setTimeout(() => navigate("/organizer/dashboard"), 1500);
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Publish failed." });
    } finally {
      setSaving(false);
    }
  };

  // ── Close registrations (Published → Closed) ─────────────────────────────
  const closeRegistrations = async () => {
    try {
      await axios.patch(`${API_URL}/organizer/events/${id}/status`, { status: "Closed" });
      setMsg({ type: "ok", text: "Registrations closed." });
      setExistingStatus("Closed");
    } catch {
      setMsg({ type: "err", text: "Failed to close registrations." });
    }
  };

  const buildPayload = (status) => ({
    eventName:            form.eventName,
    description:          form.description,
    eventType:            form.eventType,
    eligibility:          form.eligibility,
    registrationDeadline: form.registrationDeadline,
    eventStartDate:       form.eventStartDate,
    eventEndDate:         form.eventEndDate,
    registrationLimit:    form.registrationLimit === "" ? null : Number(form.registrationLimit),
    registrationFee:      Number(form.registrationFee) || 0,
    tags:                 form.tags.split(",").map(t => t.trim()).filter(Boolean),
    customFormFields:     form.eventType === "Normal"       ? form.customFormFields : [],
    variants:             form.eventType === "Merchandise"  ? form.variants         : [],
    purchaseLimitPerUser: Number(form.purchaseLimitPerUser) || 1,
    status,
  });

  // Input helpers are defined outside this component to avoid remount-on-render bug

  // ── Locked state (Ongoing/Completed/Closed) ───────────────────────────────
  if (isLocked) return (
    <>
      <OrganizerNavBar onLogout={handleLogout} userName={`${user?.firstName} ${user?.lastName}`} />
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={s.lockedBox}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔒</div>
          <h2 style={{ color: "#f8fafc", margin: "0 0 0.5rem" }}>Event Locked</h2>
          <p style={{ color: "#94a3b8", margin: "0 0 1.5rem" }}>
            Events with status <strong style={{ color: "#f59e0b" }}>{existingStatus}</strong> cannot be edited.<br />
            Only status changes are allowed at this stage.
          </p>
          <Link to="/organizer/dashboard">
            <button style={s.primaryBtn}>← Back to Dashboard</button>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .fcard:hover { border-color: rgba(99,102,241,0.3) !important; }
        .vcard:hover { border-color: rgba(99,102,241,0.3) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={s.page}>
        <OrganizerNavBar onLogout={handleLogout} userName={`${user?.firstName} ${user?.lastName}`} />

        <div style={s.wrap}>
          {/* Page header */}
          <div style={s.pageHdr}>
            <div>
              <h1 style={s.pageTitle}>
                {isEditing ? `Edit Event` : "Create New Event"}
              </h1>
              {isEditing && existingStatus && (
                <span style={{ ...s.statusPill, background: STATUS_BG[existingStatus] || "#334155", color: STATUS_COLOR[existingStatus] || "#94a3b8" }}>
                  {existingStatus}
                </span>
              )}
            </div>
            {isEditing && isPublished && (
              <button style={s.dangerBtn} onClick={closeRegistrations}>
                Close Registrations
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div style={s.steps}>
            {["Basic Info", form.eventType === "Merchandise" ? "Variants" : "Form Builder", "Review & Publish"].map((label, i) => (
              <React.Fragment key={label}>
                <div style={s.stepItem} onClick={() => setStep(i + 1)}>
                  <div style={{ ...s.stepNum, ...(step === i+1 ? s.stepNumActive : step > i+1 ? s.stepNumDone : {}) }}>
                    {step > i+1 ? "✓" : i + 1}
                  </div>
                  <span style={{ ...s.stepLabel, ...(step === i+1 ? { color: "#f8fafc" } : {}) }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ ...s.stepLine, ...(step > i+1 ? { background: "#6366f1" } : {}) }} />}
              </React.Fragment>
            ))}
          </div>

          {msg && (
            <div style={{ ...s.msg, ...(msg.type === "ok" ? s.msgOk : s.msgErr) }}>
              {msg.type === "ok" ? "✓" : "⚠"} {msg.text}
            </div>
          )}

          {/* ── STEP 1: Basic Info ── */}
          {step === 1 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Basic Information</h2>
              <p style={s.cardSub}>
                {isDraft ? "All fields are editable while in Draft." : isPublished ? "Only description, deadline and limit are editable after publishing." : ""}
              </p>

              <div style={s.grid2}>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Event Name *</label>
                  <input style={{ ...s.input, ...(canEdit("eventName") ? {} : s.inputDisabled) }} type="text" value={form.eventName} placeholder="e.g. Tech Talk 2025" onChange={e => set("eventName", e.target.value)} readOnly={!canEdit("eventName")} />
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Event Type *</label>
                  <select style={{ ...s.input, ...(canEdit("eventType") ? {} : s.inputDisabled) }} value={form.eventType} onChange={e => set("eventType", e.target.value)} disabled={!canEdit("eventType")}>
                    <option value="Normal">Normal Event</option>
                    <option value="Merchandise">Merchandise</option>
                  </select>
                </div>
              </div>

              <div style={s.fieldWrap}>
                <label style={s.lbl}>Description {isPublished && <span style={s.hint}>Editable after publishing</span>}</label>
                <textarea style={s.textarea} value={form.description}
                  onChange={e => set("description", e.target.value)}
                  readOnly={!canEdit("description")}
                  placeholder="Describe your event…" rows={4} />
              </div>

              <div style={s.grid3}>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Eligibility</label>
                  <select style={{ ...s.input, ...(canEdit("eligibility") ? {} : s.inputDisabled) }} value={form.eligibility} onChange={e => set("eligibility", e.target.value)} disabled={!canEdit("eligibility")}>
                    <option value="Open to All">Open to All</option>
                    <option value="IIIT Only">IIIT Only</option>
                    <option value="Non-IIIT Only">Non-IIIT Only</option>
                  </select>
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Registration Fee (₹)</label>
                  <input style={{ ...s.input, ...(canEdit("registrationFee") ? {} : s.inputDisabled) }} type="number" value={form.registrationFee} placeholder="0" min="0" onChange={e => set("registrationFee", e.target.value)} readOnly={!canEdit("registrationFee")} />
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Registration Limit <span style={s.hint}>(Leave blank for no limited)</span></label>
                  <input style={{ ...s.input, ...(canEdit("registrationLimit") ? {} : s.inputDisabled) }} type="number" value={form.registrationLimit} placeholder="Unlimited" min="1" onChange={e => set("registrationLimit", e.target.value)} readOnly={!canEdit("registrationLimit")} />
                </div>
              </div>

              <div style={s.grid3}>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Registration Deadline * {isPublished && <span style={s.hint}>Can extend</span>}</label>
                  <input style={{ ...s.input, ...(canEdit("registrationDeadline") ? {} : s.inputDisabled) }} type="date" value={form.registrationDeadline} onChange={e => set("registrationDeadline", e.target.value)} readOnly={!canEdit("registrationDeadline")} />
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Event Start Date *</label>
                  <input style={{ ...s.input, ...(canEdit("eventStartDate") ? {} : s.inputDisabled) }} type="date" value={form.eventStartDate} onChange={e => set("eventStartDate", e.target.value)} readOnly={!canEdit("eventStartDate")} />
                </div>
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Event End Date *</label>
                  <input style={{ ...s.input, ...(canEdit("eventEndDate") ? {} : s.inputDisabled) }} type="date" value={form.eventEndDate} onChange={e => set("eventEndDate", e.target.value)} readOnly={!canEdit("eventEndDate")} />
                </div>
              </div>

              <div style={s.fieldWrap}>
                <label style={s.lbl}>Tags <span style={s.hint}>Comma-separated — e.g. hackathon, AI, beginner</span></label>
                <input style={{ ...s.input, ...(canEdit("tags") ? {} : s.inputDisabled) }} type="text" value={form.tags} placeholder="technical, workshop, beginner-friendly" onChange={e => set("tags", e.target.value)} readOnly={!canEdit("tags")} />
              </div>

              {form.eventType === "Merchandise" && (
                <div style={s.fieldWrap}>
                  <label style={s.lbl}>Purchase Limit Per User</label>
                  <input style={{ ...s.input, ...(canEdit("purchaseLimitPerUser") ? {} : s.inputDisabled) }} type="number" value={form.purchaseLimitPerUser} min="1" onChange={e => set("purchaseLimitPerUser", e.target.value)} readOnly={!canEdit("purchaseLimitPerUser")} />
                </div>
              )}

              <div style={s.btnRow}>
                {(isDraft || !isEditing) && (
                  <button style={s.ghostBtn} onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                )}
                <button style={s.primaryBtn} onClick={() => setStep(2)}>
                  Next: {form.eventType === "Merchandise" ? "Variants" : "Form Builder"} →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2a: Form Builder (Normal) ── */}
          {step === 2 && form.eventType === "Normal" && (
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <h2 style={s.cardTitle}>Registration Form Builder</h2>
                  <p style={s.cardSub}>
                    {formLocked
                      ? "⚠ Form is locked — a registration has been received. No further edits allowed."
                      : "Add custom fields to collect information from participants."}
                  </p>
                </div>
                {!formLocked && (
                  <button style={s.addFieldBtn} onClick={addField}>+ Add Field</button>
                )}
              </div>

              {form.customFormFields.length === 0 ? (
                <div style={s.emptyFormBuilder}>
                  <p style={{ color: "#64748b", margin: 0 }}>No custom fields yet.</p>
                  <p style={{ color: "#475569", fontSize: "0.85rem" }}>Participants will only see the default registration form.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {form.customFormFields.map((field, idx) => (
                    <div key={idx} className="fcard" style={s.fieldCard}>
                      <div style={s.fieldCardTop}>
                        <span style={s.fieldNum}>Field {idx + 1}</span>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button style={s.iconBtn} onClick={() => moveField(idx, -1)} disabled={idx === 0}>↑</button>
                          <button style={s.iconBtn} onClick={() => moveField(idx, 1)} disabled={idx === form.customFormFields.length - 1}>↓</button>
                          <button style={{ ...s.iconBtn, color: "#f87171" }} onClick={() => removeField(idx)}>✕</button>
                        </div>
                      </div>

                      <div style={s.grid2}>
                        <div style={s.fieldWrap}>
                          <label style={s.lbl}>Field Label *</label>
                          <input style={s.input} value={field.label}
                            onChange={e => updateField(idx, "label", e.target.value)}
                            placeholder="e.g. Team Name, GitHub URL…" />
                        </div>
                        <div style={s.fieldWrap}>
                          <label style={s.lbl}>Field Type</label>
                          <select style={s.input} value={field.fieldType}
                            onChange={e => updateField(idx, "fieldType", e.target.value)}>
                            {FIELD_TYPES.map(ft => (
                              <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Options for dropdown/checkbox/radio */}
                      {["dropdown","checkbox","radio"].includes(field.fieldType) && (
                        <div style={s.fieldWrap}>
                          <label style={s.lbl}>Options <span style={s.hint}>(one per line)</span></label>
                          <textarea style={{ ...s.textarea, minHeight: 80 }}
                            value={(field.options || []).join("\n")}
                            onChange={e => updateField(idx, "options", e.target.value.split("\n"))}
                            placeholder={"Option 1\nOption 2\nOption 3"} rows={3} />
                        </div>
                      )}

                      <label style={s.checkLabel}>
                        <input type="checkbox" checked={field.isRequired}
                          onChange={e => updateField(idx, "isRequired", e.target.checked)} />
                        Required field
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div style={s.btnRow}>
                <button style={s.ghostBtn} onClick={() => setStep(1)}>← Back</button>
                {(isDraft || !isEditing) && (
                  <button style={s.ghostBtn} onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                )}
                <button style={s.primaryBtn} onClick={() => setStep(3)}>Review & Publish →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2b: Variants (Merchandise) ── */}
          {step === 2 && form.eventType === "Merchandise" && (
            <div style={s.card}>
              <div style={s.cardHdr}>
                <div>
                  <h2 style={s.cardTitle}>Product Variants</h2>
                  <p style={s.cardSub}>Add size/colour variants with stock quantities.</p>
                </div>
                <button style={s.addFieldBtn} onClick={addVariant}>+ Add Variant</button>
              </div>

              {form.variants.length === 0 ? (
                <div style={s.emptyFormBuilder}>
                  <p style={{ color: "#64748b", margin: 0 }}>No variants added yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {form.variants.map((v, idx) => (
                    <div key={idx} className="vcard" style={s.fieldCard}>
                      <div style={s.fieldCardTop}>
                        <span style={s.fieldNum}>Variant {idx + 1}</span>
                        <button style={{ ...s.iconBtn, color: "#f87171" }} onClick={() => removeVariant(idx)}>✕</button>
                      </div>
                      <div style={s.grid2}>
                        {[["size","Size","e.g. S, M, L, XL"],["color","Color","e.g. Black, White"]].map(([k,l,p]) => (
                          <div key={k} style={s.fieldWrap}>
                            <label style={s.lbl}>{l}</label>
                            <input style={s.input} value={v[k]}
                              onChange={e => updateVariant(idx, k, e.target.value)} placeholder={p} />
                          </div>
                        ))}
                      </div>
                      <div style={s.grid2}>
                        <div style={s.fieldWrap}>
                          <label style={s.lbl}>Stock Quantity *</label>
                          <input style={s.input} type="number" min="0" value={v.stockQuantity}
                            onChange={e => updateVariant(idx, "stockQuantity", Number(e.target.value))} />
                        </div>
                        <div style={s.fieldWrap}>
                          <label style={s.lbl}>Description</label>
                          <input style={s.input} value={v.description || ""}
                            onChange={e => updateVariant(idx, "description", e.target.value)}
                            placeholder="Optional variant notes" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={s.btnRow}>
                <button style={s.ghostBtn} onClick={() => setStep(1)}>← Back</button>
                {(isDraft || !isEditing) && (
                  <button style={s.ghostBtn} onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                )}
                <button style={s.primaryBtn} onClick={() => setStep(3)}>Review & Publish →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Publish ── */}
          {step === 3 && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>Review & Publish</h2>
              <p style={s.cardSub}>Double-check everything before publishing. Once published, only some fields can be edited.</p>

              <div style={s.reviewGrid}>
                {[
                  ["Event Name",    form.eventName            || "—"],
                  ["Type",          form.eventType            || "—"],
                  ["Eligibility",   form.eligibility          || "—"],
                  ["Fee",           form.registrationFee > 0 ? `₹${form.registrationFee}` : "Free"],
                  ["Limit",         form.registrationLimit    || "Unlimited"],
                  ["Deadline",      form.registrationDeadline || "—"],
                  ["Start Date",    form.eventStartDate        || "—"],
                  ["End Date",      form.eventEndDate          || "—"],
                  ["Tags",          form.tags                  || "None"],
                ].map(([k, v]) => (
                  <div key={k} style={s.reviewItem}>
                    <span style={s.reviewKey}>{k}</span>
                    <span style={s.reviewVal}>{v}</span>
                  </div>
                ))}
              </div>

              {form.description && (
                <div style={s.reviewDesc}>
                  <span style={s.reviewKey}>Description</span>
                  <p style={{ margin: "0.4rem 0 0", color: "#cbd5e1", lineHeight: 1.6 }}>{form.description}</p>
                </div>
              )}

              {form.eventType === "Normal" && form.customFormFields.length > 0 && (
                <div style={s.reviewExtra}>
                  <span style={s.reviewKey}>Custom Form Fields ({form.customFormFields.length})</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {form.customFormFields.map((f, i) => (
                      <span key={i} style={s.fieldTag}>
                        {f.label || "Unnamed"} · {f.fieldType}{f.isRequired ? " *" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {form.eventType === "Merchandise" && form.variants.length > 0 && (
                <div style={s.reviewExtra}>
                  <span style={s.reviewKey}>Variants ({form.variants.length})</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {form.variants.map((v, i) => (
                      <span key={i} style={s.fieldTag}>
                        {[v.size, v.color].filter(Boolean).join(" / ") || `Variant ${i+1}`} — {v.stockQuantity} in stock
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={s.btnRow}>
                <button style={s.ghostBtn} onClick={() => setStep(2)}>← Back</button>
                {(isDraft || !isEditing) && (
                  <button style={s.ghostBtn} onClick={saveDraft} disabled={saving}>
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                )}
                <button style={{ ...s.primaryBtn, background: "#22c55e", minWidth: 160 }}
                  onClick={publish} disabled={saving}>
                  {saving ? "Publishing…" : isEditing && isPublished ? "Save Changes" : "Publish Event"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const STATUS_BG    = { Draft:"#292524", Published:"#14532d22", Ongoing:"#1e3a8a22", Completed:"#1f2937", Closed:"#450a0a22" };
const STATUS_COLOR = { Draft:"#fbbf24", Published:"#4ade80",   Ongoing:"#60a5fa",   Completed:"#9ca3af", Closed:"#f87171"  };

const s = {
  page:         { background: "#0a0f1a", width:"100vw", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f8fafc" },
  wrap:         { maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" },
  pageHdr:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  pageTitle:    { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.75rem", color: "#f8fafc", margin: "0 0 0.5rem" },
  statusPill:   { display: "inline-block", padding: "0.2rem 0.75rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 700 },

  /* Steps */
  steps:        { display: "flex", alignItems: "center", marginBottom: "2rem", gap: 0 },
  stepItem:     { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" },
  stepNum:      { width: 28, height: 28, borderRadius: "50%", background: "#1e293b", border: "2px solid #334155", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 },
  stepNumActive:{ background: "#6366f1", borderColor: "#6366f1", color: "#fff" },
  stepNumDone:  { background: "#22c55e", borderColor: "#22c55e", color: "#fff" },
  stepLabel:    { fontSize: "0.85rem", fontWeight: 500, color: "#64748b", whiteSpace: "nowrap" },
  stepLine:     { flex: 1, height: 2, background: "#1e293b", margin: "0 0.75rem" },

  msg:          { padding: "0.75rem 1rem", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1.5rem" },
  msgOk:        { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" },
  msgErr:       { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" },

  card:         { background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: "2rem", marginBottom: "1.5rem" },
  cardHdr:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  cardTitle:    { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "#f8fafc", margin: "0 0 0.35rem" },
  cardSub:      { color: "#64748b", fontSize: "0.85rem", margin: 0 },

  grid2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  grid3:        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  fieldWrap:    { display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.25rem" },
  lbl:          { color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 },
  hint:         { color: "#475569", fontSize: "0.75rem", marginLeft: "0.25rem" },
  input:        { padding: "0.65rem 0.9rem", background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, color: "#f8fafc", fontSize: "0.9rem", transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "'DM Sans', sans-serif", width: "100%" },
  inputDisabled:{ background: "rgba(255,255,255,0.02)", color: "#475569", cursor: "not-allowed" },
  textarea:     { padding: "0.65rem 0.9rem", background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, color: "#f8fafc", fontSize: "0.9rem", resize: "vertical", fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "border-color 0.15s, box-shadow 0.15s" },
  checkLabel:   { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#94a3b8", cursor: "pointer", marginTop: "0.5rem" },

  /* Form builder */
  fieldCard:    { background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: "1.25rem", transition: "border-color 0.15s" },
  fieldCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  fieldNum:     { color: "#6366f1", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  iconBtn:      { background: "rgba(255,255,255,0.05)", border: "1px solid #1e293b", borderRadius: 6, color: "#94a3b8", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" },
  addFieldBtn:  { padding: "0.5rem 1rem", background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" },
  emptyFormBuilder: { textAlign: "center", padding: "3rem", color: "#475569" },

  /* Review */
  reviewGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" },
  reviewItem:   { background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.2rem" },
  reviewKey:    { color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  reviewVal:    { color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 500 },
  reviewDesc:   { background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem" },
  reviewExtra:  { background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem" },
  fieldTag:     { background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 500 },

  /* Buttons */
  btnRow:       { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #1e293b" },
  primaryBtn:   { padding: "0.7rem 1.75rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" },
  ghostBtn:     { padding: "0.7rem 1.25rem", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" },
  dangerBtn:    { padding: "0.6rem 1.25rem", background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 },

  /* Locked */
  lockedBox:    { background: "#111827", border: "1px solid #1e293b", borderRadius: 16, padding: "3rem", textAlign: "center", maxWidth: 420 },
};

export default CreateEvent;