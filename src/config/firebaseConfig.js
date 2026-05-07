// src/config/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import { FIREBASE_CONFIG } from "../utils/constants.js";

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

let _messagingInstance = null;

export const getMessagingInstance = async () => {
    if (_messagingInstance) return _messagingInstance;

    try {
        const supported = await isSupported();

        if (!supported) {
            console.warn(
                "[Firebase] FCM Messaging not supported in this browser.\n" +
                "Requires: Chrome/Edge/Opera 63+, Firefox 68+ (limited), Safari 16.4+ (PWA only)"
            );
            return null;
        }

        _messagingInstance = getMessaging(app);
        console.info("[Firebase] Messaging instance created");
        return _messagingInstance;
    } catch (err) {
        console.error("[Firebase] Failed to get messaging instance:", err.message);
        return null;
    }
};

export default app;