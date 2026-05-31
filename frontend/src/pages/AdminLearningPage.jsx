import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import {
  ALLOWED_DIFFICULTIES,
  isNonNegativeNumber,
  normalizeInput,
  normalizeOptionalInput,
} from "../utils/validation";

const emptyCourseForm = {
  title: "",
  description: "",
  module: "",
  difficulty: "",
  estimated_time: "",
  course_order: "0",
};

const emptyLessonForm = {
  title: "",
  slug: "",
  overview: "",
  content: "",
  key_concepts: "",
  example_evidence: "",
  common_mistakes: "",
  related_module: "",
  related_practice_url: "",
  difficulty: "",
  estimated_time: "",
  lesson_order: "0",
};

function AdminLearningPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  useEffect(() => {
    fetchAdminCourses();
  }, [navigate]);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => Number(course.course_id) === Number(selectedCourseId)
      ) || null,
    [courses, selectedCourseId]
  );

  const fetchAdminCourses = async () => {
    try {
      const response = await authFetch(
        "http://localhost:5000/api/learning/admin/courses",
        {},
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to fetch learning center content.");
        setIsSuccess(false);
        return;
      }

      const nextCourses = data.data || [];
      setCourses(nextCourses);

      if (selectedCourseId) {
        const stillExists = nextCourses.some(
          (course) => Number(course.course_id) === Number(selectedCourseId)
        );

        if (!stillExists) {
          setSelectedCourseId(null);
          setEditingLessonId(null);
          setLessonForm(emptyLessonForm);
        }
      }
    } catch (error) {
      console.error("Fetch admin learning courses error:", error);
      setMessage("Failed to load learning center content.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (event) => {
    setCourseForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleLessonChange = (event) => {
    setLessonForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const resetCourseForm = () => {
    setCourseForm(emptyCourseForm);
    setEditingCourseId(null);
  };

  const resetLessonForm = () => {
    setLessonForm(emptyLessonForm);
    setEditingLessonId(null);
  };

  const validateCourseForm = () => {
    const title = normalizeInput(courseForm.title);
    const difficulty = normalizeInput(courseForm.difficulty);

    if (!title) {
      return "Course title is required.";
    }

    if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return "Course difficulty must be Easy, Medium, or Hard.";
    }

    if (!isNonNegativeNumber(courseForm.course_order)) {
      return "Course order must be a non-negative number.";
    }

    return "";
  };

  const validateLessonForm = () => {
    const title = normalizeInput(lessonForm.title);
    const slug = normalizeInput(lessonForm.slug).toLowerCase();
    const difficulty = normalizeInput(lessonForm.difficulty);

    if (!selectedCourseId) {
      return "Select a course before saving a lesson.";
    }

    if (!title) {
      return "Lesson title is required.";
    }

    if (!slug) {
      return "Lesson slug is required.";
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return "Lesson slug may contain only lowercase letters, numbers, and hyphens.";
    }

    if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return "Lesson difficulty must be Easy, Medium, or Hard.";
    }

    if (
      normalizeInput(lessonForm.related_practice_url) &&
      !normalizeInput(lessonForm.related_practice_url).startsWith("/")
    ) {
      return "Related practice URL must start with /.";
    }

    if (!isNonNegativeNumber(lessonForm.lesson_order)) {
      return "Lesson order must be a non-negative number.";
    }

    return "";
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const validationError = validateCourseForm();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const url = editingCourseId
      ? `http://localhost:5000/api/learning/admin/courses/${editingCourseId}`
      : "http://localhost:5000/api/learning/admin/courses";
    const method = editingCourseId ? "PUT" : "POST";

    try {
      const response = await authFetch(
        url,
        {
          method,
          body: JSON.stringify({
            title: normalizeInput(courseForm.title),
            description: normalizeOptionalInput(courseForm.description),
            module: normalizeOptionalInput(courseForm.module),
            difficulty: normalizeOptionalInput(courseForm.difficulty),
            estimated_time: normalizeOptionalInput(courseForm.estimated_time),
            course_order: Number(courseForm.course_order),
          }),
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            (editingCourseId
              ? "Failed to update course."
              : "Failed to create course.")
        );
        return;
      }

      setMessage(
        data.message ||
          (editingCourseId
            ? "Course updated successfully."
            : "Course created successfully.")
      );
      setIsSuccess(true);

      if (!editingCourseId && data.data?.course_id) {
        setSelectedCourseId(data.data.course_id);
      }

      resetCourseForm();
      fetchAdminCourses();
    } catch (error) {
      console.error("Save learning course error:", error);
      setMessage("Server error.");
      setIsSuccess(false);
    }
  };

  const handleLessonSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const validationError = validateLessonForm();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const url = editingLessonId
      ? `http://localhost:5000/api/learning/admin/lessons/${editingLessonId}`
      : `http://localhost:5000/api/learning/admin/courses/${selectedCourseId}/lessons`;
    const method = editingLessonId ? "PUT" : "POST";

    try {
      const response = await authFetch(
        url,
        {
          method,
          body: JSON.stringify({
            title: normalizeInput(lessonForm.title),
            slug: normalizeInput(lessonForm.slug).toLowerCase(),
            overview: normalizeOptionalInput(lessonForm.overview),
            content: normalizeOptionalInput(lessonForm.content),
            key_concepts: lessonForm.key_concepts,
            example_evidence: normalizeOptionalInput(lessonForm.example_evidence),
            common_mistakes: lessonForm.common_mistakes,
            related_module: normalizeOptionalInput(lessonForm.related_module),
            related_practice_url: normalizeOptionalInput(
              lessonForm.related_practice_url
            ),
            difficulty: normalizeOptionalInput(lessonForm.difficulty),
            estimated_time: normalizeOptionalInput(lessonForm.estimated_time),
            lesson_order: Number(lessonForm.lesson_order),
          }),
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            (editingLessonId
              ? "Failed to update lesson."
              : "Failed to create lesson.")
        );
        return;
      }

      setMessage(
        data.message ||
          (editingLessonId
            ? "Lesson updated successfully."
            : "Lesson created successfully.")
      );
      setIsSuccess(true);

      resetLessonForm();
      fetchAdminCourses();
    } catch (error) {
      console.error("Save learning lesson error:", error);
      setMessage("Server error.");
      setIsSuccess(false);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.course_id);
    setCourseForm({
      title: course.title || "",
      description: course.description || "",
      module: course.module || "",
      difficulty: course.difficulty || "",
      estimated_time: course.estimated_time || "",
      course_order: String(course.course_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditLesson = (courseId, lesson) => {
    setSelectedCourseId(courseId);
    setEditingLessonId(lesson.lesson_id);
    setLessonForm({
      title: lesson.title || "",
      slug: lesson.slug || "",
      overview: lesson.overview || "",
      content: lesson.content || "",
      key_concepts: lesson.key_concepts_text || "",
      example_evidence: lesson.example_evidence || "",
      common_mistakes: lesson.common_mistakes_text || "",
      related_module: lesson.related_module || "",
      related_practice_url: lesson.related_practice_url || "",
      difficulty: lesson.difficulty || "",
      estimated_time: lesson.estimated_time || "",
      lesson_order: String(lesson.lesson_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmed = window.confirm(
      "Deactivate this course? It will no longer appear in the user Learning Center."
    );

    if (!confirmed) return;

    setMessage("");
    setIsSuccess(false);

    try {
      const response = await authFetch(
        `http://localhost:5000/api/learning/admin/courses/${courseId}`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to deactivate course.");
        return;
      }

      if (editingCourseId === courseId) {
        resetCourseForm();
      }

      if (Number(selectedCourseId) === Number(courseId)) {
        setSelectedCourseId(null);
        resetLessonForm();
      }

      setMessage(data.message || "Course deactivated successfully.");
      setIsSuccess(true);
      fetchAdminCourses();
    } catch (error) {
      console.error("Delete learning course error:", error);
      setMessage("Server error.");
      setIsSuccess(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    const confirmed = window.confirm(
      "Deactivate this lesson? It will no longer appear in the user Learning Center."
    );

    if (!confirmed) return;

    setMessage("");
    setIsSuccess(false);

    try {
      const response = await authFetch(
        `http://localhost:5000/api/learning/admin/lessons/${lessonId}`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to deactivate lesson.");
        return;
      }

      if (editingLessonId === lessonId) {
        resetLessonForm();
      }

      setMessage(data.message || "Lesson deactivated successfully.");
      setIsSuccess(true);
      fetchAdminCourses();
    } catch (error) {
      console.error("Delete learning lesson error:", error);
      setMessage("Server error.");
      setIsSuccess(false);
    }
  };

  const handlePrepareNewLesson = (course) => {
    setSelectedCourseId(course.course_id);
    setEditingLessonId(null);
    setLessonForm({
      ...emptyLessonForm,
      related_module: course.module || "",
      difficulty: course.difficulty || "",
      estimated_time: course.estimated_time || "",
      lesson_order: String(course.lessons?.length || 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMoveLesson = async (course, lessonIndex, direction) => {
    const lessons = [...(course.lessons || [])].sort(
      (a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0)
    );
    const targetIndex = lessonIndex + direction;

    if (targetIndex < 0 || targetIndex >= lessons.length) {
      return;
    }

    const [movedLesson] = lessons.splice(lessonIndex, 1);
    lessons.splice(targetIndex, 0, movedLesson);

    try {
      const response = await authFetch(
        `http://localhost:5000/api/learning/admin/courses/${course.course_id}/lessons/reorder`,
        {
          method: "PUT",
          body: JSON.stringify({
            lessonIds: lessons.map((lesson) => lesson.lesson_id),
          }),
        },
        navigate
      );

      if (!response) return;

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to reorder lessons.");
        setIsSuccess(false);
        return;
      }

      setMessage(data.message || "Lessons reordered successfully.");
      setIsSuccess(true);
      fetchAdminCourses();
    } catch (error) {
      console.error("Reorder lessons error:", error);
      setMessage("Server error.");
      setIsSuccess(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.header}>
            <div>
              <span style={styles.eyebrow}>Database-Backed Content Admin</span>
              <h1 style={styles.title}>Manage Learning Center</h1>
              <p style={styles.subtitle}>
                Create and organize learning paths, publish lessons, and
                control the order learners see them in the Learning Center.
              </p>
            </div>

            <div style={styles.headerMeta}>
              <div style={styles.metaCard}>
                <span style={styles.metaValue}>{courses.length}</span>
                <span style={styles.metaLabel}>Courses</span>
              </div>
              <div style={styles.metaCard}>
                <span style={styles.metaValue}>
                  {courses.reduce(
                    (count, course) => count + (course.lessons?.length || 0),
                    0
                  )}
                </span>
                <span style={styles.metaLabel}>Lessons</span>
              </div>
            </div>
          </div>

          {message && (
            <div
              style={{
                ...styles.messageBox,
                backgroundColor: isSuccess
                  ? "rgba(22, 163, 74, 0.14)"
                  : "rgba(239, 68, 68, 0.14)",
                borderColor: isSuccess
                  ? "rgba(34, 197, 94, 0.28)"
                  : "rgba(248, 113, 113, 0.28)",
                color: isSuccess ? "#bbf7d0" : "#fecaca",
              }}
            >
              {message}
            </div>
          )}

          <div style={styles.formGrid}>
            <section style={styles.formCard}>
              <div style={styles.formCardHeader}>
                <h2 style={styles.formTitle}>
                  {editingCourseId ? "Edit Course" : "Add Course"}
                </h2>
                {editingCourseId && (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={resetCourseForm}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleCourseSubmit} style={styles.form}>
              <label style={styles.label}>
                Course Title
                <input
                  name="title"
                  value={courseForm.title}
                  onChange={handleCourseChange}
                  style={styles.input}
                />
              </label>

              <label style={styles.label}>
                Description
                <textarea
                  name="description"
                  value={courseForm.description}
                  onChange={handleCourseChange}
                  rows={4}
                  style={styles.textarea}
                />
              </label>

              <div style={styles.twoColGrid}>
                <label style={styles.label}>
                  Module
                  <input
                    name="module"
                    value={courseForm.module}
                    onChange={handleCourseChange}
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Difficulty
                  <select
                    name="difficulty"
                    value={courseForm.difficulty}
                    onChange={handleCourseChange}
                    style={styles.select}
                  >
                    <option value="">Select difficulty</option>
                    {ALLOWED_DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.twoColGrid}>
                <label style={styles.label}>
                  Estimated Time
                  <input
                    name="estimated_time"
                    value={courseForm.estimated_time}
                    onChange={handleCourseChange}
                    style={styles.input}
                    placeholder="27 min"
                  />
                </label>

                <label style={styles.label}>
                  Course Order
                  <input
                    name="course_order"
                    value={courseForm.course_order}
                    onChange={handleCourseChange}
                    style={styles.input}
                    type="number"
                    min="0"
                  />
                </label>
              </div>

                <button type="submit" style={styles.primaryButton}>
                  {editingCourseId ? "Save Course" : "Add Course"}
                </button>
              </form>
            </section>

            <section style={styles.formCard}>
            <div style={styles.formCardHeader}>
              <div>
                <h2 style={styles.formTitle}>
                  {editingLessonId ? "Edit Lesson" : "Add Lesson"}
                </h2>
                <p style={styles.formSubtitle}>
                  {selectedCourse
                    ? `Selected course: ${selectedCourse.title}`
                    : "Choose a course below before creating a lesson."}
                </p>
              </div>

              {editingLessonId && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={resetLessonForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleLessonSubmit} style={styles.form}>
              <div style={styles.twoColGrid}>
                <label style={styles.label}>
                  Lesson Title
                  <input
                    name="title"
                    value={lessonForm.title}
                    onChange={handleLessonChange}
                    style={styles.input}
                    disabled={!selectedCourseId}
                  />
                </label>

                <label style={styles.label}>
                  Slug
                  <input
                    name="slug"
                    value={lessonForm.slug}
                    onChange={handleLessonChange}
                    style={styles.input}
                    disabled={!selectedCourseId}
                    placeholder="brute-force-detection"
                  />
                </label>
              </div>

              <label style={styles.label}>
                Overview
                <textarea
                  name="overview"
                  value={lessonForm.overview}
                  onChange={handleLessonChange}
                  rows={3}
                  style={styles.textarea}
                  disabled={!selectedCourseId}
                />
              </label>

              <label style={styles.label}>
                Content
                <textarea
                  name="content"
                  value={lessonForm.content}
                  onChange={handleLessonChange}
                  rows={4}
                  style={styles.textarea}
                  disabled={!selectedCourseId}
                />
              </label>

              <label style={styles.label}>
                Key Concepts
                <textarea
                  name="key_concepts"
                  value={lessonForm.key_concepts}
                  onChange={handleLessonChange}
                  rows={4}
                  style={styles.textarea}
                  disabled={!selectedCourseId}
                  placeholder="One concept per line"
                />
              </label>

              <label style={styles.label}>
                Example Evidence
                <textarea
                  name="example_evidence"
                  value={lessonForm.example_evidence}
                  onChange={handleLessonChange}
                  rows={4}
                  style={styles.textarea}
                  disabled={!selectedCourseId}
                />
              </label>

              <label style={styles.label}>
                Common Mistakes
                <textarea
                  name="common_mistakes"
                  value={lessonForm.common_mistakes}
                  onChange={handleLessonChange}
                  rows={4}
                  style={styles.textarea}
                  disabled={!selectedCourseId}
                  placeholder="One mistake per line"
                />
              </label>

              <div style={styles.twoColGrid}>
                <label style={styles.label}>
                  Related Module
                  <input
                    name="related_module"
                    value={lessonForm.related_module}
                    onChange={handleLessonChange}
                    style={styles.input}
                    disabled={!selectedCourseId}
                  />
                </label>

                <label style={styles.label}>
                  Related Practice URL
                  <input
                    name="related_practice_url"
                    value={lessonForm.related_practice_url}
                    onChange={handleLessonChange}
                    style={styles.input}
                    disabled={!selectedCourseId}
                    placeholder="/soc-cases"
                  />
                </label>
              </div>

              <div style={styles.threeColGrid}>
                <label style={styles.label}>
                  Difficulty
                  <select
                    name="difficulty"
                    value={lessonForm.difficulty}
                    onChange={handleLessonChange}
                    style={styles.select}
                    disabled={!selectedCourseId}
                  >
                    <option value="">Select difficulty</option>
                    {ALLOWED_DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Estimated Time
                  <input
                    name="estimated_time"
                    value={lessonForm.estimated_time}
                    onChange={handleLessonChange}
                    style={styles.input}
                    disabled={!selectedCourseId}
                    placeholder="8 min"
                  />
                </label>

                <label style={styles.label}>
                  Lesson Order
                  <input
                    name="lesson_order"
                    value={lessonForm.lesson_order}
                    onChange={handleLessonChange}
                    style={styles.input}
                    type="number"
                    min="0"
                    disabled={!selectedCourseId}
                  />
                </label>
              </div>

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={!selectedCourseId}
              >
                {editingLessonId ? "Save Lesson" : "Add Lesson"}
              </button>
            </form>
            </section>
          </div>

          <div style={styles.courseStack}>
            {loading ? (
              <div style={styles.loadingCard}>Loading learning content...</div>
            ) : (
              courses.map((course) => {
                const sortedLessons = [...(course.lessons || [])].sort(
                  (a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0)
                );

                return (
                  <section
                    key={course.course_id}
                    style={{
                      ...styles.courseCard,
                      opacity: course.is_active === false ? 0.7 : 1,
                    }}
                  >
                  <div style={styles.courseHeader}>
                    <div>
                      <div style={styles.courseStatusRow}>
                        <span style={styles.courseBadge}>
                          {course.module || "Learning Center"}
                        </span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor:
                              course.is_active === false
                                ? "rgba(239, 68, 68, 0.14)"
                                : "rgba(22, 163, 74, 0.14)",
                            color:
                              course.is_active === false ? "#fecaca" : "#bbf7d0",
                            borderColor:
                              course.is_active === false
                                ? "rgba(248, 113, 113, 0.24)"
                                : "rgba(74, 222, 128, 0.24)",
                          }}
                        >
                          {course.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </div>

                      <h2 style={styles.courseTitle}>{course.title}</h2>
                      <p style={styles.courseDescription}>
                        {course.description || "No course description yet."}
                      </p>
                      <div style={styles.courseMetaRow}>
                        <span style={styles.courseMetaItem}>
                          Difficulty: {course.difficulty || "Not set"}
                        </span>
                        <span style={styles.courseMetaItem}>
                          Estimated Time: {course.estimated_time || "Not set"}
                        </span>
                        <span style={styles.courseMetaItem}>
                          Order: {course.course_order ?? 0}
                        </span>
                      </div>
                    </div>

                    <div style={styles.courseActions}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => handleEditCourse(course)}
                      >
                        Edit Course
                      </button>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => handlePrepareNewLesson(course)}
                      >
                        Add Lesson
                      </button>
                      <button
                        type="button"
                        style={styles.dangerButton}
                        onClick={() => handleDeleteCourse(course.course_id)}
                      >
                        Deactivate Course
                      </button>
                    </div>
                  </div>

                  <div style={styles.lessonGrid}>
                    {sortedLessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.lesson_id}
                        style={{
                          ...styles.lessonCard,
                          opacity: lesson.is_active === false ? 0.72 : 1,
                        }}
                      >
                        <div style={styles.lessonTop}>
                          <span style={styles.lessonOrderBadge}>
                            Lesson {(lesson.lesson_order ?? lessonIndex) + 1}
                          </span>
                          <span
                            style={{
                              ...styles.statusBadge,
                              backgroundColor:
                                lesson.is_active === false
                                  ? "rgba(239, 68, 68, 0.14)"
                                  : "rgba(37, 99, 235, 0.14)",
                              color:
                                lesson.is_active === false
                                  ? "#fecaca"
                                  : "#bfdbfe",
                              borderColor:
                                lesson.is_active === false
                                  ? "rgba(248, 113, 113, 0.24)"
                                  : "rgba(96, 165, 250, 0.24)",
                            }}
                          >
                            {lesson.is_active === false ? "Inactive" : "Published"}
                          </span>
                        </div>

                        <h3 style={styles.lessonTitle}>{lesson.title}</h3>
                        <p style={styles.lessonMetaText}>
                          Slug: {lesson.slug}
                        </p>
                        <p style={styles.lessonMetaText}>
                          Difficulty: {lesson.difficulty || "Not set"}
                        </p>
                        <p style={styles.lessonMetaText}>
                          Estimated Time: {lesson.estimated_time || "Not set"}
                        </p>
                        <p style={styles.lessonMetaText}>
                          Related Module: {lesson.related_module || "Not set"}
                        </p>

                        <div style={styles.lessonActionRow}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() =>
                              handleMoveLesson(course, lessonIndex, -1)
                            }
                            disabled={lessonIndex === 0}
                          >
                            Move Up
                          </button>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() =>
                              handleMoveLesson(course, lessonIndex, 1)
                            }
                            disabled={lessonIndex === sortedLessons.length - 1}
                          >
                            Move Down
                          </button>
                        </div>

                        <div style={styles.lessonActionRow}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() =>
                              handleEditLesson(course.course_id, lesson)
                            }
                          >
                            Edit Lesson
                          </button>
                          <button
                            type="button"
                            style={styles.dangerButton}
                            onClick={() => handleDeleteLesson(lesson.lesson_id)}
                          >
                            Deactivate Lesson
                          </button>
                        </div>
                      </div>
                    ))}

                    {sortedLessons.length === 0 && (
                      <div style={styles.emptyLessonCard}>
                        No lessons have been added to this course yet.
                      </div>
                    )}
                  </div>
                  </section>
                );
              })
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
    padding: "32px 20px 40px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  wrapper: {
    maxWidth: "1240px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    marginBottom: "14px",
    background: "rgba(59, 130, 246, 0.14)",
    border: "1px solid rgba(96, 165, 250, 0.22)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "44px",
    lineHeight: "1.05",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    maxWidth: "760px",
    color: "#cbd5e1",
    lineHeight: "1.75",
    fontSize: "16px",
  },
  headerMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
    minWidth: "300px",
    width: "320px",
    maxWidth: "100%",
  },
  metaCard: {
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  metaValue: {
    color: "#ffffff",
    fontSize: "1.55rem",
    fontWeight: "800",
  },
  metaLabel: {
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  messageBox: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid",
    lineHeight: "1.7",
    fontWeight: "600",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  formCard: {
    background: "rgba(15, 23, 42, 0.94)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 18px 36px rgba(0,0,0,0.18)",
  },
  formCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  formTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.45rem",
  },
  formSubtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
    lineHeight: "1.6",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#dbeafe",
    fontWeight: "600",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },
  threeColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
  },
  primaryButton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "rgba(30, 41, 59, 0.78)",
    color: "#dbeafe",
    fontWeight: "700",
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid rgba(248, 113, 113, 0.24)",
    borderRadius: "10px",
    padding: "10px 14px",
    background: "rgba(127, 29, 29, 0.78)",
    color: "#fecaca",
    fontWeight: "700",
    cursor: "pointer",
  },
  courseStack: {
    display: "grid",
    gap: "22px",
  },
  loadingCard: {
    background: "rgba(15, 23, 42, 0.94)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "22px",
    color: "#dbeafe",
    fontWeight: "600",
  },
  courseCard: {
    background: "rgba(15, 23, 42, 0.94)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 18px 36px rgba(0,0,0,0.18)",
  },
  courseHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  courseStatusRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  courseBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.14)",
    border: "1px solid rgba(96, 165, 250, 0.22)",
    color: "#bfdbfe",
    fontSize: "13px",
    fontWeight: "700",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },
  courseTitle: {
    margin: "0 0 8px",
    color: "#ffffff",
    fontSize: "1.75rem",
  },
  courseDescription: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.7",
    maxWidth: "760px",
  },
  courseMetaRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "12px",
  },
  courseMetaItem: {
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: "600",
  },
  courseActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  lessonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  lessonCard: {
    background: "rgba(2, 6, 23, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    minHeight: "245px",
  },
  lessonTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  lessonOrderBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 11px",
    borderRadius: "999px",
    background: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.18)",
    color: "#bae6fd",
    fontSize: "12px",
    fontWeight: "700",
  },
  lessonTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "1.15rem",
    lineHeight: "1.4",
  },
  lessonMetaText: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.55",
    fontSize: "14px",
  },
  lessonActionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "auto",
  },
  emptyLessonCard: {
    background: "rgba(2, 6, 23, 0.54)",
    border: "1px dashed rgba(148, 163, 184, 0.22)",
    borderRadius: "18px",
    padding: "20px",
    color: "#94a3b8",
    lineHeight: "1.7",
  },
};

export default AdminLearningPage;
