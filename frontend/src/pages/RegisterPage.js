import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const IIIT_DOMAINS = ["student.iiit.ac.in", "research.iiit.ac.in"];
const ADMIN_DOMAIN = "admin.com";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    participantType: "Non-IIIT",
    collegeOrOrgName: "",
    contactNumber: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time validation helpers
  const isPassLongEnough = formData.password.length >= 8;
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "participantType") {
      // Logic for autofilling college/org when the dropdown changes
      setFormData((prev) => ({
        ...prev,
        participantType: value,
        // If they pick IIIT, force the name. If not, reset it to empty so they can type.
        collegeOrOrgName: value === "IIIT" ? "IIIT Hyderabad" : "",
      }));
    } else {
      // Normal update for all other fields
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (error) setError("");
  };

  const validate = () => {
    const { firstName, lastName, email, password, participantType } = formData;
    if (!firstName || !lastName) return "Please enter your full name.";
    
    const emailLower = email.toLowerCase();
    if (
      participantType === "IIIT" &&
      !IIIT_DOMAINS.some(domain => emailLower.endsWith(`@${domain}`))
    ) {
      return `IIIT students must use their @student.iiit.ac.in or @research.iiit.ac.in email.`;
    }
    if (emailLower.endsWith(`@${ADMIN_DOMAIN}`)) {
      return `Addresses ending in @${ADMIN_DOMAIN} are restricted.`;
    }
    if (!isPassLongEnough) return "Password must be at least 8 characters.";
    if (!doPasswordsMatch) return "Passwords do not match.";
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...payload } = formData;
      await register(payload);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <h3 style={s.title}>Create your participant account</h3>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.inputGroup}>
            <label style={s.label}>I am a...</label>
            <select 
              style={s.input} 
              name="participantType" 
              value={formData.participantType} 
              onChange={handleChange}
            >
              <option value="Non-IIIT">External Participant</option>
              <option value="IIIT">IIIT Hyderabad Student</option>
            </select>
          </div>

          <div style={s.row}>
            <div style={s.col}>
              <label style={s.label}>First Name</label>
              <input style={s.input} type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div style={s.col}>
              <label style={s.label}>Last Name</label>
              <input style={s.input} type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>
              Email Address 
              <span style={s.hint}>
                {formData.participantType === "IIIT" ? ` (Requires @${IIIT_DOMAINS})` : ` (No @${ADMIN_DOMAIN})`}
              </span>
            </label>
            <input
              style={{
                ...s.input, 
                borderColor: (formData.email.toLowerCase().endsWith(ADMIN_DOMAIN)) ? '#dc2626' : '#d1d5db'
              }}
              type="email"
              name="email"
              placeholder={formData.participantType === "IIIT" ? `student@${IIIT_DOMAINS}` : "you@example.com"}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={s.row}>
            <div style={s.col}>
              <label style={s.label}>College / Org</label>
              <input 
                style={{
                  ...s.input, 
                  background: formData.participantType === "IIIT" ? "#e2e8f0" : "##f8fafc",
                  cursor: formData.participantType === "IIIT" ? "not-allowed" : "text"
                }} 
                type="text" 
                name="collegeOrOrgName" 
                value={formData.collegeOrOrgName} 
                onChange={handleChange}
                // Important: Field is non-editable if they are IIIT students
                readOnly={formData.participantType === "IIIT"} 
                required
              />
            </div>
            <div style={s.col}>
              <label style={s.label}>Phone</label>
              <input style={s.input} type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" name="password" value={formData.password} onChange={handleChange} required />
            <div style={{...s.validationHint, color: isPassLongEnough ? '#16a34a' : '#6b7280'}}>
              {isPassLongEnough ? "✓ Minimum 8 characters" : "○ Must be at least 8 characters"}
            </div>
          </div>

          <div style={s.inputGroup}>
            <label style={s.label}>Confirm Password</label>
            <input 
              style={{
                ...s.input, 
                borderColor: (formData.confirmPassword && !doPasswordsMatch) ? '#dc2626' : '#d1d5db'
              }} 
              type="password" 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
            />
          </div>

          <button style={loading ? s.buttonDisabled : s.button} type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p style={s.footer}>
          Already registered? <Link to="/login" style={s.link}>Login here</Link>
        </p>
      </div>
    </div>
  );
};

const s = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    padding: "2rem 1rem",
  },

  card: {
    background: "#1e293b",
    padding: "2.5rem",
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
    width: "100%",
    maxWidth: "520px",
    border: "1px solid #334155",
    transition: "all 0.2s ease",
  },

  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },

  title: {
    fontSize: "1.6rem",
    fontWeight: "700",
    color: "#f1f5f9",
    margin: 0,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },

  row: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },

  col: {
    flex: 1,
    minWidth: "150px",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },

  label: {
    fontWeight: "600",
    fontSize: "0.85rem",
    color: "#cbd5e1",
  },

  hint: {
    fontWeight: "400",
    color: "#64748b",
    fontSize: "0.75rem",
  },

  validationHint: {
    fontSize: "0.75rem",
    marginTop: "0.2rem",
    color: "#94a3b8",
  },

  input: {
    padding: "0.75rem 0.95rem",
    border: "1px solid #334155",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    backgroundColor: "#0f172a",
    color: "#f1f5f9",
    transition: "all 0.2s ease",
  },

  button: {
    marginTop: "1.2rem",
    padding: "0.85rem",
    background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  buttonDisabled: {
    marginTop: "1.2rem",
    padding: "0.85rem",
    background: "#334155",
    color: "#94a3b8",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "not-allowed",
  },

  errorBox: {
    background: "#7f1d1d",
    color: "#fee2e2",
    padding: "0.8rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    border: "1px solid #991b1b",
  },

  footer: {
    marginTop: "1.8rem",
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#94a3b8",
  },

  link: {
    color: "#3b82f6",
    fontWeight: "600",
    textDecoration: "none",
  },
};
export default RegisterPage;