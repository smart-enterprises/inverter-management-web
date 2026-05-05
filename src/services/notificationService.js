// src/services/notificationService.js

export const NOTIFICATION_TYPES = Object.freeze({
    ORDER_CREATED_PENDING: "ORDER_CREATED_PENDING",
    ORDER_CREATED_PRODUCTION: "ORDER_CREATED_PRODUCTION",
    ORDER_CREATED_PACKED: "ORDER_CREATED_PACKED",
    ORDER_CONFIRMED: "ORDER_CONFIRMED",
    ORDER_STATUS_PRODUCTION: "ORDER_STATUS_PRODUCTION",
    ORDER_STATUS_PACKED: "ORDER_STATUS_PACKED",
});

export const NOTIFICATION_CONFIG = Object.freeze({
    [NOTIFICATION_TYPES.ORDER_CREATED_PENDING]: {
        label: "New Pending Order",
        icon: "🛒",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PRODUCTION]: {
        label: "New Production Order",
        icon: "⚙️",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PACKED]: {
        label: "New Packed Order",
        icon: "📦",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
        label: "Order Confirmed",
        icon: "✅",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PRODUCTION]: {
        label: "Order In Production",
        icon: "⚙️",
        soundAlert: false,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PACKED]: {
        label: "Order Packed",
        icon: "📦",
        soundAlert: false,
        systemNotif: true,
    },
});

const AudioState = {
    ctx: null,
    buffer: null,
    intervalId: null,
    unlocked: false,
    LOOP_MS: 2_500,
};

const getAudioContext = () => {
    if (!AudioState.ctx) {
        AudioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return AudioState.ctx;
};

export const loadAudioBuffer = async () => {
    if (AudioState.buffer) return AudioState.buffer;

    try {
        const ctx = getAudioContext();
        const response = await fetch("/notification-alert.mp3");

        if (!response.ok) {
            console.warn(
                "[Audio] /public/notification-alert.mp3 not found. " +
                "Add the file to /public to enable sound alerts."
            );
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        AudioState.buffer = await ctx.decodeAudioData(arrayBuffer);
        return AudioState.buffer;
    } catch (err) {
        console.error("[Audio] Failed to load buffer:", err);
        return null;
    }
};

export const unlockAudio = async () => {
    if (AudioState.unlocked) return;

    try {
        const ctx = getAudioContext();
        await ctx.resume();
        AudioState.unlocked = true;
        await loadAudioBuffer();
    } catch (err) {
        console.warn("[Audio] Unlock failed:", err);
    }
};

const playOnce = () => {
    const { ctx, buffer, unlocked } = AudioState;
    if (!ctx || !buffer || !unlocked) return;

    try {
        if (ctx.state === "suspended") ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (err) {
        console.warn("[Audio] playOnce failed:", err);
    }
};

export const startAlertLoop = () => {
    stopAlertLoop();
    playOnce();
    AudioState.intervalId = setInterval(playOnce, AudioState.LOOP_MS);
};

export const stopAlertLoop = () => {
    clearInterval(AudioState.intervalId);
    AudioState.intervalId = null;
};

export const requestSystemNotifPermission = async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";

    try {
        const result = await Notification.requestPermission();
        return result;
    } catch (err) {
        console.warn("[SystemNotif] Permission request failed:", err);
        return "denied";
    }
};

export const getSystemNotifPermission = () => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
};

export const showSystemNotification = ({
    title,
    body,
    icon,
    tag,
    data,
    onClick,
}) => {
    if (!("Notification" in window)) return null;
    if (Notification.permission !== "granted") return null;

    try {
        const notif = new Notification(title, {
            body,
            icon: icon ?? "/logo192.png",
            tag: tag ?? `notif-${Date.now()}`,
            requireInteraction: false,
            data,
        });

        if (onClick) {
            notif.onclick = (e) => {
                e.preventDefault();
                window.focus();
                onClick(data);
                notif.close();
            };
        }

        return notif;
    } catch (err) {
        console.warn("[SystemNotif] Failed to show:", err);
        return null;
    }
};

export const showSystemNotificationFromPayload = (notification, onClick) => {
    const config = NOTIFICATION_CONFIG[notification.type];
    if (!config?.systemNotif) return null;

    return showSystemNotification({
        title: `${config.icon ?? "🔔"} ${notification.title}`,
        body: notification.message,
        tag: notification.notification_id,
        data: notification.payload,
        onClick: onClick ?? (() => { }),
    });
};