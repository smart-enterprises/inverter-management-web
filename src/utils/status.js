export const ORDER_STATUS_LIST = [
    'ALL',
    'PENDING',
    'CONFIRMED',
    'PRODUCTION',
    'PACKED',
    'INVOICE',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
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
        PENDING: "bg-yellow-50 text-yellow-700",
        CONFIRMED: "bg-blue-50 text-blue-700",
        PRODUCTION: "bg-indigo-50 text-indigo-700",
        PACKED: "bg-purple-50 text-purple-700",
        INVOICE: "bg-cyan-50 text-cyan-700",
        SHIPPED: "bg-orange-50 text-orange-700",
        DELIVERED: "bg-green-50 text-green-700",
        COMPLETED: "bg-emerald-50 text-emerald-700",
        CANCELLED: "bg-red-50 text-red-700",
        REJECTED: "bg-red-50 text-red-700",
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