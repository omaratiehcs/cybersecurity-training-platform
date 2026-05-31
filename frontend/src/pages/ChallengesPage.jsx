import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";

function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const response = await authFetch(
          "http://localhost:5000/api/challenges",
          {},
          navigate
        );

        if (!response) return;

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Failed to fetch challenges");
          return;
        }

        setChallenges(data.data);
      } catch (error) {
        console.error("Fetch challenges error:", error);
        setMessage("Server error");
      }
    };

    fetchChallenges();
  }, [navigate]);

  const getDifficultyColor = (difficulty) => {
    if (difficulty === "Easy") return "#16a34a";
    if (difficulty === "Medium") return "#f59e0b";
    if (difficulty === "Hard") return "#dc2626";
    return "#6b7280";
  };

  const getDescriptionPreview = (description) => {
    if (!description) {
      return "No description available.";
    }

    const normalized = description.replace(/\s+/g, " ").trim();

    if (normalized.length <= 140) {
      return normalized;
    }

    return `${normalized.slice(0, 140).trimEnd()}...`;
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Challenges</h1>
          <p style={styles.subtitle}>Browse and solve available cybersecurity tasks.</p>
        </div>

        {message && <p style={styles.message}>{message}</p>}

        {challenges.length === 0 ? (
          <p style={styles.empty}>No challenges found.</p>
        ) : (
          <div style={styles.grid}>
            {challenges.map((challenge) => (
              <div key={challenge.challenge_id} style={styles.card}>
                <div style={styles.cardContent}>
                  <div style={styles.topRow}>
                    <h3 style={styles.cardTitle}>{challenge.title}</h3>
                    <span
                      style={{
                        ...styles.difficultyBadge,
                        backgroundColor: getDifficultyColor(challenge.difficulty),
                      }}
                    >
                      {challenge.difficulty}
                    </span>
                  </div>

                  <p style={styles.description}>
                    {getDescriptionPreview(challenge.description)}
                  </p>
                </div>

                <div style={styles.cardFooter}>
                  <div style={styles.infoRow}>
                    <span style={styles.points}>{challenge.points} pts</span>
                    <span
                      style={{
                        ...styles.status,
                        color: challenge.solved ? "#4ade80" : "#f87171",
                      }}
                    >
                      {challenge.solved ? "Solved" : "Not Solved"}
                    </span>
                  </div>

                  <Link
                    to={`/challenges/${challenge.challenge_id}`}
                    style={styles.button}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    padding: "36px 20px 24px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
  },

  header: {
    marginBottom: "36px",
  },

  title: {
    margin: 0,
    marginBottom: "10px",
    fontSize: "56px",
    lineHeight: "1.1",
    color: "#ffffff",
  },

  subtitle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "18px",
  },

  message: {
    color: "#dc2626",
    marginBottom: "16px",
  },

  empty: {
    color: "#94a3b8",
    fontSize: "16px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    columnGap: "24px",
    rowGap: "40px",
  },

  card: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "16px",
    minHeight: "220px",
  },

  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "22px",
    lineHeight: "1.3",
    color: "#f8fafc",
    fontWeight: "700",
  },

  difficultyBadge: {
    color: "#fff",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  description: {
    color: "#94a3b8",
    lineHeight: "1.6",
    fontSize: "14px",
    margin: 0,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  cardFooter: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "600",
    marginTop: "auto",
  },

  points: {
    color: "#93c5fd",
  },

  status: {
    fontWeight: "700",
  },

  button: {
    display: "inline-block",
    textAlign: "center",
    textDecoration: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: "10px",
    fontWeight: "700",
    marginTop: "auto",
  },
};

export default ChallengesPage;
