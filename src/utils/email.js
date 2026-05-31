const getNodemailer = () => {
  try {
    return require("nodemailer");
  } catch (error) {
    console.error("Nodemailer is not installed:", error);
    return null;
  }
};

const isSecureSmtp = () => {
  return String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
};

const getTransporter = () => {
  const nodemailer = getNodemailer();

  if (!nodemailer) {
    return null;
  }

  const smtpPort = Number(process.env.SMTP_PORT);

  if (
    !process.env.SMTP_HOST ||
    !Number.isFinite(smtpPort) ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    console.error("Email configuration is incomplete. Verification emails are unavailable.");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecureSmtp(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const buildVerificationLink = (token) => {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  return `${appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
};

const sendVerificationEmail = async ({ email, fullName, token }) => {
  const transporter = getTransporter();

  if (!transporter) {
    return {
      success: false,
      reason: "email_unavailable",
    };
  }

  const verificationLink = buildVerificationLink(token);
  const recipientName = fullName || "there";

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your Cybersecurity Training Platform account",
      text: `Hello ${recipientName},

Please verify your email address to activate your Cybersecurity Training Platform account.

Verification link:
${verificationLink}

This link expires in 24 hours.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Hello ${recipientName},</p>
          <p>Please verify your email address to activate your Cybersecurity Training Platform account.</p>
          <p>
            <a
              href="${verificationLink}"
              style="display:inline-block;padding:10px 16px;border-radius:8px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;"
            >
              Verify Email
            </a>
          </p>
          <p>If the button does not work, use this link:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Send verification email error:", error);
    return {
      success: false,
      reason: "send_failed",
    };
  }
};

module.exports = {
  sendVerificationEmail,
};
