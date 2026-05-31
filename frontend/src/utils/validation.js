export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ALLOWED_DIFFICULTIES = ["Easy", "Medium", "Hard"];
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_FLAG_LENGTH = 255;
export const MAX_ANSWER_LENGTH = 255;

export const normalizeInput = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const normalizeOptionalInput = (value) => normalizeInput(value);

export const normalizeEmail = (value) => normalizeInput(value).toLowerCase();

export const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmail(value));

export const isNonNegativeNumber = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 && Number.isInteger(parsedValue);
};

export const isValidDifficulty = (value) => {
  return ALLOWED_DIFFICULTIES.includes(normalizeInput(value));
};
