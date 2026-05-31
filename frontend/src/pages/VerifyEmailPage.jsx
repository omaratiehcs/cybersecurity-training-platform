import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

function VerifyEmailPage() {
  const location = useLocation();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(
        "This verification link is invalid or has expired. Please request a new verification email."
      );
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/auth/verify-email?token=${encodeURIComponent(
            token
          )}`
        );

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message ||
              "This verification link is invalid or has expired. Please request a new verification email."
          );
        }

        setStatus("success");
        setMessage(
          data.message ||
            "Your email address has been verified successfully. You can now sign in."
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error.message ||
            "This verification link is invalid or has expired. Please request a new verification email."
        );
      }
    };

    verifyEmail();
  }, [location.search]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={styles.topNavRow}>
          <Link to="/" className="auth-link">
            Back to Home
          </Link>
        </div>

        <h1 className="auth-title">Verify Email</h1>
        <p className="auth-subtitle">
          Confirm your account so you can access the Cybersecurity Training
          Platform.
        </p>

        <p
          className="auth-message"
          style={{
            color:
              status === "success"
                ? "#166534"
                : status === "loading"
                ? "#1e3a8a"
                : "#991b1b",
            background:
              status === "success"
                ? "#dcfce7"
                : status === "loading"
                ? "#dbeafe"
                : "#fee2e2",
            lineHeight: "1.6",
          }}
        >
          {message}
        </p>

        <div style={styles.actionRow}>
          {status === "success" ? (
            <Link to="/login" className="auth-link">
              Back to Sign In
            </Link>
          ) : (
            <Link to="/resend-verification" className="auth-link">
              Request New Verification Email
            </Link>
          )}
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
};

export default VerifyEmailPage;
