import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";

const API_URL = "http://localhost:5000/api/reviews/admin";

const formatDateTime = (value) => {
  if (!value) {
    return "Not updated";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const formatAverageRating = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue.toFixed(1) : "0.0";
};

const renderStars = (rating) => {
  const filled = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"\u2605".repeat(filled)}${"\u2606".repeat(5 - filled)}`;
};

const formatRatingText = (rating) => {
  const parsedRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `Rating: ${parsedRating} ${parsedRating === 1 ? "star" : "stars"}`;
};

function AdminReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const fetchReviews = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await authFetch(API_URL, {}, navigate);

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setError(data.message || "Failed to load platform reviews.");
        return;
      }

      setReviews(data.data?.reviews || []);
      setSummary(data.data?.summary || null);
    } catch (err) {
      console.error("Fetch admin platform reviews error:", err);
      setError("Failed to load platform reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews({ showLoader: true });
  }, [navigate]);

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      "Delete this platform review? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingReviewId(reviewId);
      setActionMessage("");
      setError("");

      const response = await authFetch(
        `${API_URL}/${reviewId}`,
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
        setError(data.message || "Failed to delete platform review.");
        return;
      }

      setActionMessage(data.message || "Platform review deleted successfully.");
      await fetchReviews();
    } catch (err) {
      console.error("Delete admin platform review error:", err);
      setError("Failed to delete platform review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const summaryCards = useMemo(
    () => [
      {
        label: "Average Rating",
        value: summary ? formatAverageRating(summary.average_rating) : "0.0",
      },
      {
        label: "Total Reviews",
        value: summary ? Number(summary.total_reviews) || 0 : 0,
      },
      {
        label: "5 Star",
        value: summary ? Number(summary.five_star_count) || 0 : 0,
      },
      {
        label: "4 Star",
        value: summary ? Number(summary.four_star_count) || 0 : 0,
      },
      {
        label: "3 Star",
        value: summary ? Number(summary.three_star_count) || 0 : 0,
      },
      {
        label: "2-1 Star",
        value: summary
          ? (Number(summary.two_star_count) || 0) +
            (Number(summary.one_star_count) || 0)
          : 0,
      },
    ],
    [summary]
  );

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <p style={styles.eyebrow}>Platform Feedback Analytics</p>
              <h1 style={styles.title}>Platform Reviews</h1>
              <p style={styles.subtitle}>
                Monitor learner feedback about the overall platform experience,
                review written comments, and track how satisfaction trends over time.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={styles.infoCard}>Loading platform reviews...</div>
          ) : (
            <>
              {error && <div style={styles.errorBox}>{error}</div>}

              {actionMessage && (
                <div style={styles.successBox}>{actionMessage}</div>
              )}

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Review Summary</h2>
                <div style={styles.summaryGrid}>
                  {summaryCards.map((card) => (
                    <div key={card.label} style={styles.metricCard}>
                      <span style={styles.metricLabel}>{card.label}</span>
                      <span style={styles.metricValue}>{card.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Submitted Reviews</h2>
                    <p style={styles.sectionSubtitle}>
                      Each user can maintain one platform review and update it over time.
                    </p>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div style={styles.infoCard}>
                    No platform reviews have been submitted yet.
                  </div>
                ) : (
                  <div style={styles.reviewStack}>
                    {reviews.map((review) => {
                      const reviewRating = Math.max(
                        0,
                        Math.min(5, Number(review.rating) || 0)
                      );

                      return (
                        <article key={review.review_id} style={styles.reviewCard}>
                          <div style={styles.reviewHeader}>
                            <div>
                              <h3 style={styles.reviewName}>{review.full_name}</h3>
                              <p style={styles.reviewEmail}>{review.email}</p>
                            </div>

                            <div style={styles.reviewRatingWrap}>
                              <span style={styles.reviewStars}>
                                {renderStars(reviewRating)}
                              </span>
                              <span style={styles.reviewRatingValue}>
                                {reviewRating}/5
                              </span>
                              <span style={styles.reviewRatingText}>
                                {formatRatingText(reviewRating)}
                              </span>
                            </div>
                          </div>

                          <p style={styles.reviewComment}>
                            {review.comment || "No written comment provided."}
                          </p>

                          <div style={styles.reviewMetaRow}>
                            <span style={styles.reviewMetaItem}>
                              Submitted: {formatDateTime(review.created_at)}
                            </span>
                            <span style={styles.reviewMetaItem}>
                              Updated: {review.updated_at ? formatDateTime(review.updated_at) : "Not updated"}
                            </span>
                          </div>

                          <div style={styles.reviewActions}>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(review.review_id)}
                              disabled={deletingReviewId === review.review_id}
                              style={
                                deletingReviewId === review.review_id
                                  ? styles.deleteButtonDisabled
                                  : styles.deleteButton
                              }
                            >
                              {deletingReviewId === review.review_id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    padding: "32px 20px",
    paddingTop: "96px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "1180px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "28px",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#93c5fd",
    fontSize: "0.9rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "2.3rem",
  },
  subtitle: {
    margin: "10px 0 0",
    color: "#cbd5e1",
    fontSize: "1rem",
    lineHeight: "1.7",
    maxWidth: "860px",
  },
  section: {
    marginBottom: "28px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: "0 0 14px",
    color: "#ffffff",
    fontSize: "1.4rem",
  },
  sectionSubtitle: {
    margin: 0,
    color: "#94a3b8",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  metricCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: "0.92rem",
    fontWeight: "600",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: "1.85rem",
    fontWeight: "800",
  },
  reviewStack: {
    display: "grid",
    gap: "16px",
  },
  reviewCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: "14px",
  },
  reviewName: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.15rem",
  },
  reviewEmail: {
    margin: "8px 0 0",
    color: "#94a3b8",
  },
  reviewRatingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  },
  reviewStars: {
    color: "#fbbf24",
    fontSize: "1.2rem",
    letterSpacing: "0.08em",
  },
  reviewRatingValue: {
    color: "#dbeafe",
    fontWeight: "700",
    fontSize: "0.92rem",
  },
  reviewRatingText: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  reviewComment: {
    margin: "0 0 16px",
    color: "#dbe4f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
  },
  reviewMetaRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  reviewActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "16px",
  },
  reviewMetaItem: {
    color: "#94a3b8",
    fontSize: "0.92rem",
  },
  deleteButton: {
    border: "1px solid rgba(239, 68, 68, 0.35)",
    borderRadius: "10px",
    background: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
    padding: "10px 14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  deleteButtonDisabled: {
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "10px",
    background: "rgba(51, 65, 85, 0.58)",
    color: "#94a3b8",
    padding: "10px 14px",
    fontWeight: "700",
    cursor: "not-allowed",
  },
  infoCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "18px 20px",
    color: "#cbd5e1",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  successBox: {
    background: "rgba(34, 197, 94, 0.16)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    color: "#bbf7d0",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
};

export default AdminReviewsPage;
