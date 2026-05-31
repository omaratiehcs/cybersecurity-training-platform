import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authFetch } from "../utils/authFetch";

const INITIAL_BOT_MESSAGE =
  "Hi! I can help you understand how to use the CTF challenges, SOC cases, incident response scenarios, Docker lab, timers, learning paths, progress, reviews, and contact support.";

const SUGGESTED_QUESTIONS = [
  "How do CTF challenges work?",
  "How does the timer work?",
  "What happens if time expires?",
  "How does the Docker lab work?",
  "What are SOC cases?",
  "What are Incident Response scenarios?",
  "How do Learning Paths work?",
  "Where can I see my progress?",
  "How do reviews and contact messages work?",
];

const BOT_ANSWERS = {
  ctf: "CTF challenges are flag-based exercises. Open a challenge, click Start Challenge to begin the timer, investigate the task, submit the flag, and if correct you receive points and an explanation.",
  timer:
    "CTF timers start only when you click Start Challenge. The submission form stays disabled until the timer starts. If you solve before time runs out, the timer is completed. If time expires, that challenge is locked for your account for 24 hours.",
  expired:
    "If the timer expires before a correct flag is submitted, the backend locks that specific challenge for 24 hours. This lockout is enforced server-side, so direct API submissions are also blocked.",
  docker:
    "The Docker lab is a containerized hands-on prototype connected to Challenge 1. Start the lab from the challenge page, open the live portal, investigate clues such as page source, robots.txt, hidden paths, and config.js, then submit the final flag through the normal challenge form.",
  soc: "SOC cases simulate analyst investigations. You review logs or evidence, identify suspicious activity, submit your answer, and receive an explanation after solving.",
  incident:
    "Incident Response scenarios are multi-step investigations. You move through triage, technical analysis, and containment decisions. Steps unlock progressively and each step can include its own answer, points, and explanation.",
  learning:
    "Learning Paths organize lessons into courses. Start from the Learning Center, open a course, study the lessons in order, then practice related skills in CTF, SOC, or Incident modules.",
  progress:
    "You can track solved challenges, completed cases, incident progress, score, and leaderboard position from the Dashboard, Progress page, and Leaderboard.",
  reviewContact:
    "Use Review to rate the platform and leave feedback. Use Contact to send a support message to the admin team about labs, challenges, account issues, or training content.",
  admin:
    "Admins manage challenges, SOC cases, incident scenarios, learning content, reviews, contact messages, and analytics from the admin dashboard. Normal users focus on learning and practice modules.",
  restricted:
    "I can guide you on the process, but I can't provide flags, final answers, or ways to bypass platform rules. Try reviewing the challenge evidence and learning hints.",
  fallback:
    "I'm not sure about that yet. Try asking about CTF challenges, timers, Docker labs, SOC cases, incident response, learning paths, progress, reviews, or contact support.",
};

const TYPING_DELAY_MS = 420;
const CHAT_API_URL = "http://localhost:5000/api/chat";

const getBotReply = (input) => {
  const normalizedInput = input.trim().toLowerCase();

  if (!normalizedInput) {
    return BOT_ANSWERS.fallback;
  }

  if (
    /(flag|answer|solution|solve it|bypass|skip|cheat|unlock|override|admin flag|give me)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.restricted;
  }

  if (
    /(time expires|expired timer|expire|24 hour|24-hour|locked|lockout)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.expired;
  }

  if (/(timer|time remaining|start challenge|countdown)/i.test(normalizedInput)) {
    return BOT_ANSWERS.timer;
  }

  if (/(docker|container|lab|robots\.txt|config\.js)/i.test(normalizedInput)) {
    return BOT_ANSWERS.docker;
  }

  if (/(soc|siem|log|logs|alert)/i.test(normalizedInput)) {
    return BOT_ANSWERS.soc;
  }

  if (/(incident|response|triage|containment|step)/i.test(normalizedInput)) {
    return BOT_ANSWERS.incident;
  }

  if (
    /(course|lesson|learning|path|learning center|tutorial)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.learning;
  }

  if (/(progress|score|leaderboard|dashboard|rank)/i.test(normalizedInput)) {
    return BOT_ANSWERS.progress;
  }

  if (/(review|rating|feedback|contact|message|support)/i.test(normalizedInput)) {
    return BOT_ANSWERS.reviewContact;
  }

  if (/(admin|manage|insights|analytics)/i.test(normalizedInput)) {
    return BOT_ANSWERS.admin;
  }

  if (/(ctf|flag-based|challenge|submit flag)/i.test(normalizedInput)) {
    return BOT_ANSWERS.ctf;
  }

  return BOT_ANSWERS.fallback;
};

function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "initial-bot-message",
      sender: "bot",
      text: INITIAL_BOT_MESSAGE,
    },
  ]);
  const scrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const displayedSuggestedQuestions = useMemo(
    () =>
      showAllTopics ? SUGGESTED_QUESTIONS : SUGGESTED_QUESTIONS.slice(0, 4),
    [showAllTopics]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [isOpen, messages, isTyping, showAllTopics]);

  const waitForTypingDelay = () =>
    new Promise((resolve) => {
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
        resolve();
      }, TYPING_DELAY_MS);
    });

  const requestBackendAnswer = async (questionText) => {
    const response = await authFetch(
      CHAT_API_URL,
      {
        method: "POST",
        body: JSON.stringify({
          message: questionText,
        }),
      },
      navigate
    );

    if (!response) {
      throw new Error("Chat request failed.");
    }

    if (!response.ok) {
      throw new Error("Chat request returned a non-success response.");
    }

    const data = await response.json();
    const answer =
      typeof data?.answer === "string" ? data.answer.trim() : "";
    const source =
      data?.source === "gemini"
        ? "gemini"
        : data?.source === "platform-guide"
          ? "platform-guide"
          : "fallback";

    if (!answer) {
      throw new Error("Chat response did not include an answer.");
    }

    return {
      answer,
      source,
    };
  };

  const sendQuestion = async (questionText) => {
    const trimmedQuestion = questionText.trim();

    if (!trimmedQuestion || isTyping) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const timestamp = `${Date.now()}-${Math.random()}`;
    const fallbackAnswer = getBotReply(trimmedQuestion);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${timestamp}`,
        sender: "user",
        text: trimmedQuestion,
      },
    ]);
    setShowAllTopics(false);
    setIsTyping(true);

    try {
      const [backendReply] = await Promise.all([
        requestBackendAnswer(trimmedQuestion),
        waitForTypingDelay(),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${timestamp}`,
          sender: "bot",
          text: backendReply.answer,
          source: backendReply.source,
        },
      ]);
    } catch (_error) {
      if (!isMountedRef.current) {
        return;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      await new Promise((resolve) => setTimeout(resolve, TYPING_DELAY_MS));

      if (!isMountedRef.current) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${timestamp}`,
          sender: "bot",
          text: fallbackAnswer,
          source: "fallback",
        },
      ]);
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false);
      }
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    void sendQuestion(input);
    setInput("");
  };

  const handleSuggestedQuestionClick = (question) => {
    void sendQuestion(question);
  };

  return (
    <>
      <style>
        {`
          @keyframes chatbotFloat {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0px); }
          }

          @keyframes chatbotPulse {
            0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.22); }
            70% { box-shadow: 0 0 0 14px rgba(34, 211, 238, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
          }

          @keyframes chatbotPanelIn {
            0% { opacity: 0; transform: translateY(14px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes chatbotTypingDot {
            0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-2px); }
          }

          .chatbot-widget-button,
          .chatbot-chip,
          .chatbot-send-button,
          .chatbot-close-button,
          .chatbot-more-topics {
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease,
              border-color 0.2s ease,
              background 0.2s ease,
              color 0.2s ease;
          }

          .chatbot-widget-button:hover,
          .chatbot-send-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 30px rgba(6, 182, 212, 0.22);
          }

          .chatbot-close-button:hover {
            transform: translateY(-1px);
            border-color: rgba(34, 211, 238, 0.28);
            background: rgba(15, 23, 42, 0.92);
          }

          .chatbot-chip:hover,
          .chatbot-more-topics:hover {
            transform: translateY(-2px);
            border-color: rgba(45, 212, 191, 0.32);
            background: rgba(15, 23, 42, 0.92);
          }

          .chatbot-dot {
            width: 5px;
            height: 5px;
            border-radius: 999px;
            background: #67e8f9;
            animation: chatbotTypingDot 1.1s infinite ease-in-out;
          }

          .chatbot-dot:nth-child(2) {
            animation-delay: 0.14s;
          }

          .chatbot-dot:nth-child(3) {
            animation-delay: 0.28s;
          }

          .chatbot-message-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .chatbot-message-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(71, 85, 105, 0.45);
            border-radius: 999px;
          }

          .chatbot-message-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          @media (max-width: 768px) {
            .chatbot-panel {
              width: min(92vw, 360px) !important;
              height: min(74vh, 560px) !important;
              right: 16px !important;
              bottom: 84px !important;
            }

            .chatbot-launcher {
              right: 16px !important;
              bottom: 16px !important;
            }
          }
        `}
      </style>

      {isOpen && (
        <div style={styles.panel} className="chatbot-panel">
          <div style={styles.header}>
            <div>
              <h3 style={styles.headerTitle}>Cyber Assistant</h3>
              <p style={styles.headerSubtitle}>Platform guidance</p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
              className="chatbot-close-button"
              aria-label="Close chatbot"
            >
              x
            </button>
          </div>

          <div
            style={styles.messageArea}
            ref={scrollContainerRef}
            className="chatbot-message-scrollbar"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  ...styles.messageBubble,
                  ...(message.sender === "user"
                    ? styles.userBubble
                    : styles.botBubble),
                }}
              >
                {message.sender === "bot" && message.source === "gemini" && (
                  <span style={styles.messageSourceTag}>AI-assisted</span>
                )}
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div
                style={{
                  ...styles.messageBubble,
                  ...styles.botBubble,
                  ...styles.typingBubble,
                }}
              >
                <div style={styles.typingRow}>
                  <span>Cyber Assistant is typing...</span>
                  <div style={styles.typingDots}>
                    <span className="chatbot-dot" />
                    <span className="chatbot-dot" />
                    <span className="chatbot-dot" />
                  </div>
                </div>
              </div>
            )}

            {!isTyping && (
              <div style={styles.suggestionBlock}>
                <p style={styles.suggestionLabel}>Try asking next</p>

                <div style={styles.suggestionList}>
                  {displayedSuggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSuggestedQuestionClick(question)}
                      style={styles.chip}
                      className="chatbot-chip"
                    >
                      {question}
                    </button>
                  ))}

                  {!showAllTopics &&
                    SUGGESTED_QUESTIONS.length > displayedSuggestedQuestions.length && (
                      <button
                        type="button"
                        onClick={() => setShowAllTopics(true)}
                        style={styles.moreTopicsButton}
                        className="chatbot-more-topics"
                      >
                        More topics
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={styles.form}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about CTF, timers, Docker labs..."
              style={styles.input}
              maxLength={280}
            />
            <button
              type="submit"
              style={{
                ...styles.sendButton,
                ...(isTyping || !input.trim() ? styles.sendButtonDisabled : null),
              }}
              className="chatbot-send-button"
              disabled={isTyping || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={styles.launcher}
        className="chatbot-widget-button chatbot-launcher"
        aria-label={isOpen ? "Close Cyber Assistant" : "Open Cyber Assistant"}
      >
        <span style={styles.launcherIcon}>AI</span>
      </button>
    </>
  );
}

const styles = {
  launcher: {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    width: "62px",
    height: "62px",
    borderRadius: "999px",
    border: "1px solid rgba(34, 211, 238, 0.22)",
    background:
      "linear-gradient(135deg, rgba(8, 16, 32, 0.96), rgba(6, 182, 212, 0.9))",
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: "0.98rem",
    cursor: "pointer",
    zIndex: 1200,
    boxShadow: "0 18px 36px rgba(2, 8, 23, 0.3)",
    animation:
      "chatbotFloat 5s ease-in-out infinite, chatbotPulse 3.8s ease-in-out infinite",
  },
  launcherIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    letterSpacing: "0.04em",
  },
  panel: {
    position: "fixed",
    right: "22px",
    bottom: "96px",
    width: "372px",
    maxWidth: "calc(100vw - 32px)",
    height: "min(590px, calc(100vh - 128px))",
    borderRadius: "22px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background:
      "linear-gradient(180deg, rgba(3, 10, 22, 0.92), rgba(2, 8, 23, 0.88))",
    WebkitBackdropFilter: "blur(16px)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 24px 48px rgba(2, 8, 23, 0.36)",
    zIndex: 1199,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    animation: "chatbotPanelIn 0.24s ease-out both",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "18px 18px 12px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: "1rem",
  },
  headerSubtitle: {
    margin: "4px 0 0",
    color: "#94a3b8",
    fontSize: "0.82rem",
  },
  closeButton: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background: "rgba(15, 23, 42, 0.78)",
    color: "#e2e8f0",
    fontSize: "1.05rem",
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
  },
  messageArea: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px 18px 14px",
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  messageBubble: {
    maxWidth: "88%",
    padding: "11px 13px",
    borderRadius: "16px",
    fontSize: "0.9rem",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  },
  messageSourceTag: {
    display: "inline-block",
    marginBottom: "7px",
    padding: "3px 7px",
    borderRadius: "999px",
    background: "rgba(6, 182, 212, 0.16)",
    border: "1px solid rgba(34, 211, 238, 0.18)",
    color: "#67e8f9",
    fontSize: "0.67rem",
    fontWeight: "800",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  botBubble: {
    alignSelf: "flex-start",
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid rgba(34, 211, 238, 0.12)",
    color: "#dbeafe",
  },
  userBubble: {
    alignSelf: "flex-end",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(37, 99, 235, 0.2))",
    border: "1px solid rgba(96, 165, 250, 0.16)",
    color: "#f8fafc",
  },
  typingBubble: {
    maxWidth: "92%",
  },
  typingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  typingDots: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    flexShrink: 0,
  },
  suggestionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "4px",
    paddingTop: "4px",
  },
  suggestionLabel: {
    margin: 0,
    color: "#7dd3fc",
    fontSize: "0.76rem",
    fontWeight: "700",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  suggestionList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  chip: {
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: "999px",
    background: "rgba(8, 16, 32, 0.84)",
    color: "#d7e4f4",
    padding: "8px 11px",
    fontSize: "0.76rem",
    fontWeight: "700",
    cursor: "pointer",
    textAlign: "left",
    lineHeight: 1.35,
  },
  moreTopicsButton: {
    border: "1px solid rgba(34, 211, 238, 0.22)",
    borderRadius: "999px",
    background: "rgba(6, 182, 212, 0.1)",
    color: "#67e8f9",
    padding: "8px 12px",
    fontSize: "0.76rem",
    fontWeight: "800",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    gap: "10px",
    padding: "14px 18px 18px",
    alignItems: "center",
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    background: "rgba(2, 8, 23, 0.72)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: "44px",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background: "rgba(8, 16, 32, 0.84)",
    color: "#f8fafc",
    padding: "0 14px",
    outline: "none",
    fontSize: "0.92rem",
  },
  sendButton: {
    height: "44px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.96), rgba(37, 99, 235, 0.96))",
    color: "#ffffff",
    padding: "0 16px",
    fontWeight: "800",
    cursor: "pointer",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

export default ChatbotWidget;
