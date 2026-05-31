const express = require("express");

const verifyToken = require("../middleware/auth.middleware");
const { chatLimiter } = require("../middleware/rateLimit.middleware");
const { sendChatMessage } = require("../controllers/chat.controller");

const router = express.Router();

router.post("/", verifyToken, chatLimiter, sendChatMessage);

module.exports = router;
