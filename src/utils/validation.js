const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const MIN_PASSWORD_LENGTH = 6;
const MAX_EMAIL_LENGTH = 254;
const MAX_FLAG_LENGTH = 255;
const MAX_ANSWER_LENGTH = 255;
const MAX_TITLE_LENGTH = 150;

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeOptionalString = (value) => {
  const normalizedValue = normalizeString(value);
  return normalizedValue || null;
};

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const isValidEmail = (value) => {
  return EMAIL_REGEX.test(normalizeEmail(value));
};

const isValidDifficulty = (value) => {
  return ALLOWED_DIFFICULTIES.includes(normalizeString(value));
};

const isNonNegativeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 && Number.isInteger(parsedValue);
};

const parsePositiveInt = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
};

module.exports = {
  ALLOWED_DIFFICULTIES,
  MIN_PASSWORD_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_FLAG_LENGTH,
  MAX_ANSWER_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeString,
  normalizeOptionalString,
  normalizeEmail,
  isValidEmail,
  isValidDifficulty,
  isNonNegativeNumber,
  parsePositiveInt,
};
