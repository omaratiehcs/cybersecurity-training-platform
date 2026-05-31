const express = require("express");
const router = express.Router();

const { getAdminInsights } = require("../controllers/adminInsights.controller");
const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/", verifyToken, requireAdmin, getAdminInsights);

module.exports = router;
