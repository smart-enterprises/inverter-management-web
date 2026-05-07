// src/hooks/useFCM.js
import { useEffect, useRef, useCallback } from "react";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { getMessagingInstance } from "../config/firebaseConfig";
import { registerFcmToken, deregisterFcmToken } from "../api/notifications";
import { FIREBASE_VAPID_KEY } from "../utils/constants";

const SW_PATH = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";
const TOKEN_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

const detectBrave = async () => {
    try {
        if (typeof navigator.brave === "undefined") return false;
        return await navigator.brave.isBrave().catch(() => false);
    } catch {
        return false;
    }
};

const dispatchFcmEvent = (name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    console.warn(`[FCM] Event: ${name}`, detail);
};

const checkBrowserSupport = () => {
    const missing = [];
    if (!("Notification" in window)) missing.push("Notification API");
    if (!("serviceWorker" in navigator)) missing.push("Service Worker");
    if (!("PushManager" in window)) missing.push("Push API");
    return { supported: missing.length === 0, missing };
};

const registerServiceWorker = async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const existing = regs.find(
        (r) => r.scope === `${location.origin}${SW_SCOPE}`
    );

    if (existing?.active) {
        console.info("[FCM] Reusing existing service worker");
        return existing;
    }

    const reg = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
        updateViaCache: "none",
    });

    console.info("[FCM] Service worker registered:", reg.scope);

    if (reg.installing || reg.waiting) {
        await new Promise((resolve) => {
            const sw = reg.installing ?? reg.waiting;
            const timer = setTimeout(resolve, 5000);
            sw.addEventListener("statechange", function handler() {
                if (this.state === "activated") {
                    clearTimeout(timer);
                    sw.removeEventListener("statechange", handler);
                    resolve();
                }
            });
        });
    }

    return reg;
};

const normalizeFcmPayload = (remoteMessage) => {
    try {
        const data = remoteMessage.data ?? {};
        if (!data.notification_id || !data.type) {
            console.warn("[FCM] Message missing notification_id/type — ignored", remoteMessage);
            return null;
        }
        let parsedPayload = {};
        try { parsedPayload = JSON.parse(data.payload || "{}"); } catch { }

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

const useFCM = (onForegroundMessage, enabled = true) => {
    const tokenRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const onMessageRef = useRef(onForegroundMessage);
    const refreshTimerRef = useRef(null);
    const initInProgressRef = useRef(false);

    useEffect(() => {
        onMessageRef.current = onForegroundMessage;
    }, [onForegroundMessage]);

    const initFCM = useCallback(async () => {
        if (initInProgressRef.current) {
            console.debug("[FCM] Init already in progress — skipped");
            return;
        }
        initInProgressRef.current = true;

        try {
            console.info("[FCM] initFCM start");

            const { supported, missing } = checkBrowserSupport();
            if (!supported) {
                dispatchFcmEvent("fcm:not-supported", { missing });
                console.warn("[FCM] Browser missing:", missing.join(", "));
                return;
            }

            if (Notification.permission === "denied") {
                dispatchFcmEvent("fcm:permission-denied", { reason: "permission-denied" });
                return;
            }

            let permission = Notification.permission;
            if (permission !== "granted") {
                permission = await Notification.requestPermission();
            }

            if (permission === "denied") {
                dispatchFcmEvent("fcm:permission-denied", { reason: "permission-denied" });
                return;
            }
            if (permission === "default") {
                console.info("[FCM] Prompt dismissed — stopping");
                return;
            }

            const messaging = await getMessagingInstance();
            if (!messaging) {
                console.warn("[FCM] Messaging unavailable in this browser");
                return;
            }

            let swReg;
            try {
                swReg = await registerServiceWorker();
            } catch (err) {
                console.error("[FCM] SW registration failed:", err.message);
                dispatchFcmEvent("fcm:sw-error", { reason: err.message });
                return;
            }

            let token;
            try {
                token = await getToken(messaging, {
                    vapidKey: FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: swReg,
                });
                console.info("[FCM] Token:", token ? `...${token.slice(-12)}` : "null");
            } catch (tokenErr) {
                console.error("[FCM] getToken failed:", tokenErr.code, tokenErr.message);

                const isAbortError =
                    tokenErr.name === "AbortError" ||
                    tokenErr.code === "messaging/token-subscribe-failed" ||
                    tokenErr.code === "messaging/push-subscription-error" ||
                    String(tokenErr.message).includes("AbortError");

                if (isAbortError) {
                    const isBrave = await detectBrave();
                    if (isBrave) {
                        console.warn("[FCM] Brave Shields blocking FCM. Lower Shields → refresh.");
                        dispatchFcmEvent("fcm:push-blocked", { reason: "brave-shields" });
                    } else {
                        console.warn(
                            "[FCM] Push service failed.\n" +
                            "Possible: fcm.googleapis.com blocked by firewall/adblock/network.\n" +
                            "Fix: whitelist fcm.googleapis.com or use Chrome."
                        );
                        dispatchFcmEvent("fcm:push-blocked", { reason: "push-service-error" });
                    }
                    return;
                }

                if (tokenErr.code === "messaging/failed-service-worker-registration") {
                    console.warn("[FCM] SW failed in getToken — updating and retrying...");
                    try {
                        await swReg.update();
                        token = await getToken(messaging, {
                            vapidKey: FIREBASE_VAPID_KEY,
                            serviceWorkerRegistration: swReg,
                        });
                    } catch (retryErr) {
                        console.error("[FCM] Token retry failed:", retryErr.message);
                        return;
                    }
                } else {
                    dispatchFcmEvent("fcm:token-error", { reason: tokenErr.message });
                    return;
                }
            }

            if (!token) {
                console.warn("[FCM] Token null after all attempts");
                return;
            }

            if (token !== tokenRef.current) {
                tokenRef.current = token;
                try {
                    await registerFcmToken(token, "web");
                    console.info("[FCM] Token registered with backend ✅");
                } catch (err) {
                    console.error("[FCM] Backend registration failed:", err.message);
                }
            }

            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            unsubscribeRef.current = onMessage(messaging, (msg) => {
                console.log("[FCM] Foreground message:", msg);
                const normalized = normalizeFcmPayload(msg);
                if (normalized) onMessageRef.current?.(normalized);
            });

            console.info("[FCM] Foreground listener active ✅");

            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(async () => {
                console.info("[FCM] Token refresh triggered after 30 days");
                tokenRef.current = null;
                initInProgressRef.current = false;
                await initFCM();
            }, TOKEN_REFRESH_MS);

        } finally {
            initInProgressRef.current = false;
        }
    }, []);

    const teardownFCM = useCallback(async () => {
        console.info("[FCM] Teardown start");

        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        if (tokenRef.current) {
            const token = tokenRef.current;
            tokenRef.current = null;
            initInProgressRef.current = false;

            try {
                await deregisterFcmToken(token);
                console.info("[FCM] Backend token deregistered");
            } catch (err) {
                console.warn("[FCM] Backend deregistration failed:", err.message);
            }

            try {
                const messaging = await getMessagingInstance();
                if (messaging) {
                    await deleteToken(messaging);
                    console.info("[FCM] Browser token deleted");
                }
            } catch (err) {
                console.warn("[FCM] Browser token deletion failed:", err.message);
            }
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
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [enabled]);

    return { initFCM, teardownFCM };
};

export default useFCM;