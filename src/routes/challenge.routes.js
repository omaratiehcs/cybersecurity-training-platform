const express = require("express");
const router = express.Router();

const {
  getAllChallenges,
  getChallengeProgress,
  getChallengeById,
  startChallenge,
  getChallengeTimer,
  submitChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getAllChallengesAdmin
} = require("../controllers/challenge.controller");

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/", verifyToken, getAllChallenges);
router.get("/progress", verifyToken, getChallengeProgress);
router.post("/admin", verifyToken, requireAdmin, createChallenge);
router.put("/admin/:id", verifyToken, requireAdmin, updateChallenge);
router.delete("/admin/:id", verifyToken, requireAdmin, deleteChallenge);
router.get("/admin", verifyToken, requireAdmin, getAllChallengesAdmin);
router.get("/:id/timer", verifyToken, getChallengeTimer);
router.post("/:id/start", verifyToken, startChallenge);
router.get("/:id", verifyToken, getChallengeById);
router.post("/:id/submit", verifyToken, submitChallenge);

module.exports = router;
