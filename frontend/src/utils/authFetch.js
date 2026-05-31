export async function authFetch(url, options = {}, navigate) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    navigate("/login", {
      state: { message: "Session expired. Please log in again." },
    });
    return null;
  }

  return response;
}