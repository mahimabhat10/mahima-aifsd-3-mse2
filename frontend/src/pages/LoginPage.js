import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated, loginUser, saveSession } from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const infoMessage = useMemo(() => location.state?.message || "", [location.state]);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      saveSession({ token: data.token, user: data.user });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <p className="eyebrow">Student Grievance Portal</p>
      <h1>Login</h1>
      <p>Sign in to submit, search, update, and track your grievances.</p>

      {infoMessage && <p className="alert success">{infoMessage}</p>}
      {error && <p className="alert error">{error}</p>}

      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={onChange}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            value={formData.password}
            onChange={onChange}
          />
        </label>

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="auth-switch">
        New student? <Link to="/register">Create account</Link>
      </p>
    </div>
  );
}

export default LoginPage;
