import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import { getTutorialById } from "../data/tutorials";
import {
  buildFallbackLearningCourses,
  normalizeLearningCourses,
  normalizeLearningLesson,
} from "../utils/learning";

const getDifficultyColor = (difficulty) => {
  if (difficulty === "Easy") return "#16a34a";
  if (difficulty === "Medium") return "#f59e0b";
  if (difficulty === "Hard") return "#dc2626";
  return "#6b7280";
};

const getModuleBadgeStyle = (module) => {
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

const sortCourseLessons = (lessons = []) => {
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

const getLessonNavigation = (courses, currentSlug) => {
  for (const course of courses) {
    const sortedLessons = sortCourseLessons(course.lessons || []);
    const currentIndex = sortedLessons.findIndex(
      (item) => item.slug === currentSlug || item.id === currentSlug
    );

    if (currentIndex !== -1) {
      return {
        currentCourse: course,
        currentIndex,
        totalLessons: sortedLessons.length,
        previousLesson: currentIndex > 0 ? sortedLessons[currentIndex - 1] : null,
        nextLesson:
          currentIndex < sortedLessons.length - 1
            ? sortedLessons[currentIndex + 1]
            : null,
      };
    }
  }

  return {
    currentCourse: null,
    currentIndex: -1,
    totalLessons: 0,
    previousLesson: null,
    nextLesson: null,
  };
};

function TutorialDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fallbackTutorial = getTutorialById(id);
  const fallbackCourses = useMemo(() => buildFallbackLearningCourses(), []);
  const [lesson, setLesson] = useState(
    fallbackTutorial ? normalizeLearningLesson(fallbackTutorial) : null
  );
  const [courses, setCourses] = useState(fallbackCourses);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await authFetch(
          `http://localhost:5000/api/learning/lessons/${id}`,
          {},
          navigate
        );

        if (!response) return;

        const data = await response.json();

        if (!response.ok) {
          if (fallbackTutorial) {
            setLesson(normalizeLearningLesson(fallbackTutorial));
            setUsingFallback(true);
            setNotFound(false);
            return;
          }

          setLesson(null);
          setNotFound(true);
          return;
        }

        setLesson(normalizeLearningLesson(data.data));
        setUsingFallback(false);
        setNotFound(false);
      } catch (error) {
        console.error("Fetch learning lesson error:", error);

        if (fallbackTutorial) {
          setLesson(normalizeLearningLesson(fallbackTutorial));
          setUsingFallback(true);
          setNotFound(false);
        } else {
          setLesson(null);
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [fallbackTutorial, id, navigate]);

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
          return;
        }

        const normalizedCourses = normalizeLearningCourses(data.data || []).filter(
          (course) => course.lessons.length > 0
        );

        if (normalizedCourses.length === 0) {
          setCourses(fallbackCourses);
          return;
        }

        setCourses(normalizedCourses);
      } catch (error) {
        console.error("Fetch learning course navigation error:", error);
        setCourses(fallbackCourses);
      }
    };

    fetchCourses();
  }, [fallbackCourses, navigate]);

  const courseNavigation = useMemo(() => getLessonNavigation(courses, id), [courses, id]);

  if (loading) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.notFoundCard}>
            <h1 style={styles.title}>Loading Lesson</h1>
            <p style={styles.subtitle}>
              Preparing the learning content for this lesson.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || !lesson) {
    return (
      <Layout>
        <div style={styles.page}>
          <div style={styles.notFoundCard}>
            <h1 style={styles.title}>Tutorial Not Found</h1>
            <p style={styles.subtitle}>
              We couldn't find that tutorial. It may have been moved, removed,
              or the link may be incomplete.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const moduleStyle = getModuleBadgeStyle(lesson.module);

  return (
    <Layout>
      <div style={styles.page}>
        {usingFallback && (
          <div style={styles.infoBanner}>
            Showing the built-in tutorial content while the database-backed
            lesson is unavailable.
          </div>
        )}

        <div style={styles.heroCard}>
          <span style={styles.eyebrow}>GUIDED CYBERSECURITY LESSON</span>
          <div style={styles.badgeRow}>
            <span
              style={{
                ...styles.moduleBadge,
                background: moduleStyle.background,
                border: moduleStyle.border,
                color: moduleStyle.color,
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

          <h1 style={styles.title}>{lesson.title}</h1>
          <p style={styles.subtitle}>{lesson.summary}</p>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Estimated Time</span>
              <span style={styles.metaValue}>{lesson.estimatedTime}</span>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Module</span>
              <span style={styles.metaValue}>{lesson.module}</span>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.metaLabel}>Difficulty</span>
              <span style={styles.metaValue}>{lesson.difficulty}</span>
            </div>
          </div>
        </div>

        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Overview</h2>
          <p style={styles.bodyText}>
            {lesson.content ? `${lesson.overview}\n\n${lesson.content}` : lesson.overview}
          </p>
        </div>

        <div style={styles.sectionGrid}>
          {lesson.keyConcepts.length > 0 && (
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Key Concepts</h2>
              <ul style={styles.list}>
                {lesson.keyConcepts.map((concept) => (
                  <li key={concept} style={styles.listItem}>
                    {concept}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.whatToLookFor.length > 0 && (
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>What to Look For</h2>
              <ul style={styles.list}>
                {lesson.whatToLookFor.map((item) => (
                  <li key={item} style={styles.listItem}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Example Evidence</h2>
          <p style={styles.sectionNote}>
            Review the sample closely and practice identifying the signals that
            matter before moving into the labs.
          </p>
          <pre style={styles.evidenceBox}>{lesson.exampleEvidence}</pre>
        </div>

        <div style={styles.sectionGrid}>
          {lesson.commonMistakes.length > 0 && (
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Common Mistakes</h2>
              <ul style={styles.list}>
                {lesson.commonMistakes.map((mistake) => (
                  <li key={mistake} style={styles.listItem}>
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Practice Next</h2>
            <p style={styles.sectionNote}>
              Apply this concept in the platform with guided investigations and
              hands-on problem solving.
            </p>
            <div style={styles.practiceGrid}>
              {lesson.relatedPractice.map((practice) => (
                <Link
                  key={practice.path + practice.label}
                  to={practice.path}
                  style={styles.practiceCard}
                >
                  <span style={styles.practiceLabel}>{practice.label}</span>
                  <span style={styles.practiceCta}>Open Practice</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.navigationCard}>
          <div style={styles.navigationInfo}>
            <span style={styles.navigationLabel}>
              {courseNavigation.currentCourse?.title || "Learning Center"}
            </span>
            <span style={styles.navigationMeta}>
              {courseNavigation.currentIndex >= 0
                ? `Lesson ${String(courseNavigation.currentIndex + 1).padStart(
                    2,
                    "0"
                  )} of ${String(courseNavigation.totalLessons).padStart(2, "0")}`
                : "Continue through the learning path in order."}
            </span>
          </div>

          <div style={styles.navigationActions}>
            {courseNavigation.previousLesson ? (
              <Link
                to={`/tutorials/${courseNavigation.previousLesson.slug}`}
                style={styles.navigationButton}
              >
                Previous Lesson
              </Link>
            ) : (
              <span style={styles.navigationButtonDisabled}>Previous Lesson</span>
            )}

            {courseNavigation.currentCourse && (
              <Link
                to={`/tutorials/course/${courseNavigation.currentCourse.courseId}`}
                style={styles.navigationButtonSecondary}
              >
                Back to Course
              </Link>
            )}

            {courseNavigation.nextLesson ? (
              <Link
                to={`/tutorials/${courseNavigation.nextLesson.slug}`}
                style={styles.navigationButton}
              >
                Next Lesson
              </Link>
            ) : (
              <span style={styles.navigationButtonDisabled}>Next Lesson</span>
            )}
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
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
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
  sectionNote: {
    margin: "0 0 16px",
    color: "#94a3b8",
    lineHeight: "1.7",
  },
  bodyText: {
    color: "#dbe4f0",
    lineHeight: "1.8",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  list: {
    margin: 0,
    paddingLeft: "20px",
    color: "#dbe4f0",
  },
  listItem: {
    marginBottom: "10px",
    lineHeight: "1.75",
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
  practiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  practiceCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textDecoration: "none",
    background: "rgba(37, 99, 235, 0.12)",
    color: "#bfdbfe",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    borderRadius: "14px",
    padding: "16px",
    fontWeight: "700",
  },
  practiceLabel: {
    color: "#e0f2fe",
    fontSize: "1rem",
    fontWeight: "700",
  },
  practiceCta: {
    color: "#93c5fd",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  notFoundCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    maxWidth: "760px",
  },
  navigationCard: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "20px",
    padding: "22px 24px",
    boxShadow: "0 14px 35px rgba(0,0,0,0.2)",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  navigationInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },
  navigationLabel: {
    color: "#ffffff",
    fontSize: "1.05rem",
    fontWeight: "800",
  },
  navigationMeta: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    lineHeight: "1.6",
  },
  navigationActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  navigationButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    minWidth: "156px",
  },
  navigationButtonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    color: "#dbeafe",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    minWidth: "180px",
  },
  navigationButtonDisabled: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15, 23, 42, 0.52)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#64748b",
    padding: "12px 16px",
    borderRadius: "10px",
    fontWeight: "700",
    minWidth: "156px",
    cursor: "not-allowed",
  },
};

export default TutorialDetailsPage;
