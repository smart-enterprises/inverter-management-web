// src/contexts/NotificationContext.jsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { useAuth } from "../hooks/useAuth";
import useFCM from "../hooks/useFCM";
import {
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
} from "../api/notifications";
import {
    NOTIFICATION_CONFIG,
    loadAudioBuffer,
    unlockAudio,
    startAlertLoop,
    stopAlertLoop,
    requestSystemNotifPermission,
    showSystemNotificationFromPayload,
} from "../services/notificationService";

const NOTIFICATION_ELIGIBLE_ROLES = new Set([
    "ROLE_SUPER_ADMIN",
    "ROLE_ADMIN",
    "ROLE_MANAGER",
    "ROLE_PRODUCTION",
    "ROLE_PACKING",
    "ROLE_ACCOUNTS",
    "ROLE_DELIVERY",
    "ROLE_SALESMAN",
]);

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const toastTimers = useRef({});

    const shouldReceive =
        isAuthenticated() && NOTIFICATION_ELIGIBLE_ROLES.has(user?.role);

    useEffect(() => {
        loadAudioBuffer();
        requestSystemNotifPermission();

        const unlockOnInteraction = async () => {
            await unlockAudio();
            await requestSystemNotifPermission();
        };

        window.addEventListener("click", unlockOnInteraction, { once: true });
        window.addEventListener("keydown", unlockOnInteraction, { once: true });
        window.addEventListener("touchstart", unlockOnInteraction, { once: true });

        return () => {
            window.removeEventListener("click", unlockOnInteraction);
            window.removeEventListener("keydown", unlockOnInteraction);
            window.removeEventListener("touchstart", unlockOnInteraction);
        };
    }, []);

    const dismissToast = useCallback((notificationId) => {
        clearTimeout(toastTimers.current[notificationId]);
        delete toastTimers.current[notificationId];

        setToasts((prev) => {
            const remaining = prev.filter(
                (t) => t.notification_id !== notificationId
            );
            if (remaining.length === 0) stopAlertLoop();
            return remaining;
        });
    }, []);

    const addToast = useCallback(
        (notification) => {
            setToasts((prev) => {
                if (prev.some((t) => t.notification_id === notification.notification_id))
                    return prev;
                return [...prev, { ...notification, addedAt: Date.now() }];
            });

            const config = NOTIFICATION_CONFIG[notification.type];
            if (config?.soundAlert) startAlertLoop();

            showSystemNotificationFromPayload(notification, (payload) => {
                if (payload?.order_number) {
                    window.location.href = `/orders/${payload.order_number}`;
                }
            });

            const timer = setTimeout(
                () => dismissToast(notification.notification_id),
                5_000
            );
            toastTimers.current[notification.notification_id] = timer;
        },
        [dismissToast]
    );

    const loadNotifications = useCallback(async () => {
        if (!shouldReceive) return;
        try {
            setIsLoading(true);
            const [notifRes, countRes] = await Promise.all([
                fetchNotifications({ page: 1, limit: 20 }),
                fetchUnreadCount(),
            ]);
            if (notifRes?.success)
                setNotifications(notifRes.data.notifications ?? []);
            if (countRes?.success)
                setUnreadCount(countRes.data.count ?? 0);
        } catch (err) {
            console.error("[Notifications] Failed to load:", err);
        } finally {
            setIsLoading(false);
        }
    }, [shouldReceive]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleFcmMessage = useCallback(
        (normalized) => {
            setNotifications((prev) => {
                if (prev.some((n) => n.notification_id === normalized.notification_id))
                    return prev;
                return [normalized, ...prev];
            });

            setUnreadCount((c) => c + 1);
            addToast(normalized);
        },
        [addToast]
    );

    useFCM(handleFcmMessage, shouldReceive);

    const handleMarkAsRead = useCallback(
        async (notificationId) => {
            setNotifications((prev) =>
                prev.map((n) =>
                    n.notification_id === notificationId ? { ...n, is_read: true } : n
                )
            );
            setUnreadCount((c) => Math.max(0, c - 1));
            dismissToast(notificationId);

            try {
                await markNotificationRead(notificationId);
            } catch (err) {
                console.error("[Notifications] Failed to mark as read:", err);

                setNotifications((prev) =>
                    prev.map((n) =>
                        n.notification_id === notificationId
                            ? { ...n, is_read: false }
                            : n
                    )
                );
                setUnreadCount((c) => c + 1);
            }
        },
        [dismissToast]
    );

    const handleMarkAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        stopAlertLoop();

        Object.values(toastTimers.current).forEach(clearTimeout);
        toastTimers.current = {};
        setToasts([]);

        try {
            await markAllNotificationsRead();
        } catch (err) {
            console.error("[Notifications] Failed to mark all as read:", err);
            loadNotifications();
        }
    }, [loadNotifications]);

    useEffect(() => {
        return () => {
            stopAlertLoop();
            Object.values(toastTimers.current).forEach(clearTimeout);
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                toasts,
                isLoading,
                markAsRead: handleMarkAsRead,
                markAllAsRead: handleMarkAllRead,
                dismissToast,
                refreshNotifications: loadNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx)
        throw new Error("useNotifications must be used inside <NotificationProvider>");
    return ctx;
};