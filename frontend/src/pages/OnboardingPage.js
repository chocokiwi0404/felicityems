import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api";

const INTEREST_OPTIONS = [
  "Technical", "Cultural", "Sports", "Music", "Dance",
  "Photography", "Robotics", "Gaming", "Finance", "Entrepreneurship",
];

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [organizers,        setOrganizers]        = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [followedOrgs,      setFollowedOrgs]      = useState([]);
  const [loading,           setLoading]           = useState(false);

  // Fetch all clubs so user can choose which to follow
  useEffect(() => {
    axios.get(`${API_URL}/organizers`)
      .then(res => setOrganizers(res.data.organizers))
      .catch(() => {}); // non-critical, proceed without clubs
  }, []);

  // Toggle a value in/out of an array
  const toggle = (setter, value) => {
    setter(prev => prev.includes(value)
      ? prev.filter(v => v !== value)
      : [...prev, value]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/participants/preferences`, {
        areasOfInterest:    selectedInterests,
        followedOrganizers: followedOrgs,
      });
    } catch {
      // Preferences save is non-critical — continue even if it fails
    } finally {
      setLoading(false);
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={s.title}>Welcome, {user?.firstName}! 👋</h2>
        <p style={s.sub}>Personalise your experience. You can change these anytime from your Profile.</p>

        <h3 style={s.section}>Areas of Interest</h3>
        <div style={s.chips}>
          {INTEREST_OPTIONS.map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => toggle(setSelectedInterests, interest)}
              style={{ ...s.chip, ...(selectedInterests.includes(interest) ? s.chipOn : {}) }}
            >
              {interest}
            </button>
          ))}
        </div>

        <h3 style={s.section}>Clubs / Organizers to Follow</h3>
        {organizers.length === 0
          ? <p style={s.muted}>No clubs available yet.</p>
          : (
            <div style={s.chips}>
              {organizers.map(org => (
                <button
                  key={org._id}
                  type="button"
                  onClick={() => toggle(setFollowedOrgs, org._id)}
                  style={{ ...s.chip, ...(followedOrgs.includes(org._id) ? s.chipOn : {}) }}
                >
                  {org.organizerName}
                </button>
              ))}
            </div>
          )
        }

        <div style={s.actions}>
          <button style={s.skip} onClick={() => navigate("/dashboard", { replace: true })}>
            Skip 
          </button>
          <button style={s.save} onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

const s = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width:"100vw",
    minHeight: "100vh",
    background: "#0f172a", // dark slate background
    padding: "2rem",
  },

  card: {
    background: "#1e293b", // slate card
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
    width: "100%",
    maxWidth: "560px",
  },

  title: {
    marginBottom: "0.25rem",
    color: "#f1f5f9", // light text
  },

  sub: {
    color: "#94a3b8", // muted slate
    fontSize: "0.9rem",
    marginBottom: "1.5rem",
  },

  section: {
    fontSize: "1rem",
    marginBottom: "0.75rem",
    color: "#e2e8f0",
  },

  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  },

  chip: {
    padding: "0.4rem 1rem",
    borderRadius: "999px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "all 0.2s ease",
  },

  chipOn: {
    background: "#6366f1", // indigo highlight
    color: "#ffffff",
    borderColor: "#6366f1",
  },

  muted: {
    color: "#94a3b8",
    fontSize: "0.875rem",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "1rem",
  },

  skip: {
    padding: "0.6rem 1.2rem",
    border: "1px solid #334155",
    borderRadius: "6px",
    background: "#1e293b",
    color: "#cbd5e1",
    cursor: "pointer",
  },

  save: {
    padding: "0.6rem 1.2rem",
    border: "none",
    borderRadius: "6px",
    background: "#6366f1",
    color: "#ffffff",
    cursor: "pointer",
  },
};

export default OnboardingPage;
