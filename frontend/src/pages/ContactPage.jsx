import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";
import { normalizeInput } from "../utils/validation";

const API_URL = "http://localhost:5000/api/contact";
const MAX_SUBJECT_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 3000;

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

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

function ContactPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editMessageBody, setEditMessageBody] = useState("");
  const [savingEditId, setSavingEditId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const remainingSubjectCharacters = useMemo(
    () => MAX_SUBJECT_LENGTH - subject.length,
    [subject.length]
  );
  const remainingMessageCharacters = useMemo(
    () => MAX_MESSAGE_LENGTH - messageBody.length,
    [messageBody.length]
  );
  const remainingEditSubjectCharacters = useMemo(
    () => MAX_SUBJECT_LENGTH - editSubject.length,
    [editSubject.length]
  );
  const remainingEditMessageCharacters = useMemo(
    () => MAX_MESSAGE_LENGTH - editMessageBody.length,
    [editMessageBody.length]
  );

  const resetEditState = () => {
    setEditingMessageId(null);
    setEditSubject("");
    setEditMessageBody("");
  };

  const loadMyMessages = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoadingMessages(true);
      }

      setMessagesError("");
      const response = await authFetch(`${API_URL}/my`, {}, navigate);

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessagesError(data.message || "Failed to load your contact messages.");
        return;
      }

      const nextMessages = data.data || [];

      setMyMessages(nextMessages);

      if (
        editingMessageId &&
        !nextMessages.some((item) => item.message_id === editingMessageId)
      ) {
        resetEditState();
      }
    } catch (error) {
      console.error("Fetch my contact messages error:", error);
      setMessagesError("Failed to load your contact messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMyMessages({ showLoader: true });
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const normalizedSubject = normalizeInput(subject);
    const normalizedMessage = normalizeInput(messageBody);

    if (!normalizedSubject) {
      setMessage("Subject is required.");
      return;
    }

    if (!normalizedMessage) {
      setMessage("Message is required.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await authFetch(
        API_URL,
        {
          method: "POST",
          body: JSON.stringify({
            subject: normalizedSubject,
            message: normalizedMessage,
          }),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Failed to send your message.");
        return;
      }

      setSubject("");
      setMessageBody("");
      setMessage(data.message || "Your message was sent successfully.");
      setIsSuccess(true);
      await loadMyMessages();
    } catch (error) {
      console.error("Send contact message error:", error);
      setMessage("Failed to send your message.");
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (item) => {
    setMessage("");
    setIsSuccess(false);
    setEditingMessageId(item.message_id);
    setEditSubject(item.subject || "");
    setEditMessageBody(item.message || "");
  };

  const handleCancelEdit = () => {
    resetEditState();
  };

  const handleSaveEdit = async (messageId) => {
    const normalizedSubject = normalizeInput(editSubject);
    const normalizedMessage = normalizeInput(editMessageBody);

    setMessage("");
    setIsSuccess(false);

    if (!normalizedSubject) {
      setMessage("Subject is required.");
      return;
    }

    if (!normalizedMessage) {
      setMessage("Message is required.");
      return;
    }

    try {
      setSavingEditId(messageId);

      const response = await authFetch(
        `${API_URL}/my/${messageId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            subject: normalizedSubject,
            message: normalizedMessage,
          }),
        },
        navigate
      );

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        setMessage(data.message || "Failed to update your contact message.");
        return;
      }

      setMessage(data.message || "Contact message updated successfully.");
      setIsSuccess(true);
      resetEditState();
      await loadMyMessages();
    } catch (error) {
      console.error("Update my contact message error:", error);
      setMessage("Failed to update your contact message.");
      setIsSuccess(false);
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this contact message?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setIsSuccess(false);

    try {
      setDeletingMessageId(messageId);

      const response = await authFetch(
        `${API_URL}/my/${messageId}`,
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
        setMessage(data.message || "Failed to delete your contact message.");
        return;
      }

      setMessage(data.message || "Contact message deleted successfully.");
      setIsSuccess(true);

      if (editingMessageId === messageId) {
        resetEditState();
      }

      await loadMyMessages();
    } catch (error) {
      console.error("Delete my contact message error:", error);
      setMessage("Failed to delete your contact message.");
      setIsSuccess(false);
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.heroCard}>
            <span style={styles.eyebrow}>Support &amp; Feedback</span>
            <h1 style={styles.title}>Contact Us</h1>
            <p style={styles.subtitle}>
              Send a message to the platform admin team about labs, challenges,
              account issues, or training content.
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

          <div style={styles.contentGrid}>
            <div style={styles.formCard}>
              <h2 style={styles.sectionTitle}>Send a Message</h2>
              <p style={styles.sectionSubtitle}>
                Messages are stored securely inside the platform so the admin
                team can review and respond to support needs during the project
                demo.
              </p>

              <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                  Subject
                  <input
                    type="text"
                    value={subject}
                    onChange={(event) =>
                      setSubject(event.target.value.slice(0, MAX_SUBJECT_LENGTH))
                    }
                    maxLength={MAX_SUBJECT_LENGTH}
                    placeholder="Example: Issue opening an incident lab"
                    style={styles.input}
                  />
                </label>

                <div style={styles.characterCount}>
                  {remainingSubjectCharacters} characters remaining
                </div>

                <label style={styles.label}>
                  Message
                  <textarea
                    value={messageBody}
                    onChange={(event) =>
                      setMessageBody(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
                    }
                    rows={8}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder="Describe the issue, question, or feedback you want to send to the platform admin team."
                    style={styles.textarea}
                  />
                </label>

                <div style={styles.formFooter}>
                  <span style={styles.characterCount}>
                    {remainingMessageCharacters} characters remaining
                  </span>

                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={submitting}
                  >
                    {submitting ? "Sending Message..." : "Send Message"}
                  </button>
                </div>
              </form>
            </div>

            <div style={styles.infoCard}>
              <h2 style={styles.sectionTitle}>What You Can Contact Us About</h2>
              <div style={styles.infoList}>
                <div style={styles.infoItem}>
                  <span style={styles.infoItemTitle}>Platform support</span>
                  <p style={styles.infoItemText}>
                    Report issues with navigation, page loading, or unexpected platform behavior.
                  </p>
                </div>

                <div style={styles.infoItem}>
                  <span style={styles.infoItemTitle}>Training labs</span>
                  <p style={styles.infoItemText}>
                    Share feedback about hands-on labs, walkthrough clarity, or lab access problems.
                  </p>
                </div>

                <div style={styles.infoItem}>
                  <span style={styles.infoItemTitle}>
                    Challenge, SOC, or incident questions
                  </span>
                  <p style={styles.infoItemText}>
                    Ask about suspicious outputs, unclear evidence, or training content that needs improvement.
                  </p>
                </div>

                <div style={styles.infoItem}>
                  <span style={styles.infoItemTitle}>Account or access issues</span>
                  <p style={styles.infoItemText}>
                    Reach out if you are blocked by login, verification, role access, or missing platform features.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section style={styles.historySection}>
            <div style={styles.historyHeader}>
              <div>
                <h2 style={styles.sectionTitle}>My Messages</h2>
                <p style={styles.sectionSubtitle}>
                  Review your previous contact requests and any admin replies
                  saved inside the platform.
                </p>
              </div>
            </div>

            {messagesError && <div style={styles.errorBox}>{messagesError}</div>}

            {loadingMessages ? (
              <div style={styles.historyEmptyCard}>Loading your messages...</div>
            ) : myMessages.length === 0 ? (
              <div style={styles.historyEmptyCard}>
                You have not sent any contact messages yet.
              </div>
            ) : (
              <div style={styles.historyList}>
                {myMessages.map((item) => {
                  const hasReply = Boolean(normalizeInput(item.admin_reply));
                  const isNew = item.status === "new";
                  const canModify = isNew && !hasReply;
                  const isEditing = editingMessageId === item.message_id;
                  const isSavingEdit = savingEditId === item.message_id;
                  const isDeleting = deletingMessageId === item.message_id;

                  return (
                    <article key={item.message_id} style={styles.historyCard}>
                      <div style={styles.historyCardHeader}>
                        <div>
                          <h3 style={styles.historySubject}>{item.subject}</h3>
                          <div style={styles.historyMetaRow}>
                            <span style={styles.historyMetaItem}>
                              Submitted:{" "}
                              {getDisplayDate(item, "created_at")}
                            </span>
                            <span style={styles.historyMetaItem}>
                              Read: {getDisplayDate(item, "read_at", "Not read yet")}
                            </span>
                          </div>
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

                      {isEditing ? (
                        <div style={styles.editCard}>
                          <label style={styles.label}>
                            Subject
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(event) =>
                                setEditSubject(
                                  event.target.value.slice(0, MAX_SUBJECT_LENGTH)
                                )
                              }
                              maxLength={MAX_SUBJECT_LENGTH}
                              style={styles.input}
                            />
                          </label>

                          <div style={styles.characterCount}>
                            {remainingEditSubjectCharacters} characters remaining
                          </div>

                          <label style={styles.label}>
                            Message
                            <textarea
                              value={editMessageBody}
                              onChange={(event) =>
                                setEditMessageBody(
                                  event.target.value.slice(0, MAX_MESSAGE_LENGTH)
                                )
                              }
                              rows={6}
                              maxLength={MAX_MESSAGE_LENGTH}
                              style={styles.textarea}
                            />
                          </label>

                          <div style={styles.editFooter}>
                            <span style={styles.characterCount}>
                              {remainingEditMessageCharacters} characters remaining
                            </span>

                            <div style={styles.historyActionGroup}>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                style={
                                  isSavingEdit
                                    ? styles.primaryButtonDisabled
                                    : styles.primaryButton
                                }
                                onClick={() => handleSaveEdit(item.message_id)}
                                disabled={isSavingEdit}
                              >
                                {isSavingEdit ? "Saving..." : "Save Changes"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p style={styles.historyMessage}>{item.message}</p>
                      )}

                      {hasReply && (
                        <div style={styles.replyCard}>
                          <p style={styles.replyLabel}>Admin Reply</p>
                          <p style={styles.replyText}>{item.admin_reply}</p>
                          <p style={styles.replyMeta}>
                            Replied:{" "}
                            {getDisplayDate(
                              item,
                              "replied_at",
                              "Not replied yet"
                            )}
                          </p>
                        </div>
                      )}

                      {!isEditing && canModify && (
                        <div style={styles.historyActionRow}>
                          <div style={styles.historyActionGroup}>
                            <button
                              type="button"
                              style={styles.secondaryButton}
                              onClick={() => handleStartEdit(item)}
                              disabled={isDeleting}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              style={
                                isDeleting
                                  ? styles.dangerButtonDisabled
                                  : styles.dangerButton
                              }
                              onClick={() => handleDeleteMessage(item.message_id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}

                      {!isEditing && !canModify && (
                        <p style={styles.reviewedHint}>
                          Reviewed messages cannot be edited.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
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
    maxWidth: "1180px",
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
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.9fr)",
    gap: "20px",
    alignItems: "start",
  },
  historySection: {
    marginTop: "22px",
  },
  historyHeader: {
    marginBottom: "14px",
  },
  formCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  infoCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  sectionTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.4rem",
  },
  sectionSubtitle: {
    margin: "10px 0 0",
    color: "#94a3b8",
    lineHeight: "1.7",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "20px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    color: "#dbeafe",
    fontWeight: "600",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(2, 6, 23, 0.72)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
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
  infoList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginTop: "20px",
  },
  infoItem: {
    background: "rgba(2, 6, 23, 0.52)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "16px",
    padding: "16px",
  },
  infoItemTitle: {
    display: "block",
    color: "#e0f2fe",
    fontWeight: "700",
    marginBottom: "8px",
  },
  infoItemText: {
    margin: 0,
    color: "#94a3b8",
    lineHeight: "1.7",
    fontSize: "0.95rem",
  },
  historyList: {
    display: "grid",
    gap: "16px",
  },
  historyCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  historyEmptyCard: {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "18px 20px",
    color: "#cbd5e1",
    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
  },
  historyCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  historySubject: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.15rem",
  },
  historyMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "10px",
  },
  historyMetaItem: {
    color: "#94a3b8",
    fontSize: "0.92rem",
  },
  historyMessage: {
    margin: 0,
    color: "#dbe4f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
  },
  editCard: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  editFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  historyActionRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "18px",
  },
  historyActionGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
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
  replyCard: {
    marginTop: "18px",
    background: "rgba(2, 6, 23, 0.56)",
    border: "1px solid rgba(59, 130, 246, 0.16)",
    borderRadius: "16px",
    padding: "16px",
  },
  replyLabel: {
    margin: "0 0 8px",
    color: "#93c5fd",
    fontSize: "0.82rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  replyText: {
    margin: "0 0 10px",
    color: "#e2e8f0",
    lineHeight: "1.75",
    whiteSpace: "pre-wrap",
  },
  replyMeta: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
  reviewedHint: {
    margin: "18px 0 0",
    color: "#94a3b8",
    fontSize: "0.92rem",
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
  dangerButton: {
    border: "1px solid rgba(248, 113, 113, 0.25)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(127, 29, 29, 0.18)",
    color: "#fecaca",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "pointer",
  },
  dangerButtonDisabled: {
    border: "1px solid rgba(71, 85, 105, 0.24)",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "rgba(51, 65, 85, 0.58)",
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: "0.96rem",
    cursor: "not-allowed",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "16px",
  },
};

export default ContactPage;
