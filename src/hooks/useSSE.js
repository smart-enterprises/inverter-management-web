// src/hooks/useSSE.js
import { useEffect, useRef, useCallback } from "react";
import { API_BASE_URL, getAuthHeaders } from "../api/apiClient";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

// useSSE - subscribes to a Server-Sent Events endpoint.
// @param {string} endpoint  - e.g. "/notifications/stream"
// @param {Object} handlers  - { eventName: handlerFn }
// @param {boolean} enabled  - only connect when true (e.g. user is logged in)
const useSSE = (endpoint, handlers, enabled = true) => {
    const esRef = useRef(null);
    const attemptsRef = useRef(0);
    const handlersRef = useRef(handlers);
    const timerRef = useRef(null);

    // Keep handlers ref fresh without triggering re-subscriptions
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const connect = useCallback(() => {
        if (!enabled) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        // Close any existing connection cleanly
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }

        // SSE must pass the token as a query param because EventSource doesn't support custom headers
        const url = `${API_BASE_URL}${endpoint}?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => {
            attemptsRef.current = 0; // reset backoff on successful connect
        };

        es.onerror = () => {
            es.close();
            esRef.current = null;

            if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                console.warn("[SSE] Max reconnect attempts reached. Giving up.");
                return;
            }

            const delay = Math.min(
                RECONNECT_DELAY_MS * Math.pow(1.5, attemptsRef.current),
                30000
            );
            attemptsRef.current += 1;

            timerRef.current = setTimeout(connect, delay);
        };

        // Register named event listeners from the handlers map
        Object.entries(handlersRef.current).forEach(([eventName, handler]) => {
            es.addEventListener(eventName, (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handler(data);
                } catch (err) {
                    console.error(`[SSE] Failed to parse event "${eventName}":`, err);
                }
            });
        });
    }, [endpoint, enabled]);

    useEffect(() => {
        if (enabled) {
            connect();
        }

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