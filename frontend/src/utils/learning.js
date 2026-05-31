import { getTutorialById, tutorials } from "../data/tutorials";

const getPracticeLabelFromPath = (path) => {
  if (path === "/soc-cases") {
    return "Practice in SOC Cases";
  }

  if (path === "/incidents") {
    return "Practice in Incident Response";
  }

  if (path === "/challenges") {
    return "Practice in CTF Challenges";
  }

  return "Open Practice";
};

const buildRelatedPractice = (lesson, fallbackTutorial) => {
  if (Array.isArray(fallbackTutorial?.relatedPractice) && fallbackTutorial.relatedPractice.length > 0) {
    return fallbackTutorial.relatedPractice;
  }

  if (lesson.related_practice_url) {
    return [
      {
        label: getPracticeLabelFromPath(lesson.related_practice_url),
        path: lesson.related_practice_url,
      },
    ];
  }

  return [];
};

export const normalizeLearningLesson = (lesson, courseContext = {}) => {
  const fallbackTutorial = getTutorialById(lesson.slug || lesson.id);
  const keyConcepts = Array.isArray(lesson.key_concepts)
    ? lesson.key_concepts
    : Array.isArray(lesson.keyConcepts)
    ? lesson.keyConcepts
    : Array.isArray(fallbackTutorial?.concepts)
    ? fallbackTutorial.concepts
    : [];
  const whatToLookFor =
    Array.isArray(lesson.what_to_look_for) && lesson.what_to_look_for.length > 0
      ? lesson.what_to_look_for
      : Array.isArray(lesson.whatToLookFor) && lesson.whatToLookFor.length > 0
      ? lesson.whatToLookFor
      : Array.isArray(fallbackTutorial?.whatToLookFor)
      ? fallbackTutorial.whatToLookFor
      : keyConcepts.slice(0, 2);
  const commonMistakes = Array.isArray(lesson.common_mistakes)
    ? lesson.common_mistakes
    : Array.isArray(lesson.commonMistakes)
    ? lesson.commonMistakes
    : Array.isArray(fallbackTutorial?.commonMistakes)
    ? fallbackTutorial.commonMistakes
    : [];

  return {
    id: lesson.slug || lesson.id,
    lessonId: lesson.lesson_id || lesson.lessonId || null,
    courseId: lesson.course_id || lesson.courseId || courseContext.course_id || null,
    title: lesson.title || fallbackTutorial?.title || "Untitled Lesson",
    slug: lesson.slug || lesson.id || fallbackTutorial?.id || "",
    summary:
      fallbackTutorial?.summary ||
      lesson.summary ||
      lesson.overview ||
      lesson.content ||
      "Learning content is available for this lesson.",
    overview:
      lesson.overview ||
      fallbackTutorial?.overview ||
      lesson.content ||
      "Lesson overview coming soon.",
    content: lesson.content || "",
    keyConcepts,
    whatToLookFor,
    exampleEvidence:
      lesson.example_evidence ||
      lesson.exampleEvidence ||
      fallbackTutorial?.exampleEvidence ||
      "No example evidence provided yet.",
    commonMistakes,
    relatedPractice: buildRelatedPractice(lesson, fallbackTutorial),
    module:
      lesson.related_module ||
      lesson.relatedModule ||
      courseContext.module ||
      lesson.course_module ||
      fallbackTutorial?.module ||
      "Learning Center",
    difficulty:
      lesson.difficulty || fallbackTutorial?.difficulty || courseContext.difficulty || "Easy",
    estimatedTime:
      lesson.estimated_time ||
      lesson.estimatedTime ||
      fallbackTutorial?.estimatedTime ||
      "TBD",
    lessonOrder: lesson.lesson_order ?? lesson.lessonOrder ?? 0,
    isActive:
      typeof lesson.is_active === "boolean"
        ? lesson.is_active
        : lesson.is_active === 1 || lesson.isActive === true,
  };
};

export const normalizeLearningCourses = (courses = []) => {
  return courses.map((course) => ({
    courseId: course.course_id || course.courseId,
    title: course.title,
    description: course.description || "Learning path description coming soon.",
    module: course.module || "Learning Center",
    difficulty: course.difficulty || "Easy",
    estimatedTime: course.estimated_time || course.estimatedTime || "TBD",
    courseOrder: course.course_order ?? course.courseOrder ?? 0,
    isActive:
      typeof course.is_active === "boolean"
        ? course.is_active
        : course.is_active === 1 || course.isActive === true,
    lessons: (course.lessons || []).map((lesson) =>
      normalizeLearningLesson(lesson, course)
    ),
  }));
};

export const buildFallbackLearningCourses = () => {
  const paths = [
    {
      id: "fallback-soc-analyst-basics",
      title: "SOC Analyst Basics",
      description:
        "Foundational lessons for authentication monitoring, suspicious PowerShell analysis, and malware download investigations in a SOC workflow.",
      module: "SOC Case Analysis",
      difficulty: "Easy",
      estimatedTime: "27 min",
      lessonIds: [
        "brute-force-detection",
        "suspicious-powershell-activity",
        "malware-download-investigation",
      ],
    },
    {
      id: "fallback-incident-response-basics",
      title: "Incident Response Basics",
      description:
        "Guided lessons for triage, privilege escalation review, lateral movement detection, and evidence-driven containment decisions.",
      module: "Incident Response",
      difficulty: "Easy",
      estimatedTime: "27 min",
      lessonIds: [
        "privilege-escalation-basics",
        "lateral-movement-with-psexec",
        "incident-response-workflow",
      ],
    },
  ];

  return paths.map((path, courseIndex) => ({
    courseId: path.id,
    title: path.title,
    description: path.description,
    module: path.module,
    difficulty: path.difficulty,
    estimatedTime: path.estimatedTime,
    courseOrder: courseIndex,
    isActive: true,
    lessons: path.lessonIds
      .map((lessonId, lessonIndex) => {
        const tutorial = tutorials.find((item) => item.id === lessonId);

        if (!tutorial) {
          return null;
        }

        return normalizeLearningLesson(
          {
            ...tutorial,
            slug: tutorial.id,
            lesson_order: lessonIndex,
            is_active: 1,
            related_module: tutorial.module,
          },
          path
        );
      })
      .filter(Boolean),
  }));
};

export const getLearningStats = (courses = []) => {
  const totalLessons = courses.reduce(
    (count, course) => count + (course.lessons?.length || 0),
    0
  );

  return {
    totalCourses: courses.length,
    totalLessons,
  };
};
