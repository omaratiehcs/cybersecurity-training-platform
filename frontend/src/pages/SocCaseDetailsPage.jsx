import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { MAX_ANSWER_LENGTH, normalizeInput } from "../utils/validation";

const LOG_HIGHLIGHT_PATTERN =
  /(failed|success|powershell|psexec|malware|encoded|suspicious|admin|login|source_ip|destination_ip)/gi;
const LOG_HIGHLIGHT_MATCH =
  /^(failed|success|powershell|psexec|malware|encoded|suspicious|admin|login|source_ip|destination_ip)$/i;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const highlightLogText = (text) => {
  return text.split(LOG_HIGHLIGHT_PATTERN).map((part, index) => {
    if (!part) {
      return null;
    }

    if (LOG_HIGHLIGHT_MATCH.test(part)) {
      return (
        <span key={`${part}-${index}`} style={styles.logHighlight}>
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

function SocCaseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [socCase, setSocCase] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState({
    type: "",
    text: "",
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoadError("");

        const response = await fetch(
          `http://localhost:5000/api/soc-cases/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch SOC case");
        }

        setSocCase(data.data);
      } catch (err) {
        setLoadError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submittedAnswer = normalizeInput(answer);

    if (!socCase) return;

    if (socCase.solved) {
      setFeedback({
        type: "success",
        text: "This SOC case is already solved. Resubmission is disabled.",
      });
      return;
    }

    if (!submittedAnswer) {
      setFeedback({
        type: "error",
        text: "Answer is required.",
      });
      return;
    }

    if (submittedAnswer.length > MAX_ANSWER_LENGTH) {
      setFeedback({
        type: "error",
        text: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`,
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback({ type: "", text: "" });

      const response = await fetch(
        `http://localhost:5000/api/soc-cases/${id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answer: submittedAnswer }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Submission failed");
      }

      const isCorrect =
        data?.result?.is_correct === true ||
        data?.data?.is_correct === true ||
        data?.is_correct === true ||
        data?.solved === true;

      const isAlreadySolved =
        typeof data.message === "string" &&
        data.message.toLowerCase().includes("already solved");

      if (isCorrect || isAlreadySolved) {
        setFeedback({
          type: "success",
          text: data.message || "Correct answer!",
        });

        setSocCase((prev) =>
          prev
            ? {
                ...prev,
                solved: true,
              }
            : prev
        );

        setAnswer("");
      } else {
        setFeedback({
          type: "error",
          text: data.message || "Wrong answer. Please try again.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Something went wrong while submitting",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.loading}>Loading SOC case details...</div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div style={styles.errorText}>{loadError}</div>
      </Layout>
    );
  }

  if (!socCase) {
    return (
      <Layout>
        <div style={styles.errorText}>SOC case not found.</div>
      </Layout>
    );
  }

  const summaryText =
    socCase.case_summary ||
    socCase.description ||
    "No summary available.";
  const categoryValue =
    socCase.case_type || socCase.category || socCase.type || null;
  const metadataItems = [
    { label: "Severity", value: socCase.severity },
    { label: "Hostname", value: socCase.hostname },
    { label: "Affected User", value: socCase.affected_user },
    { label: "Source IP", value: socCase.source_ip },
    { label: "Created", value: formatDate(socCase.created_at) },
    categoryValue ? { label: "Category", value: categoryValue } : null,
  ].filter(Boolean);
  const logLines = (socCase.log_source || "No log evidence provided.").split(
    /\r?\n/
  );

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            &lt; Back
          </button>

          <div style={styles.heroCard}>
            <div style={styles.heroTop}>
              <div>
                <p style={styles.badge}>SOC Investigation Lab</p>
                <h1 style={styles.title}>{socCase.title}</h1>
                <p style={styles.summaryText}>{summaryText}</p>
              </div>

              <div style={styles.statusWrap}>
                <span style={styles.pointsBadge}>{socCase.points} pts</span>
                <span style={styles.difficultyBadge}>
                  {socCase.difficulty || "Unrated"}
                </span>
                <span
                  style={socCase.solved ? styles.solvedBadge : styles.unsolvedBadge}
                >
                  {socCase.solved ? "Solved" : "Unsolved"}
                </span>
              </div>
            </div>

            <div style={styles.metaGrid}>
              {metadataItems.map((item) => (
                <div key={item.label} style={styles.metaCard}>
                  <span style={styles.metaLabel}>{item.label}</span>
                  <span style={styles.metaValue}>{item.value || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Investigation Metadata</h2>
            <div style={styles.metadataStack}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Analyst Objective</span>
                <p style={styles.bodyText}>
                  {socCase.analyst_objective || "No analyst objective provided."}
                </p>
              </div>

              {socCase.description && socCase.case_summary && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Description</span>
                  <p style={styles.bodyText}>{socCase.description}</p>
                </div>
              )}
            </div>
          </div>

          <div style={styles.sectionCard}>
            <div style={styles.viewerHeader}>
              <div>
                <h2 style={styles.sectionTitle}>SIEM Log Viewer</h2>
                <p style={styles.viewerSubtitle}>
                  Scroll through the raw investigation logs and identify the key
                  artifact before submitting your answer.
                </p>
              </div>

              <span style={styles.viewerBadge}>{logLines.length} lines</span>
            </div>

            <div style={styles.logViewer}>
              {logLines.map((line, index) => (
                <div key={`${index}-${line}`} style={styles.logLine}>
                  <span style={styles.lineNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span style={styles.lineText}>{highlightLogText(line)}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Submit Your Answer</h2>
            <p style={styles.smallText}>
              {socCase.solved
                ? "This SOC case has already been solved. Resubmission is disabled."
                : "Enter the final answer based on your investigation."}
            </p>

            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                socCase.solved ? "SOC case already solved" : "Enter your answer"
              }
              style={styles.input}
              required={!socCase.solved}
              disabled={socCase.solved || submitting}
              maxLength={MAX_ANSWER_LENGTH}
            />

            <button
              type="submit"
              disabled={socCase.solved || submitting}
              style={
                socCase.solved || submitting
                  ? styles.submitButtonDisabled
                  : styles.submitButton
              }
            >
              {socCase.solved
                ? "Already Solved"
                : submitting
                ? "Submitting..."
                : "Submit Answer"}
            </button>

            {feedback.text && (
              <div
                style={
                  feedback.type === "success"
                    ? styles.successBox
                    : styles.errorBox
                }
              >
                {feedback.text}
              </div>
            )}

            {socCase.solved && (
              <div style={styles.explanationBox}>
                <h3 style={styles.explanationTitle}>Explanation</h3>
                <p style={styles.bodyText}>
                  {socCase.explanation || "Explanation will be added soon."}
                </p>
              </div>
            )}
          </form>
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
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    padding: "32px 20px 40px",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  backButton: {
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    marginBottom: "18px",
    fontWeight: "600",
  },
  heroCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    marginBottom: "24px",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.16)",
    color: "#93c5fd",
    fontSize: "0.85rem",
    fontWeight: "700",
    marginBottom: "14px",
  },
  title: {
    margin: 0,
    fontSize: "2.1rem",
    color: "#ffffff",
  },
  summaryText: {
    marginTop: "14px",
    marginBottom: 0,
    color: "#dbe4f0",
    lineHeight: "1.8",
    maxWidth: "760px",
    whiteSpace: "pre-wrap",
  },
  statusWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  pointsBadge: {
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(99, 102, 241, 0.15)",
    color: "#c7d2fe",
    fontWeight: "700",
    border: "1px solid rgba(99, 102, 241, 0.22)",
    height: "fit-content",
  },
  difficultyBadge: {
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(245, 158, 11, 0.14)",
    color: "#fde68a",
    fontWeight: "700",
    border: "1px solid rgba(245, 158, 11, 0.22)",
    height: "fit-content",
  },
  solvedBadge: {
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(34, 197, 94, 0.14)",
    color: "#bbf7d0",
    fontWeight: "700",
    border: "1px solid rgba(34, 197, 94, 0.22)",
    height: "fit-content",
  },
  unsolvedBadge: {
    padding: "10px 14px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.12)",
    color: "#fecaca",
    fontWeight: "700",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    height: "fit-content",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  metaCard: {
    background: "rgba(2, 6, 23, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  metaLabel: {
    fontSize: "0.9rem",
    color: "#94a3b8",
    fontWeight: "600",
  },
  metaValue: {
    fontSize: "1rem",
    color: "#f8fafc",
    fontWeight: "700",
    wordBreak: "break-word",
  },
  sectionCard: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "12px",
    color: "#ffffff",
    fontSize: "1.25rem",
  },
  metadataStack: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  detailRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  detailLabel: {
    color: "#93c5fd",
    fontSize: "0.9rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  bodyText: {
    color: "#dbe4f0",
    lineHeight: "1.8",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  viewerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  viewerSubtitle: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.7",
    maxWidth: "720px",
  },
  viewerBadge: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.14)",
    color: "#bfdbfe",
    border: "1px solid rgba(59, 130, 246, 0.24)",
    fontWeight: "700",
    fontSize: "0.9rem",
    height: "fit-content",
  },
  logViewer: {
    background: "#020617",
    color: "#dbeafe",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "14px 0",
    maxHeight: "460px",
    overflowY: "auto",
    overflowX: "auto",
    boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.35)",
  },
  logLine: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: "14px",
    padding: "4px 18px",
    alignItems: "start",
  },
  lineNumber: {
    color: "#64748b",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.82rem",
    userSelect: "none",
    textAlign: "right",
    paddingTop: "1px",
  },
  lineText: {
    color: "#dbeafe",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.92rem",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  logHighlight: {
    color: "#fde68a",
    background: "rgba(245, 158, 11, 0.12)",
    borderRadius: "4px",
    padding: "1px 3px",
    fontWeight: "700",
  },
  smallText: {
    color: "#94a3b8",
    marginTop: 0,
    marginBottom: "14px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#f8fafc",
    outline: "none",
    marginBottom: "14px",
    boxSizing: "border-box",
  },
  submitButton: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "700",
    cursor: "pointer",
  },
  submitButtonDisabled: {
    background: "#334155",
    color: "#94a3b8",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "700",
    cursor: "not-allowed",
  },
  successBox: {
    marginTop: "14px",
    background: "rgba(34, 197, 94, 0.15)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#bbf7d0",
    padding: "12px 14px",
    borderRadius: "10px",
  },
  errorBox: {
    marginTop: "14px",
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
  },
  explanationBox: {
    marginTop: "18px",
    background: "rgba(22, 101, 52, 0.12)",
    border: "1px solid rgba(34, 197, 94, 0.22)",
    borderRadius: "14px",
    padding: "16px",
  },
  explanationTitle: {
    margin: "0 0 8px",
    color: "#bbf7d0",
    fontSize: "1rem",
  },
  loading: {
    minHeight: "calc(100vh - 140px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#020617",
    color: "#e2e8f0",
    fontSize: "1.1rem",
  },
  errorText: {
    minHeight: "calc(100vh - 140px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#020617",
    color: "#fecaca",
    fontSize: "1.1rem",
    padding: "20px",
    textAlign: "center",
  },
};

export default SocCaseDetailsPage;
