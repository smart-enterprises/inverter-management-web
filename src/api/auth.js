import { API_BASE_URL } from "../utils/api";

/* ========================= CORE REQUEST HANDLER ========================= */

const request = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = null;

    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data && typeof data.message === "string" ?
          data.message :
          "Authentication failed";

      throw new Error(message);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: error && typeof error.message === "string" ?
        error.message : "Unexpected error occurred",
    };
  }
};

/* ========================= AUTH APIs ========================= */

export const login = (email, password) =>
  request("/auth/signin", {
    method: "POST",
    body: JSON.stringify({
      employee_email: email,
      password,
    }),
  });

export const logout = async () => {
  const token = localStorage.getItem("token");

  if (token) {
    await request("/auth/logout", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.setItem("logout-event", Date.now().toString());
};

export const checkTokenActive = (token) =>
  request("/auth/token/active", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });