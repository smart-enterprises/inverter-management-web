// src/api/apiClient.js
import { API_BASE_URL } from "../utils/constants.js";

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

/**
 * Canonical API response shape. Every apiRequest result has these fields:
 *   success    boolean        true on 2xx with a backend success flag, false otherwise
 *   status     number         HTTP status code (0 on network failure)
 *   message    string         Human-readable message from backend, or synthesized
 *   data       any | null     Backend payload (only meaningful on success)
 *   errors     any | null     Validation/error details (only meaningful on failure)
 *   pagination object | null  Pagination meta when present
 *
 * Backend extras (timestamp, errorCode, etc.) are preserved via spread.
 */
const errorResponse = (overrides) => ({
    success: false,
    status: 0,
    message: "",
    data: null,
    errors: null,
    pagination: null,
    ...overrides,
});

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

        const body = await response.json().catch(() => null);

        /* ── 401 Unauthorized — session expired or invalid token ── */
        /* Only treat as session expiry if the user actually had a token. */
        /* Otherwise (e.g. login with wrong credentials), surface the real error. */
        if (response.status === 401 && getToken()) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            localStorage.setItem("logout-event", Date.now().toString());

            window.location.replace("/login");

            return errorResponse({
                status: 401,
                message: "Session expired. Please login again.",
            });
        }

        /* ================= OTHER ERRORS ================= */
        if (!response.ok) {
            return errorResponse({
                status: response.status,
                message: body?.message || `Request failed (${response.status})`,
                errors: body?.errors ?? null,
            });
        }

        /* ================= SUCCESS ================= */
        /* Spread backend body for extras, then enforce canonical fields. */
        return {
            success: true,
            message: "",
            data: null,
            errors: null,
            pagination: null,
            ...body,
            status: response.status,
        };

    } catch (error) {
        console.error("❌ API Request Error:", error);

        return errorResponse({
            message: error.message || "Network error. Please check your connection.",
        });
    }
};
