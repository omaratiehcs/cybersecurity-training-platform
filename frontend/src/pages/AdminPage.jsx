import { Link } from "react-router-dom";
import Layout from "../components/Layout";

function AdminPage() {
  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <div>
              <p style={styles.eyebrow}>Admin Control Center</p>
              <h1 style={styles.title}>Admin Dashboard</h1>
              <p style={styles.subtitle}>
                Manage learning content, investigations, support workflows, and
                platform analytics from one cybersecurity-themed workspace.
              </p>
            </div>

            <div style={styles.headerStats}>
              <div style={styles.statCard}>
                <span style={styles.statValue}>7</span>
                <span style={styles.statLabel}>Management Areas</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statValue}>Live</span>
                <span style={styles.statLabel}>Training Modules</span>
              </div>
            </div>
          </div>

          <div style={styles.grid}>
            <Link to="/admin/insights" style={styles.card}>
              <span style={styles.cardTag}>Analytics</span>
              <h2 style={styles.cardTitle}>Admin Insights</h2>
              <p style={styles.cardText}>
                View platform activity, training performance, and submission
                trends across all core modules.
              </p>
            </Link>

            <Link to="/admin/challenges" style={styles.card}>
              <span style={styles.cardTag}>CTF</span>
              <h2 style={styles.cardTitle}>Challenges</h2>
              <p style={styles.cardText}>
                Create, edit, and delete CTF challenges for hands-on flag-based
                practice.
              </p>
            </Link>

            <Link to="/admin/soc-cases" style={styles.card}>
              <span style={styles.cardTag}>SOC</span>
              <h2 style={styles.cardTitle}>SOC Cases</h2>
              <p style={styles.cardText}>
                Maintain analyst scenarios, evidence, and investigation prompts
                for the SOC workflow.
              </p>
            </Link>

            <Link to="/admin/incidents" style={styles.card}>
              <span style={styles.cardTag}>IR</span>
              <h2 style={styles.cardTitle}>Incident Response</h2>
              <p style={styles.cardText}>
                Manage step-based incident investigation scenarios and response
                workflows.
              </p>
            </Link>

            <Link to="/admin/learning" style={styles.card}>
              <span style={styles.cardTag}>Learning</span>
              <h2 style={styles.cardTitle}>Manage Learning Center</h2>
              <p style={styles.cardText}>
                Organize courses, lessons, and module-linked training content
                for the Learning Center.
              </p>
            </Link>

            <Link to="/admin/reviews" style={styles.card}>
              <span style={styles.cardTag}>Feedback</span>
              <h2 style={styles.cardTitle}>Platform Reviews</h2>
              <p style={styles.cardText}>
                Monitor learner ratings, written feedback, and overall platform
                satisfaction.
              </p>
            </Link>

            <Link to="/admin/contact-messages" style={styles.card}>
              <span style={styles.cardTag}>Support</span>
              <h2 style={styles.cardTitle}>Contact Messages</h2>
              <p style={styles.cardText}>
                Review support requests, reply to users, and manage admin
                follow-up communication.
              </p>
            </Link>
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
    padding: "32px 20px 40px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "26px",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#93c5fd",
    fontSize: "0.84rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  title: {
    fontSize: "46px",
    margin: 0,
    color: "#ffffff",
  },
  subtitle: {
    color: "#cbd5e1",
    margin: "10px 0 0",
    maxWidth: "720px",
    lineHeight: "1.7",
  },
  headerStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
    gap: "14px",
    width: "320px",
    maxWidth: "100%",
  },
  statCard: {
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statValue: {
    color: "#ffffff",
    fontSize: "1.6rem",
    fontWeight: "800",
  },
  statLabel: {
    color: "#93c5fd",
    fontSize: "0.8rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    display: "block",
    textDecoration: "none",
    background: "rgba(15, 23, 42, 0.88)",
    padding: "24px",
    borderRadius: "18px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    boxShadow: "0 18px 36px rgba(2, 6, 23, 0.28)",
    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
  },
  cardTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.14)",
    border: "1px solid rgba(96, 165, 250, 0.22)",
    color: "#bfdbfe",
    fontSize: "0.78rem",
    fontWeight: "700",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },
  cardTitle: {
    margin: "0 0 10px 0",
    fontSize: "24px",
    color: "#ffffff",
  },
  cardText: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.7",
  },
};

export default AdminPage;
