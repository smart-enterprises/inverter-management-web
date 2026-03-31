import { ROLES } from "./roles";

export const UPDATE_ORDER_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: {
        canEditAll: true,
    },

    [ROLES.ADMIN]: {
        canEditAll: true,
    },

    [ROLES.MANAGER]: {
        canEditAll: true,
    },

    [ROLES.SALESMAN]: {
        viewOnly: true,
        editableFields: [
            "delivery_date",
            "delivery_note",
            "promised_delivery_date",
        ],
        // priority is NOT in the spec for salesman — remove it
    },

    [ROLES.PRODUCTION]: {
        viewOnly: true,
        // Can update when "Production Completed" flag is set
        editableDetailFields: [
            "has_production_completed",
            "delivery_date",
            "promised_delivery_date",
            "delivery_note",
        ],
    },

    [ROLES.PACKING]: {
        viewOnly: true,
        // Can update when "Unpacked Completed" flag is set
        editableDetailFields: [
            "has_unPacked_completed",
            "delivery_date",
            "promised_delivery_date",
            "delivery_note",
        ],
    },

    [ROLES.ACCOUNTS]: {
        viewOnly: true,
        editableFields: [
            "amount_paid",
            "payment_method",
            "status",           // only INVOICE or SHIPPED (enforced below)
        ],
        // Condition: all items must be PACKED — enforce this in the UI
        allowedStatuses: ["INVOICE", "SHIPPED"],
        requireAllItemsPacked: true,
    },

    [ROLES.DELIVERY]: {
        viewOnly: true,
        editableFields: ["status"],
        editableDetailFields: ["delivered_qty"],
        allowedStatuses: ["DELIVERED"],
        restrictStatusToDelivered: true,  // only DELIVERED
        hidePrice: true,
    },
};