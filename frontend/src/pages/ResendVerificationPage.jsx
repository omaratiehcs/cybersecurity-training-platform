import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { normalizeEmail, isValidEmail } from "../utils/validation";

const GENERIC_SUCCESS_MESSAGE =
  "If this email belongs to an unverified account, we'll send a new verification link. Please check your inbox and spam folder.";

function ResendVerificationPage() {
  const location = useLocation();
  const initialEmail = useMemo(() => {
    return normalizeEmail(location.state?.email || "");
  }, [location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setMessageType("error");
      setMessage("Enter a valid email address");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch(
        "http://localhost:5000/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessageType("error");
        setMessage(
          data.message || data.error || "Failed to resend verification email."
        );
        return;
      }

      setMessageType("success");
      setMessage(data.message || GENERIC_SUCCESS_MESSAGE);
    } catch (error) {
      console.error("Resend verification error:", error);
      setMessageType("error");
      setMessage("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={styles.topNavRow}>
          <Link to="/" className="auth-link">
            Back to Home
          </Link>
        </div>

        <h1 className="auth-title">Resend Verification</h1>
        <p className="auth-subtitle">
          Enter your email address and we&apos;ll send a new verification link if
          your account still needs verification.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />

          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send New Verification Link"}
          </button>
        </form>

        {message && (
          <p
            className="auth-message"
            style={{
              color: messageType === "success" ? "#166534" : "#991b1b",
              background: messageType === "success" ? "#dcfce7" : "#fee2e2",
              lineHeight: "1.6",
            }}
          >
            {message}
          </p>
        )}

        <p style={styles.helperNote}>
          Didn&apos;t receive the email? Check your spam or junk folder.
        </p>

        <div style={styles.actionRow}>
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  topNavRow: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: "16px",
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "12px",
  },
  helperNote: {
    margin: "12px 0 0",
    color: "#64748b",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    textAlign: "center",
  },
};

export default ResendVerificationPage;
