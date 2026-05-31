import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import {
  ALLOWED_DIFFICULTIES,
  MAX_FLAG_LENGTH,
  normalizeInput,
  normalizeOptionalInput,
  isNonNegativeNumber,
} from "../utils/validation";

function AdminChallengePage() {
  const navigate = useNavigate();

  const emptyForm = {
    title: "",
    description: "",
    flag: "",
    points: "",
    difficulty: "",
    category_id: "",
    explanation: "",
  };

  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchChallenges();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const response = await authFetch(
        "http://localhost:5000/api/categories",
        {},
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to fetch categories");
        return;
      }

      setCategories(data.data || []);
    } catch (error) {
      console.error("Fetch categories error:", error);
      setMessage("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchChallenges = async () => {
    try {
      const response = await authFetch(
        "http://localhost:5000/api/challenges/admin",
        {},
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to fetch challenges");
        return;
      }

      setChallenges(data.data || []);
    } catch (error) {
      console.error("Fetch challenges error:", error);
      setMessage("Failed to load challenges");
    } finally {
      setLoadingChallenges(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    const title = normalizeInput(formData.title);
    const description = normalizeInput(formData.description);
    const flag = normalizeInput(formData.flag);
    const difficulty = normalizeInput(formData.difficulty);
    const categoryId = Number(formData.category_id);

    if (!title) {
      return "Title is required";
    }

    if (!description) {
      return "Description is required";
    }

    if (!flag) {
      return "Flag is required";
    }

    if (flag.length > MAX_FLAG_LENGTH) {
      return `Flag must be ${MAX_FLAG_LENGTH} characters or fewer`;
    }

    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return "Difficulty must be Easy, Medium, or Hard";
    }

    if (!isNonNegativeNumber(formData.points)) {
      return "Points must be a non-negative number";
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return "Select a valid category";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);
    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const url = editingId
      ? `http://localhost:5000/api/challenges/admin/${editingId}`
      : "http://localhost:5000/api/challenges/admin";

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await authFetch(
        url,
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: normalizeInput(formData.title),
            description: normalizeInput(formData.description),
            flag: normalizeInput(formData.flag),
            points: Number(formData.points),
            difficulty: normalizeInput(formData.difficulty),
            category_id: Number(formData.category_id),
            explanation: normalizeOptionalInput(formData.explanation),
          }),
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            data.message ||
            (editingId ? "Failed to update challenge" : "Failed to create challenge")
        );
        return;
      }

      setIsSuccess(true);
      setMessage(
        data.message ||
          (editingId
            ? "Challenge updated successfully"
            : "Challenge created successfully")
      );

      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error("Save challenge error:", error);
      setMessage("Server error");
    }
  };

  const handleEdit = (challenge) => {
    setEditingId(challenge.challenge_id);
    setFormData({
      title: challenge.title || "",
      description: challenge.description || "",
      flag: challenge.flag || "",
      points: challenge.points || "",
      difficulty: challenge.difficulty || "",
      category_id: challenge.category_id || "",
      explanation: challenge.explanation || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Delete this challenge? Related submissions for this challenge will also be removed."
    );

    if (!confirmed) return;

    setMessage("");
    setIsSuccess(false);

    try {
      const response = await authFetch(
        `http://localhost:5000/api/challenges/admin/${id}`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.message || "Failed to delete challenge");
        return;
      }

      setIsSuccess(true);
      setMessage(data.message || "Challenge deleted successfully");

      if (editingId === id) {
        resetForm();
      }

      setChallenges((prev) =>
        prev.filter((challenge) => challenge.challenge_id !== id)
      );
    } catch (error) {
      console.error("Delete challenge error:", error);
      setMessage("Server error");
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(
      (cat) => Number(cat.category_id) === Number(categoryId)
    );
    return category ? category.name : `Category ${categoryId}`;
  };

  return (
    <Layout>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              {editingId ? "Edit Challenge" : "Manage Challenges"}
            </h1>
            <p style={styles.subtitle}>
              Create, update, and delete CTF challenges from one place
            </p>
          </div>

        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter challenge title"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Enter challenge description"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Flag</label>
              <input
                type="text"
                name="flag"
                value={formData.flag}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter correct flag"
                maxLength={MAX_FLAG_LENGTH}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Explanation</label>
              <textarea
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Explain why the flag is correct"
              />
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Points</label>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="100"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Difficulty</label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="">Select difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={loadingCategories}
                >
                  <option value="">
                    {loadingCategories ? "Loading categories..." : "Select category"}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.category_id}
                      value={category.category_id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <p
                style={{
                  ...styles.message,
                  backgroundColor: isSuccess ? "#dcfce7" : "#fee2e2",
                  color: isSuccess ? "#166534" : "#991b1b",
                  border: isSuccess
                    ? "1px solid #bbf7d0"
                    : "1px solid #fecaca",
                }}
              >
                {message}
              </p>
            )}

            <div style={styles.buttonRow}>
              <button type="submit" style={styles.button}>
                {editingId ? "Update Challenge" : "Create Challenge"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelButton}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={styles.listSection}>
          <h2 style={styles.sectionTitle}>Existing Challenges</h2>

          {loadingChallenges ? (
            <p style={styles.infoText}>Loading challenges...</p>
          ) : challenges.length === 0 ? (
            <p style={styles.infoText}>No challenges found.</p>
          ) : (
            <div style={styles.challengeGrid}>
              {challenges.map((challenge) => (
                <div key={challenge.challenge_id} style={styles.challengeCard}>
                  <div style={styles.challengeTop}>
                    <h3 style={styles.challengeTitle}>{challenge.title}</h3>
                    <span style={styles.difficultyBadge}>
                      {challenge.difficulty}
                    </span>
                  </div>

                  <p style={styles.challengeDescription}>
                    {challenge.description}
                  </p>

                  <div style={styles.challengeMeta}>
                    <span>{challenge.points} pts</span>
                    <span>{getCategoryName(challenge.category_id)}</span>
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      onClick={() => handleEdit(challenge)}
                      style={styles.editButton}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(challenge.challenge_id)}
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    margin: "-20px",
    padding: "32px 20px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  header: {
    maxWidth: "1200px",
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    color: "#ffffff",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
  },
  card: {
    maxWidth: "1200px",
    margin: "0 auto 28px",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    marginBottom: "16px",
  },
  label: {
    fontWeight: "600",
    color: "#e2e8f0",
  },
  input: {
    padding: "12px 14px",
    border: "1px solid #334155",
    borderRadius: "10px",
    fontSize: "15px",
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
  },
  textarea: {
    padding: "12px 14px",
    border: "1px solid #334155",
    borderRadius: "10px",
    fontSize: "15px",
    resize: "vertical",
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },
  message: {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  button: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "15px",
  },
  cancelButton: {
    background: "transparent",
    color: "#e2e8f0",
    border: "1px solid #475569",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
  },
  listSection: {
    maxWidth: "1200px",
    margin: "0 auto 40px",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "1.25rem",
    color: "#ffffff",
  },
  infoText: {
    color: "#cbd5e1",
    fontSize: "16px",
  },
  challengeGrid: {
    display: "grid",
    gap: "16px",
  },
  challengeCard: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  challengeTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  challengeTitle: {
    margin: 0,
    fontSize: "1.15rem",
    color: "#ffffff",
  },
  difficultyBadge: {
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fde68a",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(245, 158, 11, 0.22)",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  challengeDescription: {
    margin: 0,
    color: "#e2e8f0",
    lineHeight: "1.6",
  },
  challengeMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: "14px",
    gap: "12px",
    flexWrap: "wrap",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "auto",
  },
  editButton: {
    backgroundColor: "#1d4ed8",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default AdminChallengePage;
