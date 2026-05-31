const express = require("express");
const router = express.Router();

const {
  getAllSocCases,
  getAllSocCasesAdmin,
  getSocCaseProgress,
  getSocCaseById,
  submitSocCase,
  createSocCase,
  updateSocCase,
  deleteSocCase
} = require("../controllers/socCase.controller");

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/", verifyToken, getAllSocCases);
router.get("/progress", verifyToken, getSocCaseProgress);

router.get("/admin", verifyToken, requireAdmin, getAllSocCasesAdmin);
router.post("/admin", verifyToken, requireAdmin, createSocCase);
router.put("/admin/:id", verifyToken, requireAdmin, updateSocCase);
router.delete("/admin/:id", verifyToken, requireAdmin, deleteSocCase);

router.get("/:id", verifyToken, getSocCaseById);
router.post("/:id/submit", verifyToken, submitSocCase);

module.exports = router;