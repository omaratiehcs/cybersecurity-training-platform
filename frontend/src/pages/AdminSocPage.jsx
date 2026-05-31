import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  ALLOWED_DIFFICULTIES,
  MAX_ANSWER_LENGTH,
  normalizeInput,
  normalizeOptionalInput,
  isNonNegativeNumber,
} from "../utils/validation";
const API_BASE_URL = "http://localhost:5000/api/soc-cases/admin";

const initialForm = {
  title: "",
  description: "",
  case_summary: "",
  severity: "",
  hostname: "",
  affected_user: "",
  source_ip: "",
  analyst_objective: "",
  log_source: "",
  correct_answer: "",
  points: "",
  difficulty: "Easy",
  explanation: "",   
};

function AdminSocPage() {
  const [socCases, setSocCases] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  const fetchSocCases = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_BASE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch SOC cases");
      }

      setSocCases(data.data || []);
    } catch (err) {
      setError(err.message || "Something went wrong while fetching SOC cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocCases();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const validateForm = () => {
    const correctAnswer = normalizeInput(formData.correct_answer);

    if (!normalizeInput(formData.title)) {
      return "Title is required";
    }

    if (!normalizeInput(formData.description)) {
      return "Description is required";
    }

    if (!correctAnswer) {
      return "Correct answer is required";
    }

    if (correctAnswer.length > MAX_ANSWER_LENGTH) {
      return `Correct answer must be ${MAX_ANSWER_LENGTH} characters or fewer`;
    }

    if (!isNonNegativeNumber(formData.points)) {
      return "Points must be a non-negative number";
    }

    if (!ALLOWED_DIFFICULTIES.includes(normalizeInput(formData.difficulty))) {
      return "Difficulty must be Easy, Medium, or Hard";
    }

    return "";
  };

  const handleEdit = (socCase) => {
    setEditingId(socCase.soc_case_id);
    setMessage("");
    setError("");

    setFormData({
  title: socCase.title || "",
  description: socCase.description || "",
  case_summary: socCase.case_summary || "",
  severity: socCase.severity || "",
  hostname: socCase.hostname || "",
  affected_user: socCase.affected_user || "",
  source_ip: socCase.source_ip || "",
  analyst_objective: socCase.analyst_objective || "",
  log_source: socCase.log_source || "",
  correct_answer: socCase.correct_answer || "",
  points: socCase.points?.toString() || "",
  difficulty: socCase.difficulty || "Easy",
  explanation: socCase.explanation || "",   
});

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this SOC case? Related submissions for this case will also be removed."
    );

    if (!confirmDelete) return;

    try {
      setMessage("");
      setError("");

      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete SOC case");
      }

      setMessage(data.message || "SOC case deleted successfully.");
      if (editingId === id) {
        resetForm();
      }

      fetchSocCases();
    } catch (err) {
      setError(err.message || "Failed to delete SOC case.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setMessage("");
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      const payload = {
        title: normalizeInput(formData.title),
        description: normalizeInput(formData.description),
        case_summary: normalizeOptionalInput(formData.case_summary),
        severity: normalizeOptionalInput(formData.severity),
        hostname: normalizeOptionalInput(formData.hostname),
        affected_user: normalizeOptionalInput(formData.affected_user),
        source_ip: normalizeOptionalInput(formData.source_ip),
        analyst_objective: normalizeOptionalInput(formData.analyst_objective),
        log_source: normalizeOptionalInput(formData.log_source),
        correct_answer: normalizeInput(formData.correct_answer),
        points: Number(formData.points),
        difficulty: normalizeInput(formData.difficulty),
        explanation: normalizeOptionalInput(formData.explanation),
      };

      const url = editingId ? `${API_BASE_URL}/${editingId}` : API_BASE_URL;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save SOC case");
      }

      setMessage(
        editingId
          ? "SOC case updated successfully"
          : "SOC case created successfully"
      );

      resetForm();
      fetchSocCases();
    } catch (err) {
      setError(err.message || "Something went wrong while saving SOC case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <Layout>
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Manage SOC Cases</h1>
        <p style={styles.subtitle}>
          Create, edit, and delete SOC investigation labs.
        </p>

        {message && <div style={styles.successBox}>{message}</div>}
        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {editingId ? "Edit SOC Case" : "Create New SOC Case"}
          </h2>

          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Severity</label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                required
                style={styles.input}
              >
                <option value="">Select severity</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Hostname</label>
              <input
                type="text"
                name="hostname"
                value={formData.hostname}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Affected User</label>
              <input
                type="text"
                name="affected_user"
                value={formData.affected_user}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Source IP</label>
              <input
                type="text"
                name="source_ip"
                value={formData.source_ip}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Points</label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                required
                min="0"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                required
                style={styles.input}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Short Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="3"
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Case Summary</label>
            <textarea
              name="case_summary"
              value={formData.case_summary}
              onChange={handleChange}
              required
              rows="4"
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Analyst Objective</label>
            <textarea
              name="analyst_objective"
              value={formData.analyst_objective}
              onChange={handleChange}
              required
              rows="3"
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Log Evidence</label>
            <textarea
              name="log_source"
              value={formData.log_source}
              onChange={handleChange}
              required
              rows="8"
              style={styles.codeArea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Correct Answer</label>
            <input
              type="text"
              name="correct_answer"
              value={formData.correct_answer}
              onChange={handleChange}
              required
              style={styles.input}
              maxLength={MAX_ANSWER_LENGTH}
            />
          </div>
<div style={styles.field}>
  <label style={styles.label}>Explanation</label>
  <textarea
    name="explanation"
    value={formData.explanation}
    onChange={handleChange}
    rows="4"
    style={styles.textarea}
    placeholder="Explain why the answer is correct"
  />
</div>
          <div style={styles.buttonRow}>
            <button type="submit" disabled={submitting} style={styles.primaryBtn}>
              {submitting
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                ? "Update SOC Case"
                : "Create SOC Case"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={styles.secondaryBtn}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <div style={styles.listSection}>
          <h2 style={styles.sectionTitle}>Existing SOC Cases</h2>

          {loading ? (
            <p style={styles.infoText}>Loading SOC cases...</p>
          ) : socCases.length === 0 ? (
            <p style={styles.infoText}>No SOC cases found.</p>
          ) : (
            <div style={styles.cardList}>
              {socCases.map((socCase) => (
                <div key={socCase.soc_case_id} style={styles.caseCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.caseTitle}>{socCase.title}</h3>
                      <p style={styles.caseMeta}>
                        {socCase.difficulty} • {socCase.points} pts •{" "}
                        {socCase.severity || "No severity"}
                      </p>
                    </div>
                    <div style={styles.cardActions}>
                      <button
                        onClick={() => handleEdit(socCase)}
                        style={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(socCase.soc_case_id)}
                        style={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p style={styles.cardText}>
                    <strong>Host:</strong> {socCase.hostname || "-"}
                  </p>
                  <p style={styles.cardText}>
                    <strong>User:</strong> {socCase.affected_user || "-"}
                  </p>
                  <p style={styles.cardText}>
                    <strong>Source IP:</strong> {socCase.source_ip || "-"}
                  </p>
                  <p style={styles.cardText}>
                    <strong>Summary:</strong> {socCase.case_summary || "-"}
                  </p>
                  <p style={styles.cardText}>
                    <strong>Objective:</strong> {socCase.analyst_objective || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
  </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    background:
      "linear-gradient(135deg, #0f172a 0%, #111827 45%, #1e293b 100%)",
    padding: "32px 20px 40px",
    paddingTop: "96px",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "8px",
    color: "#ffffff",
  },
  subtitle: {
    color: "#cbd5e1",
    marginBottom: "24px",
  },
  formCard: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    marginBottom: "18px",
    color: "#ffffff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "16px",
  },
  label: {
    marginBottom: "8px",
    fontWeight: "600",
    color: "#e2e8f0",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    resize: "vertical",
    outline: "none",
  },
  codeArea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#dbeafe",
    resize: "vertical",
    outline: "none",
    fontFamily: "monospace",
    fontSize: "0.95rem",
    lineHeight: "1.5",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: "700",
  },
  secondaryBtn: {
    background: "transparent",
    color: "#e2e8f0",
    border: "1px solid #475569",
    borderRadius: "10px",
    padding: "12px 18px",
    cursor: "pointer",
    fontWeight: "600",
  },
  successBox: {
    background: "rgba(34, 197, 94, 0.15)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#bbf7d0",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  listSection: {
    marginTop: "10px",
  },
  infoText: {
    color: "#cbd5e1",
  },
  cardList: {
    display: "grid",
    gap: "16px",
  },
  caseCard: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "16px",
    padding: "20px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  caseTitle: {
    margin: 0,
    fontSize: "1.15rem",
    color: "#ffffff",
  },
  caseMeta: {
    marginTop: "6px",
    color: "#94a3b8",
  },
  cardActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  editBtn: {
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  deleteBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cardText: {
    margin: "8px 0",
    color: "#e2e8f0",
    lineHeight: "1.6",
  },
};

export default AdminSocPage;
