import { APP_VERSION } from "../utils/constants.js";
import { apiRequest } from "./apiClient.js";

const DEVICE_ENDPOINT = "/notifications/devices";

const createDeviceId = () => {
    const storageKey = "smart-enterprise-device-id";
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const id =
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(storageKey, id);
    return id;
};

export const registerFcmToken = (token, platform = "web") =>
    apiRequest(DEVICE_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
            token,
            platform,
            device_id: createDeviceId(),
            app_version: APP_VERSION || "1.0.0",
        }),
    });

export const refreshFcmToken = ({ oldToken, newToken, platform = "web" }) =>
    apiRequest(`${DEVICE_ENDPOINT}/refresh`, {
        method: "PUT",
        body: JSON.stringify({
            old_token: oldToken,
            new_token: newToken,
            platform,
            device_id: createDeviceId(),
            app_version: APP_VERSION || "1.0.0",
        }),
    });

export const deregisterFcmToken = (token) =>
    apiRequest(DEVICE_ENDPOINT, {
        method: "DELETE",
        body: JSON.stringify({ token }),
    });

export const deregisterAllFcmTokens = () =>
    apiRequest(`${DEVICE_ENDPOINT}/me`, { method: "DELETE" });

export const fetchMyFcmDevices = () =>
    apiRequest(`${DEVICE_ENDPOINT}/me`, { method: "GET" });

export const sendNotification = ({
    notificationType,
    context = {},
    targetRoles = [],
    targetEmployeeIds = [],
    excludeEmployeeIds = [],
    metadata = {},
}) =>
    apiRequest("/notifications/send", {
        method: "POST",
        body: JSON.stringify({
            notificationType,
            context,
            targetRoles,
            targetEmployeeIds,
            excludeEmployeeIds,
            metadata,
        }),
    });
