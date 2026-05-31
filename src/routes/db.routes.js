const router = require("express").Router();
const { pool } = require("../config/db");
const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/ping", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.request().query("SELECT 1 AS ok");
    res.json({ ok: true, result: result.recordset[0] });
  } catch (err) {
    console.error("DB ping error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
