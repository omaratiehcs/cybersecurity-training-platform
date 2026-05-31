import { Navigate } from "react-router-dom";
import { getTokenPayload } from "../utils/token";

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={{ message: "Session expired. Please log in again." }}
        replace
      />
    );
  }

  const payload = getTokenPayload(token);

  if (!payload) {
    localStorage.removeItem("token");
    return (
      <Navigate
        to="/login"
        state={{ message: "Session expired. Please log in again." }}
        replace
      />
    );
  }

  if (payload.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
