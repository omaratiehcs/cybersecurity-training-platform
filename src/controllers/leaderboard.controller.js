const { sql, pool } = require("../config/db");

// GET /api/leaderboard
const getChallengeLeaderboard = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        u.user_id,
        u.full_name,
        COUNT(sc.challenge_id) AS solved_count,
        ISNULL(SUM(sc.points), 0) AS total_score
      FROM [USER] u
      LEFT JOIN (
        SELECT DISTINCT
          s.user_id,
          s.challenge_id,
          c.points
        FROM SUBMISSION s
        INNER JOIN CHALLENGE c
          ON s.challenge_id = c.challenge_id
        WHERE s.is_correct = 1
      ) sc
        ON u.user_id = sc.user_id
      GROUP BY
        u.user_id,
        u.full_name
      ORDER BY
        total_score DESC,
        solved_count DESC,
        u.full_name ASC
    `);

    const leaderboard = result.recordset.map((user, index) => ({
      rank: index + 1,
      user_id: user.user_id,
      full_name: user.full_name,
      solved_count: user.solved_count,
      total_score: user.total_score
    }));

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      error: "Failed to fetch leaderboard"
    });
  }
};

// GET /api/leaderboard/me
const getMyRank = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.request().query(`
      SELECT
        u.user_id,
        u.full_name,
        COUNT(sc.challenge_id) AS solved_count,
        ISNULL(SUM(sc.points), 0) AS total_score
      FROM [USER] u
      LEFT JOIN (
        SELECT DISTINCT
          s.user_id,
          s.challenge_id,
          c.points
        FROM SUBMISSION s
        INNER JOIN CHALLENGE c
          ON s.challenge_id = c.challenge_id
        WHERE s.is_correct = 1
      ) sc
        ON u.user_id = sc.user_id
      GROUP BY
        u.user_id,
        u.full_name
      ORDER BY
        total_score DESC,
        solved_count DESC,
        u.full_name ASC
    `);

    const leaderboard = result.recordset.map((user, index) => ({
      rank: index + 1,
      user_id: user.user_id,
      full_name: user.full_name,
      solved_count: user.solved_count,
      total_score: user.total_score
    }));

    const currentUser = leaderboard.find(
      (user) => user.user_id === userId
    );

    if (!currentUser) {
      return res.status(404).json({
        error: "User rank not found"
      });
    }

    res.status(200).json({
      success: true,
      data: currentUser
    });
  } catch (error) {
    console.error("Get my rank error:", error);
    res.status(500).json({
      error: "Failed to fetch user rank"
    });
  }
};

module.exports = {
  getChallengeLeaderboard,
  getMyRank
};