// src/components/NotificationToast.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
    FiX,
    FiShoppingBag,
    FiBell,
    FiPackage,
    FiSettings,
    FiCheckCircle,
} from "react-icons/fi";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { NOTIFICATION_TYPES } from "../services/notificationService";

const TYPE_CONFIG = {
    [NOTIFICATION_TYPES.ORDER_CREATED_PENDING]: {
        Icon: FiShoppingBag,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        accent: "border-l-indigo-500",
        progressColor: "bg-indigo-500",
        pingColor: "bg-indigo-400",
        dotColor: "bg-indigo-500",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PRODUCTION]: {
        Icon: FiSettings,
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
        accent: "border-l-orange-500",
        progressColor: "bg-orange-500",
        pingColor: "bg-orange-400",
        dotColor: "bg-orange-500",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PACKED]: {
        Icon: FiPackage,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        accent: "border-l-emerald-500",
        progressColor: "bg-emerald-500",
        pingColor: "bg-emerald-400",
        dotColor: "bg-emerald-500",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
    [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
        Icon: FiCheckCircle,
        iconBg: "bg-teal-100",
        iconColor: "text-teal-600",
        accent: "border-l-teal-500",
        progressColor: "bg-teal-500",
        pingColor: "bg-teal-400",
        dotColor: "bg-teal-500",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PRODUCTION]: {
        Icon: FiSettings,
        iconBg: "bg-orange-100",
        iconColor: "text-orange-600",
        accent: "border-l-orange-400",
        progressColor: "bg-orange-400",
        pingColor: "bg-orange-300",
        dotColor: "bg-orange-400",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PACKED]: {
        Icon: FiPackage,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        accent: "border-l-emerald-400",
        progressColor: "bg-emerald-400",
        pingColor: "bg-emerald-300",
        dotColor: "bg-emerald-400",
        route: (payload) => `/orders/${payload?.order_number}`,
    },
};

const getFallbackConfig = () => ({
    Icon: FiBell,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    accent: "border-l-slate-400",
    progressColor: "bg-slate-500",
    pingColor: "bg-slate-400",
    dotColor: "bg-slate-400",
    route: () => null,
});

const TOAST_DURATION_MS = 5_000;

const SingleToast = ({ toast }) => {
    const { markAsRead, dismissToast } = useNotifications();
    const navigate = useNavigate();

    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);

    const config = TYPE_CONFIG[toast.type] ?? getFallbackConfig();
    const { Icon } = config;

    // Countdown progress bar
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setProgress((p) => {
                if (p <= 0) { clearInterval(interval); return 0; }
                return p - (100 / (TOAST_DURATION_MS / 100));
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isPaused]);

    const handleClick = useCallback(() => {
        markAsRead(toast.notification_id);
        const route = config.route(toast.payload);
        if (route) navigate(route);
    }, [markAsRead, navigate, toast.notification_id, toast.payload, config]);

    return (
        <div
            className={`
                relative overflow-hidden w-80 bg-white rounded-2xl
                shadow-2xl border border-slate-200 border-l-4 ${config.accent}
                transition-all duration-300 hover:shadow-xl cursor-pointer
            `}
            style={{
                animation: "toastSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={handleClick}
            role="alert"
            aria-live="polite"
        >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100">
                <div
                    className={`h-full ${config.progressColor} transition-all duration-100`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-start gap-3 p-4 pt-5">
                {/* Icon */}
                <div
                    className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                    <Icon size={16} className={config.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                        {toast.title}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        {toast.message}
                    </p>

                    {toast.payload?.order_number && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-mono">
                                #{toast.payload.order_number}
                            </span>
                            {toast.payload?.priority && (
                                <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${toast.payload.priority === "HIGH"
                                        ? "bg-rose-50 text-rose-600 border border-rose-100"
                                        : toast.payload.priority === "MEDIUM"
                                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                        }`}
                                >
                                    {toast.payload.priority}
                                </span>
                            )}
                            {toast.payload?.order_status && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                    {toast.payload.order_status}
                                </span>
                            )}
                        </div>
                    )}

                    <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                        Click to view order
                    </p>
                </div>

                {/* Dismiss */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        dismissToast(toast.notification_id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0 cursor-pointer"
                    aria-label="Dismiss notification"
                >
                    <FiX size={13} />
                </button>
            </div>

            {/* Pulse ring */}
            <div className="absolute top-3 right-3 pointer-events-none">
                <span className="flex h-2.5 w-2.5">
                    <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pingColor} opacity-70`}
                    />
                    <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dotColor}`}
                    />
                </span>
            </div>
        </div>
    );
};

// NotificationToastStack — fixed portal rendering all active toasts
const NotificationToastStack = () => {
    const { toasts } = useNotifications();

    if (!toasts.length) return null;

    return (
        <>
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(110%) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0)   scale(1);   }
                }
            `}</style>

            <div
                className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none"
                aria-label="Notification toasts"
                aria-live="polite"
            >
                {toasts.map((toast) => (
                    <div key={toast.notification_id} className="pointer-events-auto">
                        <SingleToast toast={toast} />
                    </div>
                ))}
            </div>
        </>
    );
};

export default NotificationToastStack;