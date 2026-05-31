import { useEffect, useState } from "react";
import Layout from "../components/Layout";

function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/leaderboard");

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Failed to fetch leaderboard");
          return;
        }

        setLeaderboard(data.data);
      } catch (error) {
        console.error("Leaderboard error:", error);
        setMessage("Server error");
      }
    };

    fetchLeaderboard();
  }, []);

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

  const getRowStyle = (rank) => {
    if (rank === 1) {
      return {
        background: "rgba(245, 158, 11, 0.16)",
        borderColor: "rgba(245, 158, 11, 0.24)",
      };
    }

    if (rank === 2) {
      return {
        background: "rgba(148, 163, 184, 0.12)",
        borderColor: "rgba(148, 163, 184, 0.18)",
      };
    }

    if (rank === 3) {
      return {
        background: "rgba(217, 119, 6, 0.14)",
        borderColor: "rgba(217, 119, 6, 0.22)",
      };
    }

    return {
      background: "rgba(2, 6, 23, 0.46)",
      borderColor: "rgba(148, 163, 184, 0.1)",
    };
  };

  const getRankBadgeStyle = (rank) => {
    if (rank === 1) return { backgroundColor: "#f59e0b" };
    if (rank === 2) return { backgroundColor: "#94a3b8" };
    if (rank === 3) return { backgroundColor: "#d97706" };
    return { backgroundColor: "#1e293b" };
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <h1 style={styles.title}>Leaderboard</h1>
            <p style={styles.subtitle}>
              See how players rank based on solved challenges and score.
            </p>
          </div>

          {leaderboard.length === 0 ? (
            <p style={styles.empty}>No data available</p>
          ) : (
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Rank</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Solved</th>
                    <th style={styles.th}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user) => (
                    <tr
                      key={user.user_id}
                      style={{
                        ...styles.tr,
                        ...getRowStyle(user.rank),
                      }}
                    >
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.rankBadge,
                            ...getRankBadgeStyle(user.rank),
                          }}
                        >
                          #{user.rank}
                        </span>
                      </td>
                      <td style={styles.td}>{user.full_name}</td>
                      <td style={styles.td}>{user.solved_count}</td>
                      <td style={{ ...styles.td, color: "#60a5fa", fontWeight: "700" }}>
                        {user.total_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  empty: {
    color: "#94a3b8",
    fontSize: "16px",
  },
  tableCard: {
    background: "rgba(15, 23, 42, 0.88)",
    borderRadius: "18px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    overflowX: "auto",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "18px 20px",
    backgroundColor: "rgba(2, 6, 23, 0.82)",
    color: "#bfdbfe",
    fontSize: "15px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
  },
  tr: {
    borderBottom: "1px solid",
  },
  td: {
    padding: "18px 20px",
    fontSize: "16px",
    color: "#e2e8f0",
  },
  rankBadge: {
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    display: "inline-block",
    minWidth: "42px",
    textAlign: "center",
  },
  messageText: {
    marginTop: 0,
    color: "#fecaca",
  },
};

export default LeaderboardPage;
