const { GoogleGenAI } = require("@google/genai");

const { normalizeString, parsePositiveInt } = require("../utils/validation");
const {
  warnMalformedInput,
  warnSuspiciousFields,
  warnInvalidId,
} = require("../utils/security");

const MAX_CHAT_MESSAGE_LENGTH = 1000;
const GEMINI_MODEL = "gemini-2.5-flash";
const SAFE_REFUSAL_MESSAGE =
  "I can guide you on the process, but I can't provide flags, final answers, or ways to bypass platform rules. Try reviewing the challenge evidence and learning hints.";

const BOT_ANSWERS = {
  ctf: "CTF challenges are flag-based exercises. Open a challenge, click Start Challenge to begin the timer, investigate the task, submit the flag, and if correct you receive points and an explanation.",
  timer:
    "CTF timers start only when you click Start Challenge. Before starting, the submission form stays disabled. If you submit the correct flag before time runs out, the timer is completed and the normal success/explanation flow continues. If time expires before a correct flag is submitted, that specific challenge is locked for your account for 24 hours, and the backend also blocks direct API submissions.",
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
  restricted: SAFE_REFUSAL_MESSAGE,
  fallback:
    "I'm not sure about that yet. Try asking about CTF challenges, timers, Docker labs, SOC cases, incident response, learning paths, progress, reviews, or contact support.",
};

const CHATBOT_SYSTEM_INSTRUCTION = `
You are Cyber Assistant for a Cybersecurity Training Platform.

Your job is to help logged-in users understand how to use the platform's existing features:
- CTF challenges
- CTF timers and 24-hour lockouts
- Docker lab prototype
- SOC case analysis
- Incident Response scenarios
- Learning Center courses and lessons
- progress and leaderboard
- platform reviews and contact support
- admin features at a high level

Rules:
- Keep answers concise, practical, and friendly.
- Answer in 2 to 5 sentences.
- This assistant is inside a Cybersecurity Training Platform with specific built-in workflows.
- For exact platform behavior, never invent details that are not explicitly provided.
- If you are unsure about exact platform behavior, tell the user to use the platform guide or ask the admin.
- Do not reveal flags, final answers, exact challenge answers, or hidden solutions.
- Do not explain how to bypass timers, lockouts, or platform rules.
- Never claim timers start after wrong attempts or hint requests.
- Never claim a challenge lockout duration other than 24 hours.
- Do not provide malicious hacking instructions or harmful exploit steps.
- Do not invent platform features that do not exist.
- If the user asks for unsafe or unavailable content, politely refuse and redirect them toward reviewing evidence, hints, or learning materials.
`.trim();

const geminiApiKey = normalizeString(process.env.GEMINI_API_KEY);

const geminiClient = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

const isRestrictedPrompt = (input) => {
  return /(flag|final answer|exact answer|solution|solve it|bypass|skip|cheat|unlock|override|give me|hidden answer|correct flag|timer bypass|lockout bypass)/i.test(
    input
  );
};

const getPlatformGuideReply = (input) => {
  const normalizedInput = normalizeString(input).toLowerCase();

  if (!normalizedInput) {
    return null;
  }

  if (
    /(timer|start challenge|time expires|time remaining|countdown|lockout|locked|24 hour|24-hour)/i.test(
      normalizedInput
    )
  ) {
    return /(time expires|expire|locked|lockout|24 hour|24-hour)/i.test(
      normalizedInput
    )
      ? BOT_ANSWERS.expired
      : BOT_ANSWERS.timer;
  }

  if (
    /(docker lab|containerized lab|challenge 1 lab|challenge 1|robots\.txt|config\.js|backup_admin_panel)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.docker;
  }

  if (
    /(ctf challenges|how do ctf|flag submission|submit the flag|submit flag|challenge submission)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.ctf;
  }

  if (/(soc cases?|soc case analysis)/i.test(normalizedInput)) {
    return BOT_ANSWERS.soc;
  }

  if (
    /(incident response scenarios|incident scenarios|incident response modules?|incident steps?|multi-step investigation)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.incident;
  }

  if (
    /(learning paths?|learning center|courses?|lessons?|tutorials?)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.learning;
  }

  if (/(progress|dashboard|leaderboard|score|rank)/i.test(normalizedInput)) {
    return BOT_ANSWERS.progress;
  }

  if (
    /(reviews?|rating|feedback|contact messages?|contact support|support message)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.reviewContact;
  }

  if (
    /(admin pages?|admin dashboard|admin insights|management pages?|manage challenges|manage incidents|manage learning)/i.test(
      normalizedInput
    )
  ) {
    return BOT_ANSWERS.admin;
  }

  return null;
};

const shouldUseGeminiForGeneralLearning = (input) => {
  const normalizedInput = normalizeString(input).toLowerCase();

  if (!normalizedInput) {
    return false;
  }

  return /(what is|what are|explain|define|how does|how do i identify|why is|difference between|signs of|indicators of|brute force|phishing|lateral movement|powershell|malware|privilege escalation|psexec|incident triage|triage|siem|web reconnaissance|suspicious activity|ioc|iocs|indicator|indicators|containment|analysis)/i.test(
    normalizedInput
  );
};

const getFallbackReply = (input) => {
  const normalizedInput = normalizeString(input).toLowerCase();

  if (!normalizedInput) {
    return BOT_ANSWERS.fallback;
  }

  if (isRestrictedPrompt(normalizedInput)) {
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

const isUnsafeAssistantOutput = (text) => {
  return /CTF\{.*\}|flag\s+is|final answer|bypass(?:ing)?\s+(?:the\s+)?(?:timer|lockout)/i.test(
    text
  );
};

const generateGeminiAnswer = async (message) => {
  if (!geminiClient) {
    return null;
  }

  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: message,
    config: {
      systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
      temperature: 0.3,
      maxOutputTokens: 65536,
    },
  });

  const answer = normalizeString(response?.text);

  if (!answer || isUnsafeAssistantOutput(answer)) {
    return null;
  }

  return answer;
};

const sendChatMessage = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.user?.userId);
    const rawMessage = req.body?.message;
    const message = normalizeString(rawMessage);

    if (!userId) {
      warnInvalidId(req, "chat.send.userId", req.user?.userId);
      return res.status(401).json({
        message: "Invalid user session.",
      });
    }

    warnSuspiciousFields(req, "chat.send", {
      message: rawMessage,
    });

    if (typeof rawMessage !== "string") {
      warnMalformedInput(req, "chat.send", {
        field: "message",
        valueType: typeof rawMessage,
      });
      return res.status(400).json({
        message: "Message must be a string.",
      });
    }

    if (!message) {
      warnMalformedInput(req, "chat.send", { field: "message" });
      return res.status(400).json({
        message: "Message is required.",
      });
    }

    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    if (isRestrictedPrompt(message)) {
      return res.status(200).json({
        answer: SAFE_REFUSAL_MESSAGE,
        source: "fallback",
      });
    }

    const platformGuideReply = getPlatformGuideReply(message);

    if (platformGuideReply) {
      return res.status(200).json({
        answer: platformGuideReply,
        source: "platform-guide",
      });
    }

    if (geminiClient && shouldUseGeminiForGeneralLearning(message)) {
      try {
        const geminiAnswer = await generateGeminiAnswer(message);

        if (geminiAnswer) {
          return res.status(200).json({
            answer: geminiAnswer,
            source: "gemini",
          });
        }
      } catch (error) {
        console.error("Gemini chat error:", error);
      }
    }

    return res.status(200).json({
      answer: getFallbackReply(message),
      source: "fallback",
    });
  } catch (error) {
    console.error("Send chat message error:", error);
    return res.status(500).json({
      message: "Failed to process chat message.",
    });
  }
};

module.exports = {
  sendChatMessage,
};
