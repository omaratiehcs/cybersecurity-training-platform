import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import {
  buildFallbackLearningCourses,
  getLearningStats,
  normalizeLearningCourses,
} from "../utils/learning";

const getDifficultyColor = (difficulty) => {
  if (difficulty === "Easy") return "#16a34a";
  if (difficulty === "Medium") return "#f59e0b";
  if (difficulty === "Hard") return "#dc2626";
  return "#6b7280";
};

const getModuleColor = (module) => {
  if (module === "SOC Case Analysis") {
    return {
      background: "rgba(16, 185, 129, 0.14)",
      border: "1px solid rgba(16, 185, 129, 0.24)",
      color: "#a7f3d0",
    };
  }

  if (module === "Incident Response") {
    return {
      background: "rgba(59, 130, 246, 0.14)",
      border: "1px solid rgba(59, 130, 246, 0.24)",
      color: "#bfdbfe",
    };
  }

  return {
    background: "rgba(148, 163, 184, 0.14)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    color: "#cbd5e1",
  };
};

function TutorialsPage() {
  const navigate = useNavigate();
  const fallbackCourses = useMemo(() => buildFallbackLearningCourses(), []);
  const [courses, setCourses] = useState(fallbackCourses);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await authFetch(
          "http://localhost:5000/api/learning/courses",
          {},
          navigate
        );

        if (!response) return;

        const data = await response.json();

        if (!response.ok) {
          setCourses(fallbackCourses);
          setIsUsingFallback(true);
          setInfoMessage(
            data.message ||
              "Using the built-in Learning Center catalog while database content is unavailable."
          );
          return;
        }

        const normalizedCourses = normalizeLearningCourses(data.data || []).filter(
          (course) => course.lessons.length > 0
        );

        if (normalizedCourses.length === 0) {
          setCourses(fallbackCourses);
          setIsUsingFallback(true);
          setInfoMessage(
            "No active learning courses were found in the database yet. Showing the built-in tutorial catalog."
          );
          return;
        }

        setCourses(normalizedCourses);
        setIsUsingFallback(false);
        setInfoMessage("");
      } catch (error) {
        console.error("Fetch learning courses error:", error);
        setCourses(fallbackCourses);
        setIsUsingFallback(true);
        setInfoMessage(
          "Using the built-in Learning Center catalog while the database-backed content loads."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [fallbackCourses, navigate]);

  const stats = getLearningStats(courses);

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.hero}>
            <div style={styles.heroContent}>
              <div style={styles.heroMain}>
                <span style={styles.eyebrow}>GUIDED CYBERSECURITY TRAINING</span>
                <h1 style={styles.title}>Learning Center</h1>
                <p style={styles.subtitle}>
                  Build your cybersecurity foundation before starting hands-on
                  labs.
                </p>

                <div style={styles.heroChips}>
                  <span style={styles.heroChip}>SOC Analysis</span>
                  <span style={styles.heroChip}>Incident Response</span>
                  <span style={styles.heroChip}>CTF Practice</span>
                </div>
              </div>

              <div style={styles.heroStats}>
                <div style={styles.heroStatCard}>
                  <span style={styles.heroStatValue}>{stats.totalLessons}</span>
                  <span style={styles.heroStatLabel}>Lessons</span>
                </div>
                <div style={styles.heroStatCard}>
                  <span style={styles.heroStatValue}>{stats.totalCourses}</span>
                  <span style={styles.heroStatLabel}>Learning Paths</span>
                </div>
                <div style={styles.heroStatCard}>
                  <span style={styles.heroStatValue}>Protected</span>
                  <span style={styles.heroStatLabel}>User Access</span>
                </div>
              </div>
            </div>
          </div>

          {infoMessage && (
            <div
              style={{
                ...styles.infoBanner,
                backgroundColor: isUsingFallback
                  ? "rgba(37, 99, 235, 0.12)"
                  : "rgba(16, 185, 129, 0.12)",
                borderColor: isUsingFallback
                  ? "rgba(59, 130, 246, 0.22)"
                  : "rgba(16, 185, 129, 0.22)",
                color: isUsingFallback ? "#bfdbfe" : "#a7f3d0",
              }}
            >
              {infoMessage}
            </div>
          )}

          {loading ? (
            <div style={styles.loadingCard}>Loading learning paths...</div>
          ) : (
            <div style={styles.courseGrid}>
              {courses.map((course) => {
                const courseModuleStyle = getModuleColor(course.module);

                return (
                  <section key={course.courseId} style={styles.courseCard}>
                    <div style={styles.courseCardTop}>
                      <div style={styles.courseBadgeRow}>
                        <span
                          style={{
                            ...styles.moduleBadge,
                            background: courseModuleStyle.background,
                            border: courseModuleStyle.border,
                            color: courseModuleStyle.color,
                          }}
                        >
                          {course.module}
                        </span>
                        <span
                          style={{
                            ...styles.difficultyBadge,
                            backgroundColor: getDifficultyColor(course.difficulty),
                          }}
                        >
                          {course.difficulty}
                        </span>
                      </div>

                      <h2 style={styles.courseTitle}>{course.title}</h2>
                      <p style={styles.courseDescription}>{course.description}</p>

                      <div style={styles.courseMetaGrid}>
                        <div style={styles.courseMetaItem}>
                          <span style={styles.courseMetaLabel}>Lessons</span>
                          <span style={styles.courseMetaValue}>
                            {course.lessons.length}
                          </span>
                        </div>
                        <div style={styles.courseMetaItem}>
                          <span style={styles.courseMetaLabel}>Estimated Time</span>
                          <span style={styles.courseMetaValue}>
                            {course.estimatedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/tutorials/course/${course.courseId}`}
                      style={styles.button}
                    >
                      View Course
                    </Link>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    margin: "-20px",
    minHeight: "100vh",
    padding: "42px 20px 28px",
    background:
      "radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 20%), linear-gradient(180deg, #020617 0%, #0b1220 38%, #111827 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "1260px",
    margin: "0 auto",
  },
  hero: {
    marginBottom: "18px",
    padding: "20px 22px",
    borderRadius: "22px",
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
  },
  heroContent: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
    alignItems: "stretch",
  },
  heroMain: {
    minWidth: 0,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 13px",
    borderRadius: "999px",
    marginBottom: "14px",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "clamp(2rem, 4vw, 2.8rem)",
    lineHeight: "1.05",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: "1.65",
    maxWidth: "620px",
  },
  heroChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px",
  },
  heroChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(2, 6, 23, 0.62)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "700",
  },
  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
    alignSelf: "stretch",
  },
  heroStatCard: {
    background: "rgba(2, 6, 23, 0.68)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    justifyContent: "center",
    minHeight: "92px",
  },
  heroStatValue: {
    color: "#ffffff",
    fontSize: "1.2rem",
    fontWeight: "800",
    lineHeight: "1.1",
  },
  heroStatLabel: {
    color: "#93c5fd",
    fontSize: "0.82rem",
    fontWeight: "700",
    lineHeight: "1.4",
  },
  infoBanner: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid",
    lineHeight: "1.7",
    fontWeight: "600",
  },
  loadingCard: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "18px",
    padding: "24px",
    color: "#dbeafe",
    fontSize: "16px",
    fontWeight: "600",
  },
  courseGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },
  courseCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 18px 34px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "18px",
    minHeight: "280px",
  },
  courseCardTop: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  courseBadgeRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  moduleBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "13px",
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
  courseTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.55rem",
    lineHeight: "1.25",
  },
  courseDescription: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.7",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  courseMetaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  courseMetaItem: {
    background: "rgba(2, 6, 23, 0.68)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  courseMetaLabel: {
    color: "#93c5fd",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  courseMetaValue: {
    color: "#ffffff",
    fontSize: "0.98rem",
    fontWeight: "700",
    lineHeight: "1.4",
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

export default TutorialsPage;
