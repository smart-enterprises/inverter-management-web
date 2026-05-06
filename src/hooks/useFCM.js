// src/hooks/useFCM.js
import { useEffect, useRef, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "../config/firebaseConfig";
import { registerFcmToken, deregisterFcmToken } from "../api/notifications";
import { FIREBASE_VAPID_KEY } from "../utils/constants";

const useFCM = (onForegroundMessage, enabled = true) => {
    const tokenRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const onMessageRef = useRef(onForegroundMessage);

    useEffect(() => {
        onMessageRef.current = onForegroundMessage;
    }, [onForegroundMessage]);

    const initFCM = useCallback(async () => {
        if (!enabled) return;

        try {
            if (Notification.permission === "denied") {
                console.warn("[FCM] Notifications are blocked. User must enable in browser settings.");
                window.dispatchEvent(
                    new CustomEvent("fcm:permission-denied", {
                        detail: { reason: "permission-denied" },
                    })
                );
                return;
            }

            const permission =
                Notification.permission === "granted"
                    ? "granted"
                    : await Notification.requestPermission();

            if (permission === "denied") {
                console.warn("[FCM] Notifications blocked by user.");
                window.dispatchEvent(
                    new CustomEvent("fcm:permission-denied", {
                        detail: { reason: "permission-denied" },
                    })
                );
                return;
            }

            if (permission === "default") {
                console.warn("[FCM] Notification prompt dismissed by user.");
                return;
            }

            if (!("serviceWorker" in navigator)) {
                console.warn("[FCM] Service workers not supported in this browser.");
                return;
            }

            await navigator.serviceWorker.register(
                "/firebase-messaging-sw.js",
                { scope: "/" }
            );

            const activeReg = await navigator.serviceWorker.ready;

            const messaging = await getMessagingInstance();
            if (!messaging) {
                console.warn("[FCM] Messaging instance unavailable");
                return;
            }

            let token;
            try {
                token = await getToken(messaging, {
                    vapidKey: FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: activeReg,
                });
            } catch (tokenErr) {
                if (
                    tokenErr.name === "AbortError" ||
                    tokenErr.code === "messaging/token-subscribe-failed"
                ) {
                    const isBrave =
                        typeof navigator.brave !== "undefined" &&
                        (await navigator.brave.isBrave().catch(() => false));

                    if (isBrave) {
                        console.warn(
                            "[FCM] Brave Shields is blocking the FCM push service. " +
                            "Lower Shields for this site or switch to Chrome/Firefox."
                        );
                        window.dispatchEvent(
                            new CustomEvent("fcm:push-blocked", {
                                detail: { reason: "brave-shields" },
                            })
                        );
                    } else {
                        console.warn(
                            "[FCM] Push service registration failed. " +
                            "fcm.googleapis.com may be blocked by your network or firewall."
                        );
                        window.dispatchEvent(
                            new CustomEvent("fcm:push-blocked", {
                                detail: { reason: "push-service-error" },
                            })
                        );
                    }
                    return;
                }

                throw tokenErr;
            }

            if (!token) {
                console.warn("[FCM] Failed to retrieve FCM token");
                return;
            }

            if (token !== tokenRef.current) {
                tokenRef.current = token;
                await registerFcmToken(token, "web");
                console.info("[FCM] Token registered with backend");
            }

            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }

            unsubscribeRef.current = onMessage(messaging, (remoteMessage) => {
                console.log("[FCM] Foreground message received:", remoteMessage);

                const normalized = normalizeFcmPayload(remoteMessage);
                if (normalized) {
                    onMessageRef.current?.(normalized);
                }
            });
        } catch (err) {
            console.error("[FCM] Initialisation failed:", err);
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
        } else {
            teardownFCM();
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [enabled]);

    return { initFCM, teardownFCM };
};

const normalizeFcmPayload = (remoteMessage) => {
    try {
        const data = remoteMessage.data ?? {};

        if (!data.notification_id || !data.type) {
            console.warn("[FCM] Message missing notification_id or type — ignored");
            return null;
        }

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