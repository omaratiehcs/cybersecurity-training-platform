const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sql, pool } = require("../config/db");
const {
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizeString,
  isValidEmail,
} = require("../utils/validation");
const {
  getRequestSource,
  warnMalformedInput,
  warnSuspiciousFields,
} = require("../utils/security");
const { sendVerificationEmail } = require("../utils/email");

const JWT_SECRET = process.env.JWT_SECRET;
const failedLoginAttempts = new Map();
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_WARN_THRESHOLD = 3;
const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const getFailedLoginKey = (email, req) => {
  return `${email || "unknown"}|${getRequestSource(req)}`;
};

const trackFailedLoginAttempt = (email, req, reason) => {
  const failedLoginKey = getFailedLoginKey(email, req);
  const now = Date.now();
  const existingAttempt = failedLoginAttempts.get(failedLoginKey);

  if (!existingAttempt || now - existingAttempt.lastAttemptAt > FAILED_LOGIN_WINDOW_MS) {
    failedLoginAttempts.set(failedLoginKey, {
      count: 1,
      lastAttemptAt: now,
    });
    return;
  }

  existingAttempt.count += 1;
  existingAttempt.lastAttemptAt = now;

  if (existingAttempt.count >= FAILED_LOGIN_WARN_THRESHOLD) {
    console.warn("[SECURITY] Repeated failed login attempts detected", {
      source: getRequestSource(req),
      email,
      reason,
      count: existingAttempt.count,
    });
  }
};

const clearFailedLoginAttempts = (email, req) => {
  failedLoginAttempts.delete(getFailedLoginKey(email, req));
};

const createEmailVerificationToken = () => {
  return crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString("hex");
};

const createEmailVerificationExpiry = () => {
  return new Date(Date.now() + EMAIL_VERIFICATION_WINDOW_MS);
};

// Register a new user
const register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const normalizedFullName = normalizeString(full_name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = typeof password === "string" ? password : "";

    warnSuspiciousFields(req, "auth.register", {
      full_name,
      email,
    });

    if (!normalizedFullName) {
      warnMalformedInput(req, "auth.register", {
        field: "full_name",
      });
      return res.status(400).json({
        error: "Full name is required"
      });
    }

    if (!normalizedEmail) {
      warnMalformedInput(req, "auth.register", {
        field: "email",
      });
      return res.status(400).json({
        error: "Email is required"
      });
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH || !isValidEmail(normalizedEmail)) {
      warnMalformedInput(req, "auth.register", {
        field: "email",
        value: normalizedEmail,
      });
      return res.status(400).json({
        error: "A valid email is required"
      });
    }

    if (!normalizedPassword.trim()) {
      warnMalformedInput(req, "auth.register", {
        field: "password",
        password_length: normalizedPassword.length,
      });
      return res.status(400).json({
        error: "Password is required"
      });
    }

    if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      warnMalformedInput(req, "auth.register", {
        field: "password",
        password_length: normalizedPassword.length,
      });
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: "Server configuration error"
      });
    }

    const existingUserResult = await pool.request()
      .input("email", sql.NVarChar, normalizedEmail)
      .query(`
        SELECT TOP 1 user_id, email_verified
        FROM [USER]
        WHERE email = @email
      `);

    if (existingUserResult.recordset.length > 0) {
      const existingUser = existingUserResult.recordset[0];

      return res.status(400).json({
        success: false,
        message: existingUser.email_verified
          ? "An account with this email already exists."
          : "An account with this email already exists. Please verify your email or request a new verification link.",
      });
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const verificationToken = createEmailVerificationToken();
    const verificationExpires = createEmailVerificationExpiry();
    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      await new sql.Request(transaction)
        .input("full_name", sql.NVarChar, normalizedFullName)
        .input("email", sql.NVarChar, normalizedEmail)
        .input("password_hash", sql.NVarChar, hashedPassword)
        .input("email_verified", sql.Bit, 0)
        .input("email_verification_token", sql.NVarChar(255), verificationToken)
        .input("email_verification_expires", sql.DateTime, verificationExpires)
        .query(`
          INSERT INTO [USER] (
            full_name,
            email,
            password_hash,
            email_verified,
            email_verification_token,
            email_verification_expires
          )
          VALUES (
            @full_name,
            @email,
            @password_hash,
            @email_verified,
            @email_verification_token,
            @email_verification_expires
          )
        `);

      const emailResult = await sendVerificationEmail({
        email: normalizedEmail,
        fullName: normalizedFullName,
        token: verificationToken,
      });

      if (!emailResult.success) {
        await transaction.rollback();
        return res.status(503).json({
          success: false,
          message:
            "We couldn't send the verification email right now. Please try again in a few minutes.",
        });
      }

      await transaction.commit();
    } catch (transactionError) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("Register rollback error:", rollbackError);
        }
      }

      throw transactionError;
    }

    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your inbox and spam folder to verify your email address."
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      error: "Registration failed"
    });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = typeof password === "string" ? password : "";

    warnSuspiciousFields(req, "auth.login", {
      email,
    });

    if (!normalizedEmail) {
      warnMalformedInput(req, "auth.login", {
        field: "email",
      });
      return res.status(400).json({
        error: "Email is required"
      });
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH || !isValidEmail(normalizedEmail)) {
      warnMalformedInput(req, "auth.login", {
        field: "email",
        value: normalizedEmail,
      });
      return res.status(400).json({
        error: "A valid email is required"
      });
    }

    if (!normalizedPassword.trim()) {
      warnMalformedInput(req, "auth.login", {
        field: "password",
        password_length: normalizedPassword.length,
      });
      return res.status(400).json({
        error: "Password is required"
      });
    }

    if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      warnMalformedInput(req, "auth.login", {
        field: "password",
        password_length: normalizedPassword.length,
      });
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: "Server configuration error"
      });
    }

    const result = await pool.request()
      .input("email", sql.NVarChar, normalizedEmail)
      .query(`
        SELECT * FROM [USER]
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      trackFailedLoginAttempt(normalizedEmail, req, "user_not_found");
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const user = result.recordset[0];

    const isPasswordCorrect = await bcrypt.compare(normalizedPassword, user.password_hash);

    if (!isPasswordCorrect) {
      trackFailedLoginAttempt(normalizedEmail, req, "invalid_password");
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    clearFailedLoginAttempts(normalizedEmail, req);

    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email address before signing in. Check your inbox or request a new verification link.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed"
    });
  }
};

// GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res) => {
  try {
    const token = normalizeString(req.query.token);

    warnSuspiciousFields(req, "auth.verifyEmail", {
      token,
    });

    if (!token || token.length > 255) {
      warnMalformedInput(req, "auth.verifyEmail", {
        field: "token",
      });
      return res.status(400).json({
        success: false,
        message:
          "This verification link is invalid or has expired. Please request a new verification email.",
      });
    }

    const userResult = await pool.request()
      .input("token", sql.NVarChar(255), token)
      .query(`
        SELECT TOP 1 user_id
        FROM [USER]
        WHERE email_verification_token = @token
          AND email_verified = 0
          AND email_verification_expires IS NOT NULL
          AND email_verification_expires >= GETDATE()
      `);

    if (userResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "This verification link is invalid or has expired. Please request a new verification email.",
      });
    }

    const userId = userResult.recordset[0].user_id;

    await pool.request()
      .input("user_id", sql.Int, userId)
      .query(`
        UPDATE [USER]
        SET
          email_verified = 1,
          email_verification_token = NULL,
          email_verification_expires = NULL
        WHERE user_id = @user_id
      `);

    res.status(200).json({
      success: true,
      message:
        "Your email address has been verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify email.",
    });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    warnSuspiciousFields(req, "auth.resendVerification", {
      email: req.body?.email,
    });

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      warnMalformedInput(req, "auth.resendVerification", {
        field: "email",
        value: normalizedEmail,
      });
      return res.status(400).json({
        success: false,
        message: "A valid email is required.",
      });
    }

    const userResult = await pool.request()
      .input("email", sql.NVarChar, normalizedEmail)
      .query(`
        SELECT TOP 1 user_id, full_name, email, email_verified
        FROM [USER]
        WHERE email = @email
      `);

    if (userResult.recordset.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          "If this email belongs to an unverified account, we'll send a new verification link. Please check your inbox and spam folder.",
      });
    }

    const user = userResult.recordset[0];

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message:
          "This email address is already verified. You can sign in to your account.",
      });
    }

    const verificationToken = createEmailVerificationToken();
    const verificationExpires = createEmailVerificationExpiry();

    await pool.request()
      .input("user_id", sql.Int, user.user_id)
      .input("email_verification_token", sql.NVarChar(255), verificationToken)
      .input("email_verification_expires", sql.DateTime, verificationExpires)
      .query(`
        UPDATE [USER]
        SET
          email_verification_token = @email_verification_token,
          email_verification_expires = @email_verification_expires
        WHERE user_id = @user_id
      `);

    const emailResult = await sendVerificationEmail({
      email: user.email,
      fullName: user.full_name,
      token: verificationToken,
    });

    if (!emailResult.success) {
      return res.status(503).json({
        success: false,
        message:
          "We couldn't send the verification email right now. Please try again in a few minutes.",
      });
    }

    res.status(200).json({
      success: true,
      message:
        "If this email belongs to an unverified account, we'll send a new verification link. Please check your inbox and spam folder.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email.",
    });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
};
