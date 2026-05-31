import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  isValidEmail,
} from "../utils/validation";
import { getTokenPayload } from "../utils/token";

const EMAIL_VERIFICATION_REQUIRED_MESSAGE =
  "Please verify your email address before signing in. Check your inbox or request a new verification link.";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showResendLink, setShowResendLink] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      setMessageType("error");
      setShowResendLink(false);
    }
  }, [location.state]);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const payload = getTokenPayload(token);

    if (!payload) {
      return;
    }

    navigate(payload.role === "admin" ? "/admin" : "/dashboard", {
      replace: true,
    });
  }, [navigate]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRetryAfterSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  const formatRetryAfter = (totalSeconds) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      return "";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
    }

    if (hours === 0 && seconds > 0) {
      parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
    }

    return parts.join(" ");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (retryAfterSeconds > 0) {
      setMessageType("error");
      setShowResendLink(false);
      setMessage(
        `Too many login attempts. Please try again later. Try again in ${formatRetryAfter(
          retryAfterSeconds
        )}.`
      );
      return;
    }

    if (!normalizedEmail) {
      setMessageType("error");
      setShowResendLink(false);
      setMessage("Email is required");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessageType("error");
      setShowResendLink(false);
      setMessage("Enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setMessageType("error");
      setShowResendLink(false);
      setMessage("Password is required");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessageType("error");
      setShowResendLink(false);
      setMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json();
      const retryAfterHeader = response.headers.get("Retry-After");
      const parsedRetryAfter = Number.parseInt(
        retryAfterHeader || data.retryAfter,
        10
      );

      if (response.status === 429) {
        const nextRetryAfter =
          Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
            ? parsedRetryAfter
            : 0;

        setRetryAfterSeconds(nextRetryAfter);
        setMessageType("error");
        setShowResendLink(false);
        setMessage(
          nextRetryAfter > 0
            ? `Too many login attempts. Please try again later. Try again in ${formatRetryAfter(
                nextRetryAfter
              )}.`
            : "Too many login attempts. Please try again later."
        );
        return;
      }

      if (!response.ok || data.success === false) {
        const nextMessage = data.message || data.error || "Login failed";
        setMessageType("error");
        setShowResendLink(nextMessage === EMAIL_VERIFICATION_REQUIRED_MESSAGE);
        setMessage(nextMessage);
        return;
      }

      localStorage.setItem("token", data.token);
      setRetryAfterSeconds(0);
      setMessageType("success");
      setShowResendLink(false);
      setMessage("Login successful");

      const payload = getTokenPayload(data.token);
      const nextPath = payload?.role === "admin" ? "/admin" : "/dashboard";

      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 700);
    } catch (error) {
      console.error("Login error:", error);
      setMessageType("error");
      setShowResendLink(false);
      setMessage("Server error");
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

        <h1 className="auth-title">Login</h1>
        <p className="auth-subtitle">
          Access your CyberSec Platform account.
        </p>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
            minLength={MIN_PASSWORD_LENGTH}
          />

          <button
            className="auth-button"
            type="submit"
            disabled={retryAfterSeconds > 0}
            style={
              retryAfterSeconds > 0
                ? {
                    opacity: 0.72,
                    cursor: "not-allowed",
                  }
                : undefined
            }
          >
            {retryAfterSeconds > 0 ? "Try Again Later" : "Login"}
          </button>
        </form>

        {message && (
          <div>
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

            {showResendLink && (
              <div style={styles.actionRow}>
                <Link
                  to="/resend-verification"
                  state={{ email: normalizeEmail(email) }}
                  className="auth-link"
                >
                  Request a new verification link
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="auth-footer">
          Need an account?{" "}
          <Link to="/register" className="auth-link">
            Create Account
          </Link>
        </p>
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
    marginTop: "10px",
  },
};

export default LoginPage;
