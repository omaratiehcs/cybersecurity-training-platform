const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const {
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
} = require("../controllers/learning.controller");

router.get("/courses", verifyToken, getLearningCourses);
router.get("/lessons/:slug", verifyToken, getLearningLessonBySlug);

router.get("/admin/courses", verifyToken, requireAdmin, getAdminLearningCourses);
router.post("/admin/courses", verifyToken, requireAdmin, createLearningCourse);
router.put(
  "/admin/courses/:courseId",
  verifyToken,
  requireAdmin,
  updateLearningCourse
);
router.delete(
  "/admin/courses/:courseId",
  verifyToken,
  requireAdmin,
  deleteLearningCourse
);
router.post(
  "/admin/courses/:courseId/lessons",
  verifyToken,
  requireAdmin,
  createLearningLesson
);
router.put(
  "/admin/lessons/:lessonId",
  verifyToken,
  requireAdmin,
  updateLearningLesson
);
router.delete(
  "/admin/lessons/:lessonId",
  verifyToken,
  requireAdmin,
  deleteLearningLesson
);
router.put(
  "/admin/courses/:courseId/lessons/reorder",
  verifyToken,
  requireAdmin,
  reorderLearningLessons
);

module.exports = router;
