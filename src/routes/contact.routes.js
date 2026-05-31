const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const {
  createContactMessage,
  getAdminContactMessages,
  getMyContactMessages,
  updateMyContactMessage,
  deleteMyContactMessage,
  markContactMessageAsRead,
  replyToContactMessage,
} = require("../controllers/contact.controller");

router.post("/", verifyToken, createContactMessage);
router.get("/my", verifyToken, getMyContactMessages);
router.put("/my/:messageId", verifyToken, updateMyContactMessage);
router.delete("/my/:messageId", verifyToken, deleteMyContactMessage);
router.get("/admin", verifyToken, requireAdmin, getAdminContactMessages);
router.put(
  "/admin/:messageId/read",
  verifyToken,
  requireAdmin,
  markContactMessageAsRead
);
router.put(
  "/admin/:messageId/reply",
  verifyToken,
  requireAdmin,
  replyToContactMessage
);

module.exports = router;
