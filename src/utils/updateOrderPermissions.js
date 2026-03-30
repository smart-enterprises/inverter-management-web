// updateOrderPermissions.js Code
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
            "priority",
            "delivery_date",
            "delivery_note",
            "promised_delivery_date",
        ],
    },

    [ROLES.PRODUCTION]: {
        viewOnly: true,
        editableDetailFields: [
            "has_production_completed",
            "delivery_date",
            "promised_delivery_date",
            "delivery_note",
        ],
    },

    [ROLES.PACKING]: {
        viewOnly: true,
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
            "payment_method",
            "amount_paid",
            "promised_delivery_date",
            "delivery_date",
            "delivery_note",
        ],
    },

    [ROLES.DELIVERY]: {
        viewOnly: true,
        editableFields: ["status"],
        editableDetailFields: ["delivered_qty"],
        restrictStatusToDelivered: true,
    },
};