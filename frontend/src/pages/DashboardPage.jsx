import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";

const getProgressMetrics = (solved, total) => {
  const solvedCount = Math.max(0, Number(solved) || 0);
  const totalCount = Math.max(0, Number(total) || 0);
  const percentage =
    totalCount > 0 ? Math.min(100, Math.round((solvedCount / totalCount) * 100)) : 0;

  return {
    solvedCount,
    totalCount,
    percentage,
  };
};

function DashboardPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState({
    challenges: null,
    socCases: null,
    incidents: null,
  });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const [challengeResponse, socResponse, incidentResponse] =
          await Promise.all([
            authFetch(
              "http://localhost:5000/api/challenges/progress",
              {},
              navigate
            ),
            authFetch(
              "http://localhost:5000/api/soc-cases/progress",
              {},
              navigate
            ),
            authFetch(
              "http://localhost:5000/api/incidents/progress",
              {},
              navigate
            ),
          ]);

        if (!challengeResponse || !socResponse || !incidentResponse) {
          return;
        }

        const [challengeData, socData, incidentData] = await Promise.all([
          challengeResponse.json(),
          socResponse.json(),
          incidentResponse.json(),
        ]);

        setProgress({
          challenges: challengeResponse.ok ? challengeData.data : null,
          socCases: socResponse.ok ? socData.data : null,
          incidents: incidentResponse.ok ? incidentData.data : null,
        });
      } catch (error) {
        console.error("Fetch dashboard progress error:", error);
      }
    };

    fetchProgress();
  }, [navigate]);

  const challengeProgress = progress.challenges
    ? getProgressMetrics(
        progress.challenges.solved_challenges,
        progress.challenges.total_challenges
      )
    : null;
  const socProgress = progress.socCases
    ? getProgressMetrics(
        progress.socCases.solved_soc_cases,
        progress.socCases.total_soc_cases
      )
    : null;
  const incidentProgress = progress.incidents
    ? getProgressMetrics(
        progress.incidents.solved_incidents,
        progress.incidents.total_incidents
      )
    : null;

  const cards = [
    {
      title: "CTF Challenges",
      description: "Solve practical cybersecurity tasks, capture flags, and sharpen core hands-on skills.",
      path: "/challenges",
      buttonLabel: "Go to Challenges",
      progressText: challengeProgress
        ? `${challengeProgress.solvedCount} / ${challengeProgress.totalCount} solved`
        : "Track your progress as you complete tasks",
      progressPercent: challengeProgress?.percentage ?? 0,
      progressPercentText: challengeProgress
        ? `${challengeProgress.percentage}% complete`
        : "0% complete",
      accent: "rgba(59, 130, 246, 0.24)",
      progressFill: "linear-gradient(90deg, #60a5fa, #2563eb)",
      badge: "Hands-on Lab",
    },
    {
      title: "SOC Cases",
      description: "Review alerts, investigate SIEM-style evidence, and practice analyst decision-making.",
      path: "/soc-cases",
      buttonLabel: "Go to SOC Cases",
      progressText: socProgress
        ? `${socProgress.solvedCount} / ${socProgress.totalCount} solved`
        : "Track your progress as you complete tasks",
      progressPercent: socProgress?.percentage ?? 0,
      progressPercentText: socProgress
        ? `${socProgress.percentage}% complete`
        : "0% complete",
      accent: "rgba(16, 185, 129, 0.24)",
      progressFill: "linear-gradient(90deg, #34d399, #059669)",
      badge: "Detection & Triage",
    },
    {
      title: "Incident Response",
      description: "Work through investigations, review evidence, and make containment decisions step by step.",
      path: "/incidents",
      buttonLabel: "Go to Incidents",
      progressText: incidentProgress
        ? `${incidentProgress.solvedCount} / ${incidentProgress.totalCount} solved`
        : "Track your progress as you complete tasks",
      progressPercent: incidentProgress?.percentage ?? 0,
      progressPercentText: incidentProgress
        ? `${incidentProgress.percentage}% complete`
        : "0% complete",
      accent: "rgba(245, 158, 11, 0.24)",
      progressFill: "linear-gradient(90deg, #fbbf24, #f59e0b)",
      badge: "Response Workflow",
    },
  ];

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>
              Track your cybersecurity training progress
            </p>
          </div>

          <div style={styles.grid}>
            {cards.map((card) => (
              <div
                key={card.title}
                style={styles.card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 22px 48px rgba(2, 6, 23, 0.42)";
                  e.currentTarget.style.borderColor =
                    "rgba(148, 163, 184, 0.28)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 16px 36px rgba(2, 6, 23, 0.3)";
                  e.currentTarget.style.borderColor =
                    "rgba(148, 163, 184, 0.16)";
                }}
              >
                <div style={styles.cardTop}>
                  <span
                    style={{
                      ...styles.cardBadge,
                      background: card.accent,
                    }}
                  >
                    {card.badge}
                  </span>
                  <h2 style={styles.cardTitle}>{card.title}</h2>
                  <p style={styles.cardText}>{card.description}</p>
                </div>

                <div style={styles.cardBottom}>
                  <div style={styles.progressCard}>
                    <span style={styles.progressLabel}>Progress</span>
                    <div style={styles.progressRow}>
                      <p style={styles.progressText}>{card.progressText}</p>
                      <span style={styles.progressPercentText}>
                        {card.progressPercentText}
                      </span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${card.progressPercent}%`,
                          background: card.progressFill,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(card.path)}
                    style={styles.button}
                  >
                    {card.buttonLabel}
                  </button>
                </div>
              </div>
            ))}
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
    padding: "40px 20px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  wrapper: {
    maxWidth: "1180px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "42px",
  },
  title: {
    margin: 0,
    fontSize: "3rem",
    lineHeight: "1.05",
    color: "#ffffff",
  },
  subtitle: {
    margin: "14px 0 0",
    color: "#94a3b8",
    fontSize: "1.05rem",
    lineHeight: "1.7",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
  },
  card: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "22px",
    padding: "26px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "24px",
    minHeight: "320px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  cardTop: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  cardBadge: {
    alignSelf: "flex-start",
    color: "#dbeafe",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "0.82rem",
    fontWeight: "700",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.6rem",
    color: "#ffffff",
    lineHeight: "1.25",
  },
  cardText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.75",
    fontSize: "0.97rem",
  },
  cardBottom: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginTop: "auto",
  },
  progressCard: {
    background: "rgba(2, 6, 23, 0.52)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "16px",
  },
  progressLabel: {
    display: "block",
    color: "#93c5fd",
    fontSize: "0.82rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "8px",
  },
  progressText: {
    margin: 0,
    color: "#e2e8f0",
    lineHeight: "1.6",
    fontSize: "0.96rem",
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  progressPercentText: {
    color: "#94a3b8",
    fontSize: "0.88rem",
    fontWeight: "700",
  },
  progressTrack: {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    overflow: "hidden",
    marginTop: "12px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.25s ease",
    minWidth: 0,
  },
  button: {
    border: "none",
    borderRadius: "12px",
    padding: "13px 16px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.28)",
  },
};

export default DashboardPage;
