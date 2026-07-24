import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Still verifying the token with the server — show spinner, not a redirect.
  // Without this check, the app would flash to /login on every page refresh
  // before the session check completes.
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: "5rem" }}>
        <p>Loading…</p>
      </div>
    );
  }

  // No logged-in user — send to login page
  // replace={true} prevents the protected page from appearing in browser history
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is logged in but their role is not in the allowed list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed — render the actual page
  return children;
};

export default ProtectedRoute;
