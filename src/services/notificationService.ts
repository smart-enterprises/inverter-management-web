// src/services/notificationService.ts
import {
    unlockAudio as _unlockAudio,
    startAlertLoop as _startAlertLoop,
    stopAlertLoop as _stopAlertLoop,
    teardownAudio,
    loadAudioBufferEarly,
} from "./audioService";

import {
    NormalizedNotification,
    NotificationPayload,
    NOTIFICATION_CONFIG,
} from "./notificationServiceTypes";

export { teardownAudio, loadAudioBufferEarly };
export const unlockAudio = _unlockAudio;
export const startAlertLoop = _startAlertLoop;
export const stopAlertLoop = _stopAlertLoop;

export const loadAudioBuffer = async (): Promise<AudioBuffer | null> => {
    await loadAudioBufferEarly();
    return null;
};

export type SystemNotificationPermission =
    | NotificationPermission
    | "unsupported";

export const getSystemNotifPermission = (): SystemNotificationPermission => {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
};

export const requestSystemNotifPermission =
    async (): Promise<SystemNotificationPermission> => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return "unsupported";
        }
        if (Notification.permission === "granted") return "granted";

        try {
            return await Notification.requestPermission();
        } catch {
            return "denied";
        }
    };

interface ShowSystemNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: NotificationPayload;
    onClick?: (data?: NotificationPayload) => void;
}

export const showSystemNotification = ({
    title,
    body,
    icon,
    tag,
    data,
    onClick,
}: ShowSystemNotificationOptions): Notification | null => {
    if (typeof window === "undefined" || !("Notification" in window)) return null;
    if (Notification.permission !== "granted") return null;

    try {
        const notification = new Notification(title, {
            body,
            icon: icon ?? "/logo192.png",
            badge: "/logo192.png",
            tag: tag ?? `notif-${Date.now()}`,
            requireInteraction: false,
            silent: false,
            data,
        });

        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            notification.close();
            onClick?.(data);
        };

        notification.onerror = () => {
            console.warn("[SystemNotif] Notification error");
        };

        return notification;
    } catch (err) {
        console.warn("[SystemNotif] Failed to show notification:", err);
        return null;
    }
};

export const showSystemNotificationFromPayload = (
    notification: NormalizedNotification,
    onClick?: (payload?: NotificationPayload) => void,
): Notification | null => {
    const config = NOTIFICATION_CONFIG[notification.type];
    if (!config?.systemNotif) return null;

    return showSystemNotification({
        title: `${config.icon ?? "🔔"} ${notification.title}`,
        body: notification.message,
        icon: "/logo192.png",
        tag: notification.notification_id,
        data: notification.payload,
        onClick: onClick ?? (() => { }),
    });
};