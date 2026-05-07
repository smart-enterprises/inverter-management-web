// src/contexts/NotificationContext.jsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
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
    unlockAudio,
    startAlertLoop,
    stopAlertLoop,
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

const TOAST_DURATION_MS = 5_000;

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notifPermission, setNotifPermission] = useState(
        typeof Notification !== "undefined" ? Notification.permission : "default"
    );
    const [pushBlocked, setPushBlocked] = useState(false);
    const [pushBlockedReason, setPushBlockedReason] = useState(null);

    const toastTimers = useRef({});
    const loadInProgressRef = useRef(false);

    const shouldReceive = useMemo(
        () => isAuthenticated() && NOTIFICATION_ELIGIBLE_ROLES.has(user?.role),
        [user?.role, isAuthenticated]
    );

    useEffect(() => {
        const onPermDenied = (e) => {
            setPushBlocked(true);
            setPushBlockedReason(e.detail?.reason ?? "permission-denied");
            setNotifPermission("denied");
        };
        const onPushBlocked = (e) => {
            setPushBlocked(true);
            setPushBlockedReason(e.detail?.reason ?? "push-service-error");
        };
        const onNotSupported = () => {
            setPushBlocked(true);
            setPushBlockedReason("not-supported");
        };

        window.addEventListener("fcm:permission-denied", onPermDenied);
        window.addEventListener("fcm:push-blocked", onPushBlocked);
        window.addEventListener("fcm:not-supported", onNotSupported);

        return () => {
            window.removeEventListener("fcm:permission-denied", onPermDenied);
            window.removeEventListener("fcm:push-blocked", onPushBlocked);
            window.removeEventListener("fcm:not-supported", onNotSupported);
        };
    }, []);

    useEffect(() => {
        const handleInteraction = async () => {
            await unlockAudio();

            if (typeof Notification !== "undefined" && Notification.permission === "default") {
                const perm = await Notification.requestPermission();
                setNotifPermission(perm);
                if (perm === "denied") {
                    setPushBlocked(true);
                    setPushBlockedReason("permission-denied");
                }
            } else if (typeof Notification !== "undefined") {
                setNotifPermission(Notification.permission);
            }
        };

        window.addEventListener("click", handleInteraction, { once: true });
        window.addEventListener("keydown", handleInteraction, { once: true });
        window.addEventListener("touchstart", handleInteraction, { once: true, passive: true });

        return () => {
            window.removeEventListener("click", handleInteraction);
            window.removeEventListener("keydown", handleInteraction);
            window.removeEventListener("touchstart", handleInteraction);
        };
    }, []);

    const dismissToast = useCallback((notificationId) => {
        clearTimeout(toastTimers.current[notificationId]);
        delete toastTimers.current[notificationId];

        setToasts((prev) => {
            const remaining = prev.filter((t) => t.notification_id !== notificationId);
            if (remaining.length === 0) stopAlertLoop();
            return remaining;
        });
    }, []);

    const addToast = useCallback(
        (notification) => {
            setToasts((prev) => {
                if (prev.some((t) => t.notification_id === notification.notification_id)) return prev;
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
                TOAST_DURATION_MS
            );
            toastTimers.current[notification.notification_id] = timer;
        },
        [dismissToast]
    );

    const loadNotifications = useCallback(async () => {
        if (!shouldReceive) return;
        if (loadInProgressRef.current) {
            console.debug("[Notifications] Load already in progress — skipped");
            return;
        }

        loadInProgressRef.current = true;
        try {
            setIsLoading(true);
            const [notifRes, countRes] = await Promise.all([
                fetchNotifications({ page: 1, limit: 20 }),
                fetchUnreadCount(),
            ]);

            if (notifRes?.success) setNotifications(notifRes.data?.notifications ?? []);
            if (countRes?.success) setUnreadCount(countRes.data?.count ?? 0);
        } catch (err) {
            console.error("[Notifications] loadNotifications failed:", err.message);
        } finally {
            setIsLoading(false);
            loadInProgressRef.current = false;
        }
    }, [shouldReceive]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleFcmMessage = useCallback(
        (normalized) => {
            console.info(
                `[Notifications] FCM message: ${normalized.type} | ${normalized.notification_id}`
            );

            setNotifications((prev) => {
                if (prev.some((n) => n.notification_id === normalized.notification_id)) return prev;
                return [normalized, ...prev];
            });

            setUnreadCount((c) => c + 1);
            addToast(normalized);
        },
        [addToast]
    );

    const { initFCM } = useFCM(handleFcmMessage, shouldReceive);

    const requestNotificationPermission = useCallback(async () => {
        if (typeof Notification === "undefined") {
            return { granted: false, reason: "not-supported" };
        }

        if (Notification.permission === "denied") {
            setNotifPermission("denied");
            setPushBlocked(true);
            setPushBlockedReason("permission-denied");
            return { granted: false, reason: "permission-denied" };
        }

        const permission = await Notification.requestPermission();
        setNotifPermission(permission);

        if (permission === "granted") {
            setPushBlocked(false);
            setPushBlockedReason(null);
            await initFCM();
            return { granted: true };
        }

        return { granted: false, reason: permission };
    }, [initFCM]);

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
                console.error("[Notifications] markAsRead failed:", err.message);
                // Rollback
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.notification_id === notificationId ? { ...n, is_read: false } : n
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
            console.error("[Notifications] markAllAsRead failed:", err.message);
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
                notifPermission,
                pushBlocked,
                pushBlockedReason,
                requestNotificationPermission,
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
    if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
    return ctx;
};