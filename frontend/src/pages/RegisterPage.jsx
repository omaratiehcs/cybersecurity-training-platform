import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizeInput,
  isValidEmail,
} from "../utils/validation";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    const normalizedFullName = normalizeInput(fullName);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedFullName) {
      setMessageType("error");
      setMessage("Full name is required");
      return;
    }

    if (!normalizedEmail) {
      setMessageType("error");
      setMessage("Email is required");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setMessageType("error");
      setMessage("Enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setMessageType("error");
      setMessage("Password is required");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessageType("error");
      setMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: normalizedFullName,
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.message || data.error || "Registration failed");
        return;
      }

      setMessageType("success");
      setRegisteredEmail(normalizedEmail);
      setMessage(
        data.message ||
          "Account created successfully. Please check your inbox and spam folder to verify your email address."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Register error:", error);
      setMessageType("error");
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

      <h1 className="auth-title">Create Account</h1>
      <p className="auth-subtitle">
        Join the CyberSec Platform and start solving challenges.
      </p>

      <form onSubmit={handleRegister} className="auth-form">
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="auth-input"
          required
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          required
          minLength={MIN_PASSWORD_LENGTH}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="auth-input"
          required
          minLength={MIN_PASSWORD_LENGTH}
        />

        <button className="auth-button">Register</button>
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

          {messageType === "success" && (
            <div style={styles.actionRow}>
              <Link to="/login" className="auth-link">
                Go to Sign In
              </Link>
              <button
                type="button"
                onClick={() =>
                  navigate("/resend-verification", {
                    state: { email: registeredEmail },
                  })
                }
                style={styles.secondaryButton}
              >
                Request New Verification Link
              </button>
            </div>
          )}
        </div>
      )}

      <p style={styles.helperNote}>
        Didn&apos;t receive the email? Check your spam or junk folder.
      </p>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Sign In
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
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "10px",
  },
  secondaryButton: {
    background: "transparent",
    color: "#1d4ed8",
    border: "1px solid #93c5fd",
    borderRadius: "999px",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
  helperNote: {
    margin: "12px 0 0",
    color: "#64748b",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    textAlign: "center",
  },
};

export default RegisterPage;
