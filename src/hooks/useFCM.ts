import { useCallback, useEffect, useRef } from "react";
import { deleteToken, getToken, MessagePayload, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "../firebase/messaging";
import { deregisterFcmToken, registerFcmToken, refreshFcmToken } from "../api/notifications";
import { FIREBASE_VAPID_KEY } from "../utils/constants";
import {
    isNotificationType,
    NotificationPayload,
    NotificationType,
} from "../services/notificationServiceTypes";

const SW_PATH = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";
const TOKEN_REFRESH_MS = 7 * 24 * 60 * 60 * 1_000;
const TOKEN_BACKEND_SYNC_MS = 12 * 60 * 60 * 1_000;
const TOKEN_STORAGE_KEY = "smart-enterprise-fcm-token";
const TOKEN_SYNCED_AT_STORAGE_KEY = "smart-enterprise-fcm-token-synced-at";

export interface NormalizedNotification {
    readonly notification_id: string;
    readonly type: NotificationType;
    readonly title: string;
    readonly message: string;
    readonly payload: NotificationPayload;
    readonly created_at: string;
    is_read: boolean;
}

export interface UseFCMReturn {
    initFCM: () => Promise<void>;
    teardownFCM: () => Promise<void>;
}

type FcmEventName =
    | "fcm:not-supported"
    | "fcm:permission-denied"
    | "fcm:push-blocked"
    | "fcm:sw-error"
    | "fcm:token-error";

const dispatchFcmEvent = (
    name: FcmEventName,
    detail: Record<string, unknown> = {},
): void => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    console.warn(`[FCM] ${name}`, detail);
};

const checkBrowserSupport = (): { supported: boolean; missing: string[] } => {
    const missing: string[] = [];
    if (!("Notification" in window)) missing.push("Notification API");
    if (!("serviceWorker" in navigator)) missing.push("Service Worker");
    if (!("PushManager" in window)) missing.push("Push API");
    return { supported: missing.length === 0, missing };
};

const detectBrave = async (): Promise<boolean> => {
    try {
        type BraveNavigator = Navigator & { brave?: { isBrave: () => Promise<boolean> } };
        const nav = navigator as BraveNavigator;
        return nav.brave ? nav.brave.isBrave().catch(() => false) : false;
    } catch {
        return false;
    }
};

const safeJsonParse = <T,>(value: unknown, fallback: T): T => {
    if (typeof value !== "string") return fallback;

    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
};

const createNotificationId = (data: Record<string, string>): string => {
    if (data.notification_id) return data.notification_id;

    const parts = [
        data.type,
        data.order_number,
        data.status,
        data.created_at,
        Date.now().toString(),
    ].filter(Boolean);

    return parts.join(":");
};

const normalizeFCMPayload = (msg: MessagePayload): NormalizedNotification | null => {
    try {
        const data = msg.data ?? {};
        const type = data.type;

        if (!isNotificationType(type)) {
            console.warn("[FCM] Unknown notification type ignored:", type, msg);
            return null;
        }

        const legacyPayload = safeJsonParse<NotificationPayload>(data.payload, {});
        const payload: NotificationPayload = {
            ...data,
            ...legacyPayload,
            type,
            order_number: legacyPayload.order_number ?? data.order_number,
            status: legacyPayload.status ?? data.status,
            priority: legacyPayload.priority ?? data.priority,
        };

        return {
            notification_id: createNotificationId(data),
            type,
            title: data.title ?? msg.notification?.title ?? "Notification",
            message: data.message ?? data.body ?? msg.notification?.body ?? "",
            payload,
            created_at: data.created_at ?? new Date().toISOString(),
            is_read: false,
        };
    } catch (error) {
        console.error("[FCM] normalizeFCMPayload error:", error);
        return null;
    }
};

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existing = registrations.find(
        (registration) => registration.scope === `${location.origin}${SW_SCOPE}`,
    );

    if (existing?.active) return existing;

    const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
        updateViaCache: "none",
    });

    if (registration.installing || registration.waiting) {
        await new Promise<void>((resolve) => {
            const sw = (registration.installing ?? registration.waiting)!;
            const timer = window.setTimeout(resolve, 5_000);

            sw.addEventListener("statechange", function handler(this: ServiceWorker) {
                if (this.state === "activated") {
                    window.clearTimeout(timer);
                    sw.removeEventListener("statechange", handler);
                    resolve();
                }
            });
        });
    }

    return registration;
};

const persistTokenWithBackend = async (token: string): Promise<void> => {
    const previousToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const lastSyncedAt = Number(localStorage.getItem(TOKEN_SYNCED_AT_STORAGE_KEY) || 0);
    const recentlySynced =
        previousToken === token &&
        lastSyncedAt > 0 &&
        Date.now() - lastSyncedAt < TOKEN_BACKEND_SYNC_MS;

    if (recentlySynced) return;

    let response;
    if (previousToken && previousToken !== token) {
        response = await refreshFcmToken({
            oldToken: previousToken,
            newToken: token,
            platform: "web",
        });
    } else {
        response = await registerFcmToken(token, "web");
    }

    if (!response?.success) {
        if (response?.status === 429) {
            console.warn("[FCM] Backend token registration rate-limited. Will retry later.");
            return;
        }

        throw new Error(response?.message || "FCM token registration failed.");
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_SYNCED_AT_STORAGE_KEY, String(Date.now()));
};

export const useFCM = (
    onForegroundMessage: (notification: NormalizedNotification) => void,
    enabled = true,
): UseFCMReturn => {
    const tokenRef = useRef<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const handlerRef = useRef(onForegroundMessage);
    const initInProgress = useRef(false);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        handlerRef.current = onForegroundMessage;
    }, [onForegroundMessage]);

    const initFCM = useCallback(async (): Promise<void> => {
        if (initInProgress.current) return;
        initInProgress.current = true;

        try {
            const { supported, missing } = checkBrowserSupport();
            if (!supported) {
                dispatchFcmEvent("fcm:not-supported", { missing });
                return;
            }

            if (Notification.permission === "denied") {
                dispatchFcmEvent("fcm:permission-denied", { reason: "permission-denied" });
                return;
            }

            const permission =
                Notification.permission === "granted"
                    ? "granted"
                    : await Notification.requestPermission();

            if (permission === "denied") {
                dispatchFcmEvent("fcm:permission-denied", { reason: "permission-denied" });
                return;
            }

            if (permission === "default") return;

            const messaging = await getMessagingInstance();
            if (!messaging) return;

            let swRegistration: ServiceWorkerRegistration;
            try {
                swRegistration = await registerServiceWorker();
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                dispatchFcmEvent("fcm:sw-error", { reason });
                return;
            }

            let token: string;
            try {
                token = await getToken(messaging, {
                    vapidKey: FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: swRegistration,
                });
            } catch (tokenError) {
                const error = tokenError as Error & { code?: string };
                const isAbortError =
                    error.name === "AbortError" ||
                    error.code === "messaging/token-subscribe-failed" ||
                    error.code === "messaging/push-subscription-error" ||
                    String(error.message).includes("AbortError");

                if (isAbortError) {
                    const isBrave = await detectBrave();
                    dispatchFcmEvent("fcm:push-blocked", {
                        reason: isBrave ? "brave-shields" : "push-service-error",
                    });
                    return;
                }

                dispatchFcmEvent("fcm:token-error", { reason: error.message });
                return;
            }

            if (!token) return;

            if (token !== tokenRef.current) {
                await persistTokenWithBackend(token);
                tokenRef.current = token;
            } else {
                await persistTokenWithBackend(token);
            }

            unsubscribeRef.current?.();
            unsubscribeRef.current = onMessage(messaging, (message) => {
                const normalized = normalizeFCMPayload(message);
                if (normalized) handlerRef.current(normalized);
            });

            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(async () => {
                initInProgress.current = false;
                await initFCM();
            }, TOKEN_REFRESH_MS);
        } finally {
            initInProgress.current = false;
        }
    }, []);

    const teardownFCM = useCallback(async (): Promise<void> => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        unsubscribeRef.current?.();
        unsubscribeRef.current = null;

        const token = tokenRef.current || localStorage.getItem(TOKEN_STORAGE_KEY);
        tokenRef.current = null;
        initInProgress.current = false;

        if (!token) return;

        await Promise.allSettled([
            deregisterFcmToken(token),
            getMessagingInstance().then((messaging) => {
                if (!messaging) return;
                return deleteToken(messaging);
            }),
        ]);

        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_SYNCED_AT_STORAGE_KEY);
    }, []);

    useEffect(() => {
        if (enabled) void initFCM();
        else void teardownFCM();

        return () => {
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [enabled, initFCM, teardownFCM]);

    return { initFCM, teardownFCM };
};

export default useFCM;
