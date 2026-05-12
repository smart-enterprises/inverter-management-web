// src/components/NotificationBanner.jsx

import useNotifications from "../hooks/useNotifications";

const BANNER_MESSAGES = {
    "permission-denied": {
        icon: "🔕",
        text: "Notifications are blocked for this site.",
        guide: `To fix: click the 🔒 icon in your browser's address bar → 
                Site Settings → Notifications → Allow, then refresh.`,
    },
    "brave-shields": {
        icon: "🛡️",
        text: "Brave Shields is blocking push notifications.",
        guide: `To fix: click the Shields icon (🦁) in the address bar, 
                lower Shields for this site, then refresh.`,
    },
    "push-service-error": {
        icon: "⚠️",
        text: "Push notifications couldn't connect.",
        guide: "Your network may be blocking fcm.googleapis.com. Try a different network or contact your IT team.",
    },
};

const NotificationBanner = () => {
    const { pushBlocked, pushBlockedReason } = useNotifications();

    if (!pushBlocked || !pushBlockedReason) return null;

    const { icon, text, guide } = BANNER_MESSAGES[pushBlockedReason] ?? {
        icon: "⚠️",
        text: "Push notifications are unavailable.",
        guide: "Please check your browser settings.",
    };

    return (
        <div
            role="alert"
            style={{
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: 6,
                padding: "10px 16px",
                margin: "8px 0",
                fontSize: 14,
            }}
        >
            <strong>{icon} {text}</strong>
            <p style={{ margin: "4px 0 0", color: "#555" }}>{guide}</p>
        </div>
    );
};

export default NotificationBanner;