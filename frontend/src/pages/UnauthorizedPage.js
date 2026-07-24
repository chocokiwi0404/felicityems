import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_REDIRECT = {
  participant: "/dashboard",
  organizer:   "/organizer/dashboard",
  admin:       "/admin/dashboard",
};

const UnauthorizedPage = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const goHome = () => navigate(ROLE_REDIRECT[user?.role] || "/login", { replace: true });

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.code}>403</h1>
        <h2 style={s.title}>Access Denied</h2>
        <p style={s.message}>You do not have permission to view this page.</p>
        <button style={s.button} onClick={goHome}>
          Go to my Dashboard
        </button>
      </div>
    </div>
  );
};

const s = {
  page:    { display:"flex", justifyContent:"center", alignItems:"center", width:"100vw", minHeight:"100vh", background:"#f3f4f6" },
  card:    { background:"#fff", padding:"3rem", borderRadius:"8px", boxShadow:"0 2px 12px rgba(0,0,0,0.1)", textAlign:"center", maxWidth:"400px", width:"100%" },
  code:    { fontSize:"4rem", color:"#4f46e5", margin:0 },
  title:   { marginTop:"0.5rem" },
  message: { color:"#6b7280", marginBottom:"1.5rem" },
  button:  { padding:"0.75rem 1.5rem", background:"#4f46e5", color:"#fff", border:"none", borderRadius:"4px", fontSize:"1rem", cursor:"pointer" },
};

export default UnauthorizedPage;
