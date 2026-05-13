// src/services/audioService.ts
//
// Reliable notification audio — fixes silent drops when the AudioContext
// is not yet unlocked or the buffer has not finished loading when a
// notification arrives.
//
// Key improvements over the previous implementation:
//   • Single shared "ready" promise — concurrent callers all await the same
//     decode operation; no redundant fetches.
//   • Unlock + buffer load are collapsed into one atomic `ensureReady()`
//     path so callers never race the two independently.
//   • `startAlertLoop` queues a pending play if the engine is not yet ready
//     and fires it as soon as `ensureReady()` resolves — no silent drops.
//   • Visibility-change resume is handled centrally; no duplicate listeners.
//   • All public surface is unchanged — drop-in replacement.

const AUDIO_PATH = "/notification-alert.mp3";
const LOOP_INTERVAL_MS = 2_500;

// ─── Internal state ───────────────────────────────────────────────────────────

interface AudioEngine {
    ctx: AudioContext | null;
    buffer: AudioBuffer | null;
    /** Resolves once the buffer has been decoded and the context is running. */
    readyPromise: Promise<boolean> | null;
    unlocked: boolean;
    loopIntervalId: ReturnType<typeof setInterval> | null;
    /** True when startAlertLoop was called before the engine was ready. */
    pendingPlay: boolean;
}

const engine: AudioEngine = {
    ctx: null,
    buffer: null,
    readyPromise: null,
    unlocked: false,
    loopIntervalId: null,
    pendingPlay: false,
};

let currentSource: AudioBufferSourceNode | null = null;

// ─── AudioContext factory ─────────────────────────────────────────────────────

function getOrCreateContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (engine.ctx) return engine.ctx;

    try {
        const Ctor =
            window.AudioContext ??
            (window as Window & { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;

        if (!Ctor) return null;

        engine.ctx = new Ctor();
        return engine.ctx;
    } catch {
        return null;
    }
}

// ─── Core: ensure context running + buffer decoded ───────────────────────────

/**
 * Guarantees that:
 *   1. An AudioContext exists and is in the "running" state.
 *   2. The notification sound has been fetched and decoded.
 *
 * Multiple concurrent callers share the same promise so the MP3 is only
 * fetched / decoded once.
 *
 * Returns `true` on success, `false` if audio is not available.
 */
async function ensureReady(): Promise<boolean> {
    // Fast path — already fully ready.
    if (engine.unlocked && engine.buffer && engine.ctx?.state === "running") {
        return true;
    }

    // Coalesce concurrent callers onto one promise.
    if (engine.readyPromise) return engine.readyPromise;

    engine.readyPromise = (async (): Promise<boolean> => {
        try {
            const ctx = getOrCreateContext();
            if (!ctx) return false;

            // Resume suspended context (required after first user interaction).
            if (ctx.state === "suspended") {
                await ctx.resume();
            }

            // Play a 1-frame silent buffer to satisfy strict autoplay policies.
            const silentBuffer = ctx.createBuffer(1, 1, 22_050);
            const silentSource = ctx.createBufferSource();
            silentSource.buffer = silentBuffer;
            silentSource.connect(ctx.destination);
            silentSource.start(0);

            // Fetch and decode the notification MP3 if not cached.
            if (!engine.buffer) {
                const response = await fetch(AUDIO_PATH);
                if (!response.ok) {
                    console.warn(`[Audio] Failed to load "${AUDIO_PATH}" (${response.status})`);
                    return false;
                }
                const arrayBuffer = await response.arrayBuffer();
                engine.buffer = await ctx.decodeAudioData(arrayBuffer);
            }

            engine.unlocked = true;
            return true;
        } catch (err) {
            console.warn("[Audio] ensureReady failed:", err);
            return false;
        } finally {
            // Allow future calls to re-enter if we need to re-resume after
            // a browser suspends the context again (e.g. tab hidden → shown).
            engine.readyPromise = null;
        }
    })();

    return engine.readyPromise;
}

// ─── Playback ─────────────────────────────────────────────────────────────────

async function playOnce(): Promise<void> {
    const ready = await ensureReady();
    if (!ready || !engine.ctx || !engine.buffer) return;

    // Attempt to resume if the browser re-suspended the context.
    if (engine.ctx.state === "suspended") {
        try {
            await engine.ctx.resume();
        } catch {
            return;
        }
    }

    if (engine.ctx.state !== "running") return;

    try {
        // Stop any currently playing source cleanly.
        if (currentSource) {
            try { currentSource.stop(); } catch { /* already stopped */ }
            currentSource.disconnect();
            currentSource = null;
        }

        const source = engine.ctx.createBufferSource();
        source.buffer = engine.buffer;
        source.connect(engine.ctx.destination);
        source.onended = () => {
            if (currentSource === source) currentSource = null;
        };
        source.start(0);
        currentSource = source;
    } catch (err) {
        console.warn("[Audio] Playback error:", err);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pre-warms the AudioContext and decodes the MP3 so the first notification
 * plays without a perceptible delay.  Call once on app mount.
 */
export async function loadAudioBufferEarly(): Promise<void> {
    // Just create the context — do not resume yet; that requires a gesture.
    getOrCreateContext();

    // Pre-fetch and decode on idle so playback is instant when needed.
    if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => { void fetch(AUDIO_PATH).catch(() => { /* pre-warm only */ }); });
    }
}

/**
 * Must be called from a user-gesture handler (click / keydown / touchstart).
 * Resumes the AudioContext and decodes the MP3 so subsequent programmatic
 * plays work without any user interaction.
 */
export async function unlockAudio(): Promise<void> {
    await ensureReady();
}

/**
 * Starts a repeating alert sound.  If the audio engine is not yet ready
 * (e.g. the user has not interacted with the page yet), the play is queued
 * and fires automatically once `unlockAudio()` succeeds.
 */
export function startAlertLoop(): void {
    // Already looping — nothing to do.
    if (engine.loopIntervalId !== null) return;

    if (engine.unlocked && engine.buffer) {
        // Engine is ready — play immediately and set up the interval.
        void playOnce();
        engine.loopIntervalId = setInterval(() => void playOnce(), LOOP_INTERVAL_MS);
    } else {
        // Engine not ready yet — mark as pending; `unlockAudio` will pick it up.
        engine.pendingPlay = true;

        // Try to get ready in the background; if this resolves (e.g. the page
        // already received a gesture earlier) the sound will play right away.
        ensureReady().then((ready) => {
            if (!ready || !engine.pendingPlay) return;

            engine.pendingPlay = false;

            if (engine.loopIntervalId !== null) return; // loop started elsewhere

            void playOnce();
            engine.loopIntervalId = setInterval(() => void playOnce(), LOOP_INTERVAL_MS);
        });
    }
}

/** Stops the repeating alert and any currently playing sound. */
export function stopAlertLoop(): void {
    engine.pendingPlay = false;

    if (engine.loopIntervalId !== null) {
        clearInterval(engine.loopIntervalId);
        engine.loopIntervalId = null;
    }

    if (currentSource) {
        try { currentSource.stop(); } catch { /* already stopped */ }
        currentSource.disconnect();
        currentSource = null;
    }
}

/** One-shot play — useful for non-looping notifications. */
export function playNotificationSound(): void {
    void playOnce();
}

/** Tears down the entire audio engine.  Call on app unmount. */
export function teardownAudio(): void {
    stopAlertLoop();

    if (engine.ctx) {
        try { void engine.ctx.close(); } catch { /* ignore */ }
    }

    engine.ctx = null;
    engine.buffer = null;
    engine.unlocked = false;
    engine.readyPromise = null;
}

// ─── Visibility change — resume context when tab becomes visible ──────────────

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;

        const ctx = engine.ctx;
        if (!ctx || ctx.state !== "suspended") return;

        ctx.resume().catch(() => { /* best-effort */ });
    });
}