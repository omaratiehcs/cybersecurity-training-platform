const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const {
  getPlatformReview,
  savePlatformReview,
  getAdminPlatformReviews,
  deleteMyPlatformReview,
  deleteAdminPlatformReview,
} = require("../controllers/review.controller");

router.get("/my", verifyToken, getPlatformReview);
router.delete("/my", verifyToken, deleteMyPlatformReview);
router.post("/", verifyToken, savePlatformReview);
router.get("/admin", verifyToken, requireAdmin, getAdminPlatformReviews);
router.delete(
  "/admin/:reviewId",
  verifyToken,
  requireAdmin,
  deleteAdminPlatformReview
);

module.exports = router;
