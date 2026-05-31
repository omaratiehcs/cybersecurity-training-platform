const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, authController.register);
router.post("/login", loginLimiter, authController.login);
router.get("/verify-email", authController.verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  authController.resendVerification
);

module.exports = router;
