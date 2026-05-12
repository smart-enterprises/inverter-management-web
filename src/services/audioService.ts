// src/services/audioService.ts
const AUDIO_PATH = "/notification-alert.mp3";

const LOOP_INTERVAL_MS = 2500;

interface AudioState {
    ctx: AudioContext | null;
    buffer: AudioBuffer | null;
    unlocked: boolean;
    intervalId: ReturnType<typeof setInterval> | null;
    loadingPromise: Promise<AudioBuffer | null> | null;
}

const state: AudioState = {
    ctx: null,
    buffer: null,
    unlocked: false,
    intervalId: null,
    loadingPromise: null,
};

let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") {
        return null;
    }

    if (state.ctx) {
        return state.ctx;
    }

    try {
        const AudioContextClass =
            window.AudioContext ||
            (
                window as Window & {
                    webkitAudioContext?: typeof AudioContext;
                }
            ).webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        state.ctx = new AudioContextClass();
        return state.ctx;
    } catch (error) {
        console.warn("[Audio] Failed to create AudioContext:", error);

        return null;
    }
};

const loadBuffer = async (): Promise<AudioBuffer | null> => {
    if (state.buffer) {
        return state.buffer;
    }

    if (state.loadingPromise) {
        return state.loadingPromise;
    }

    state.loadingPromise = (async () => {
        try {
            const ctx = getAudioContext();

            if (!ctx) {
                return null;
            }

            const response = await fetch(AUDIO_PATH);

            if (!response.ok) {
                console.warn(
                    `[Audio] Failed to load audio file (${response.status})`,
                );

                return null;
            }

            const arrayBuffer = await response.arrayBuffer();

            const decodedBuffer =
                await ctx.decodeAudioData(arrayBuffer);

            state.buffer = decodedBuffer;

            return decodedBuffer;
        } catch (error) {
            console.warn("[Audio] Buffer load failed:", error);

            return null;
        } finally {
            state.loadingPromise = null;
        }
    })();

    return state.loadingPromise;
};

export const loadAudioBufferEarly = async (): Promise<void> => {
    getAudioContext();

    await loadBuffer();
};

export const unlockAudio = async (): Promise<void> => {
    try {
        const ctx = getAudioContext();

        if (!ctx) {
            return;
        }

        if (ctx.state === "suspended") {
            await ctx.resume();
        }

        const silentBuffer = ctx.createBuffer(1, 1, 22050);

        const source = ctx.createBufferSource();

        source.buffer = silentBuffer;

        source.connect(ctx.destination);

        source.start(0);

        state.unlocked = true;

        await loadBuffer();
    } catch (error) {
        console.warn("[Audio] Unlock failed:", error);
    }
};

const ensureContextRunning = async (): Promise<boolean> => {
    const ctx = getAudioContext();

    if (!ctx) {
        return false;
    }

    if (ctx.state === "suspended") {
        try {
            await ctx.resume();
        } catch (error) {
            console.warn("[Audio] Resume failed:", error);

            return false;
        }
    }

    return ctx.state === "running";
};

const playOnce = async (): Promise<void> => {
    if (!state.unlocked) {
        console.warn("[Audio] Audio not unlocked");

        return;
    }

    const ctx = getAudioContext();

    if (!ctx) {
        return;
    }

    const running = await ensureContextRunning();

    if (!running) {
        return;
    }

    if (!state.buffer) {
        await loadBuffer();
    }

    if (!state.buffer) {
        return;
    }

    try {
        if (currentSource) {
            try {
                currentSource.stop();
            } catch { }

            currentSource.disconnect();

            currentSource = null;
        }

        const source = ctx.createBufferSource();

        currentSource = source;

        source.buffer = state.buffer;

        source.connect(ctx.destination);

        source.onended = () => {
            if (currentSource === source) {
                currentSource = null;
            }
        };

        source.start(0);
    } catch (error) {
        console.warn("[Audio] Playback failed:", error);
    }
};

export const startAlertLoop = (): void => {
    if (state.intervalId !== null) {
        return;
    }

    void playOnce();

    state.intervalId = setInterval(() => {
        void playOnce();
    }, LOOP_INTERVAL_MS);
};

export const stopAlertLoop = (): void => {
    if (state.intervalId !== null) {
        clearInterval(state.intervalId);

        state.intervalId = null;
    }

    if (currentSource) {
        try {
            currentSource.stop();
        } catch { }

        currentSource.disconnect();

        currentSource = null;
    }
};

export const playNotificationSound = (): void => {
    void playOnce();
};

export const teardownAudio = (): void => {
    stopAlertLoop();

    if (state.ctx) {
        try {
            void state.ctx.close();
        } catch { }
    }

    state.ctx = null;
    state.buffer = null;
    state.unlocked = false;
    state.loadingPromise = null;
};

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            void ensureContextRunning();
        }
    });
}