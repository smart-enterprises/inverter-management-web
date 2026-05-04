// src/hooks/useFCM.js
import { useEffect, useRef, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "../config/firebaseConfig";
import { registerFcmToken, deregisterFcmToken } from "../api/notifications";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const useFCM = (onForegroundMessage, enabled = true) => {
    const tokenRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const messagingRef = useRef(null);
    const onMessageRef = useRef(onForegroundMessage);

    useEffect(() => {
        onMessageRef.current = onForegroundMessage;
    }, [onForegroundMessage]);

    const initFCM = useCallback(async () => {
        if (!enabled) return;

        try {
            let swReg = null;
            if ("serviceWorker" in navigator) {
                swReg = await navigator.serviceWorker.register(
                    "/firebase-messaging-sw.js",
                    { scope: "/" }
                );
                await navigator.serviceWorker.ready;
            }

            const messaging = await getMessagingInstance();
            if (!messaging) return;
            messagingRef.current = messaging;
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                console.warn("[FCM] Notification permission denied");
                return;
            }

            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg ?? undefined,
            });

            if (!token) {
                console.warn("[FCM] Failed to retrieve FCM token");
                return;
            }

            tokenRef.current = token;

            await registerFcmToken(token);
            console.info("[FCM] Token registered with backend");

            unsubscribeRef.current = onMessage(messaging, (remoteMessage) => {
                console.log("[FCM] Foreground message:", remoteMessage);
                const normalized = normalizeFcmPayload(remoteMessage);
                if (normalized) {
                    onMessageRef.current?.(normalized);
                }
            });
        } catch (err) {
            console.error("[FCM] Initialization failed:", err);
        }
    }, [enabled]);

    const teardownFCM = useCallback(async () => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        if (tokenRef.current) {
            try {
                await deregisterFcmToken(tokenRef.current);
                console.info("[FCM] Token deregistered from backend");
            } catch (err) {
                console.warn("[FCM] Failed to deregister token:", err);
            }
            tokenRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            initFCM();
        }

        return () => {
            teardownFCM();
        };
    }, [enabled]);

    return { teardownFCM };
};

const normalizeFcmPayload = (remoteMessage) => {
    try {
        const data = remoteMessage.data ?? {};

        if (!data.notification_id || !data.type) return null;

        let parsedPayload = {};
        try {
            parsedPayload = JSON.parse(data.payload || "{}");
        } catch (_) { }

        return {
            notification_id: data.notification_id,
            type: data.type,
            title: data.title ?? remoteMessage.notification?.title ?? "Notification",
            message: data.message ?? remoteMessage.notification?.body ?? "",
            payload: parsedPayload,
            created_at: data.created_at ?? new Date().toISOString(),
            is_read: false,
        };
    } catch (err) {
        console.error("[FCM] normalizeFcmPayload error:", err);
        return null;
    }
};

export default useFCM;