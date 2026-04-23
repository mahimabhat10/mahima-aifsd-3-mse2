import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Login to continue." },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <p className="eyebrow">Student Grievance Portal</p>
      <h1>Registration</h1>
      <p>Create your account with name, email, and password to access the dashboard.</p>

      {error && <p className="alert error">{error}</p>}

      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Name
          <input
            type="text"
            name="name"
            minLength={2}
            required
            value={formData.name}
            onChange={onChange}
          />
        </label>

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
            minLength={6}
            required
            value={formData.password}
            onChange={onChange}
          />
        </label>

        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="auth-switch">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
