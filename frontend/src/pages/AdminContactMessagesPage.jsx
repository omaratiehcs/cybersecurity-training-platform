import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import { normalizeInput } from "../utils/validation";

const API_URL = "http://localhost:5000/api/contact/admin";
const MAX_REPLY_LENGTH = 3000;

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const normalizedValue = trimmedValue.includes(" ")
      ? trimmedValue.replace(" ", "T")
      : trimmedValue;

    const valueWithTimezone =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalizedValue)
        ? `${normalizedValue}Z`
        : normalizedValue;

    const parsedDate = new Date(valueWithTimezone);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getDisplayDate = (item, fieldName, fallback = "Not available") => {
  const displayValue = item?.[`${fieldName}_display`];

  if (displayValue) {
    return displayValue;
  }

  const rawValue = item?.[fieldName];

  if (!rawValue) {
    return fallback;
  }

  if (typeof rawValue === "string") {
    return rawValue;
  }

  const parsedDate = parseDateValue(rawValue);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const sortMessages = (items = []) => {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "new" ? -1 : 1;
    }

    const firstDate = parseDateValue(a.created_at)?.getTime() ?? Number.NaN;
    const secondDate = parseDateValue(b.created_at)?.getTime() ?? Number.NaN;

    if (
      Number.isFinite(firstDate) &&
      Number.isFinite(secondDate) &&
      firstDate !== secondDate
    ) {
      return secondDate - firstDate;
    }

    return (Number(b.message_id) || 0) - (Number(a.message_id) || 0);
  });
};

function AdminContactMessagesPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [markingReadId, setMarkingReadId] = useState(null);
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  const loadMessages = async ({ showLoader = false } = {}) => {
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
        setError(data.message || "Failed to load contact messages.");
        return;
      }

      const nextMessages = sortMessages(data.data || []);

      setMessages(nextMessages);
      setReplyDrafts((previousDrafts) => {
        const nextDrafts = {};

        nextMessages.forEach((item) => {
          nextDrafts[item.message_id] =
            previousDrafts[item.message_id] ?? item.admin_reply ?? "";
        });

        return nextDrafts;
      });
    } catch (err) {
      console.error("Fetch admin contact messages error:", err);
      setError("Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages({ showLoader: true });
  }, [navigate]);

  const summary = useMemo(() => {
    const totalMessages = messages.length;
    const newMessages = messages.filter((item) => item.status === "new").length;
    const readMessages = messages.filter((item) => item.status === "read").length;

    return {
      totalMessages,
      newMessages,
      readMessages,
    };
  }, [messages]);

  const handleReplyDraftChange = (messageId, value) => {
    setReplyDrafts((previousDrafts) => ({
      ...previousDrafts,
      [messageId]: value.slice(0, MAX_REPLY_LENGTH),
    }));
  };

  const handleMarkAsRead = async (messageId) => {
    setActionMessage("");
    setIsSuccess(false);

    try {
      setMarkingReadId(messageId);

      const response = await authFetch(
        `${API_URL}/${messageId}/read`,
        {
          method: "PUT",
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setActionMessage(data.message || "Failed to update contact message.");
        return;
      }

      setActionMessage(data.message || "Contact message marked as read.");
      setIsSuccess(true);
      await loadMessages();
    } catch (error) {
      console.error("Mark contact message as read error:", error);
      setActionMessage("Failed to update contact message.");
      setIsSuccess(false);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleReplySubmit = async (messageId) => {
    const normalizedReply = normalizeInput(replyDrafts[messageId]);

    setActionMessage("");
    setIsSuccess(false);

    if (!normalizedReply) {
      setActionMessage("Reply is required.");
      return;
    }

    try {
      setSubmittingReplyId(messageId);

      const response = await authFetch(
        `${API_URL}/${messageId}/reply`,
        {
          method: "PUT",
          body: JSON.stringify({
            reply: normalizedReply,
          }),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setActionMessage(data.message || "Failed to save contact reply.");
        return;
      }

      setActionMessage(data.message || "Contact reply saved successfully.");
      setIsSuccess(true);
      await loadMessages();
    } catch (error) {
      console.error("Reply to contact message error:", error);
      setActionMessage("Failed to save contact reply.");
      setIsSuccess(false);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <div>
              <p style={styles.eyebrow}>Admin Support Inbox</p>
              <h1 style={styles.title}>Contact Messages</h1>
              <p style={styles.subtitle}>
                Review user questions, send in-platform replies, and manage
                support requests about labs, accounts, and training content.
              </p>
            </div>
          </div>

          {actionMessage && (
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
              {actionMessage}
            </div>
          )}

          {loading ? (
            <div style={styles.infoCard}>Loading contact messages...</div>
          ) : (
            <>
              {error && <div style={styles.errorBox}>{error}</div>}

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Message Summary</h2>
                <div style={styles.summaryGrid}>
                  <div style={styles.metricCard}>
                    <span style={styles.metricLabel}>Total Messages</span>
                    <span style={styles.metricValue}>{summary.totalMessages}</span>
                  </div>
                  <div style={styles.metricCard}>
                    <span style={styles.metricLabel}>New Messages</span>
                    <span style={styles.metricValue}>{summary.newMessages}</span>
                  </div>
                  <div style={styles.metricCard}>
                    <span style={styles.metricLabel}>Read Messages</span>
                    <span style={styles.metricValue}>{summary.readMessages}</span>
                  </div>
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Submitted Messages</h2>
                    <p style={styles.sectionSubtitle}>
                      New messages appear first so the admin team can review
                      unread support requests quickly and respond inside the
                      platform.
                    </p>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div style={styles.infoCard}>
                    No contact messages have been submitted yet.
                  </div>
                ) : (
                  <div style={styles.messageStack}>
                    {messages.map((item) => {
                      const isNew = item.status === "new";
                      const hasReply = Boolean(normalizeInput(item.admin_reply));
                      const draftReply = replyDrafts[item.message_id] ?? "";
                      const isSubmittingReply =
                        submittingReplyId === item.message_id;
                      const isMarkingRead = markingReadId === item.message_id;

                      return (
                        <article key={item.message_id} style={styles.messageCard}>
                          <div style={styles.messageHeader}>
                            <div>
                              <h3 style={styles.messageSubject}>{item.subject}</h3>
                              <p style={styles.messageUser}>
                                {item.full_name} | {item.email}
                              </p>
                            </div>

                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: isNew
                                  ? "rgba(37, 99, 235, 0.14)"
                                  : "rgba(22, 163, 74, 0.14)",
                                color: isNew ? "#bfdbfe" : "#bbf7d0",
                                borderColor: isNew
                                  ? "rgba(96, 165, 250, 0.24)"
                                  : "rgba(74, 222, 128, 0.24)",
                              }}
                            >
                              {isNew ? "New" : "Read"}
                            </span>
                          </div>

                          <p style={styles.messageBody}>{item.message}</p>

                          <div style={styles.metaRow}>
                            <span style={styles.metaItem}>
                              Submitted: {getDisplayDate(item, "created_at")}
                            </span>
                            <span style={styles.metaItem}>
                              Read: {getDisplayDate(item, "read_at", "Not read yet")}
                            </span>
                          </div>

                          {hasReply && (
                            <div style={styles.replyPreviewCard}>
                              <p style={styles.replyPreviewLabel}>Admin Reply</p>
                              <p style={styles.replyPreviewText}>{item.admin_reply}</p>
                              <p style={styles.replyPreviewMeta}>
                                Replied:{" "}
                                {getDisplayDate(
                                  item,
                                  "replied_at",
                                  "Not replied yet"
                                )}
                              </p>
                            </div>
                          )}

                          <div style={styles.replyComposer}>
                            <div style={styles.replyComposerHeader}>
                              <span style={styles.replyComposerTitle}>
                                {hasReply ? "Update Reply" : "Write Reply"}
                              </span>
                              <span style={styles.replyCharacterCount}>
                                {MAX_REPLY_LENGTH - draftReply.length} characters
                                remaining
                              </span>
                            </div>

                            <textarea
                              value={draftReply}
                              onChange={(event) =>
                                handleReplyDraftChange(
                                  item.message_id,
                                  event.target.value
                                )
                              }
                              rows={4}
                              maxLength={MAX_REPLY_LENGTH}
                              placeholder="Write an admin reply that the user can view on the Contact page."
                              style={styles.replyTextarea}
                            />
                          </div>

                          <div style={styles.actionRow}>
                            {isNew && !hasReply && (
                              <button
                                type="button"
                                style={
                                  isMarkingRead
                                    ? styles.secondaryButtonDisabled
                                    : styles.secondaryButton
                                }
                                onClick={() => handleMarkAsRead(item.message_id)}
                                disabled={isMarkingRead || isSubmittingReply}
                              >
                                {isMarkingRead ? "Marking..." : "Mark as Read"}
                              </button>
                            )}

                            <button
                              type="button"
                              style={
                                isSubmittingReply
                                  ? styles.primaryButtonDisabled
                                  : styles.primaryButton
                              }
                              onClick={() => handleReplySubmit(item.message_id)}
                              disabled={isSubmittingReply || isMarkingRead}
                            >
                              {isSubmittingReply
                                ? hasReply
                                  ? "Updating..."
                                  : "Sending..."
                                : hasReply
                                  ? "Update Reply"
                                  : "Send Reply"}
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
  messageBox: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid",
    lineHeight: "1.7",
    fontWeight: "600",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
  messageStack: {
    display: "grid",
    gap: "16px",
  },
  messageCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: "14px",
  },
  messageSubject: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.15rem",
  },
  messageUser: {
    margin: "8px 0 0",
    color: "#94a3b8",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },
  messageBody: {
    margin: "0 0 16px",
    color: "#dbe4f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
  },
  metaRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  metaItem: {
    color: "#94a3b8",
    fontSize: "0.92rem",
  },
  replyPreviewCard: {
    marginTop: "18px",
    background: "rgba(2, 6, 23, 0.56)",
    border: "1px solid rgba(59, 130, 246, 0.16)",
    borderRadius: "16px",
    padding: "16px",
  },
  replyPreviewLabel: {
    margin: "0 0 8px",
    color: "#93c5fd",
    fontSize: "0.82rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  replyPreviewText: {
    margin: "0 0 10px",
    color: "#e2e8f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
  },
  replyPreviewMeta: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
  replyComposer: {
    marginTop: "18px",
    background: "rgba(2, 6, 23, 0.48)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "16px",
  },
  replyComposerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  replyComposerTitle: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  replyCharacterCount: {
    color: "#94a3b8",
    fontSize: "0.88rem",
  },
  replyTextarea: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(15, 23, 42, 0.82)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.7",
    minHeight: "118px",
    boxSizing: "border-box",
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
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
  secondaryButton: {
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(15, 23, 42, 0.7)",
    color: "#dbeafe",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "pointer",
  },
  secondaryButtonDisabled: {
    border: "1px solid rgba(71, 85, 105, 0.24)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(51, 65, 85, 0.58)",
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: "0.96rem",
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
};

export default AdminContactMessagesPage;
