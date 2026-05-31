const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const {
  getHiddenCommentLabStatus,
  startHiddenCommentLab,
  stopHiddenCommentLab,
} = require("../controllers/lab.controller");

router.get("/hidden-comment/status", verifyToken, getHiddenCommentLabStatus);
router.post("/hidden-comment/start", verifyToken, startHiddenCommentLab);
router.post("/hidden-comment/stop", verifyToken, stopHiddenCommentLab);

module.exports = router;
