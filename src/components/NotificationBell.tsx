// src/components/NotificationBell.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    FiBell,
    FiCheck,
    FiShoppingBag,
    FiChevronRight,
    FiCreditCard,
    FiTruck,
    FiPackage,
    FiSettings,
    FiCheckCircle,
    FiXCircle,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import {
    NormalizedNotification,
    NOTIFICATION_TYPES,
    NotificationType,
} from "../services/notificationServiceTypes";

const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;

    return `${Math.floor(hrs / 24)}d ago`;
};

type NotificationIcon = React.ComponentType<{
    size?: number;
    className?: string;
}>;

interface TypeStyle {
    Icon: NotificationIcon;
    iconBg: string;
    iconText: string;
}

const TYPE_STYLE: Partial<Record<NotificationType, TypeStyle>> = {
    [NOTIFICATION_TYPES.ORDER_CREATED_PENDING]: {
        Icon: FiShoppingBag,
        iconBg: "bg-indigo-100",
        iconText: "text-indigo-600",
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PRODUCTION]: {
        Icon: FiSettings,
        iconBg: "bg-orange-100",
        iconText: "text-orange-600",
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PACKED]: {
        Icon: FiPackage,
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-600",
    },
    [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
        Icon: FiCheckCircle,
        iconBg: "bg-teal-100",
        iconText: "text-teal-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PRODUCTION]: {
        Icon: FiSettings,
        iconBg: "bg-orange-100",
        iconText: "text-orange-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PACKED]: {
        Icon: FiPackage,
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_INVOICE]: {
        Icon: FiCreditCard,
        iconBg: "bg-cyan-100",
        iconText: "text-cyan-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_SHIPPED]: {
        Icon: FiTruck,
        iconBg: "bg-blue-100",
        iconText: "text-blue-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_DELIVERED]: {
        Icon: FiCheckCircle,
        iconBg: "bg-teal-100",
        iconText: "text-teal-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_COMPLETED]: {
        Icon: FiCheckCircle,
        iconBg: "bg-teal-100",
        iconText: "text-teal-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_CANCELLED]: {
        Icon: FiXCircle,
        iconBg: "bg-rose-100",
        iconText: "text-rose-600",
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_REJECTED]: {
        Icon: FiXCircle,
        iconBg: "bg-rose-100",
        iconText: "text-rose-600",
    },
};

const getTypeStyle = (type: NotificationType): TypeStyle => {
    return (
        TYPE_STYLE[type] ?? {
            Icon: FiBell,
            iconBg: "bg-slate-100",
            iconText: "text-slate-500",
        }
    );
};

interface NotificationItemProps {
    notification: NormalizedNotification;
    onNotificationClick: (notification: NormalizedNotification) => void;
}

const NotificationItem = React.memo(
    ({ notification, onNotificationClick }: NotificationItemProps) => {
        const { Icon, iconBg, iconText } = getTypeStyle(notification.type);

        return (
            <button
                type="button"
                onClick={() => onNotificationClick(notification)}
                className={`
          w-full flex items-start gap-3 px-4 py-3
          border-b border-slate-50 last:border-0
          text-left transition-colors duration-150 cursor-pointer
          ${!notification.is_read
                        ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                        : "hover:bg-slate-50"
                    }
        `}
            >
                <div
                    className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                >
                    <Icon size={13} className={iconText} />
                </div>

                <div className="flex-1 min-w-0">
                    <p
                        className={`text-xs leading-tight truncate ${!notification.is_read
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-600"
                            }`}
                    >
                        {notification.title}
                    </p>

                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                    </p>

                    <p className="text-[9px] text-slate-400 font-semibold mt-1">
                        {timeAgo(notification.created_at)}
                    </p>
                </div>

                {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                )}
            </button>
        );
    },
);

NotificationItem.displayName = "NotificationItem";

const NotificationBell = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        isLoading,
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isOpen) return;

        const handler = (event: MouseEvent): void => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, [isOpen]);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const handleNotificationClick = useCallback(
        async (notification: NormalizedNotification): Promise<void> => {
            if (!notification.is_read) {
                await markAsRead(notification.notification_id);
            }

            setIsOpen(false);

            if (notification.payload?.order_number) {
                navigate(`/orders/${notification.payload.order_number}`);
            }
        },
        [markAsRead, navigate],
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className={`
          relative w-9 h-9 flex items-center justify-center cursor-pointer
          rounded-xl border transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
          ${isOpen
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600"
                    }
        `}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""
                    }`}
            >
                <FiBell size={15} />

                {unreadCount > 0 && (
                    <>
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black ring-2 ring-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>

                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-400 animate-ping opacity-60 pointer-events-none" />
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Notifications panel"
                    className="absolute right-0 top-[calc(100%+10px)] w-80 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] z-50 overflow-hidden"
                    style={{
                        animation:
                            "nb-dropdown-in 160ms cubic-bezier(0.4,0,0.2,1) forwards",
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                Notifications
                            </p>

                            {unreadCount > 0 && (
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAllAsRead()}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all cursor-pointer"
                            >
                                <FiCheck size={10} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
                                <FiBell size={24} className="opacity-30" />
                                <p className="text-xs font-semibold">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.notification_id}
                                    notification={notification}
                                    onNotificationClick={(item) =>
                                        void handleNotificationClick(item)
                                    }
                                />
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                            <button
                                type="button"
                                onClick={() => {
                                    navigate("/orders");
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                            >
                                View all orders <FiChevronRight size={11} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
