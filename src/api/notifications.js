// Notifications API
import { apiRequest } from "./apiClient.js";

export const fetchNotifications = ({ page = 1, limit = 20 } = {}) =>
    apiRequest(`/notifications?page=${page}&limit=${limit}`, { method: "GET" });

export const fetchUnreadCount = () =>
    apiRequest("/notifications/unread-count", { method: "GET" });

export const markNotificationRead = (notificationId) =>
    apiRequest(`/notifications/${notificationId}/read`, { method: "PUT" });

export const markAllNotificationsRead = () =>
    apiRequest("/notifications/mark-all-read", { method: "PUT" });