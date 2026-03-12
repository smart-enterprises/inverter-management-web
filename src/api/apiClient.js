/* ================= API CONFIG ================= */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/* ================= GET AUTH TOKEN ================= */
const getToken = () => {
    try {
        return localStorage.getItem("token");
    } catch {
        return null;
    }
};

/* ================= DEFAULT HEADERS ================= */
export const getAuthHeaders = () => {
    const token = getToken();

    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

/* ================= API REQUEST ================= */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
        method: options.method || "GET",
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);

        const data = await response.json().catch(() => null);

        /* ================= UNAUTHORIZED ================= */
        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            localStorage.setItem("logout-event", Date.now().toString());

            window.location.replace("/login");

            return {
                success: false,
                message: "Session expired. Please login again.",
            };
        }

        /* ================= OTHER ERRORS ================= */
        if (!response.ok) {
            return {
                success: false,
                message: data?.message || "API request failed",
                errors: data?.errors || [],
                status: response.status,
            };
        }

        return data;

    } catch (error) {
        console.error("❌ API Request Error:", error);

        return {
            success: false,
            message: error.message || "Network error",
            errors: [],
        };

    }
};