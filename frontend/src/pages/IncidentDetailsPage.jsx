import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { MAX_ANSWER_LENGTH, normalizeInput } from "../utils/validation";

function IncidentDetailsPage() {
  const { id } = useParams();

  const [incident, setIncident] = useState(null);
  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState({
    total_steps: 0,
    solved_steps: 0,
    completed: false,
  });
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState({
    type: "",
    text: "",
  });
  const [stepAnswers, setStepAnswers] = useState({});
  const [stepFeedback, setStepFeedback] = useState({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingStepId, setSubmittingStepId] = useState(null);

  const token = localStorage.getItem("token");
  const hasSteps = steps.length > 0;
  const incidentSolved = hasSteps ? progress.completed : incident?.solved;

  const fetchIncident = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setLoadError("");

      if (!token) {
        setLoadError("You must be logged in.");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/incidents/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to fetch incident");
      }

      const incidentData = data?.data?.incident || data?.data || null;
      const stepData = Array.isArray(data?.data?.steps) ? data.data.steps : [];
      const progressData = data?.data?.progress || {
        total_steps: stepData.length,
        solved_steps: stepData.filter((step) => step.solved).length,
        completed: incidentData?.solved === true,
      };

      setIncident(incidentData);
      setSteps(stepData);
      setProgress(progressData);
    } catch (err) {
      setLoadError(err.message || "Something went wrong");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id, token]);

  const handleLegacySubmit = async (e) => {
    e.preventDefault();
    const submittedAnswer = normalizeInput(answer);

    if (!incident) return;

    if (incident.solved) {
      setFeedback({
        type: "success",
        text: "This incident is already solved. Resubmission is disabled.",
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
        `http://localhost:5000/api/incidents/${id}/submit`,
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
        throw new Error(data.error || data.message || "Failed to submit answer");
      }

      const isCorrect =
        data?.result?.is_correct === true ||
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

        setIncident((prev) =>
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

  const handleStepAnswerChange = (stepId, value) => {
    setStepAnswers((prev) => ({
      ...prev,
      [stepId]: value,
    }));
  };

  const handleStepSubmit = async (e, step) => {
    e.preventDefault();

    const stepId = step.incident_step_id;
    const submittedAnswer = normalizeInput(stepAnswers[stepId] || "");

    if (!submittedAnswer) {
      setStepFeedback((prev) => ({
        ...prev,
        [stepId]: {
          type: "error",
          text: "Answer is required.",
        },
      }));
      return;
    }

    if (submittedAnswer.length > MAX_ANSWER_LENGTH) {
      setStepFeedback((prev) => ({
        ...prev,
        [stepId]: {
          type: "error",
          text: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.`,
        },
      }));
      return;
    }

    try {
      setSubmittingStepId(stepId);
      setStepFeedback((prev) => ({
        ...prev,
        [stepId]: {
          type: "",
          text: "",
        },
      }));

      const response = await fetch(
        `http://localhost:5000/api/incidents/steps/${stepId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answer: submittedAnswer,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to submit step");
      }

      const isCorrect = data.correct === true;

      setStepFeedback((prev) => ({
        ...prev,
        [stepId]: {
          type: isCorrect ? "success" : "error",
          text: data.message || (isCorrect ? "Correct answer!" : "Incorrect answer"),
        },
      }));

      if (isCorrect) {
        setStepAnswers((prev) => ({
          ...prev,
          [stepId]: "",
        }));

        await fetchIncident(false);
      }
    } catch (err) {
      setStepFeedback((prev) => ({
        ...prev,
        [stepId]: {
          type: "error",
          text: err.message || "Something went wrong while submitting",
        },
      }));
    } finally {
      setSubmittingStepId(null);
    }
  };

  const renderStepOptionLabel = (option, index) => {
    if (typeof option === "string") {
      return option;
    }

    return (
      option?.label ||
      option?.text ||
      option?.value ||
      `Option ${index + 1}`
    );
  };

  const renderStepOptionValue = (option, index) => {
    if (typeof option === "string") {
      return option;
    }

    return (
      option?.value ||
      option?.answer ||
      option?.label ||
      option?.text ||
      `Option ${index + 1}`
    );
  };

  if (loading) {
    return (
      <Layout>
        <div style={styles.centeredState}>Loading incident details...</div>
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

  if (!incident) {
    return (
      <Layout>
        <div style={styles.errorText}>Incident not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroCard}>
            <div style={styles.heroTop}>
              <div>
                <p style={styles.badge}>Incident Response Lab</p>
                <h1 style={styles.title}>{incident.title}</h1>
                <p style={styles.subtitle}>
                  {hasSteps
                    ? "Review the scenario, work through each investigation step, and submit answers as you progress."
                    : "Review the scenario, analyze the evidence, and determine the correct answer."}
                </p>
              </div>

              <div style={styles.statusWrap}>
                <span style={styles.pointsBadge}>{incident.points} pts</span>
                <span style={styles.difficultyBadge}>
                  {incident.difficulty || "Unrated"}
                </span>
                <span
                  style={
                    incidentSolved ? styles.solvedBadge : styles.unsolvedBadge
                  }
                >
                  {incidentSolved ? "Solved" : "Unsolved"}
                </span>
              </div>
            </div>

            <div style={styles.metaGrid}>
              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Severity</span>
                <span style={styles.metaValue}>{incident.severity || "-"}</span>
              </div>

              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Hostname</span>
                <span style={styles.metaValue}>{incident.hostname || "-"}</span>
              </div>

              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Affected User</span>
                <span style={styles.metaValue}>
                  {incident.affected_user || "-"}
                </span>
              </div>

              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Source IP</span>
                <span style={styles.metaValue}>{incident.source_ip || "-"}</span>
              </div>
            </div>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Case Summary</h2>
            <p style={styles.bodyText}>
              {incident.case_summary ||
                incident.description ||
                "No summary available."}
            </p>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Analyst Objective</h2>
            <p style={styles.bodyText}>
              {incident.analyst_objective || "No analyst objective provided."}
            </p>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Evidence / Timeline</h2>
            <pre style={styles.evidenceBox}>
              {incident.evidence_file || "No evidence provided."}
            </pre>
          </div>

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Progress</h2>
            <div style={styles.progressGrid}>
              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Total Steps</span>
                <span style={styles.metaValue}>{progress.total_steps || 0}</span>
              </div>

              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Solved Steps</span>
                <span style={styles.metaValue}>{progress.solved_steps || 0}</span>
              </div>

              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Status</span>
                <span style={styles.metaValue}>
                  {progress.completed ? "Completed" : "Not Completed"}
                </span>
              </div>
            </div>
          </div>

          {hasSteps ? (
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Investigation Steps</h2>

              <div style={styles.stepsWrap}>
                {steps.map((step) => {
                  const stepId = step.incident_step_id;
                  const currentFeedback = stepFeedback[stepId];
                  const currentAnswer = stepAnswers[stepId] || "";
                  const isSubmittingStep = submittingStepId === stepId;

                  return (
                    <div
                      key={stepId}
                      style={
                        step.solved
                          ? styles.stepCardSolved
                          : step.unlocked
                          ? styles.stepCard
                          : styles.stepCardLocked
                      }
                    >
                      <div style={styles.stepHeader}>
                        <div>
                          <p style={styles.stepNumber}>Step {step.step_number}</p>
                          <h3 style={styles.stepTitle}>
                            {step.title || `Step ${step.step_number}`}
                          </h3>
                        </div>

                        <div style={styles.stepStatusWrap}>
                          <span style={styles.stepPointsBadge}>
                            {step.points} pts
                          </span>
                          <span
                            style={
                              step.solved
                                ? styles.stepSolvedBadge
                                : step.unlocked
                                ? styles.stepUnlockedBadge
                                : styles.stepLockedBadge
                            }
                          >
                            {step.solved
                              ? "Solved"
                              : step.unlocked
                              ? "Unlocked"
                              : "Locked"}
                          </span>
                        </div>
                      </div>

                      <p style={styles.bodyText}>
                        {step.question || "No question provided."}
                      </p>

                      {Array.isArray(step.options) && step.options.length > 0 && (
                        <div style={styles.optionList}>
                          {step.options.map((option, index) => {
                            const optionLabel = renderStepOptionLabel(option, index);
                            const optionValue = renderStepOptionValue(option, index);

                            return (
                              <button
                                key={`${stepId}-${index}`}
                                type="button"
                                style={
                                  currentAnswer === optionValue
                                    ? {
                                        ...styles.optionButton,
                                        ...styles.optionButtonSelected,
                                      }
                                    : styles.optionButton
                                }
                                onClick={() =>
                                  handleStepAnswerChange(stepId, optionValue)
                                }
                                disabled={!step.unlocked || step.solved}
                              >
                                {optionLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {step.solved ? (
                        <div style={styles.explanationBox}>
                          <h4 style={styles.explanationTitle}>Explanation</h4>
                          <p style={styles.explanationText}>
                            {step.explanation || "Explanation will be added soon."}
                          </p>
                          {currentFeedback?.text && (
                            <div
                              style={
                                currentFeedback.type === "success"
                                  ? styles.successBox
                                  : styles.errorBox
                              }
                            >
                              {currentFeedback.text}
                            </div>
                          )}
                        </div>
                      ) : step.unlocked ? (
                        <form
                          onSubmit={(e) => handleStepSubmit(e, step)}
                          style={styles.stepForm}
                        >
                          <input
                            type="text"
                            value={currentAnswer}
                            onChange={(e) =>
                              handleStepAnswerChange(stepId, e.target.value)
                            }
                            placeholder="Enter your answer"
                            style={styles.input}
                            disabled={isSubmittingStep}
                            maxLength={MAX_ANSWER_LENGTH}
                          />

                          <button
                            type="submit"
                            disabled={isSubmittingStep}
                            style={
                              isSubmittingStep
                                ? styles.submitButtonDisabled
                                : styles.submitButton
                            }
                          >
                            {isSubmittingStep ? "Submitting..." : "Submit Step"}
                          </button>

                          {currentFeedback?.text && (
                            <div
                              style={
                                currentFeedback.type === "success"
                                  ? styles.successBox
                                  : styles.errorBox
                              }
                            >
                              {currentFeedback.text}
                            </div>
                          )}
                        </form>
                      ) : (
                        <div style={styles.lockedNotice}>
                          Solve previous step first.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleLegacySubmit} style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Submit Your Answer</h2>
              <p style={styles.smallText}>
                {incident.solved
                  ? "This incident is already solved. Resubmission is disabled."
                  : "Enter the final answer based on your investigation."}
              </p>

              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  incident.solved
                    ? "Incident already solved"
                    : "Enter your answer"
                }
                style={styles.input}
                required={!incident.solved}
                disabled={incident.solved || submitting}
                maxLength={MAX_ANSWER_LENGTH}
              />

              <button
                type="submit"
                disabled={incident.solved || submitting}
                style={
                  incident.solved || submitting
                    ? styles.submitButtonDisabled
                    : styles.submitButton
                }
              >
                {incident.solved
                  ? "Already Solved"
                  : submitting
                  ? "Submitting..."
                  : "Submit Answer"}
              </button>

              {incident.solved && (
                <div style={styles.explanationBox}>
                  <h3 style={styles.explanationTitle}>Explanation</h3>
                  <p style={styles.explanationText}>
                    {incident.explanation || "Explanation will be added soon."}
                  </p>
                </div>
              )}

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
            </form>
          )}
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
  subtitle: {
    marginTop: "10px",
    color: "#cbd5e1",
    lineHeight: "1.7",
    maxWidth: "720px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
  },
  progressGrid: {
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
  bodyText: {
    color: "#dbe4f0",
    lineHeight: "1.8",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  evidenceBox: {
    background: "#020617",
    color: "#dbeafe",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "18px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.95rem",
    lineHeight: "1.7",
    margin: 0,
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
  stepsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  stepCard: {
    background: "rgba(2, 6, 23, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "16px",
    padding: "18px",
  },
  stepCardSolved: {
    background: "rgba(22, 101, 52, 0.16)",
    border: "1px solid rgba(34, 197, 94, 0.28)",
    borderRadius: "16px",
    padding: "18px",
  },
  stepCardLocked: {
    background: "rgba(30, 41, 59, 0.55)",
    border: "1px solid rgba(100, 116, 139, 0.2)",
    borderRadius: "16px",
    padding: "18px",
    opacity: 0.92,
  },
  stepHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  stepNumber: {
    margin: "0 0 6px",
    color: "#93c5fd",
    fontWeight: "700",
    fontSize: "0.9rem",
  },
  stepTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.1rem",
  },
  stepStatusWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  stepPointsBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    background: "rgba(99, 102, 241, 0.15)",
    color: "#c7d2fe",
    fontWeight: "700",
    border: "1px solid rgba(99, 102, 241, 0.22)",
    height: "fit-content",
  },
  stepSolvedBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    background: "rgba(34, 197, 94, 0.14)",
    color: "#bbf7d0",
    fontWeight: "700",
    border: "1px solid rgba(34, 197, 94, 0.22)",
    height: "fit-content",
  },
  stepUnlockedBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    background: "rgba(59, 130, 246, 0.15)",
    color: "#bfdbfe",
    fontWeight: "700",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    height: "fit-content",
  },
  stepLockedBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    background: "rgba(71, 85, 105, 0.25)",
    color: "#cbd5e1",
    fontWeight: "700",
    border: "1px solid rgba(100, 116, 139, 0.22)",
    height: "fit-content",
  },
  optionList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px",
  },
  optionButton: {
    background: "rgba(15, 23, 42, 0.9)",
    color: "#dbeafe",
    border: "1px solid rgba(59, 130, 246, 0.25)",
    borderRadius: "999px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "600",
  },
  optionButtonSelected: {
    background: "rgba(37, 99, 235, 0.24)",
    color: "#ffffff",
    border: "1px solid rgba(96, 165, 250, 0.6)",
    boxShadow: "0 0 0 1px rgba(96, 165, 250, 0.18)",
  },
  stepForm: {
    marginTop: "16px",
  },
  lockedNotice: {
    marginTop: "16px",
    background: "rgba(71, 85, 105, 0.2)",
    border: "1px solid rgba(100, 116, 139, 0.22)",
    color: "#cbd5e1",
    padding: "12px 14px",
    borderRadius: "10px",
  },
  explanationBox: {
    marginTop: "16px",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "14px",
    padding: "16px",
  },
  explanationTitle: {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "1rem",
  },
  explanationText: {
    margin: 0,
    color: "#dbe4f0",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
  },
  centeredState: {
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

export default IncidentDetailsPage;
