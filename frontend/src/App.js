import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { isAuthenticated } from "./services/api";

function HomeRedirect() {
  return <Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <div className="app-shell">
      <div className="decor" />
      <main className="main-wrap">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
