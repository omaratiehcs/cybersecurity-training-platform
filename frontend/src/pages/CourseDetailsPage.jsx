import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import {
  buildFallbackLearningCourses,
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

const sortLessons = (lessons = []) => {
  return [...lessons].sort((a, b) => {
    const orderDiff = (a.lessonOrder ?? 0) - (b.lessonOrder ?? 0);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return String(a.lessonId ?? a.id ?? "").localeCompare(
      String(b.lessonId ?? b.id ?? "")
    );
  });
};

function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const fallbackCourses = useMemo(() => buildFallbackLearningCourses(), []);
  const [courses, setCourses] = useState(fallbackCourses);
  const [loading, setLoading] = useState(true);
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
          setInfoMessage(
            data.message ||
              "Showing the built-in Learning Center catalog while database content is unavailable."
          );
          return;
        }

        const normalizedCourses = normalizeLearningCourses(data.data || []).filter(
          (course) => course.lessons.length > 0
        );

        if (normalizedCourses.length === 0) {
          setCourses(fallbackCourses);
          setInfoMessage(
            "No active learning courses were found in the database yet. Showing the built-in tutorial catalog."
          );
          return;
        }

        setCourses(normalizedCourses);
        setInfoMessage("");
      } catch (error) {
        console.error("Fetch learning course details error:", error);
        setCourses(fallbackCourses);
        setInfoMessage(
          "Showing the built-in Learning Center catalog while the database-backed content loads."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [fallbackCourses, navigate]);

  const course = useMemo(
    () => courses.find((item) => String(item.courseId) === String(courseId)) || null,
    [courseId, courses]
  );

  const sortedLessons = useMemo(
    () => sortLessons(course?.lessons || []),
    [course?.lessons]
  );

  if (loading) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.notFoundCard}>
            <h1 style={styles.title}>Loading Course</h1>
            <p style={styles.subtitle}>
              Preparing the lessons in this learning path.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.notFoundCard}>
            <h1 style={styles.title}>Course Not Found</h1>
            <p style={styles.subtitle}>
              We couldn't find that learning path. It may have been removed or
              the link may be incomplete.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const moduleStyle = getModuleColor(course.module);

  return (
    <Layout>
      <div style={styles.page}>
        {infoMessage && (
          <div style={styles.infoBanner}>{infoMessage}</div>
        )}

        <div style={styles.heroCard}>
          <span style={styles.eyebrow}>GUIDED CYBERSECURITY LEARNING PATH</span>
          <div style={styles.badgeRow}>
            <span
              style={{
                ...styles.moduleBadge,
                background: moduleStyle.background,
                border: moduleStyle.border,
                color: moduleStyle.color,
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

          <h1 style={styles.title}>{course.title}</h1>
          <p style={styles.subtitle}>{course.description}</p>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Estimated Time</span>
              <span style={styles.metaValue}>{course.estimatedTime}</span>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Lessons</span>
              <span style={styles.metaValue}>{sortedLessons.length}</span>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Module</span>
              <span style={styles.metaValue}>{course.module}</span>
            </div>
          </div>
        </div>

        <div style={styles.lessonGrid}>
          {sortedLessons.map((lesson, lessonIndex) => {
            const lessonModuleStyle = getModuleColor(lesson.module);

            return (
              <div key={lesson.id} style={styles.lessonCard}>
                <div style={styles.lessonCardTop}>
                  <span style={styles.lessonTag}>
                    Lesson {String(lessonIndex + 1).padStart(2, "0")}
                  </span>

                  <div style={styles.badgeRow}>
                    <span
                      style={{
                        ...styles.moduleBadge,
                        background: lessonModuleStyle.background,
                        border: lessonModuleStyle.border,
                        color: lessonModuleStyle.color,
                      }}
                    >
                      {lesson.module}
                    </span>
                    <span
                      style={{
                        ...styles.difficultyBadge,
                        backgroundColor: getDifficultyColor(lesson.difficulty),
                      }}
                    >
                      {lesson.difficulty}
                    </span>
                  </div>

                  <span style={styles.timePill}>{lesson.estimatedTime} read</span>

                  <h2 style={styles.lessonTitle}>{lesson.title}</h2>
                  <p style={styles.lessonPreview}>{lesson.overview || lesson.summary}</p>
                </div>

                <div style={styles.lessonMetaRow}>
                  <span style={styles.lessonMetaLabel}>Related Module</span>
                  <span style={styles.lessonMetaValue}>{lesson.module}</span>
                </div>

                <Link to={`/tutorials/${lesson.slug}`} style={styles.button}>
                  Start Lesson
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    padding: "36px 20px 28px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
  },
  infoBanner: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "rgba(37, 99, 235, 0.12)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    color: "#bfdbfe",
    lineHeight: "1.7",
    fontWeight: "600",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    marginBottom: "16px",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  heroCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    marginBottom: "24px",
  },
  badgeRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  moduleBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "700",
  },
  difficultyBadge: {
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "2.4rem",
    lineHeight: "1.1",
  },
  subtitle: {
    margin: "14px 0 0",
    color: "#cbd5e1",
    lineHeight: "1.8",
    fontSize: "1rem",
    maxWidth: "840px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "24px",
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
  },
  lessonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
  lessonCard: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "16px",
    minHeight: "290px",
  },
  lessonCardTop: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  lessonTag: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(56, 189, 248, 0.1)",
    border: "1px solid rgba(56, 189, 248, 0.18)",
    color: "#bae6fd",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  timePill: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "rgba(2, 6, 23, 0.56)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: "700",
  },
  lessonTitle: {
    margin: 0,
    fontSize: "1.2rem",
    lineHeight: "1.35",
    color: "#f8fafc",
    fontWeight: "700",
  },
  lessonPreview: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.6",
    fontSize: "14px",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  lessonMetaRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "rgba(2, 6, 23, 0.48)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "14px",
    padding: "12px 14px",
  },
  lessonMetaLabel: {
    color: "#93c5fd",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  lessonMetaValue: {
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "600",
    lineHeight: "1.5",
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
  notFoundCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    maxWidth: "760px",
  },
};

export default CourseDetailsPage;
