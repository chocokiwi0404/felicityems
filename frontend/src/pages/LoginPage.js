
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_REDIRECT = {
  participant: "/participant/dashboard",
  organizer:   "/organizer/dashboard",
  admin:       "/admin/dashboard",
};

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // Safe redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(ROLE_REDIRECT[user.role] || "/participant/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await login(formData.email, formData.password);

      // Onboarding support
      const target = loggedInUser.isNewUser
        ? "/onboarding"
        : ROLE_REDIRECT[loggedInUser.role] || "/participant/dashboard";

      navigate(target, { replace: true });

    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={s.title}>Felicity - Sign In</h2>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <button style={s.button} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={s.footer}>
          New participant? <Link style={s.link} to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

const s = {
  page: {
    display: "flex",
    justifyContent: "center",
    width: "100vw",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0f172a"
  },

  card: {
    background: "#1e293b",
    padding: "2.5rem",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "400px",
    color: "#e2e8f0",
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)"
  },

  title: {
    marginBottom: "1.5rem",
    textAlign: "center"
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem"
  },

  label: {
    fontWeight: 600,
    fontSize: "0.875rem"
  },

  input: {
    padding: "0.7rem 0.9rem",
    border: "1px solid #334155",
    borderRadius: "6px",
    fontSize: "1rem",
    background: "#0f172a",
    color: "#fff"
  },

  button: {
    marginTop: "0.8rem",
    padding: "0.75rem",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "bold"
  },

  error: {
    color: "#fecaca",
    background: "#7f1d1d",
    padding: "0.6rem 0.75rem",
    borderRadius: "6px",
    marginBottom: "0.75rem",
    fontSize: "0.875rem"
  },

  footer: {
    marginTop: "1.2rem",
    textAlign: "center",
    fontSize: "0.875rem"
  },

  link: {
    color: "#818cf8",
    textDecoration: "none",
    fontWeight: "500"
  }
};

export default LoginPage;