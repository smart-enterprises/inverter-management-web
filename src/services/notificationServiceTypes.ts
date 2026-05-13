export const NOTIFICATION_TYPES = Object.freeze({
    ORDER_CREATED_PENDING: "ORDER_CREATED_PENDING",
    ORDER_CREATED_PRODUCTION: "ORDER_CREATED_PRODUCTION",
    ORDER_CREATED_PACKED: "ORDER_CREATED_PACKED",
    ORDER_CONFIRMED: "ORDER_CONFIRMED",
    ORDER_STATUS_PRODUCTION: "ORDER_STATUS_PRODUCTION",
    ORDER_STATUS_PRODUCTION_COMPLETED: "ORDER_STATUS_PRODUCTION_COMPLETED",
    ORDER_STATUS_PACKED: "ORDER_STATUS_PACKED",
    ORDER_STATUS_INVOICE: "ORDER_STATUS_INVOICE",
    ORDER_STATUS_SHIPPED: "ORDER_STATUS_SHIPPED",
    ORDER_STATUS_DELIVERED: "ORDER_STATUS_DELIVERED",
    ORDER_STATUS_COMPLETED: "ORDER_STATUS_COMPLETED",
    ORDER_STATUS_CANCELLED: "ORDER_STATUS_CANCELLED",
    ORDER_STATUS_REJECTED: "ORDER_STATUS_REJECTED",
} as const);

export type NotificationType =
    (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export interface NotificationPayload {
    readonly type?: NotificationType;
    readonly order_number?: string;
    readonly status?: string;
    readonly priority?: string;
    readonly dealer_name?: string;
    readonly triggered_by_name?: string;
    readonly click_action?: string;
    readonly created_at?: string;
    readonly [key: string]: unknown;
}

export interface NormalizedNotification {
    readonly notification_id: string;
    readonly type: NotificationType;
    readonly title: string;
    readonly message: string;
    readonly payload: NotificationPayload;
    readonly created_at: string;
    is_read: boolean;
}

export interface NotificationConfigEntry {
    readonly label: string;
    readonly icon: string;
    readonly soundAlert: boolean;
    readonly systemNotif: boolean;
}

export type NotificationConfigMap = Readonly<
    Record<NotificationType, NotificationConfigEntry>
>;

export const NOTIFICATION_CONFIG: NotificationConfigMap = Object.freeze({
    [NOTIFICATION_TYPES.ORDER_CREATED_PENDING]: {
        label: "New Pending Order",
        icon: "Order",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PRODUCTION]: {
        label: "New Production Order",
        icon: "Production",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CREATED_PACKED]: {
        label: "New Packed Order",
        icon: "Packed",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
        label: "Order Confirmed",
        icon: "Confirmed",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PRODUCTION]: {
        label: "Production Started",
        icon: "Production",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PRODUCTION_COMPLETED]: {
        label: "Production Completed",
        icon: "Production Completed",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_PACKED]: {
        label: "Packing Completed",
        icon: "Packed",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_INVOICE]: {
        label: "Invoice Generated",
        icon: "Invoice",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_SHIPPED]: {
        label: "Order Shipped",
        icon: "Shipped",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_DELIVERED]: {
        label: "Order Delivered",
        icon: "Delivered",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_COMPLETED]: {
        label: "Order Completed",
        icon: "Completed",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_CANCELLED]: {
        label: "Order Cancelled",
        icon: "Cancelled",
        soundAlert: true,
        systemNotif: true,
    },
    [NOTIFICATION_TYPES.ORDER_STATUS_REJECTED]: {
        label: "Order Rejected",
        icon: "Rejected",
        soundAlert: true,
        systemNotif: true,
    },
});

export const isNotificationType = (value: unknown): value is NotificationType =>
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(NOTIFICATION_CONFIG, value);
