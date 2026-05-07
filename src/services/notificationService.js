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
    loadAttempted: false,
    LOOP_MS: 2_500,
    AUDIO_PATH: "/notification-alert.mp3",
};

const getAudioContext = () => {
    if (!AudioState.ctx) {
        try {
            AudioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
            console.info("[Audio] AudioContext created");
        } catch (err) {
            console.warn("[Audio] Failed to create AudioContext:", err.message);
            return null;
        }
    }
    return AudioState.ctx;
};

export const loadAudioBuffer = async () => {
    if (AudioState.buffer) return AudioState.buffer;
    if (AudioState.loadAttempted) return null;

    AudioState.loadAttempted = true;
    const ctx = getAudioContext();
    if (!ctx) return null;

    try {
        const response = await fetch(AudioState.AUDIO_PATH);

        if (!response.ok) {
            console.warn(
                `[Audio] ${AudioState.AUDIO_PATH} not found (${response.status}).\n` +
                "Add an MP3 to /public/notification-alert.mp3 to enable sound alerts.\n" +
                "Notification system will work without sound."
            );
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        AudioState.buffer = await ctx.decodeAudioData(arrayBuffer);
        console.info("[Audio] Audio buffer loaded successfully");
        return AudioState.buffer;
    } catch (err) {
        console.warn("[Audio] Failed to load audio buffer:", err.message);
        return null;
    }
};

export const unlockAudio = async () => {
    if (AudioState.unlocked) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            await ctx.resume();
            console.info("[Audio] AudioContext resumed");
        }

        AudioState.unlocked = true;

        await loadAudioBuffer();
    } catch (err) {
        console.warn("[Audio] Unlock failed:", err.message);
    }
};

const playOnce = () => {
    const { ctx, buffer, unlocked } = AudioState;

    if (!ctx || !buffer) {
        return;
    }

    if (!unlocked) {
        console.debug("[Audio] AudioContext not unlocked yet — skipping playback");
        return;
    }

    try {
        if (ctx.state === "suspended") {
            ctx.resume().catch(() => { });
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (err) {
        console.warn("[Audio] playOnce failed:", err.message);
    }
};

export const startAlertLoop = () => {
    stopAlertLoop();
    playOnce();
    AudioState.intervalId = setInterval(playOnce, AudioState.LOOP_MS);
    console.debug("[Audio] Alert loop started");
};

export const stopAlertLoop = () => {
    if (AudioState.intervalId) {
        clearInterval(AudioState.intervalId);
        AudioState.intervalId = null;
        console.debug("[Audio] Alert loop stopped");
    }
};

export const getSystemNotifPermission = () => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
};

export const requestSystemNotifPermission = async () => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";

    try {
        const result = await Notification.requestPermission();
        console.info("[SystemNotif] Permission result:", result);
        return result;
    } catch (err) {
        console.warn("[SystemNotif] Permission request failed:", err.message);
        return "denied";
    }
};

export const showSystemNotification = ({
    title,
    body,
    icon,
    tag,
    data,
    onClick,
}) => {
    if (!("Notification" in window)) {
        console.debug("[SystemNotif] Notification API not available");
        return null;
    }

    if (Notification.permission !== "granted") {
        console.debug("[SystemNotif] Permission not granted — skipping system notification");
        return null;
    }

    try {
        const notif = new Notification(title, {
            body,
            icon: icon ?? "/logo192.png",
            badge: "/logo192.png",
            tag: tag ?? `notif-${Date.now()}`,
            renotify: true,
            requireInteraction: false,
            silent: false,
            data,
        });

        notif.onclick = (e) => {
            e.preventDefault();
            window.focus();
            notif.close();
            onClick?.(data);
        };

        notif.onerror = (e) => {
            console.warn("[SystemNotif] Notification error:", e);
        };

        return notif;
    } catch (err) {
        console.warn("[SystemNotif] Failed to show notification:", err.message);
        return null;
    }
};

export const showSystemNotificationFromPayload = (notification, onClick) => {
    const config = NOTIFICATION_CONFIG[notification.type];

    if (!config?.systemNotif) {
        console.debug(`[SystemNotif] Type '${notification.type}' has systemNotif=false — skipped`);
        return null;
    }

    return showSystemNotification({
        title: `${config.icon ?? "🔔"} ${notification.title}`,
        body: notification.message,
        icon: "/logo192.png",
        tag: notification.notification_id,
        data: notification.payload,
        onClick: onClick ?? (() => { }),
    });
};