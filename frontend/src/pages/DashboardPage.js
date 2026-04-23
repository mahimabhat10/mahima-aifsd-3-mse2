import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearSession,
  createGrievance,
  fetchGrievances,
  getStoredUser,
  logoutUser,
  removeGrievance,
  searchGrievances,
  updateGrievance,
} from "../services/api";

const CATEGORIES = ["Academic", "Hostel", "Transport", "Other"];
const STATUSES = ["Pending", "Resolved"];

const getId = (value) => value?.id || value?._id || "";

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
};

function DashboardPage() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser());
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [grievanceForm, setGrievanceForm] = useState({
    title: "",
    description: "",
    category: "Academic",
    date: "",
    status: "Pending",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "Academic",
    date: "",
    status: "Pending",
  });

  const exitToLogin = (message) => {
    clearSession();
    navigate("/login", { replace: true, state: { message } });
  };

  const handleError = (err, fallback) => {
    if (err.status === 401) {
      exitToLogin("Unauthorized access. Please login again.");
      return;
    }
    setError(err.message || fallback);
  };

  const resetCreateForm = () => {
    setGrievanceForm({
      title: "",
      description: "",
      category: "Academic",
      date: "",
      status: "Pending",
    });
  };

  const loadGrievances = async (successMessage = "") => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchGrievances();
      setGrievances(data.grievances || []);
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (err) {
      handleError(err, "Failed to load grievances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrievances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreateSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    setError("");

    try {
      const payload = {
        title: grievanceForm.title.trim(),
        description: grievanceForm.description.trim(),
        category: grievanceForm.category,
        status: grievanceForm.status,
      };

      if (grievanceForm.date) {
        payload.date = new Date(grievanceForm.date).toISOString();
      }

      await createGrievance(payload);
      resetCreateForm();
      await loadGrievances("Grievance submitted successfully.");
    } catch (err) {
      handleError(err, "Failed to submit grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSearchSubmit = async (event) => {
    event.preventDefault();
    setSearching(true);
    setNotice("");
    setError("");

    try {
      const title = searchTitle.trim();
      if (!title) {
        await loadGrievances("Showing all grievances.");
        return;
      }

      const data = await searchGrievances(title);
      setGrievances(data.grievances || []);
      setNotice(`Found ${data.count || 0} grievance(s) matching "${title}".`);
    } catch (err) {
      handleError(err, "Failed to search grievances.");
    } finally {
      setSearching(false);
    }
  };

  const onClearSearch = async () => {
    setSearchTitle("");
    setNotice("");
    setError("");
    await loadGrievances();
  };

  const startEditing = (grievance) => {
    setEditingId(getId(grievance));
    setEditForm({
      title: grievance.title || "",
      description: grievance.description || "",
      category: grievance.category || "Academic",
      date: toInputDate(grievance.date),
      status: grievance.status || "Pending",
    });
    setNotice("");
    setError("");
  };

  const cancelEditing = () => {
    setEditingId("");
    setEditForm({
      title: "",
      description: "",
      category: "Academic",
      date: "",
      status: "Pending",
    });
  };

  const onUpdateGrievance = async (grievanceId) => {
    setSavingEdit(true);
    setNotice("");
    setError("");

    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        status: editForm.status,
      };

      if (editForm.date) {
        payload.date = new Date(editForm.date).toISOString();
      }

      const data = await updateGrievance(grievanceId, payload);
      setGrievances((prev) =>
        prev.map((grievance) => (getId(grievance) === grievanceId ? data.grievance : grievance))
      );
      setNotice("Grievance updated successfully.");
      cancelEditing();
    } catch (err) {
      handleError(err, "Failed to update grievance.");
    } finally {
      setSavingEdit(false);
    }
  };

  const onDeleteGrievance = async (grievanceId) => {
    if (!window.confirm("Delete this grievance permanently?")) return;

    setNotice("");
    setError("");

    try {
      await removeGrievance(grievanceId);
      setGrievances((prev) => prev.filter((grievance) => getId(grievance) !== grievanceId));
      setNotice("Grievance deleted successfully.");
      if (editingId === grievanceId) {
        cancelEditing();
      }
    } catch (err) {
      handleError(err, "Failed to delete grievance.");
    }
  };

  const onLogout = async () => {
    try {
      await logoutUser();
    } catch (_) {
      // Keep logout dependable even if the API responds unexpectedly.
    } finally {
      exitToLogin("Logged out successfully.");
    }
  };

  if (loading) {
    return <p className="status-text">Loading your grievance dashboard...</p>;
  }

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Student Grievance Management System</p>
          <h1>Dashboard</h1>
          <p className="hero-copy">
            Welcome back, {user?.name || "Student"}. Submit concerns, search older complaints,
            and track resolution progress from one place.
          </p>
        </div>
        <div className="hero-side">
          <div className="identity-card">
            <span>Signed in as</span>
            <strong>{user?.name || "Student"}</strong>
            <small>{user?.email || "No email"}</small>
          </div>
          <button type="button" className="btn danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>

      {notice && <p className="alert success">{notice}</p>}
      {error && <p className="alert error">{error}</p>}

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="section-tag">Create</p>
            <h2>Submit Grievance</h2>
          </div>
        </div>

        <form onSubmit={onCreateSubmit} className="form-grid">
          <div className="two-col">
            <label>
              Title
              <input
                type="text"
                required
                minLength={3}
                value={grievanceForm.title}
                onChange={(event) =>
                  setGrievanceForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </label>

            <label>
              Category
              <select
                value={grievanceForm.category}
                onChange={(event) =>
                  setGrievanceForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea
              required
              rows={4}
              value={grievanceForm.description}
              onChange={(event) =>
                setGrievanceForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>

          <div className="two-col">
            <label>
              Date
              <input
                type="date"
                value={grievanceForm.date}
                onChange={(event) =>
                  setGrievanceForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>

            <label>
              Status
              <select
                value={grievanceForm.status}
                onChange={(event) =>
                  setGrievanceForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Grievance"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="section-tag">Search</p>
            <h2>Find Grievances</h2>
          </div>
        </div>

        <form onSubmit={onSearchSubmit} className="search-bar">
          <label className="search-input">
            Search by Title
            <input
              type="text"
              value={searchTitle}
              onChange={(event) => setSearchTitle(event.target.value)}
              placeholder="Library, hostel, transport..."
            />
          </label>

          <div className="inline-actions">
            <button type="submit" className="btn primary" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
            <button type="button" className="btn secondary" onClick={onClearSearch}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <p className="section-tag">Manage</p>
            <h2>Your Grievances</h2>
          </div>
          <span className="count-pill">{grievances.length} total</span>
        </div>

        {!grievances.length ? (
          <p className="subtle-text">No grievances found yet. Submit your first complaint above.</p>
        ) : (
          <div className="items-grid">
            {grievances.map((grievance) => {
              const grievanceId = getId(grievance);
              const editing = editingId === grievanceId;
              const isResolved = grievance.status === "Resolved";

              return (
                <article key={grievanceId} className="item-card grievance-card">
                  {editing ? (
                    <div className="form-grid">
                      <div className="two-col">
                        <label>
                          Title
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, title: event.target.value }))
                            }
                          />
                        </label>

                        <label>
                          Category
                          <select
                            value={editForm.category}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, category: event.target.value }))
                            }
                          >
                            {CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label>
                        Description
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                      </label>

                      <div className="two-col">
                        <label>
                          Date
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, date: event.target.value }))
                            }
                          />
                        </label>

                        <label>
                          Status
                          <select
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((prev) => ({ ...prev, status: event.target.value }))
                            }
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="inline-actions">
                        <button
                          type="button"
                          className="btn primary"
                          disabled={savingEdit}
                          onClick={() => onUpdateGrievance(grievanceId)}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="btn secondary" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="item-head">
                        <div>
                          <h3>{grievance.title}</h3>
                          <p className="card-subtitle">{grievance.category}</p>
                        </div>
                        <span className={`badge ${isResolved ? "resolved" : "pending"}`}>
                          {grievance.status}
                        </span>
                      </div>

                      <p className="item-desc">{grievance.description}</p>

                      <div className="item-meta">
                        <span>Date: {formatDate(grievance.date)}</span>
                        <span>
                          Student: {grievance.student?.name || user?.name || "Unknown"} (
                          {grievance.student?.email || user?.email || "No email"})
                        </span>
                      </div>

                      <div className="inline-actions">
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => startEditing(grievance)}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => onDeleteGrievance(grievanceId)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
