const express = require("express");
const router = express.Router();

const {
  getChallengeLeaderboard,
  getMyRank
} = require("../controllers/leaderboard.controller");

const verifyToken = require("../middleware/auth.middleware");

// GET /api/leaderboard/me (protected)
router.get("/me", verifyToken, getMyRank);

// GET /api/leaderboard (public)
router.get("/", getChallengeLeaderboard);

module.exports = router;