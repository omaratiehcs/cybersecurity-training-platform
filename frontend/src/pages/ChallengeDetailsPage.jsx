import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import { MAX_FLAG_LENGTH, normalizeInput } from "../utils/validation";

const CHALLENGE_API_BASE = "http://localhost:5000/api/challenges";
const TIMER_STATUS = {
  LOADING: "loading",
  NOT_STARTED: "not_started",
  ACTIVE: "active",
  LOCKED: "locked",
  COMPLETED: "completed",
  SOLVED: "solved",
};

const getTimeLimitFromDifficulty = (difficulty) => {
  switch (difficulty) {
    case "Medium":
      return 20;
    case "Hard":
      return 30;
    case "Easy":
    default:
      return 15;
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const formatRemainingSeconds = (value) => {
  const totalSeconds = Number(value);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "00:00";
  }

  const normalizedSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

function ChallengeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isHiddenCommentLabChallenge = Number(id) === 1;
  const timerRefreshTriggeredRef = useRef(false);

  const [challenge, setChallenge] = useState(null);
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [timerState, setTimerState] = useState({
    status: TIMER_STATUS.LOADING,
    started_at: null,
    expires_at: null,
    locked_until: null,
    completed_at: null,
    remaining_seconds: null,
    locked_remaining_seconds: null,
    time_limit_minutes: null,
  });
  const [timerMessage, setTimerMessage] = useState("");
  const [timerMessageType, setTimerMessageType] = useState("");
  const [timerAction, setTimerAction] = useState("");
  const [countdown, setCountdown] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [labRunning, setLabRunning] = useState(false);
  const [labUrl, setLabUrl] = useState("");
  const [labMessage, setLabMessage] = useState("");
  const [labMessageType, setLabMessageType] = useState("");
  const [labAction, setLabAction] = useState("");

  const resolvedTimeLimitMinutes =
    timerState.time_limit_minutes ||
    getTimeLimitFromDifficulty(challenge?.difficulty);

  const loadTimerState = async (showLoading = false) => {
    try {
      if (showLoading) {
        setTimerState((prev) => ({
          ...prev,
          status: TIMER_STATUS.LOADING,
        }));
      }

      const response = await authFetch(
        `${CHALLENGE_API_BASE}/${id}/timer`,
        {},
        navigate
      );

      if (!response) {
        return null;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setTimerMessage(data.message || "Failed to load challenge timer.");
        setTimerMessageType("error");
        return null;
      }

      const nextTimerState = data.data || {
        status: TIMER_STATUS.NOT_STARTED,
      };

      setTimerState(nextTimerState);
      setRemainingSeconds(
        typeof nextTimerState.remaining_seconds === "number"
          ? nextTimerState.remaining_seconds
          : null
      );
      return nextTimerState;
    } catch (error) {
      console.error("Fetch challenge timer error:", error);
      setTimerMessage("Failed to load challenge timer.");
      setTimerMessageType("error");
      return null;
    }
  };

  useEffect(() => {
    const fetchChallengeAndTimer = async () => {
      try {
        setMessage("");
        setMessageType("");
        setTimerMessage("");
        setTimerMessageType("");

        const response = await authFetch(
          `${CHALLENGE_API_BASE}/${id}`,
          {},
          navigate
        );

        if (!response) {
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Failed to fetch challenge");
          setMessageType("error");
          return;
        }

        setChallenge({
          ...data.data,
          solved: data.data.solved === 1 || data.data.solved === true,
        });

        await loadTimerState(true);
      } catch (error) {
        console.error("Fetch challenge error:", error);
        setMessage("Server error");
        setMessageType("error");
      }
    };

    fetchChallengeAndTimer();
  }, [id, navigate]);

  useEffect(() => {
    if (
      timerState.status !== TIMER_STATUS.ACTIVE ||
      typeof timerState.remaining_seconds !== "number"
    ) {
      setCountdown("");
      setRemainingSeconds(null);
      timerRefreshTriggeredRef.current = false;
      return undefined;
    }

    timerRefreshTriggeredRef.current = false;
    setRemainingSeconds(timerState.remaining_seconds);
    setCountdown(formatRemainingSeconds(timerState.remaining_seconds));

    return undefined;
  }, [timerState.remaining_seconds, timerState.status]);

  useEffect(() => {
    if (timerState.status !== TIMER_STATUS.ACTIVE || remainingSeconds === null) {
      return undefined;
    }

    setCountdown(formatRemainingSeconds(remainingSeconds));

    if (remainingSeconds <= 0) {
      if (!timerRefreshTriggeredRef.current) {
        timerRefreshTriggeredRef.current = true;
        loadTimerState();
      }

      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setRemainingSeconds((previousValue) => {
        if (previousValue === null) {
          return previousValue;
        }

        return Math.max(previousValue - 1, 0);
      });
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [remainingSeconds, timerState.status]);

  useEffect(() => {
    if (!isHiddenCommentLabChallenge) {
      setLabRunning(false);
      setLabUrl("");
      setLabMessage("");
      setLabMessageType("");
      setLabAction("");
      return;
    }

    const fetchLabStatus = async () => {
      try {
        const response = await authFetch(
          "http://localhost:5000/api/labs/hidden-comment/status",
          {},
          navigate
        );

        if (!response) {
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setLabMessage(data.message || "Failed to load Docker lab status.");
          setLabMessageType("error");
          return;
        }

        setLabRunning(Boolean(data.running));
        setLabUrl(data.running ? data.labUrl || "http://localhost:8088" : "");
      } catch (error) {
        console.error("Fetch Docker lab status error:", error);
        setLabMessage("Failed to load Docker lab status.");
        setLabMessageType("error");
      }
    };

    fetchLabStatus();
  }, [isHiddenCommentLabChallenge, navigate]);

  const handleStartChallenge = async () => {
    try {
      setTimerAction("start");
      setTimerMessage("");
      setTimerMessageType("");

      const response = await authFetch(
        `${CHALLENGE_API_BASE}/${id}/start`,
        {
          method: "POST",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setTimerMessage(data.message || "Failed to start challenge timer.");
        setTimerMessageType("error");
        return;
      }

      const nextTimerState = data.data || {
        status: TIMER_STATUS.NOT_STARTED,
      };

      setTimerState(nextTimerState);
      setRemainingSeconds(
        typeof nextTimerState.remaining_seconds === "number"
          ? nextTimerState.remaining_seconds
          : null
      );
      setTimerMessage(data.message || "Challenge timer started successfully.");
      setTimerMessageType("success");
    } catch (error) {
      console.error("Start challenge timer error:", error);
      setTimerMessage("Failed to start challenge timer.");
      setTimerMessageType("error");
    } finally {
      setTimerAction("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submittedFlag = normalizeInput(flag);

    if (!submittedFlag) {
      setMessage("Flag is required");
      setMessageType("error");
      return;
    }

    if (submittedFlag.length > MAX_FLAG_LENGTH) {
      setMessage(`Flag must be ${MAX_FLAG_LENGTH} characters or fewer`);
      setMessageType("error");
      return;
    }

    try {
      setMessage("");
      setMessageType("");

      const response = await authFetch(
        `${CHALLENGE_API_BASE}/${id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ flag: submittedFlag }),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.message || "Submission failed");
        setMessageType("error");

        if (data.data) {
          setTimerState(data.data);
          setRemainingSeconds(
            typeof data.data.remaining_seconds === "number"
              ? data.data.remaining_seconds
              : null
          );
        }

        if (
          response.status === 423 ||
          data?.data?.status === TIMER_STATUS.LOCKED ||
          data?.data?.status === TIMER_STATUS.NOT_STARTED
        ) {
          await loadTimerState();
        }

        return;
      }

      const isCorrect =
        data?.result?.is_correct === true ||
        data?.data?.is_correct === true ||
        data?.is_correct === true ||
        data?.solved === true;

      const isAlreadySolved =
        typeof data.message === "string" &&
        data.message.toLowerCase().includes("already solved");

      setMessage(isAlreadySolved ? "Challenge already solved" : data.message);
      setMessageType(isCorrect || isAlreadySolved ? "success" : "error");

      if (isCorrect || isAlreadySolved) {
        setChallenge((prev) =>
          prev
            ? {
                ...prev,
                solved: true,
              }
            : prev
        );
        setFlag("");
        await loadTimerState();
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("Server error");
      setMessageType("error");
    }
  };

  const handleStartLab = async () => {
    try {
      setLabAction("start");
      setLabMessage("");
      setLabMessageType("");

      const response = await authFetch(
        "http://localhost:5000/api/labs/hidden-comment/start",
        {
          method: "POST",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setLabMessage(data.message || "Failed to start Docker lab.");
        setLabMessageType("error");
        return;
      }

      setLabRunning(Boolean(data.running));
      setLabUrl(data.labUrl || "http://localhost:8088");
      setLabMessage(data.message || "Docker lab started successfully.");
      setLabMessageType("success");
    } catch (error) {
      console.error("Start Docker lab error:", error);
      setLabMessage("Failed to start Docker lab.");
      setLabMessageType("error");
    } finally {
      setLabAction("");
    }
  };

  const handleStopLab = async () => {
    try {
      setLabAction("stop");
      setLabMessage("");
      setLabMessageType("");

      const response = await authFetch(
        "http://localhost:5000/api/labs/hidden-comment/stop",
        {
          method: "POST",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setLabMessage(data.message || "Failed to stop Docker lab.");
        setLabMessageType("error");
        return;
      }

      setLabRunning(false);
      setLabUrl("");
      setLabMessage(data.message || "Docker lab stopped successfully.");
      setLabMessageType("success");
    } catch (error) {
      console.error("Stop Docker lab error:", error);
      setLabMessage("Failed to stop Docker lab.");
      setLabMessageType("error");
    } finally {
      setLabAction("");
    }
  };

  const handleOpenLab = () => {
    const targetUrl = labUrl || "http://localhost:8088";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  if (!challenge) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.wrapper}>
            <p style={styles.loadingText}>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const description = challenge.description || "No description available.";
  const hasMultilineDescription = description.includes("\n");
  const looksLikeEvidence =
    /(\d{1,2}:\d{2}:\d{2}|->|state=|EventID=|source_ip|destination_ip)/i.test(
      description
    );
  const descriptionStyle = hasMultilineDescription
    ? {
        ...styles.description,
        ...styles.descriptionPanel,
        ...(looksLikeEvidence
          ? styles.descriptionEvidence
          : styles.descriptionMultiline),
      }
    : styles.description;

  const isSolved = Boolean(challenge.solved);
  const timerStatus = isSolved ? TIMER_STATUS.SOLVED : timerState.status;
  const submissionDisabled =
    !isSolved &&
    (timerStatus === TIMER_STATUS.LOADING ||
      timerStatus === TIMER_STATUS.NOT_STARTED ||
      timerStatus === TIMER_STATUS.COMPLETED ||
      timerStatus === TIMER_STATUS.LOCKED ||
      timerAction === "start");

  return (
    <Layout>
      <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.topRow}>
            <h1 style={styles.title}>{challenge.title}</h1>
            <span
              style={{
                ...styles.badge,
                backgroundColor:
                  challenge.difficulty === "Easy"
                    ? "#16a34a"
                    : challenge.difficulty === "Medium"
                    ? "#f59e0b"
                    : "#dc2626",
              }}
            >
              {challenge.difficulty}
            </span>
          </div>

          <div style={descriptionStyle}>{description}</div>

          <div style={styles.metaRow}>
            <p style={styles.points}>
              <strong>Points:</strong> {challenge.points}
            </p>
          </div>

          <div style={styles.timerSection}>
            <div style={styles.timerHeader}>
              <div>
                <h3 style={styles.timerTitle}>Challenge Timer</h3>
                <p style={styles.timerSubtitle}>
                  Start the timer to enable flag submission. If time expires
                  before a correct solve, this challenge locks for 24 hours.
                </p>
              </div>
              <span style={styles.timerDifficultyPill}>
                {challenge.difficulty}: {resolvedTimeLimitMinutes} min
              </span>
            </div>

            {timerStatus === TIMER_STATUS.SOLVED && (
              <div style={{ ...styles.timerStateBox, ...styles.timerSolvedBox }}>
                <div>
                  <strong>Challenge solved.</strong>
                  <div style={styles.timerStateText}>
                    Your correct submission was already recorded for this
                    challenge.
                  </div>
                </div>
              </div>
            )}

            {timerStatus === TIMER_STATUS.LOADING && !isSolved && (
              <div style={{ ...styles.timerStateBox, ...styles.timerNeutralBox }}>
                Loading challenge timer...
              </div>
            )}

            {timerStatus === TIMER_STATUS.NOT_STARTED && !isSolved && (
              <div style={{ ...styles.timerStateBox, ...styles.timerNeutralBox }}>
                <div>
                  <strong>Start Challenge</strong>
                  <div style={styles.timerStateText}>
                    Time limit: {resolvedTimeLimitMinutes} minutes. The flag
                    form stays disabled until you start.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartChallenge}
                  style={{
                    ...styles.timerButton,
                    ...styles.timerStartButton,
                    opacity: timerAction ? 0.8 : 1,
                  }}
                  disabled={Boolean(timerAction)}
                >
                  {timerAction === "start" ? "Starting..." : "Start Challenge"}
                </button>
              </div>
            )}

            {timerStatus === TIMER_STATUS.ACTIVE && !isSolved && (
              <div style={{ ...styles.timerStateBox, ...styles.timerActiveBox }}>
                <div style={styles.timerInfoGrid}>
                  <div>
                    <span style={styles.timerLabel}>Time Remaining</span>
                    <div style={styles.timerValue}>{countdown || "00:00"}</div>
                  </div>
                  <div>
                    <span style={styles.timerLabel}>Started</span>
                    <div style={styles.timerMetaValue}>
                      {formatDateTime(timerState.started_at)}
                    </div>
                  </div>
                  <div>
                    <span style={styles.timerLabel}>Expires</span>
                    <div style={styles.timerMetaValue}>
                      {formatDateTime(timerState.expires_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {timerStatus === TIMER_STATUS.LOCKED && !isSolved && (
              <div style={{ ...styles.timerStateBox, ...styles.timerLockedBox }}>
                <div>
                  <strong>Time expired. This challenge is locked for 24 hours.</strong>
                  <div style={styles.timerStateText}>
                    Locked Until:{" "}
                    {timerState.locked_until
                      ? formatDateTime(timerState.locked_until)
                      : "Unavailable"}
                  </div>
                </div>
              </div>
            )}

            {timerStatus === TIMER_STATUS.COMPLETED && !isSolved && (
              <div style={{ ...styles.timerStateBox, ...styles.timerNeutralBox }}>
                <div>
                  <strong>Challenge timer already completed.</strong>
                  <div style={styles.timerStateText}>
                    Refresh the page to sync the latest solve state for this challenge.
                  </div>
                </div>
              </div>
            )}

            {timerMessage && (
              <p
                style={{
                  ...styles.timerMessage,
                  backgroundColor:
                    timerMessageType === "success" ? "#dcfce7" : "#fee2e2",
                  color: timerMessageType === "success" ? "#166534" : "#991b1b",
                  border:
                    timerMessageType === "success"
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                }}
              >
                {timerMessage}
              </p>
            )}
          </div>

          {isHiddenCommentLabChallenge && (
            <div style={styles.labSection}>
              <div style={styles.labHeader}>
                <div>
                  <h3 style={styles.labTitle}>Containerized Lab Prototype</h3>
                  <p style={styles.labSubtitle}>
                    This lab runs inside a Docker container and demonstrates
                    how future challenges can launch isolated hands-on
                    environments. Inspect the live login portal, find the
                    hidden flag, then submit it using the normal challenge
                    form.
                  </p>
                </div>
                <span
                  style={{
                    ...styles.labStatusBadge,
                    backgroundColor: labRunning ? "#dcfce7" : "#fef3c7",
                    color: labRunning ? "#166534" : "#92400e",
                    border: labRunning
                      ? "1px solid #bbf7d0"
                      : "1px solid #fde68a",
                  }}
                >
                  {labRunning ? "Running" : "Stopped"}
                </span>
              </div>

              <p style={styles.labHint}>
                This prototype lab is only attached to this challenge and does
                not replace the normal flag submission flow.
              </p>

              {labUrl && (
                <div style={styles.labUrlBox}>
                  <strong>Lab URL:</strong> {labUrl}
                </div>
              )}

              <div style={styles.labButtonRow}>
                <button
                  type="button"
                  onClick={handleStartLab}
                  style={{
                    ...styles.labButton,
                    ...styles.labStartButton,
                    opacity: labAction ? 0.8 : 1,
                  }}
                  disabled={Boolean(labAction)}
                >
                  {labAction === "start" ? "Starting..." : "Start Docker Lab"}
                </button>

                <button
                  type="button"
                  onClick={handleOpenLab}
                  style={{
                    ...styles.labButton,
                    ...styles.labOpenButton,
                    opacity: labRunning || labUrl ? 1 : 0.55,
                    cursor: labRunning || labUrl ? "pointer" : "not-allowed",
                  }}
                  disabled={!labRunning && !labUrl}
                >
                  Open Lab
                </button>

                <button
                  type="button"
                  onClick={handleStopLab}
                  style={{
                    ...styles.labButton,
                    ...styles.labStopButton,
                    opacity: labAction ? 0.8 : 1,
                  }}
                  disabled={Boolean(labAction)}
                >
                  {labAction === "stop" ? "Stopping..." : "Stop Lab"}
                </button>
              </div>

              {labMessage && (
                <p
                  style={{
                    ...styles.labMessage,
                    backgroundColor:
                      labMessageType === "success" ? "#dcfce7" : "#fee2e2",
                    color: labMessageType === "success" ? "#166534" : "#991b1b",
                    border:
                      labMessageType === "success"
                        ? "1px solid #bbf7d0"
                        : "1px solid #fecaca",
                  }}
                >
                  {labMessage}
                </p>
              )}
            </div>
          )}

          <div style={styles.formSection}>
            <h3 style={styles.formTitle}>
              {isSolved ? "Challenge Completed" : "Submit Flag"}
            </h3>

            {isSolved && messageType !== "success" && (
              <div style={styles.solvedBox}>
                You already solved this challenge.
              </div>
            )}

            {!isSolved && (
              <form onSubmit={handleSubmit} style={styles.form}>
                <input
                  type="text"
                  placeholder={
                    timerStatus === TIMER_STATUS.NOT_STARTED
                      ? "Start the challenge timer to submit"
                      : timerStatus === TIMER_STATUS.LOCKED
                      ? "Challenge is locked"
                      : "Enter flag"
                  }
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  style={{
                    ...styles.input,
                    ...(submissionDisabled ? styles.inputDisabled : {}),
                  }}
                  maxLength={MAX_FLAG_LENGTH}
                  disabled={submissionDisabled}
                />

                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    ...(submissionDisabled ? styles.buttonDisabled : {}),
                  }}
                  disabled={submissionDisabled}
                >
                  Submit
                </button>
              </form>
            )}

            {isSolved && (
              <div style={styles.explanationBox}>
                <h3 style={styles.explanationTitle}>Explanation</h3>
                <p style={styles.explanationText}>
                  {challenge.explanation || "Explanation will be added soon."}
                </p>
              </div>
            )}

            {message && (
              <p
                style={{
                  ...styles.message,
                  backgroundColor:
                    messageType === "success" ? "#dcfce7" : "#fee2e2",
                  color: messageType === "success" ? "#166534" : "#991b1b",
                  border:
                    messageType === "success"
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                }}
              >
                {message}
              </p>
            )}
          </div>
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
    padding: "36px 20px 30px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
  },
  wrapper: {
    display: "flex",
    justifyContent: "center",
    maxWidth: "920px",
    margin: "0 auto",
  },
  card: {
    width: "100%",
    maxWidth: "820px",
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "40px",
    lineHeight: "1.1",
    color: "#ffffff",
  },
  badge: {
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  description: {
    fontSize: "17px",
    lineHeight: "1.7",
    color: "#cbd5e1",
    marginBottom: "24px",
    whiteSpace: "pre-wrap",
  },
  descriptionPanel: {
    padding: "18px",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    overflowX: "auto",
  },
  descriptionMultiline: {
    background: "rgba(2, 6, 23, 0.56)",
  },
  descriptionEvidence: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#dbeafe",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "15px",
    lineHeight: "1.75",
  },
  metaRow: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "28px",
  },
  points: {
    margin: 0,
    color: "#93c5fd",
    fontSize: "16px",
  },
  timerSection: {
    marginBottom: "30px",
    padding: "20px",
    borderRadius: "14px",
    background: "rgba(2, 6, 23, 0.54)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  timerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  timerTitle: {
    margin: 0,
    color: "#ffffff",
  },
  timerSubtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
    lineHeight: "1.7",
  },
  timerDifficultyPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  timerStateBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid",
  },
  timerNeutralBox: {
    background: "rgba(15, 23, 42, 0.8)",
    borderColor: "rgba(148, 163, 184, 0.16)",
    color: "#e2e8f0",
  },
  timerActiveBox: {
    background: "rgba(37, 99, 235, 0.16)",
    borderColor: "rgba(96, 165, 250, 0.24)",
    color: "#bfdbfe",
  },
  timerLockedBox: {
    background: "rgba(127, 29, 29, 0.22)",
    borderColor: "rgba(248, 113, 113, 0.24)",
    color: "#fecaca",
  },
  timerSolvedBox: {
    background: "rgba(22, 101, 52, 0.2)",
    borderColor: "rgba(74, 222, 128, 0.24)",
    color: "#bbf7d0",
  },
  timerStateText: {
    marginTop: "6px",
    lineHeight: "1.65",
  },
  timerInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  timerLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "8px",
  },
  timerValue: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
  },
  timerMetaValue: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#bfdbfe",
    lineHeight: "1.55",
  },
  timerButton: {
    border: "none",
    padding: "12px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
  },
  timerStartButton: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
  },
  timerMessage: {
    marginTop: "14px",
    marginBottom: 0,
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  labSection: {
    marginBottom: "30px",
    padding: "20px",
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))",
    border: "1px solid #334155",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.22)",
  },
  labHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  labTitle: {
    margin: 0,
    color: "#f8fafc",
  },
  labSubtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
  labStatusBadge: {
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },
  labHint: {
    margin: "0 0 14px",
    color: "#93c5fd",
    lineHeight: "1.65",
    fontSize: "14px",
  },
  labUrlBox: {
    marginBottom: "14px",
    padding: "12px 14px",
    borderRadius: "10px",
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    color: "#dbeafe",
    fontSize: "14px",
    wordBreak: "break-word",
  },
  labButtonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  labButton: {
    border: "none",
    padding: "12px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  labStartButton: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
  },
  labOpenButton: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    border: "1px solid #334155",
  },
  labStopButton: {
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#ffffff",
  },
  labMessage: {
    marginTop: "14px",
    marginBottom: 0,
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  formSection: {
    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
    paddingTop: "24px",
  },
  formTitle: {
    marginTop: 0,
    marginBottom: "16px",
    color: "#ffffff",
  },
  form: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    flex: "1",
    minWidth: "240px",
    padding: "12px 14px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "10px",
    fontSize: "15px",
    background: "rgba(2, 6, 23, 0.72)",
    color: "#f8fafc",
    height: "48px",
  },
  inputDisabled: {
    background: "rgba(30, 41, 59, 0.72)",
    color: "#94a3b8",
    cursor: "not-allowed",
  },
  button: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    height: "48px",
  },
  buttonDisabled: {
    background: "rgba(51, 65, 85, 0.72)",
    cursor: "not-allowed",
  },
  message: {
    marginTop: "16px",
    padding: "12px 14px",
    borderRadius: "8px",
    fontWeight: "600",
  },
  solvedBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(22, 101, 52, 0.2)",
    color: "#bbf7d0",
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "600",
    marginBottom: "16px",
    border: "1px solid rgba(74, 222, 128, 0.24)",
  },
  explanationBox: {
    marginBottom: "16px",
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(2, 6, 23, 0.56)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  explanationTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#ffffff",
  },
  explanationText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
  },
  loadingText: {
    margin: 0,
    color: "#cbd5e1",
    padding: "24px 0",
  },
};

export default ChallengeDetailsPage;
