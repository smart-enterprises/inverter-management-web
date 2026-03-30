// discountPermissions.js Code
import { ROLES } from "./roles";

export const DISCOUNT_CREATE_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
]);

export const canManageDiscounts = (role) =>
    DISCOUNT_CREATE_ROLES.includes(role);