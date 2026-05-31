const rateLimit = require("express-rate-limit");
const { getRequestSource } = require("../utils/security");

const getRetryAfterSeconds = (req, windowMs) => {
  const resetTime = req.rateLimit?.resetTime;

  if (resetTime) {
    const parsedResetTime =
      resetTime instanceof Date
        ? resetTime.getTime()
        : new Date(resetTime).getTime();
    const remainingMs = parsedResetTime - Date.now();

    if (Number.isFinite(remainingMs) && remainingMs > 0) {
      return Math.ceil(remainingMs / 1000);
    }
  }

  return Math.ceil(windowMs / 1000);
};

const createJsonRateLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getRequestSource(req),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req, res) => {
      const retryAfter = getRetryAfterSeconds(req, windowMs);

      res.set("Retry-After", String(retryAfter));

      return res.status(429).json({
        success: false,
        error: message,
        message,
        retryAfter,
      });
    },
  });
};

const loginLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again later.",
});

const registerLimiter = createJsonRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts. Please try again later.",
});

const resendVerificationLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message:
    "Too many verification email requests. Please try again in 15 minutes.",
});

const chatLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many chat messages. Please try again in 15 minutes.",
});

module.exports = {
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
  chatLimiter,
};
