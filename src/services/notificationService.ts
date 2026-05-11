import {
    NormalizedNotification,
    NotificationPayload,
    NOTIFICATION_CONFIG,
} from "./notificationServiceTypes";

type WebkitWindow = Window &
    typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
    };

const AudioState: {
    ctx: AudioContext | null;
    buffer: AudioBuffer | null;
    intervalId: ReturnType<typeof setInterval> | null;
    unlocked: boolean;
    loadAttempted: boolean;
    LOOP_MS: number;
    AUDIO_PATH: string;
} = {
    ctx: null,
    buffer: null,
    intervalId: null,
    unlocked: false,
    loadAttempted: false,
    LOOP_MS: 2_500,
    AUDIO_PATH: "/notification-alert.mp3",
};

const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;

    if (!AudioState.ctx) {
        try {
            const AudioContextClass =
                window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;

            if (!AudioContextClass) return null;

            AudioState.ctx = new AudioContextClass();
            console.info("[Audio] AudioContext created");
        } catch (error) {
            console.warn("[Audio] Failed to create AudioContext:", error);
            return null;
        }
    }

    return AudioState.ctx;
};

export const loadAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (AudioState.buffer) return AudioState.buffer;
    if (AudioState.loadAttempted) return null;

    AudioState.loadAttempted = true;

    const ctx = getAudioContext();
    if (!ctx) return null;

    try {
        const response = await fetch(AudioState.AUDIO_PATH);

        if (!response.ok) {
            console.warn(
                `[Audio] ${AudioState.AUDIO_PATH} not found (${response.status}). Add an MP3 to public/notification-alert.mp3 to enable sound alerts.`,
            );
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        AudioState.buffer = await ctx.decodeAudioData(arrayBuffer);

        console.info("[Audio] Audio buffer loaded successfully");
        return AudioState.buffer;
    } catch (error) {
        console.warn("[Audio] Failed to load audio buffer:", error);
        return null;
    }
};

export const unlockAudio = async (): Promise<void> => {
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
    } catch (error) {
        console.warn("[Audio] Unlock failed:", error);
    }
};

const playOnce = (): void => {
    const { ctx, buffer, unlocked } = AudioState;

    if (!ctx || !buffer || !unlocked) return;

    try {
        if (ctx.state === "suspended") {
            void ctx.resume();
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (error) {
        console.warn("[Audio] playOnce failed:", error);
    }
};

export const startAlertLoop = (): void => {
    stopAlertLoop();
    playOnce();
    AudioState.intervalId = setInterval(playOnce, AudioState.LOOP_MS);
    console.debug("[Audio] Alert loop started");
};

export const stopAlertLoop = (): void => {
    if (!AudioState.intervalId) return;

    clearInterval(AudioState.intervalId);
    AudioState.intervalId = null;
    console.debug("[Audio] Alert loop stopped");
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

        if (Notification.permission === "granted") {
            return "granted";
        }

        try {
            const result = await Notification.requestPermission();
            console.info("[SystemNotif] Permission result:", result);
            return result;
        } catch (error) {
            console.warn("[SystemNotif] Permission request failed:", error);
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
    if (typeof window === "undefined" || !("Notification" in window)) {
        console.debug("[SystemNotif] Notification API not available");
        return null;
    }

    if (Notification.permission !== "granted") {
        console.debug("[SystemNotif] Permission not granted — skipping");
        return null;
    }

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

        notification.onerror = (event) => {
            console.warn("[SystemNotif] Notification error:", event);
        };

        return notification;
    } catch (error) {
        console.warn("[SystemNotif] Failed to show notification:", error);
        return null;
    }
};

export const showSystemNotificationFromPayload = (
    notification: NormalizedNotification,
    onClick?: (payload?: NotificationPayload) => void,
): Notification | null => {
    const config = NOTIFICATION_CONFIG[notification.type];

    if (!config?.systemNotif) {
        console.debug(
            `[SystemNotif] Type '${notification.type}' has systemNotif=false — skipped`,
        );
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
