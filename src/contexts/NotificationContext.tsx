// src/contexts/NotificationContext.tsx
//
// Changes from the previous version:
//   • `unlockAudio` is awaited before `startAlertLoop` — the loop only starts
//     once the engine is actually ready, so the first sound is never silently
//     dropped.
//   • User-gesture listeners call `unlockAudio` and then drain any pending
//     alert loop that was queued before the first gesture arrived.
//   • `loadAudioBufferEarly` is still called on mount for pre-warming.
//   • Everything else (API, props, types) is identical to the original.

import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { useFCM, NormalizedNotification } from "../hooks/useFCM";
import {
    showSystemNotificationFromPayload,
    startAlertLoop,
    stopAlertLoop,
    unlockAudio,
    teardownAudio,
    loadAudioBufferEarly,
} from "../services/notificationService";
import {
    NotificationPayload,
    NOTIFICATION_CONFIG,
    isNotificationType,
} from "../services/notificationServiceTypes";

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

const STORAGE_KEY = "smart-enterprise-notifications";
const MAX_STORED_NOTIFICATIONS = 10;
const TOAST_DURATION_MS = 5_000;

type NotifPermission = "default" | "granted" | "denied";

type PushBlockedReason =
    | "permission-denied"
    | "push-service-error"
    | "brave-shields"
    | "not-supported"
    | null;

export interface NotificationContextValue {
    notifications: NormalizedNotification[];
    unreadCount: number;
    toasts: NormalizedNotification[];
    isLoading: boolean;
    notifPermission: NotifPermission;
    pushBlocked: boolean;
    pushBlockedReason: PushBlockedReason;
    requestNotificationPermission: () => Promise<{
        granted: boolean;
        reason?: string;
    }>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    dismissToast: (notificationId: string) => void;
    refreshNotifications: () => Promise<void>;
}

export const NotificationContext =
    createContext<NotificationContextValue | null>(null);

// ─── Storage helpers ──────────────────────────────────────────────────────────

const readStoredNotifications = (): NormalizedNotification[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeStoredNotifications = (
    notifications: NormalizedNotification[],
): void => {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(notifications.slice(0, MAX_STORED_NOTIFICATIONS)),
        );
    } catch {
        // Storage quota exceeded — non-fatal.
    }
};

const upsertNotification = (
    list: NormalizedNotification[],
    notification: NormalizedNotification,
): NormalizedNotification[] => {
    if (list.some((n) => n.notification_id === notification.notification_id)) {
        return list;
    }
    return [notification, ...list].slice(0, MAX_STORED_NOTIFICATIONS);
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user, isAuthenticated } = useAuth();

    const [notifications, setNotifications] = useState<NormalizedNotification[]>([]);
    const [toasts, setToasts] = useState<NormalizedNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notifPermission, setNotifPermission] = useState<NotifPermission>(
        typeof Notification !== "undefined"
            ? (Notification.permission as NotifPermission)
            : "default",
    );
    const [pushBlocked, setPushBlocked] = useState(false);
    const [pushBlockedReason, setPushBlockedReason] =
        useState<PushBlockedReason>(null);

    const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const shouldReceive = useMemo(
        () =>
            isAuthenticated() &&
            NOTIFICATION_ELIGIBLE_ROLES.has(user?.role ?? ""),
        [user?.role],
    );

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.is_read).length,
        [notifications],
    );

    // ── Audio pre-warm on mount ───────────────────────────────────────────────

    useEffect(() => {
        void loadAudioBufferEarly();
    }, []);

    // ── User-gesture unlock ───────────────────────────────────────────────────
    //
    // We unlock the AudioContext on the first user interaction and then drain
    // any `startAlertLoop` call that may have been queued before the gesture.
    // The audio service's internal `pendingPlay` flag handles the actual drain;
    // we just need to make sure `unlockAudio` is called as early as possible.

    useEffect(() => {
        let unlocked = false;

        const handleGesture = (): void => {
            if (unlocked) return;
            unlocked = true;

            // Fire-and-forget — the audio service queues the pending play
            // automatically inside `ensureReady()`.
            void unlockAudio();
        };

        const opts: AddEventListenerOptions = { passive: true, once: false };
        window.addEventListener("click", handleGesture, opts);
        window.addEventListener("keydown", handleGesture, opts);
        window.addEventListener("touchstart", handleGesture, opts);

        return () => {
            window.removeEventListener("click", handleGesture);
            window.removeEventListener("keydown", handleGesture);
            window.removeEventListener("touchstart", handleGesture);
        };
    }, []);

    // ── FCM push-blocked event listeners ─────────────────────────────────────

    useEffect(() => {
        const onPermissionDenied = (event: Event): void => {
            const reason =
                (event as CustomEvent<{ reason?: PushBlockedReason }>).detail
                    ?.reason ?? "permission-denied";
            setPushBlocked(true);
            setPushBlockedReason(reason);
            setNotifPermission("denied");
        };

        const onPushBlocked = (event: Event): void => {
            const reason =
                (event as CustomEvent<{ reason?: PushBlockedReason }>).detail
                    ?.reason ?? "push-service-error";
            setPushBlocked(true);
            setPushBlockedReason(reason);
        };

        const onNotSupported = (): void => {
            setPushBlocked(true);
            setPushBlockedReason("not-supported");
        };

        window.addEventListener("fcm:permission-denied", onPermissionDenied);
        window.addEventListener("fcm:push-blocked", onPushBlocked);
        window.addEventListener("fcm:not-supported", onNotSupported);

        return () => {
            window.removeEventListener("fcm:permission-denied", onPermissionDenied);
            window.removeEventListener("fcm:push-blocked", onPushBlocked);
            window.removeEventListener("fcm:not-supported", onNotSupported);
        };
    }, []);

    // ── Background SW messages ────────────────────────────────────────────────

    useEffect(() => {
        const handleSWMessage = (event: MessageEvent): void => {
            if (event.data?.type !== "FCM_BACKGROUND_NOTIFICATION") return;

            const notification = event.data
                .notification as NormalizedNotification | undefined;
            if (!notification || !isNotificationType(notification.type)) return;

            setNotifications((prev) => upsertNotification(prev, notification));
            addToast(notification);
        };

        navigator.serviceWorker?.addEventListener("message", handleSWMessage);
        return () => {
            navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
        };
    }, []);

    // ── Notification storage ──────────────────────────────────────────────────

    const refreshNotifications = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            setNotifications(readStoredNotifications());
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshNotifications();
    }, [refreshNotifications]);

    useEffect(() => {
        writeStoredNotifications(notifications);
    }, [notifications]);

    // ── Toast management ──────────────────────────────────────────────────────

    const dismissToast = useCallback((notificationId: string): void => {
        clearTimeout(toastTimers.current[notificationId]);
        delete toastTimers.current[notificationId];

        setToasts((prev) => {
            const remaining = prev.filter(
                (t) => t.notification_id !== notificationId,
            );
            if (remaining.length === 0) stopAlertLoop();
            return remaining;
        });
    }, []);

    const addToast = useCallback(
        (notification: NormalizedNotification): void => {
            setToasts((prev) => upsertNotification(prev, notification));

            const config = NOTIFICATION_CONFIG[notification.type];

            if (config?.soundAlert) {
                // Unlock first (no-op if already unlocked), then start the
                // loop.  Because `startAlertLoop` now handles the not-yet-ready
                // case internally via `pendingPlay`, this is always safe to call
                // even before the first user gesture.
                unlockAudio().then(() => {
                    startAlertLoop();
                });
            }

            showSystemNotificationFromPayload(
                notification,
                (payload?: NotificationPayload) => {
                    if (payload?.order_number) {
                        window.location.href = `/orders/${payload.order_number}`;
                    }
                },
            );

            toastTimers.current[notification.notification_id] = setTimeout(
                () => dismissToast(notification.notification_id),
                TOAST_DURATION_MS,
            );
        },
        [dismissToast],
    );

    // ── FCM foreground messages ───────────────────────────────────────────────

    const handleFcmMessage = useCallback(
        (notification: NormalizedNotification): void => {
            setNotifications((prev) => upsertNotification(prev, notification));
            addToast(notification);
        },
        [addToast],
    );

    const { initFCM } = useFCM(handleFcmMessage, shouldReceive);

    // ── Permission request ────────────────────────────────────────────────────

    const requestNotificationPermission = useCallback(async (): Promise<{
        granted: boolean;
        reason?: string;
    }> => {
        if (typeof Notification === "undefined") {
            setPushBlocked(true);
            setPushBlockedReason("not-supported");
            return { granted: false, reason: "not-supported" };
        }

        if (Notification.permission === "denied") {
            setNotifPermission("denied");
            setPushBlocked(true);
            setPushBlockedReason("permission-denied");
            return { granted: false, reason: "permission-denied" };
        }

        const permission = await Notification.requestPermission();
        setNotifPermission(permission as NotifPermission);

        if (permission === "granted") {
            setPushBlocked(false);
            setPushBlockedReason(null);
            await initFCM();
            return { granted: true };
        }

        return { granted: false, reason: permission };
    }, [initFCM]);

    // ── Read / dismiss helpers ────────────────────────────────────────────────

    const markAsRead = useCallback(
        async (notificationId: string): Promise<void> => {
            setNotifications((prev) =>
                prev.map((n) =>
                    n.notification_id === notificationId
                        ? { ...n, is_read: true }
                        : n,
                ),
            );
            dismissToast(notificationId);
        },
        [dismissToast],
    );

    const markAllAsRead = useCallback(async (): Promise<void> => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        stopAlertLoop();

        Object.values(toastTimers.current).forEach(clearTimeout);
        toastTimers.current = {};
        setToasts([]);
    }, []);

    // ── Stop loop when user is not eligible ───────────────────────────────────

    useEffect(() => {
        if (!shouldReceive) {
            setToasts([]);
            stopAlertLoop();
        }
    }, [shouldReceive]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            stopAlertLoop();
            teardownAudio();
            Object.values(toastTimers.current).forEach(clearTimeout);
        };
    }, []);

    // ── Context value ─────────────────────────────────────────────────────────

    const value = useMemo<NotificationContextValue>(
        () => ({
            notifications,
            unreadCount,
            toasts,
            isLoading,
            notifPermission,
            pushBlocked,
            pushBlockedReason,
            requestNotificationPermission,
            markAsRead,
            markAllAsRead,
            dismissToast,
            refreshNotifications,
        }),
        [
            notifications,
            unreadCount,
            toasts,
            isLoading,
            notifPermission,
            pushBlocked,
            pushBlockedReason,
            requestNotificationPermission,
            markAsRead,
            markAllAsRead,
            dismissToast,
            refreshNotifications,
        ],
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;