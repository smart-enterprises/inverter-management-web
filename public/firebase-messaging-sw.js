// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
    console.log("[SW] Installing - skipWaiting");
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[SW] Activated - claiming clients");
    event.waitUntil(clients.claim());
});

const firebaseConfig = {
    apiKey: "AIzaSyB25-Oiu7Gomu5AGvMXnV0sFw7G0Urxon8",
    authDomain: "smart-enterprises-d444b.firebaseapp.com",
    projectId: "smart-enterprises-d444b",
    storageBucket: "smart-enterprises-d444b.firebasestorage.app",
    messagingSenderId: "818545460753",
    appId: "1:818545460753:web:83237346fa2e84b93693b0",
};

let app;
try {
    app = firebase.app();
    console.log("[SW] Firebase app already initialized, reusing");
} catch {
    app = firebase.initializeApp(firebaseConfig);
    console.log("[SW] Firebase app initialized");
}

const messaging = firebase.messaging(app);

const TYPE_CONFIG = {
    ORDER_CREATED_PENDING: { icon: "/icons/order-pending.png", badge: "/icons/badge.png", tag: "order-pending" },
    ORDER_CREATED_PRODUCTION: { icon: "/icons/order-production.png", badge: "/icons/badge.png", tag: "order-production" },
    ORDER_CREATED_PACKED: { icon: "/icons/order-packed.png", badge: "/icons/badge.png", tag: "order-packed" },
    ORDER_CONFIRMED: { icon: "/icons/order-confirmed.png", badge: "/icons/badge.png", tag: "order-confirmed" },
    ORDER_STATUS_PRODUCTION: { icon: "/icons/order-production.png", badge: "/icons/badge.png", tag: "order-production" },
    ORDER_STATUS_PACKED: { icon: "/icons/order-packed.png", badge: "/icons/badge.png", tag: "order-packed" },
};

const getFallbackIcon = () => "/logo192.png";

messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Background FCM message received:", payload);

    const notificationTitle = payload.notification?.title
        ?? payload.data?.title
        ?? "New Notification";

    const notificationBody = payload.notification?.body
        ?? payload.data?.message
        ?? "";

    const data = payload.data ?? {};
    const notifType = data.type ?? "";

    let parsedPayload = {};
    try {
        parsedPayload = JSON.parse(data.payload || "{}");
    } catch (e) {
        console.warn("[SW] Failed to parse notification payload:", e.message);
    }

    const typeConf = TYPE_CONFIG[notifType] ?? {};
    const icon = typeConf.icon || getFallbackIcon();
    const badge = typeConf.badge || getFallbackIcon();
    const tag = typeConf.tag
        ? `${typeConf.tag}-${data.notification_id ?? Date.now()}`
        : `notif-${data.notification_id ?? Date.now()}`;

    const orderNumber = parsedPayload.order_number ?? data.order_number;

    const notificationOptions = {
        body: notificationBody,
        icon,
        badge,
        tag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200, 100, 200],
        data: {
            ...data,
            parsedPayload,
            order_number: orderNumber,
            notification_id: data.notification_id,
            url: orderNumber
                ? `${self.location.origin}/orders/${orderNumber}`
                : self.location.origin,
        },
        actions: orderNumber
            ? [
                { action: "view_order", title: "View Order", icon: "/icons/view.png" },
                { action: "dismiss", title: "Dismiss", icon: "/icons/close.png" },
            ]
            : [],
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
    );
});

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Notification clicked | action:", event.action, "| data:", event.notification.data);

    event.notification.close();

    if (event.action === "dismiss") return;

    const targetUrl = event.notification.data?.url ?? self.location.origin;

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.startsWith(self.location.origin) && "focus" in client) {
                        client.focus();
                        if ("navigate" in client) {
                            return client.navigate(targetUrl);
                        }
                        return client;
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

self.addEventListener("notificationclose", (event) => {
    console.log("[SW] Notification closed without click | tag:", event.notification.tag);
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    if (event.data?.type === "PING") {
        event.ports[0]?.postMessage({ type: "PONG" });
    }
});