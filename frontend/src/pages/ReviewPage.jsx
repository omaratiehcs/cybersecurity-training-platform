import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import { normalizeOptionalInput } from "../utils/validation";

const API_URL = "http://localhost:5000/api/reviews";
const MAX_COMMENT_LENGTH = 1000;

const ratingLabels = {
  1: "Needs significant improvement",
  2: "Below expectations",
  3: "Good overall",
  4: "Very good experience",
  5: "Excellent platform experience",
};

function ReviewPage() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchMyReview = async () => {
      try {
        const response = await authFetch(`${API_URL}/my`, {}, navigate);

        if (!response) {
          return;
        }

        const data = await response.json();

        if (!response.ok || data.success === false) {
          setMessage(data.message || "Failed to load your platform review.");
          setIsSuccess(false);
          return;
        }

        if (data.data) {
          setRating(Number(data.data.rating) || 0);
          setComment(data.data.comment || "");
          setHasExistingReview(true);
        } else {
          setHasExistingReview(false);
        }
      } catch (error) {
        console.error("Fetch my platform review error:", error);
        setMessage("Failed to load your platform review.");
        setIsSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReview();
  }, [navigate]);

  const remainingCharacters = useMemo(
    () => MAX_COMMENT_LENGTH - comment.length,
    [comment.length]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setMessage("Please select a rating from 1 to 5 stars.");
      return;
    }

    try {
      setSaving(true);

      const response = await authFetch(
        API_URL,
        {
          method: "POST",
          body: JSON.stringify({
            rating,
            comment: normalizeOptionalInput(comment),
          }),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Failed to save your platform review.");
        return;
      }

      setRating(Number(data.data?.rating) || rating);
      setComment(data.data?.comment || "");
      setHasExistingReview(true);
      setMessage(data.message || "Platform review submitted successfully.");
      setIsSuccess(true);
    } catch (error) {
      console.error("Save platform review error:", error);
      setMessage("Failed to save your platform review.");
      setIsSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your platform review?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsSuccess(false);

    try {
      setDeleting(true);

      const response = await authFetch(
        `${API_URL}/my`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Failed to delete your platform review.");
        return;
      }

      setRating(0);
      setComment("");
      setHasExistingReview(false);
      setMessage(data.message || "Your platform review was deleted successfully.");
      setIsSuccess(true);
    } catch (error) {
      console.error("Delete my platform review error:", error);
      setMessage("Failed to delete your platform review.");
      setIsSuccess(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroCard}>
            <span style={styles.eyebrow}>Platform Feedback</span>
            <h1 style={styles.title}>Rate &amp; Review the Platform</h1>
            <p style={styles.subtitle}>
              Share feedback about your overall experience with the platform,
              including usability, training quality, and how effective the labs
              felt during practice.
            </p>
          </div>

          {message && (
            <div
              style={{
                ...styles.messageBox,
                backgroundColor: isSuccess
                  ? "rgba(22, 163, 74, 0.14)"
                  : "rgba(239, 68, 68, 0.14)",
                borderColor: isSuccess
                  ? "rgba(34, 197, 94, 0.28)"
                  : "rgba(248, 113, 113, 0.28)",
                color: isSuccess ? "#bbf7d0" : "#fecaca",
              }}
            >
              {message}
            </div>
          )}

          <div style={styles.reviewCard}>
            <div style={styles.reviewHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Your Platform Review</h2>
                <p style={styles.sectionSubtitle}>
                  {hasExistingReview
                    ? "You already submitted a review. You can update it any time."
                    : "Tell us how the platform felt from onboarding through hands-on practice."}
                </p>
              </div>

              {loading && <span style={styles.loadingPill}>Loading review...</span>}
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <span style={styles.label}>Overall Rating</span>
                <div style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const isSelected = value <= rating;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        style={{
                          ...styles.starButton,
                          ...(isSelected ? styles.starButtonSelected : {}),
                        }}
                        aria-label={`${value} star rating`}
                      >
                        {"\u2605"}
                      </button>
                    );
                  })}
                </div>
                <span style={styles.ratingHint}>
                  {rating ? ratingLabels[rating] : "Select a rating from 1 to 5 stars."}
                </span>
              </div>

              <label style={styles.label}>
                Review Comment
                <textarea
                  value={comment}
                  onChange={(event) =>
                    setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))
                  }
                  rows={6}
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="What worked well? What could be improved? This feedback is about the platform experience overall."
                  style={styles.textarea}
                />
              </label>

              <div style={styles.formFooter}>
                <span style={styles.characterCount}>
                  {remainingCharacters} characters remaining
                </span>

                <div style={styles.actionGroup}>
                  {hasExistingReview && (
                    <button
                      type="button"
                      style={
                        deleting
                          ? styles.deleteButtonDisabled
                          : styles.deleteButton
                      }
                      disabled={saving || deleting}
                      onClick={handleDelete}
                    >
                      {deleting ? "Deleting Review..." : "Delete My Review"}
                    </button>
                  )}

                  <button
                    type="submit"
                    style={saving ? styles.primaryButtonDisabled : styles.primaryButton}
                    disabled={saving || deleting}
                  >
                    {saving
                      ? "Saving Review..."
                      : hasExistingReview
                      ? "Update Review"
                      : "Submit Review"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    padding: "36px 20px 28px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "960px",
    margin: "0 auto",
  },
  heroCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
    marginBottom: "22px",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    marginBottom: "16px",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.08em",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "2.4rem",
    lineHeight: "1.1",
  },
  subtitle: {
    margin: "14px 0 0",
    color: "#cbd5e1",
    lineHeight: "1.8",
    fontSize: "1rem",
    maxWidth: "760px",
  },
  messageBox: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid",
    lineHeight: "1.7",
    fontWeight: "600",
  },
  reviewCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.45rem",
  },
  sectionSubtitle: {
    margin: "10px 0 0",
    color: "#94a3b8",
    lineHeight: "1.7",
    maxWidth: "720px",
  },
  loadingPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(2, 6, 23, 0.68)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: "700",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    color: "#dbeafe",
    fontWeight: "600",
    fontSize: "14px",
  },
  starRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  starButton: {
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(2, 6, 23, 0.6)",
    color: "#64748b",
    borderRadius: "14px",
    width: "54px",
    height: "54px",
    fontSize: "26px",
    cursor: "pointer",
    transition: "all 0.18s ease",
  },
  starButtonSelected: {
    color: "#fbbf24",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.28)",
    boxShadow: "0 10px 20px rgba(245, 158, 11, 0.16)",
  },
  ratingHint: {
    color: "#93c5fd",
    fontSize: "0.95rem",
    lineHeight: "1.6",
  },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.72)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.7",
  },
  formFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  characterCount: {
    color: "#94a3b8",
    fontSize: "0.92rem",
  },
  actionGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.28)",
  },
  primaryButtonDisabled: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(51, 65, 85, 0.72)",
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  deleteButton: {
    border: "1px solid rgba(248, 113, 113, 0.25)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(127, 29, 29, 0.18)",
    color: "#fecaca",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "pointer",
  },
  deleteButtonDisabled: {
    border: "1px solid rgba(71, 85, 105, 0.24)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(51, 65, 85, 0.58)",
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "not-allowed",
  },
};

export default ReviewPage;
