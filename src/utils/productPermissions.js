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

// Who can update stock
export const PRODUCT_STOCK_UPDATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.PRODUCTION,
    ROLES.PACKING,
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
]);

export const canCreateProduct = (role) => PRODUCT_CREATE_ROLES.includes(role);
export const canEditProduct = (role) => PRODUCT_EDIT_ROLES.includes(role);
export const canUpdateProductStock = (role) => PRODUCT_STOCK_UPDATE_ROLES.includes(role);
export const canViewProductPrice = (role) => !PRICE_HIDDEN_ROLES.includes(role);
export const canViewProductCost = (role) => !COST_HIDDEN_ROLES.includes(role);