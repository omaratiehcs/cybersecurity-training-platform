const SQL_LIKE_PATTERN =
  /(?:--|\/\*|\*\/|;\s*(?:drop|select|insert|update|delete)|'\s*(?:or|and)\b|\bunion\b\s+select\b)/i;

const getRequestSource = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

const sanitizeLogValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.replace(/\s+/g, " ").trim();
  return normalizedValue.slice(0, 120);
};

const warnMalformedInput = (req, context, details = {}) => {
  console.warn(`[SECURITY] Malformed input in ${context}`, {
    source: getRequestSource(req),
    ...details,
  });
};

const warnInvalidId = (req, context, value) => {
  console.warn(`[SECURITY] Invalid ID in ${context}`, {
    source: getRequestSource(req),
    value: sanitizeLogValue(String(value ?? "")),
  });
};

const warnSuspiciousFields = (req, context, fields = {}) => {
  Object.entries(fields).forEach(([field, value]) => {
    if (typeof value !== "string") {
      return;
    }

    if (!SQL_LIKE_PATTERN.test(value)) {
      return;
    }

    console.warn(`[SECURITY] Suspicious SQL-like input in ${context}`, {
      source: getRequestSource(req),
      field,
      value: sanitizeLogValue(value),
    });
  });
};

module.exports = {
  getRequestSource,
  warnMalformedInput,
  warnInvalidId,
  warnSuspiciousFields,
};
