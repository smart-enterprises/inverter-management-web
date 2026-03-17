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
        editableFields: ["priority"],
        viewOnly: true,
    },

    [ROLES.PRODUCTION]: {
        editableDetailFields: ["has_production_completed", "delivery_date"],
        viewOnly: true,
    },

    [ROLES.PACKING]: {
        editableDetailFields: ["has_unPacked_completed", "delivery_date"],
        viewOnly: true,
    },

    [ROLES.ACCOUNTS]: {
        editableFields: ["payment_method", "amount_paid"],
        viewOnly: true,
    },

    [ROLES.DELIVERY]: {
        editableFields: ["status"], // only allow DELIVERED
        editableDetailFields: ["delivered_qty"],
        restrictStatusToDelivered: true,
        viewOnly: true,
    },
};