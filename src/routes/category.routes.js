const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories
} = require("../controllers/category.controller");

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

router.get("/", verifyToken, getAllCategories);
router.post("/admin", verifyToken, requireAdmin, createCategory);

module.exports = router;