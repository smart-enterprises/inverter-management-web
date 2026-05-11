/* global importScripts, firebase, clients */
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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

const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging(app);

const NOTIFICATION_CONFIG = {
    ORDER_CREATED_PENDING: { tag: "order-created-pending" },
    ORDER_CREATED_PRODUCTION: { tag: "order-created-production" },
    ORDER_CREATED_PACKED: { tag: "order-created-packed" },
    ORDER_CONFIRMED: { tag: "order-confirmed" },
    ORDER_STATUS_PRODUCTION: { tag: "order-production" },
    ORDER_STATUS_PACKED: { tag: "order-packed" },
    ORDER_STATUS_INVOICE: { tag: "order-invoice" },
    ORDER_STATUS_SHIPPED: { tag: "order-shipped" },
    ORDER_STATUS_DELIVERED: { tag: "order-delivered" },
    ORDER_STATUS_COMPLETED: { tag: "order-completed" },
    ORDER_STATUS_CANCELLED: { tag: "order-cancelled" },
    ORDER_STATUS_REJECTED: { tag: "order-rejected" },
};

const APP_ICON = "/logo.png";
const APP_BADGE = "/logo.png";

const safeJsonParse = (value, fallback = {}) => {
    if (typeof value !== "string") return fallback;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const resolveNotificationData = (payload) => {
    const data = payload.data || {};
    const legacyPayload = safeJsonParse(data.payload);
    const merged = {
        ...data,
        ...legacyPayload,
    };

    const orderNumber = merged.order_number || data.order_number || null;
    const notificationId =
        data.notification_id ||
        [data.type, orderNumber, data.status, data.created_at, Date.now()]
            .filter(Boolean)
            .join(":");

    return {
        data: merged,
        orderNumber,
        notificationId,
        targetUrl: orderNumber
            ? `${self.location.origin}/orders/${orderNumber}`
            : `${self.location.origin}/dashboard`,
    };
};

messaging.onBackgroundMessage((payload) => {
    const { data, orderNumber, notificationId, targetUrl } =
        resolveNotificationData(payload);

    const typeConfig = NOTIFICATION_CONFIG[data.type] || {};
    const title = payload.notification?.title || data.title || "Smart Enterprises";
    const body = payload.notification?.body || data.body || data.message || "";

    const notificationData = {
        ...data,
        order_number: orderNumber,
        notification_id: notificationId,
        url: targetUrl,
    };

    clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windowClients) => {
            windowClients.forEach((client) => {
                client.postMessage({
                    type: "FCM_BACKGROUND_NOTIFICATION",
                    notification: {
                        notification_id: notificationId,
                        type: data.type,
                        title,
                        message: body,
                        payload: notificationData,
                        created_at: data.created_at || new Date().toISOString(),
                        is_read: false,
                    },
                });
            });
        });

    self.registration.showNotification(title, {
        body,
        icon: APP_ICON,
        badge: APP_BADGE,
        tag: `${typeConfig.tag || "notification"}-${notificationId}`,
        renotify: true,
        requireInteraction: false,
        silent: false,
        data: notificationData,
        actions: orderNumber
            ? [
                {
                    action: "view_order",
                    title: "View order",
                },
                {
                    action: "dismiss",
                    title: "Dismiss",
                },
            ]
            : [],
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const targetUrl = event.notification.data?.url || `${self.location.origin}/dashboard`;

    event.waitUntil(
        clients
            .matchAll({
                type: "window",
                includeUncontrolled: true,
            })
            .then((windowClients) => {
                const existingClient = windowClients.find(
                    (client) =>
                        client.url.startsWith(self.location.origin) && "focus" in client,
                );

                if (existingClient) {
                    existingClient.focus();

                    if ("navigate" in existingClient) {
                        return existingClient.navigate(targetUrl);
                    }

                    return existingClient;
                }

                return clients.openWindow(targetUrl);
            }),
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    if (event.data?.type === "PING") {
        event.ports[0]?.postMessage({ type: "PONG" });
    }
});
