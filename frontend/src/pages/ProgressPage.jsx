import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";

function ProgressPage() {
  const navigate = useNavigate();

  const [challengeProgress, setChallengeProgress] = useState(null);
  const [socProgress, setSocProgress] = useState(null);
  const [incidentProgress, setIncidentProgress] = useState(null);
  const [message, setMessage] = useState("");

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

        if (!challengeResponse || !socResponse || !incidentResponse) return;

        const challengeData = await challengeResponse.json();
        const socData = await socResponse.json();
        const incidentData = await incidentResponse.json();

        if (!challengeResponse.ok) {
          setMessage(challengeData.error || "Failed to fetch challenge progress");
          return;
        }

        if (!socResponse.ok) {
          setMessage(socData.error || "Failed to fetch SOC progress");
          return;
        }

        if (!incidentResponse.ok) {
          setMessage(incidentData.error || "Failed to fetch incident progress");
          return;
        }

        setChallengeProgress(challengeData.data);
        setSocProgress(socData.data);
        setIncidentProgress(incidentData.data);
      } catch (error) {
        console.error("Fetch progress error:", error);
        setMessage("Server error");
      }
    };

    fetchProgress();
  }, [navigate]);

  if (message) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.wrapper}>
            <p style={styles.messageText}>{message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!challengeProgress || !socProgress || !incidentProgress) {
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

  const combinedScore =
    (challengeProgress.total_score || 0) +
    (socProgress.total_score || 0) +
    (incidentProgress.total_score || 0);

  const totalActivities =
    (challengeProgress.total_challenges || 0) +
    (socProgress.total_soc_cases || 0) +
    (incidentProgress.total_incidents || 0);

  const totalSolved =
    (challengeProgress.solved_challenges || 0) +
    (socProgress.solved_soc_cases || 0) +
    (incidentProgress.solved_incidents || 0);

  const totalUnsolved =
    (challengeProgress.unsolved_challenges || 0) +
    (socProgress.unsolved_soc_cases || 0) +
    (incidentProgress.unsolved_incidents || 0);

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <h1 style={styles.title}>Your Progress</h1>
            <p style={styles.subtitle}>
              Track your performance across challenges, SOC cases, and incident
              response scenarios.
            </p>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <h3 style={styles.cardTitle}>Total Activities</h3>
              <p style={styles.cardValue}>{totalActivities}</p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.cardTitle}>Total Solved</h3>
              <p style={{ ...styles.cardValue, color: "#4ade80" }}>
                {totalSolved}
              </p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.cardTitle}>Total Unsolved</h3>
              <p style={{ ...styles.cardValue, color: "#f87171" }}>
                {totalUnsolved}
              </p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.cardTitle}>Combined Score</h3>
              <p style={{ ...styles.cardValue, color: "#60a5fa" }}>
                {combinedScore}
              </p>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Challenges</h2>
            <div style={styles.grid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Total Challenges</h3>
                <p style={styles.cardValue}>{challengeProgress.total_challenges}</p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Solved</h3>
                <p style={{ ...styles.cardValue, color: "#4ade80" }}>
                  {challengeProgress.solved_challenges}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Unsolved</h3>
                <p style={{ ...styles.cardValue, color: "#f87171" }}>
                  {challengeProgress.unsolved_challenges}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Score</h3>
                <p style={{ ...styles.cardValue, color: "#60a5fa" }}>
                  {challengeProgress.total_score}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>SOC Cases</h2>
            <div style={styles.grid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Total SOC Cases</h3>
                <p style={styles.cardValue}>{socProgress.total_soc_cases}</p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Solved</h3>
                <p style={{ ...styles.cardValue, color: "#4ade80" }}>
                  {socProgress.solved_soc_cases}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Unsolved</h3>
                <p style={{ ...styles.cardValue, color: "#f87171" }}>
                  {socProgress.unsolved_soc_cases}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Score</h3>
                <p style={{ ...styles.cardValue, color: "#60a5fa" }}>
                  {socProgress.total_score}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Incident Response</h2>
            <div style={styles.grid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Total Incidents</h3>
                <p style={styles.cardValue}>{incidentProgress.total_incidents}</p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Solved</h3>
                <p style={{ ...styles.cardValue, color: "#4ade80" }}>
                  {incidentProgress.solved_incidents}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Unsolved</h3>
                <p style={{ ...styles.cardValue, color: "#f87171" }}>
                  {incidentProgress.unsolved_incidents}
                </p>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Score</h3>
                <p style={{ ...styles.cardValue, color: "#60a5fa" }}>
                  {incidentProgress.total_score}
                </p>
              </div>
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
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "28px",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "48px",
    lineHeight: "1.1",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "17px",
    lineHeight: "1.7",
  },
  section: {
    marginTop: "34px",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "30px",
    color: "#ffffff",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  summaryCard: {
    background: "rgba(15, 23, 42, 0.88)",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    textAlign: "center",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderTop: "4px solid rgba(96, 165, 250, 0.55)",
  },
  card: {
    background: "rgba(15, 23, 42, 0.88)",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    textAlign: "center",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
  cardTitle: {
    margin: 0,
    marginBottom: "14px",
    color: "#cbd5e1",
    fontSize: "18px",
    fontWeight: "600",
  },
  cardValue: {
    margin: 0,
    fontSize: "42px",
    fontWeight: "700",
    color: "#f8fafc",
  },
  messageText: {
    marginTop: 0,
    color: "#fecaca",
  },
  loadingText: {
    marginTop: 0,
    color: "#cbd5e1",
  },
};

export default ProgressPage;
