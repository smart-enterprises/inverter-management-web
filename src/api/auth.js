import { apiRequest } from "./apiClient.js";

const SIGN_OUT_ENDPOINT = "/auth/logout"; // "/auth/signout";

/* ========================= AUTH APIs ========================= */
export const login = async (email, password) => {
  return apiRequest("/auth/signin", {
    method: "POST",
    body: JSON.stringify({
      employee_email: email,
      password,
    }),
  });
};

export const logout = async () => {
  try {
    const token = localStorage.getItem("token");

    if (token) {
      await apiRequest(SIGN_OUT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.warn("Logout request failed:", error);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    localStorage.setItem("logout-event", Date.now().toString());
  }
};

export const checkTokenActive = async (token) => {
  return apiRequest("/auth/token/active", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};