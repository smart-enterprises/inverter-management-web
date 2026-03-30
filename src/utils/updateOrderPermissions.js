// utils/updateOrderPermissions.js

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
        editableFields: ["priority", "delivery_date", "delivery_note", "promised_delivery_date"],
        viewOnly: true,
    },

    [ROLES.PRODUCTION]: {
        editableDetailFields: ["has_production_completed", "delivery_date", "promised_delivery_date", "delivery_note"],
        viewOnly: true,
    },

    [ROLES.PACKING]: {
        editableDetailFields: ["has_unPacked_completed", "delivery_date", "promised_delivery_date", "delivery_note"],
        viewOnly: true,
    },

    [ROLES.ACCOUNTS]: {
        editableFields: ["payment_method", "amount_paid", "promised_delivery_date", "delivery_date", "delivery_note"],
        viewOnly: true,
    },

    [ROLES.DELIVERY]: {
        editableFields: ["status"], // only allow DELIVERED
        editableDetailFields: ["delivered_qty"],
        restrictStatusToDelivered: true,
        viewOnly: true,
    },
};