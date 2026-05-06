// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import { FIREBASE_CONFIG } from "../utils/constants";

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

let _messagingInstance = null;

export const getMessagingInstance = async () => {
    if (_messagingInstance) return _messagingInstance;

    try {
        const supported = await isSupported();
        if (!supported) {
            console.warn("[FCM] Firebase Messaging is not supported in this browser.");
            return null;
        }
        _messagingInstance = getMessaging(app);
        return _messagingInstance;
    } catch (err) {
        console.error("[FCM] Failed to get messaging instance:", err);
        return null;
    }
};

export default app;