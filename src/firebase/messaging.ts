import { getMessaging, isSupported, Messaging } from "firebase/messaging";
import { firebaseApp } from "./config";

let messagingInstance: Messaging | null = null;

export const getMessagingInstance = async (): Promise<Messaging | null> => {
    if (messagingInstance) return messagingInstance;

    try {
        const supported = await isSupported();

        if (!supported) {
            console.warn("[FCM] Firebase Messaging is not supported in this browser");
            return null;
        }

        messagingInstance = getMessaging(firebaseApp);
        return messagingInstance;
    } catch (error) {
        console.error("[FCM] Failed to initialize messaging:", error);
        return null;
    }
};