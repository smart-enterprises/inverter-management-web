import { ROLES } from "./roles";

// Who can create/edit products
export const PRODUCT_CREATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
]);

export const PRODUCT_EDIT_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
]);

// Who can update PACKED stock (Packing-style)
export const PRODUCT_PACKED_STOCK_UPDATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.PACKING,
]);

// Who can update UNPACKED stock (Production-style)
export const PRODUCT_UNPACKED_STOCK_UPDATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.PRODUCTION,
]);

// Anyone who can update either form of stock
export const PRODUCT_STOCK_UPDATE_ROLES = Object.freeze([
    ...new Set([
        ...PRODUCT_PACKED_STOCK_UPDATE_ROLES,
        ...PRODUCT_UNPACKED_STOCK_UPDATE_ROLES,
    ]),
]);

// Who CANNOT see price information
export const PRICE_HIDDEN_ROLES = Object.freeze([
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.DELIVERY,
]);

// Who CANNOT see cost information
export const COST_HIDDEN_ROLES = Object.freeze([
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.DELIVERY,
    ROLES.MANAGER,
    ROLES.ACCOUNTS,
    ROLES.SALESMAN,
]);

export const canCreateProduct = (role) => PRODUCT_CREATE_ROLES.includes(role);
export const canEditProduct = (role) => PRODUCT_EDIT_ROLES.includes(role);
export const canUpdateProductStock = (role) => PRODUCT_STOCK_UPDATE_ROLES.includes(role);
export const canUpdatePackedStock = (role) => PRODUCT_PACKED_STOCK_UPDATE_ROLES.includes(role);
export const canUpdateUnpackedStock = (role) => PRODUCT_UNPACKED_STOCK_UPDATE_ROLES.includes(role);
export const canViewProductPrice = (role) => !PRICE_HIDDEN_ROLES.includes(role);
export const canViewProductCost = (role) => !COST_HIDDEN_ROLES.includes(role);