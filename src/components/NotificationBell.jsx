// src/components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from "react";
import { FiBell, FiCheck, FiShoppingBag, FiChevronRight } from "react-icons/fi";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
        useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    const handleNotifClick = (notif) => {
        if (!notif.is_read) markAsRead(notif.notification_id);
        setIsOpen(false);
        if (notif.payload?.order_number) {
            navigate(`/orders/${notif.payload.order_number}`);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                type="button"
                onClick={() => setIsOpen((p) => !p)}
                className={`
          relative w-9 h-9 flex items-center justify-center
          rounded-xl border transition-all duration-200
          ${isOpen
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600"
                    }
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
        `}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
                <FiBell size={15} />

                {unreadCount > 0 && (
                    <>
                        {/* Badge */}
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black ring-2 ring-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                        {/* Pulse ring */}
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-400 animate-ping opacity-60 pointer-events-none" />
                    </>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    className="absolute right-0 top-[calc(100%+10px)] w-80 bg-white rounded-2xl border border-slate-200 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] z-50 overflow-hidden"
                    style={{ animation: "nb-dropdown-in 160ms cubic-bezier(0.4,0,0.2,1) forwards" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                        <div>
                            <p className="text-sm font-bold text-slate-900">Notifications</p>
                            {unreadCount > 0 && (
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all"
                            >
                                <FiCheck size={10} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
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
                            notifications.map((notif) => (
                                <button
                                    key={notif.notification_id}
                                    type="button"
                                    onClick={() => handleNotifClick(notif)}
                                    className={`
                                        w-full flex items-start gap-3 px-4 py-3
                                        border-b border-slate-50 last:border-0
                                        text-left transition-colors duration-150
                                        ${!notif.is_read
                                            ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                                            : "hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    {/* Icon */}
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <FiShoppingBag size={13} className="text-indigo-600" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-xs leading-tight truncate ${!notif.is_read
                                                ? "font-bold text-slate-900"
                                                : "font-semibold text-slate-600"
                                                }`}
                                        >
                                            {notif.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                            {timeAgo(notif.created_at)}
                                        </p>
                                    </div>

                                    {/* Unread dot */}
                                    {!notif.is_read && (
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                            <button
                                onClick={() => { navigate("/orders"); setIsOpen(false); }}
                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
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