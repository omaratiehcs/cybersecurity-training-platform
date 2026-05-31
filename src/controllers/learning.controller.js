const { sql, pool } = require("../config/db");
const {
  ALLOWED_DIFFICULTIES,
  MAX_TITLE_LENGTH,
  normalizeOptionalString,
  normalizeString,
  isNonNegativeNumber,
  parsePositiveInt,
} = require("../utils/validation");
const {
  warnMalformedInput,
  warnInvalidId,
  warnSuspiciousFields,
} = require("../utils/security");

const MAX_SLUG_LENGTH = 150;

const normalizeSlug = (value) => normalizeString(value).toLowerCase();

const isValidSlug = (value) => /^[a-z0-9-]+$/.test(value);

const parseTextListInput = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeString(String(item)))
        .filter(Boolean);
    }
  } catch (_error) {
    // Fall back to line-based parsing.
  }

  return trimmed
    .split(/\r?\n/)
    .map((item) => normalizeString(item))
    .filter(Boolean);
};

const stringifyTextListInput = (value) => {
  const normalizedList = parseTextListInput(value);
  return normalizedList.length > 0 ? JSON.stringify(normalizedList) : null;
};

const parseStoredTextList = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeString(String(item)))
        .filter(Boolean);
    }
  } catch (_error) {
    // Fall back to line-based parsing.
  }

  return value
    .split(/\r?\n/)
    .map((item) => normalizeString(item))
    .filter(Boolean);
};

const listToTextareaValue = (value) => parseStoredTextList(value).join("\n");

const normalizePracticeUrl = (value) => {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.startsWith("/") ? normalizedValue : null;
};

const formatLessonRecord = (lesson, includeAdminText = false) => {
  const formattedLesson = {
    ...lesson,
    key_concepts: parseStoredTextList(lesson.key_concepts),
    common_mistakes: parseStoredTextList(lesson.common_mistakes),
    what_to_look_for: [],
  };

  if (includeAdminText) {
    formattedLesson.key_concepts_text = listToTextareaValue(lesson.key_concepts);
    formattedLesson.common_mistakes_text = listToTextareaValue(
      lesson.common_mistakes
    );
  }

  return formattedLesson;
};

const buildCourseMap = (courses, lessons, includeAdminText = false) => {
  const courseMap = new Map(
    courses.map((course) => [
      course.course_id,
      {
        ...course,
        lessons: [],
      },
    ])
  );

  lessons.forEach((lesson) => {
    const course = courseMap.get(lesson.course_id);

    if (!course) {
      return;
    }

    course.lessons.push(formatLessonRecord(lesson, includeAdminText));
  });

  return Array.from(courseMap.values());
};

const validateCoursePayload = (req, payload) => {
  const title = normalizeString(payload.title);
  const description = normalizeOptionalString(payload.description);
  const moduleName = normalizeOptionalString(payload.module);
  const difficulty = normalizeOptionalString(payload.difficulty);
  const estimatedTime = normalizeOptionalString(payload.estimated_time);
  const courseOrder = Number(payload.course_order);

  warnSuspiciousFields(req, "learning.course", {
    title: payload.title,
    description: payload.description,
    module: payload.module,
    estimated_time: payload.estimated_time,
  });

  if (!title) {
    warnMalformedInput(req, "learning.course", { field: "title" });
    return { error: "Title is required." };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }

  if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
    return { error: "Difficulty must be Easy, Medium, or Hard." };
  }

  if (!isNonNegativeNumber(courseOrder)) {
    return { error: "Course order must be a non-negative integer." };
  }

  return {
    value: {
      title,
      description,
      moduleName,
      difficulty,
      estimatedTime,
      courseOrder,
    },
  };
};

const validateLessonPayload = (req, payload) => {
  const title = normalizeString(payload.title);
  const slug = normalizeSlug(payload.slug);
  const overview = normalizeOptionalString(payload.overview);
  const content = normalizeOptionalString(payload.content);
  const keyConcepts = stringifyTextListInput(payload.key_concepts);
  const exampleEvidence = normalizeOptionalString(payload.example_evidence);
  const commonMistakes = stringifyTextListInput(payload.common_mistakes);
  const relatedModule = normalizeOptionalString(payload.related_module);
  const relatedPracticeUrl = normalizePracticeUrl(payload.related_practice_url);
  const difficulty = normalizeOptionalString(payload.difficulty);
  const estimatedTime = normalizeOptionalString(payload.estimated_time);
  const lessonOrder = Number(payload.lesson_order);

  warnSuspiciousFields(req, "learning.lesson", {
    title: payload.title,
    slug: payload.slug,
    overview: payload.overview,
    content: payload.content,
    example_evidence: payload.example_evidence,
    related_module: payload.related_module,
    related_practice_url: payload.related_practice_url,
  });

  if (!title) {
    warnMalformedInput(req, "learning.lesson", { field: "title" });
    return { error: "Title is required." };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }

  if (!slug) {
    warnMalformedInput(req, "learning.lesson", { field: "slug" });
    return { error: "Slug is required." };
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    return { error: `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.` };
  }

  if (!isValidSlug(slug)) {
    return {
      error: "Slug may contain only lowercase letters, numbers, and hyphens.",
    };
  }

  if (difficulty && !ALLOWED_DIFFICULTIES.includes(difficulty)) {
    return { error: "Difficulty must be Easy, Medium, or Hard." };
  }

  if (!isNonNegativeNumber(lessonOrder)) {
    return { error: "Lesson order must be a non-negative integer." };
  }

  if (payload.related_practice_url && !relatedPracticeUrl) {
    return { error: "Related practice URL must start with /." };
  }

  return {
    value: {
      title,
      slug,
      overview,
      content,
      keyConcepts,
      exampleEvidence,
      commonMistakes,
      relatedModule,
      relatedPracticeUrl,
      difficulty,
      estimatedTime,
      lessonOrder,
    },
  };
};

const getLearningCourses = async (_req, res) => {
  try {
    const coursesResult = await pool.request().query(`
      SELECT
        course_id,
        title,
        description,
        module,
        difficulty,
        estimated_time,
        course_order,
        is_active,
        created_at,
        updated_at
      FROM LEARNING_COURSE
      WHERE is_active = 1
      ORDER BY course_order ASC, course_id ASC
    `);

    const lessonsResult = await pool.request().query(`
      SELECT
        lesson_id,
        course_id,
        title,
        slug,
        overview,
        content,
        key_concepts,
        example_evidence,
        common_mistakes,
        related_module,
        related_practice_url,
        difficulty,
        estimated_time,
        lesson_order,
        is_active,
        created_at,
        updated_at
      FROM LEARNING_LESSON
      WHERE is_active = 1
      ORDER BY lesson_order ASC, lesson_id ASC
    `);

    const courses = buildCourseMap(
      coursesResult.recordset,
      lessonsResult.recordset,
      false
    ).filter((course) => course.is_active === true || course.is_active === 1);

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Get learning courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch learning center courses.",
    });
  }
};

const getLearningLessonBySlug = async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);

    if (!slug || !isValidSlug(slug)) {
      warnMalformedInput(req, "learning.lesson.getBySlug", {
        slug: req.params.slug,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid lesson identifier.",
      });
    }

    const result = await pool.request()
      .input("slug", sql.NVarChar(150), slug)
      .query(`
        SELECT TOP 1
          l.lesson_id,
          l.course_id,
          c.title AS course_title,
          c.module AS course_module,
          l.title,
          l.slug,
          l.overview,
          l.content,
          l.key_concepts,
          l.example_evidence,
          l.common_mistakes,
          l.related_module,
          l.related_practice_url,
          l.difficulty,
          l.estimated_time,
          l.lesson_order,
          l.is_active,
          l.created_at,
          l.updated_at
        FROM LEARNING_LESSON l
        INNER JOIN LEARNING_COURSE c
          ON c.course_id = l.course_id
        WHERE l.slug = @slug
          AND l.is_active = 1
          AND c.is_active = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: formatLessonRecord(result.recordset[0], false),
    });
  } catch (error) {
    console.error("Get learning lesson by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch learning lesson.",
    });
  }
};

const getAdminLearningCourses = async (_req, res) => {
  try {
    const coursesResult = await pool.request().query(`
      SELECT
        course_id,
        title,
        description,
        module,
        difficulty,
        estimated_time,
        course_order,
        is_active,
        created_at,
        updated_at
      FROM LEARNING_COURSE
      ORDER BY is_active DESC, course_order ASC, course_id ASC
    `);

    const lessonsResult = await pool.request().query(`
      SELECT
        lesson_id,
        course_id,
        title,
        slug,
        overview,
        content,
        key_concepts,
        example_evidence,
        common_mistakes,
        related_module,
        related_practice_url,
        difficulty,
        estimated_time,
        lesson_order,
        is_active,
        created_at,
        updated_at
      FROM LEARNING_LESSON
      ORDER BY is_active DESC, lesson_order ASC, lesson_id ASC
    `);

    res.status(200).json({
      success: true,
      data: buildCourseMap(
        coursesResult.recordset,
        lessonsResult.recordset,
        true
      ),
    });
  } catch (error) {
    console.error("Get admin learning courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin learning courses.",
    });
  }
};

const createLearningCourse = async (req, res) => {
  try {
    const validation = validateCoursePayload(req, req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const { title, description, moduleName, difficulty, estimatedTime, courseOrder } =
      validation.value;

    const result = await pool.request()
      .input("title", sql.NVarChar(150), title)
      .input("description", sql.NVarChar(sql.MAX), description)
      .input("module", sql.NVarChar(80), moduleName)
      .input("difficulty", sql.NVarChar(20), difficulty)
      .input("estimated_time", sql.NVarChar(50), estimatedTime)
      .input("course_order", sql.Int, courseOrder)
      .query(`
        INSERT INTO LEARNING_COURSE (
          title,
          description,
          module,
          difficulty,
          estimated_time,
          course_order,
          is_active,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.course_id,
               INSERTED.title,
               INSERTED.description,
               INSERTED.module,
               INSERTED.difficulty,
               INSERTED.estimated_time,
               INSERTED.course_order,
               INSERTED.is_active,
               INSERTED.created_at,
               INSERTED.updated_at
        VALUES (
          @title,
          @description,
          @module,
          @difficulty,
          @estimated_time,
          @course_order,
          1,
          GETDATE(),
          NULL
        )
      `);

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: {
        ...result.recordset[0],
        lessons: [],
      },
    });
  } catch (error) {
    console.error("Create learning course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create learning course.",
    });
  }
};

const updateLearningCourse = async (req, res) => {
  try {
    const courseId = parsePositiveInt(req.params.courseId);

    if (!courseId) {
      warnInvalidId(req, "learning.course.update", req.params.courseId);
      return res.status(400).json({
        success: false,
        message: "Invalid course identifier.",
      });
    }

    const validation = validateCoursePayload(req, req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const checkResult = await pool.request()
      .input("course_id", sql.Int, courseId)
      .query(`
        SELECT course_id
        FROM LEARNING_COURSE
        WHERE course_id = @course_id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const { title, description, moduleName, difficulty, estimatedTime, courseOrder } =
      validation.value;

    const result = await pool.request()
      .input("course_id", sql.Int, courseId)
      .input("title", sql.NVarChar(150), title)
      .input("description", sql.NVarChar(sql.MAX), description)
      .input("module", sql.NVarChar(80), moduleName)
      .input("difficulty", sql.NVarChar(20), difficulty)
      .input("estimated_time", sql.NVarChar(50), estimatedTime)
      .input("course_order", sql.Int, courseOrder)
      .query(`
        UPDATE LEARNING_COURSE
        SET
          title = @title,
          description = @description,
          module = @module,
          difficulty = @difficulty,
          estimated_time = @estimated_time,
          course_order = @course_order,
          updated_at = GETDATE()
        WHERE course_id = @course_id;

        SELECT
          course_id,
          title,
          description,
          module,
          difficulty,
          estimated_time,
          course_order,
          is_active,
          created_at,
          updated_at
        FROM LEARNING_COURSE
        WHERE course_id = @course_id;
      `);

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: {
        ...result.recordset[0],
      },
    });
  } catch (error) {
    console.error("Update learning course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update learning course.",
    });
  }
};

const deleteLearningCourse = async (req, res) => {
  try {
    const courseId = parsePositiveInt(req.params.courseId);

    if (!courseId) {
      warnInvalidId(req, "learning.course.delete", req.params.courseId);
      return res.status(400).json({
        success: false,
        message: "Invalid course identifier.",
      });
    }

    const result = await pool.request()
      .input("course_id", sql.Int, courseId)
      .query(`
        UPDATE LEARNING_COURSE
        SET
          is_active = 0,
          updated_at = GETDATE()
        WHERE course_id = @course_id;

        SELECT @@ROWCOUNT AS affected_rows;
      `);

    const affectedRows = result.recordset[0]?.affected_rows || 0;

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete learning course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate learning course.",
    });
  }
};

const createLearningLesson = async (req, res) => {
  try {
    const courseId = parsePositiveInt(req.params.courseId);

    if (!courseId) {
      warnInvalidId(req, "learning.lesson.create", req.params.courseId);
      return res.status(400).json({
        success: false,
        message: "Invalid course identifier.",
      });
    }

    const validation = validateLessonPayload(req, req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const courseCheck = await pool.request()
      .input("course_id", sql.Int, courseId)
      .query(`
        SELECT course_id
        FROM LEARNING_COURSE
        WHERE course_id = @course_id
      `);

    if (courseCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const {
      title,
      slug,
      overview,
      content,
      keyConcepts,
      exampleEvidence,
      commonMistakes,
      relatedModule,
      relatedPracticeUrl,
      difficulty,
      estimatedTime,
      lessonOrder,
    } = validation.value;

    const result = await pool.request()
      .input("course_id", sql.Int, courseId)
      .input("title", sql.NVarChar(150), title)
      .input("slug", sql.NVarChar(150), slug)
      .input("overview", sql.NVarChar(sql.MAX), overview)
      .input("content", sql.NVarChar(sql.MAX), content)
      .input("key_concepts", sql.NVarChar(sql.MAX), keyConcepts)
      .input("example_evidence", sql.NVarChar(sql.MAX), exampleEvidence)
      .input("common_mistakes", sql.NVarChar(sql.MAX), commonMistakes)
      .input("related_module", sql.NVarChar(80), relatedModule)
      .input("related_practice_url", sql.NVarChar(255), relatedPracticeUrl)
      .input("difficulty", sql.NVarChar(20), difficulty)
      .input("estimated_time", sql.NVarChar(50), estimatedTime)
      .input("lesson_order", sql.Int, lessonOrder)
      .query(`
        INSERT INTO LEARNING_LESSON (
          course_id,
          title,
          slug,
          overview,
          content,
          key_concepts,
          example_evidence,
          common_mistakes,
          related_module,
          related_practice_url,
          difficulty,
          estimated_time,
          lesson_order,
          is_active,
          created_at,
          updated_at
        )
        OUTPUT INSERTED.lesson_id,
               INSERTED.course_id,
               INSERTED.title,
               INSERTED.slug,
               INSERTED.overview,
               INSERTED.content,
               INSERTED.key_concepts,
               INSERTED.example_evidence,
               INSERTED.common_mistakes,
               INSERTED.related_module,
               INSERTED.related_practice_url,
               INSERTED.difficulty,
               INSERTED.estimated_time,
               INSERTED.lesson_order,
               INSERTED.is_active,
               INSERTED.created_at,
               INSERTED.updated_at
        VALUES (
          @course_id,
          @title,
          @slug,
          @overview,
          @content,
          @key_concepts,
          @example_evidence,
          @common_mistakes,
          @related_module,
          @related_practice_url,
          @difficulty,
          @estimated_time,
          @lesson_order,
          1,
          GETDATE(),
          NULL
        )
      `);

    res.status(201).json({
      success: true,
      message: "Lesson created successfully.",
      data: formatLessonRecord(result.recordset[0], true),
    });
  } catch (error) {
    console.error("Create learning lesson error:", error);

    if (error?.message?.toLowerCase().includes("unique")) {
      return res.status(400).json({
        success: false,
        message: "Lesson slug already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create learning lesson.",
    });
  }
};

const updateLearningLesson = async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.params.lessonId);

    if (!lessonId) {
      warnInvalidId(req, "learning.lesson.update", req.params.lessonId);
      return res.status(400).json({
        success: false,
        message: "Invalid lesson identifier.",
      });
    }

    const validation = validateLessonPayload(req, req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const existingResult = await pool.request()
      .input("lesson_id", sql.Int, lessonId)
      .query(`
        SELECT lesson_id, course_id
        FROM LEARNING_LESSON
        WHERE lesson_id = @lesson_id
      `);

    if (existingResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    const {
      title,
      slug,
      overview,
      content,
      keyConcepts,
      exampleEvidence,
      commonMistakes,
      relatedModule,
      relatedPracticeUrl,
      difficulty,
      estimatedTime,
      lessonOrder,
    } = validation.value;

    const result = await pool.request()
      .input("lesson_id", sql.Int, lessonId)
      .input("title", sql.NVarChar(150), title)
      .input("slug", sql.NVarChar(150), slug)
      .input("overview", sql.NVarChar(sql.MAX), overview)
      .input("content", sql.NVarChar(sql.MAX), content)
      .input("key_concepts", sql.NVarChar(sql.MAX), keyConcepts)
      .input("example_evidence", sql.NVarChar(sql.MAX), exampleEvidence)
      .input("common_mistakes", sql.NVarChar(sql.MAX), commonMistakes)
      .input("related_module", sql.NVarChar(80), relatedModule)
      .input("related_practice_url", sql.NVarChar(255), relatedPracticeUrl)
      .input("difficulty", sql.NVarChar(20), difficulty)
      .input("estimated_time", sql.NVarChar(50), estimatedTime)
      .input("lesson_order", sql.Int, lessonOrder)
      .query(`
        UPDATE LEARNING_LESSON
        SET
          title = @title,
          slug = @slug,
          overview = @overview,
          content = @content,
          key_concepts = @key_concepts,
          example_evidence = @example_evidence,
          common_mistakes = @common_mistakes,
          related_module = @related_module,
          related_practice_url = @related_practice_url,
          difficulty = @difficulty,
          estimated_time = @estimated_time,
          lesson_order = @lesson_order,
          updated_at = GETDATE()
        WHERE lesson_id = @lesson_id;

        SELECT
          lesson_id,
          course_id,
          title,
          slug,
          overview,
          content,
          key_concepts,
          example_evidence,
          common_mistakes,
          related_module,
          related_practice_url,
          difficulty,
          estimated_time,
          lesson_order,
          is_active,
          created_at,
          updated_at
        FROM LEARNING_LESSON
        WHERE lesson_id = @lesson_id;
      `);

    res.status(200).json({
      success: true,
      message: "Lesson updated successfully.",
      data: formatLessonRecord(result.recordset[0], true),
    });
  } catch (error) {
    console.error("Update learning lesson error:", error);

    if (error?.message?.toLowerCase().includes("unique")) {
      return res.status(400).json({
        success: false,
        message: "Lesson slug already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update learning lesson.",
    });
  }
};

const deleteLearningLesson = async (req, res) => {
  try {
    const lessonId = parsePositiveInt(req.params.lessonId);

    if (!lessonId) {
      warnInvalidId(req, "learning.lesson.delete", req.params.lessonId);
      return res.status(400).json({
        success: false,
        message: "Invalid lesson identifier.",
      });
    }

    const result = await pool.request()
      .input("lesson_id", sql.Int, lessonId)
      .query(`
        UPDATE LEARNING_LESSON
        SET
          is_active = 0,
          updated_at = GETDATE()
        WHERE lesson_id = @lesson_id;

        SELECT @@ROWCOUNT AS affected_rows;
      `);

    const affectedRows = result.recordset[0]?.affected_rows || 0;

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lesson deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete learning lesson error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate learning lesson.",
    });
  }
};

const reorderLearningLessons = async (req, res) => {
  let transaction = null;
  let transactionActive = false;

  try {
    const courseId = parsePositiveInt(req.params.courseId);
    const lessonIds = Array.isArray(req.body.lessonIds) ? req.body.lessonIds : [];
    const normalizedLessonIds = lessonIds.map((value) => parsePositiveInt(value));

    if (!courseId) {
      warnInvalidId(req, "learning.lesson.reorder.course", req.params.courseId);
      return res.status(400).json({
        success: false,
        message: "Invalid course identifier.",
      });
    }

    if (
      normalizedLessonIds.length === 0 ||
      normalizedLessonIds.some((value) => !value) ||
      new Set(normalizedLessonIds).size !== normalizedLessonIds.length
    ) {
      warnMalformedInput(req, "learning.lesson.reorder", {
        lessonIds,
      });
      return res.status(400).json({
        success: false,
        message: "Lesson order payload is invalid.",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionActive = true;

    const courseCheck = await transaction.request()
      .input("course_id", sql.Int, courseId)
      .query(`
        SELECT course_id
        FROM LEARNING_COURSE
        WHERE course_id = @course_id
      `);

    if (courseCheck.recordset.length === 0) {
      await transaction.rollback();
      transactionActive = false;
      transaction = null;

      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const lessonsCheck = await transaction.request()
      .input("course_id", sql.Int, courseId)
      .query(`
        SELECT lesson_id
        FROM LEARNING_LESSON
        WHERE course_id = @course_id
      `);

    const existingLessonIds = lessonsCheck.recordset.map((lesson) => lesson.lesson_id);
    const hasInvalidLesson = normalizedLessonIds.some(
      (lessonId) => !existingLessonIds.includes(lessonId)
    );

    if (hasInvalidLesson) {
      await transaction.rollback();
      transactionActive = false;
      transaction = null;

      return res.status(400).json({
        success: false,
        message: "One or more lessons do not belong to this course.",
      });
    }

    for (let index = 0; index < normalizedLessonIds.length; index += 1) {
      await transaction.request()
        .input("lesson_id", sql.Int, normalizedLessonIds[index])
        .input("lesson_order", sql.Int, index)
        .query(`
          UPDATE LEARNING_LESSON
          SET
            lesson_order = @lesson_order,
            updated_at = GETDATE()
          WHERE lesson_id = @lesson_id
        `);
    }

    await transaction.commit();
    transactionActive = false;
    transaction = null;

    res.status(200).json({
      success: true,
      message: "Lessons reordered successfully.",
    });
  } catch (error) {
    if (transaction && transactionActive) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback learning lesson reorder error:", rollbackError);
      }
    }

    console.error("Reorder learning lessons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder lessons.",
    });
  }
};

module.exports = {
  getLearningCourses,
  getLearningLessonBySlug,
  getAdminLearningCourses,
  createLearningCourse,
  updateLearningCourse,
  deleteLearningCourse,
  createLearningLesson,
  updateLearningLesson,
  deleteLearningLesson,
  reorderLearningLessons,
};
