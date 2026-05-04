// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: self.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: self.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: self.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: self.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
    appId: self.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Background FCM message received:", payload);

    const { title, body } = payload.notification ?? {};
    const data = payload.data ?? {};

    let parsedPayload = {};
    try {
        parsedPayload = JSON.parse(data.payload || "{}");
    } catch (_) { }

    self.registration.showNotification(title ?? "New Notification", {
        body: body ?? "",
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