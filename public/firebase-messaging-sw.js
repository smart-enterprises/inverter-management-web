// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
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

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Background FCM message received:", payload);

    const notificationTitle = payload.notification?.title ?? "New Notification";
    const notificationBody = payload.notification?.body ?? "";
    const data = payload.data ?? {};

    let parsedPayload = {};
    try {
        parsedPayload = JSON.parse(data.payload || "{}");
    } catch (_) { /* ignore JSON parse errors */ }

    self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: data.notification_id ?? `notif-${Date.now()}`,
        data: { ...data, parsedPayload },
        requireInteraction: false,
        vibrate: [200, 100, 200],
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const orderNumber = event.notification.data?.parsedPayload?.order_number;
    const urlToOpen = orderNumber
        ? `${self.location.origin}/orders/${orderNumber}`
        : self.location.origin;

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.startsWith(self.location.origin) && "focus" in client) {
                        client.focus();
                        client.navigate(urlToOpen);
                        return;
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});