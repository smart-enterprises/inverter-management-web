// src/hooks/useSSE.js
import { useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "../api/apiClient";

const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * useSSE — subscribes to a Server-Sent Events endpoint.
 *
 * @param {string}  endpoint  - e.g. "/notifications/stream"
 * @param {Object}  handlers  - { eventName: handlerFn }  (stable ref kept internally)
 * @param {boolean} enabled   - only connect when true (e.g. user is authenticated)
 */
const useSSE = (endpoint, handlers, enabled = true) => {
    const esRef = useRef(null);
    const attemptsRef = useRef(0);
    const handlersRef = useRef(handlers);
    const timerRef = useRef(null);

    // Keep handlers fresh without triggering reconnects
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const connect = useCallback(() => {
        if (!enabled) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        // Cleanly close any stale connection
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }

        // EventSource doesn't support custom headers — pass token as query param
        const url = `${API_BASE_URL}${endpoint}?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => {
            attemptsRef.current = 0; // reset back-off on successful connect
        };

        es.onerror = () => {
            es.close();
            esRef.current = null;

            if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                console.warn("[SSE] Max reconnect attempts reached. Giving up.");
                return;
            }

            // Exponential back-off with a ceiling
            const delay = Math.min(
                RECONNECT_BASE_MS * Math.pow(1.5, attemptsRef.current),
                RECONNECT_MAX_MS
            );
            attemptsRef.current += 1;

            timerRef.current = setTimeout(connect, delay);
        };

        // Bind named event listeners dynamically
        Object.entries(handlersRef.current).forEach(([eventName, handler]) => {
            es.addEventListener(eventName, (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Always call the latest handler from the ref
                    handlersRef.current[eventName]?.(data);
                } catch (err) {
                    console.error(`[SSE] Failed to parse event "${eventName}":`, err);
                }
            });
        });
    }, [endpoint, enabled]);

    useEffect(() => {
        if (enabled) connect();

        return () => {
            clearTimeout(timerRef.current);
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
            }
        };
    }, [connect, enabled]);
};

export default useSSE;