import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../services/api";

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: "Please login to access dashboard.",
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
