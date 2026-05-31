export const getTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const tokenParts = token.split(".");

    if (tokenParts.length < 2) {
      return null;
    }

    const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    return JSON.parse(atob(paddedBase64));
  } catch (error) {
    return null;
  }
};
