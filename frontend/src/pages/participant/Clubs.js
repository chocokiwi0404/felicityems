import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import ParticipantNavbar from "../../components/ParticipantNavBar";

const API_URL = "http://localhost:5000/api";

const Clubs = () => {
  const { user, loading: authLoading } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(new Set());
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    fetchClubs();
  }, [authLoading]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const [clubsRes, prefsRes] = await Promise.all([
        axios.get(`${API_URL}/organizers`),
        axios.get(`${API_URL}/participants/preferences`).catch(() => ({ data: { preferences: {} } })),
      ]);
      setClubs(clubsRes.data.organizers || []);
      const followed = prefsRes.data.preferences?.followedOrganizers || [];
      setFollowing(new Set(followed.map(o => typeof o === "object" ? o._id : o)));
    } catch {
      setMsg({ type: "err", text: "Failed to load clubs." });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (clubId) => {
    try {
      const isFollowing = following.has(clubId);
      const endpoint = isFollowing ? "unfollow" : "follow";

      await axios.post(`${API_URL}/participants/${endpoint}/${clubId}`);

      const next = new Set(following);
      isFollowing ? next.delete(clubId) : next.add(clubId);
      setFollowing(next);
    } catch {
      setMsg({ type: "err", text: "Action failed. Please try again." });
    }
  };

  return (
    <div style={s.page}>
      <ParticipantNavbar />

      <div style={s.content}>
        <h1 style={s.title}>Clubs & Organizers</h1>
        <p style={s.sub}>Explore and follow campus organizations.</p>

        {msg && (
          <div style={{ ...s.msg, ...(msg.type === "ok" ? s.msgOk : s.msgErr) }}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div style={s.loader}>Loading Clubs...</div>
        ) : clubs.length === 0 ? (
          <div style={s.empty}>No approved clubs available.</div>
        ) : (
          <div style={s.grid}>
            {clubs.map((club) => (
              <div key={club._id} style={s.card}>
                <div>
                  <div style={s.badge}>{club.category || "General"}</div>
                  <h2 style={s.clubName}>{club.organizerName}</h2>
                  <p style={s.clubDesc}>
                    {club.description || "No description provided."}
                  </p>
                </div>

                <button
                  style={{
                    ...s.button,
                    ...(following.has(club._id) ? s.following : {})
                  }}
                  onClick={() => handleFollowToggle(club._id)}
                >
                  {following.has(club._id) ? "✓ Following" : "+ Follow"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "system-ui, sans-serif"
  },

  content: {
    padding: "2.5rem 6%",
  },

  title: {
    fontSize: "2rem",
    fontWeight: 700,
    marginBottom: "0.5rem"
  },

  sub: {
    color: "#94a3b8",
    marginBottom: "2rem"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem"
  },

  card: {
    background: "#1e293b",
    borderRadius: "12px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "220px",
    border: "1px solid #334155"
  },

  badge: {
    background: "#1e3a8a",
    color: "#93c5fd",
    fontSize: "0.7rem",
    padding: "0.3rem 0.7rem",
    borderRadius: "999px",
    marginBottom: "1rem",
    display: "inline-block"
  },

  clubName: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "0.6rem"
  },

  clubDesc: {
    fontSize: "0.9rem",
    color: "#94a3b8",
    marginBottom: "1.5rem"
  },

  button: {
    padding: "0.6rem",
    borderRadius: "8px",
    border: "1px solid #6366f1",
    background: "transparent",
    color: "#818cf8",
    fontWeight: 600,
    cursor: "pointer"
  },

  following: {
    background: "#6366f1",
    color: "#fff"
  },

  loader: {
    padding: "4rem",
    textAlign: "center",
    color: "#94a3b8"
  },

  empty: {
    padding: "4rem",
    textAlign: "center",
    color: "#64748b"
  },

  msg: {
    padding: "0.8rem",
    borderRadius: "8px",
    marginBottom: "1.5rem"
  },

  msgOk: {
    background: "#052e16",
    color: "#4ade80"
  },

  msgErr: {
    background: "#3f1d1d",
    color: "#f87171"
  }
};

export default Clubs;