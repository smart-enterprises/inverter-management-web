// src/contexts/NotificationContext.jsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { useAuth } from "../hooks/useAuth";
import useSSE from "../hooks/useSSE";
import {
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
} from "../api/notifications";

const NotificationContext = createContext(null);

// Roles that receive order notifications (mirror backend constant)
const ORDER_NOTIFICATION_ROLES = new Set([
    "ROLE_SUPER_ADMIN",
    "ROLE_ADMIN",
    "ROLE_MANAGER",
    "ROLE_PRODUCTION",
    "ROLE_PACKING",
    "ROLE_ACCOUNTS",
    "ROLE_DELIVERY",
]);

// ┬─┬ ノ( ゜-゜ノ)  AUDIO SYSTEM
let audioCtx = null;
let audioBuffer = null;
let soundIntervalId = null;
let audioUnlocked = false;

// load audio buffer
async function loadAudioBuffer() {
    if (audioBuffer) return audioBuffer; // already loaded
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch("/notification-alert.mp3");
        if (!response.ok) {
            console.error("[Audio] File not found: /public/notification-alert.mp3 — add this file!");
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (err) {
        console.error("[Audio] Failed to load audio buffer:", err);
        return null;
    }
}

// Plays the loaded buffer once. Safe to call from anywhere.
function playOnce() {
    if (!audioCtx || !audioBuffer || !audioUnlocked) return;
    try {
        // AudioContext may be suspended after page idle — resume it
        if (audioCtx.state === "suspended") audioCtx.resume();
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
    } catch (err) {
        console.warn("[Audio] playOnce failed:", err);
    }
}

function startSoundLoop() {
    stopSoundLoop(); // clear any existing interval first
    playOnce();
    soundIntervalId = setInterval(playOnce, 2500);
}

function stopSoundLoop() {
    clearInterval(soundIntervalId);
    soundIntervalId = null;
}

export const NotificationProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]); // active popup toasts
    const [isLoading, setIsLoading] = useState(false);

    const toastTimers = useRef({});

    const shouldReceiveNotifications =
        isAuthenticated() && ORDER_NOTIFICATION_ROLES.has(user?.role);

    /* ── Audio helpers ─────────────────────────────────── */
    useEffect(() => {
        // Pre-fetch and decode the audio file so it's ready instantly
        loadAudioBuffer();

        const unlock = async () => {
            if (audioUnlocked) return;
            try {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                await audioCtx.resume(); // This MUST happen inside a user gesture
                audioUnlocked = true;
                // Also ensure buffer is loaded if it wasn't ready yet
                await loadAudioBuffer();
            } catch (err) {
                console.warn("[Audio] Unlock failed:", err);
            }
        };

        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });

        return () => {
            window.removeEventListener("click", unlock);
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("touchstart", unlock);
        };
    }, []);

    const dismissToast = useCallback((notificationId) => {
        // Clear this toast's auto-dismiss timer
        clearTimeout(toastTimers.current[notificationId]);
        delete toastTimers.current[notificationId];

        setToasts((prev) => {
            const remaining = prev.filter((t) => t.notification_id !== notificationId);
            // ─── CHANGE 5 ──────────────────────────────────────────────────────
            // Only stop sound when there are NO more active toasts.
            // Previously stopSound() was called on every dismiss, killing audio
            // even if other toasts were still active.
            // ───────────────────────────────────────────────────────────────────
            if (remaining.length === 0) {
                stopSoundLoop();
            }
            return remaining;
        });
    }, []);

    const addToast = useCallback((notification) => {
        setToasts((prev) => {
            if (prev.some((t) => t.notification_id === notification.notification_id)) {
                return prev;
            }
            return [...prev, { ...notification, addedAt: Date.now() }];
        });

        startSoundLoop();

        // ─── CHANGE 6 ──────────────────────────────────────────────────────────
        // Store timer in ref so dismissToast always cancels the right one,
        // even if the component re-renders between addToast and the timeout.
        // ───────────────────────────────────────────────────────────────────────
        const timer = setTimeout(() => {
            dismissToast(notification.notification_id);
        }, 5000);
        toastTimers.current[notification.notification_id] = timer;
    }, [dismissToast]);

    /* ── Load initial data ──────────────────────────────── */

    const loadNotifications = useCallback(async () => {
        if (!shouldReceiveNotifications) return;
        try {
            setIsLoading(true);
            const [notifRes, countRes] = await Promise.all([
                fetchNotifications({ page: 1, limit: 20 }),
                fetchUnreadCount(),
            ]);
            if (notifRes?.success) setNotifications(notifRes.data.notifications || []);
            if (countRes?.success) setUnreadCount(countRes.data.count || 0);
        } catch (err) {
            console.error("[Notifications] Failed to load:", err);
        } finally {
            setIsLoading(false);
        }
    }, [shouldReceiveNotifications]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    /* ── SSE event handlers ──────────────────────────────── */

    const handleConnected = useCallback(({ unread_count }) => {
        setUnreadCount(unread_count || 0);
    }, []);

    const handleOrderCreated = useCallback((data) => {
        const newNotif = { ...data, is_read: false };
        setNotifications((prev) => {
            if (prev.some((n) => n.notification_id === data.notification_id)) return prev;
            return [newNotif, ...prev];
        });
        setUnreadCount((c) => c + 1);
        addToast(newNotif);
    }, [addToast]);

    useSSE(
        "/notifications/stream",
        { connected: handleConnected, ORDER_CREATED: handleOrderCreated },
        shouldReceiveNotifications
    );

    /* ── Mark as read ──────────────────────────────────── */

    const handleMarkAsRead = useCallback(async (notificationId) => {
        setNotifications((prev) =>
            prev.map((n) => n.notification_id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        dismissToast(notificationId);

        try {
            await markNotificationRead(notificationId);
        } catch (err) {
            console.error("[Notifications] Failed to mark as read:", err);
            setNotifications((prev) =>
                prev.map((n) => n.notification_id === notificationId ? { ...n, is_read: false } : n)
            );
            setUnreadCount((c) => c + 1);
        }
    }, [dismissToast]);

    const handleMarkAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        stopSoundLoop();
        // Clear all pending timers
        Object.values(toastTimers.current).forEach(clearTimeout);
        toastTimers.current = {};
        setToasts([]);

        try {
            await markAllNotificationsRead();
        } catch (err) {
            console.error("[Notifications] Failed to mark all as read:", err);
            loadNotifications();
        }
    }, [loadNotifications]);

    /* ── Cleanup on unmount ──────────────────────────────── */
    useEffect(() => {
        return () => {
            stopSoundLoop();
            Object.values(toastTimers.current).forEach(clearTimeout);
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                toasts,
                isLoading,
                markAsRead: handleMarkAsRead,
                markAllAsRead: handleMarkAllRead,
                dismissToast,
                refreshNotifications: loadNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
    return ctx;
};