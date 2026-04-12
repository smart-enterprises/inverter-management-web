import { ROLES } from "./roles";

// Who can print / download PDF of an order
export const ORDER_PRINT_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.ACCOUNTS,
]);

// Who can create orders
export const ORDER_CREATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
]);

// Who sees price info on orders
export const ORDER_PRICE_HIDDEN_ROLES = Object.freeze([
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.DELIVERY,
]);

// Who sees dealer information on orders
export const ORDER_DEALER_INFORMATION_HIDDEN_ROLES = Object.freeze([
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.DELIVERY,
]);

export const canPrintOrder = (role) => ORDER_PRINT_ROLES.includes(role);
export const canCreateOrder = (role) => ORDER_CREATE_ROLES.includes(role);
export const canViewOrderPrice = (role) => !ORDER_PRICE_HIDDEN_ROLES.includes(role);
export const canViewDealerInformation = (role) => !ORDER_DEALER_INFORMATION_HIDDEN_ROLES.includes(role);