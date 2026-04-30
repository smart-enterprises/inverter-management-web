import { ROLE_LABELS, ROLES } from "./roles";

export const ORDER_STATUSES = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    PRODUCTION: "PRODUCTION",
    PACKED: "PACKED",
    INVOICE: "INVOICE",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    COMPLETED: "COMPLETED",

    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED"
};

export const ORDER_STATUS_LIST = [
    'ALL',
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.PRODUCTION,
    ORDER_STATUSES.PACKED,
    ORDER_STATUSES.INVOICE,
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.COMPLETED,
    ORDER_STATUSES.CANCELLED,
    ORDER_STATUSES.REJECTED
];

export const PRIORITY_OPTIONS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

export const PAYMENT_METHOD_OPTIONS = [
    'CASH',
    'CARD',
    'UPI',
    'CHEQUE',
    'BANK_TRANSFER'
];

// 🔹 UPDATED: Centralized status style system (enterprise-safe)
export const getStatusStyle = (status) => {
    const normalized = status?.toUpperCase();

    const statusMap = {
        [ORDER_STATUSES.PENDING]: "bg-yellow-50 text-yellow-700",
        [ORDER_STATUSES.CONFIRMED]: "bg-blue-50 text-blue-700",
        [ORDER_STATUSES.PRODUCTION]: "bg-indigo-50 text-indigo-700",
        [ORDER_STATUSES.PACKED]: "bg-purple-50 text-purple-700",
        [ORDER_STATUSES.INVOICE]: "bg-cyan-50 text-cyan-700",
        [ORDER_STATUSES.SHIPPED]: "bg-orange-50 text-orange-700",
        [ORDER_STATUSES.DELIVERED]: "bg-green-50 text-green-700",
        [ORDER_STATUSES.COMPLETED]: "bg-emerald-50 text-emerald-700",

        [ORDER_STATUSES.CANCELLED]: "bg-red-50 text-red-700",
        [ORDER_STATUSES.REJECTED]: "bg-red-50 text-red-700",
    };

    return statusMap[normalized] || "bg-gray-50 text-gray-700";
};

// 🔹 UPDATED: Priority Style System
export const getPriorityStyle = (priority) => {
    const normalized = priority?.toUpperCase();

    const priorityMap = {
        HIGH: "bg-red-50 text-red-700",
        MEDIUM: "bg-yellow-50 text-yellow-700",
        LOW: "bg-green-50 text-green-700",
    };

    return priorityMap[normalized] || "bg-gray-50 text-gray-700";
};

export const ALLOWED_TRANSITIONS = {
    [ORDER_STATUSES.PENDING]: [
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.REJECTED
    ],

    [ORDER_STATUSES.CONFIRMED]: [
        ORDER_STATUSES.PRODUCTION,
        ORDER_STATUSES.PACKED,
        ORDER_STATUSES.CANCELLED
    ],

    [ORDER_STATUSES.PRODUCTION]: [
        ORDER_STATUSES.PACKED,
        ORDER_STATUSES.CANCELLED
    ],

    [ORDER_STATUSES.PACKED]: [
        ORDER_STATUSES.INVOICE,
        ORDER_STATUSES.CANCELLED
    ],

    [ORDER_STATUSES.INVOICE]: [
        ORDER_STATUSES.SHIPPED
    ],

    [ORDER_STATUSES.SHIPPED]: [
        ORDER_STATUSES.DELIVERED
    ],

    [ORDER_STATUSES.DELIVERED]: [
        ORDER_STATUSES.COMPLETED
    ],

    [ORDER_STATUSES.COMPLETED]: [],

    [ORDER_STATUSES.CANCELLED]: [],
    [ORDER_STATUSES.REJECTED]: []
};

export const getRoleBasedStatusOptions = (role) => {

    switch (role) {

        // case ROLES.PRODUCTION:
        //     return [
        //         ORDER_STATUSES.PRODUCTION,
        //         ORDER_STATUSES.PACKED
        //     ];

        // case ROLES.PACKING:
        //     return [
        //         ORDER_STATUSES.PRODUCTION,
        //         ORDER_STATUSES.PACKED
        //     ];

        default:
            return ORDER_STATUS_LIST;
    }
};

export const getFilteredStatusOptions = (role) => {
    const raw = getRoleBasedStatusOptions(role);
    // Remove "CONFIRM" if present (it's not a valid status)
    return raw.filter((s) => s !== ORDER_STATUSES.CONFIRMED);
};