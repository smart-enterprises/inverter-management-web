/* ============================================================
   ROLE CONSTANTS
============================================================ */

export const ROLES = Object.freeze({
    SUPER_ADMIN: 'ROLE_SUPER_ADMIN',
    ADMIN: 'ROLE_ADMIN',
    MANAGER: 'ROLE_MANAGER',
    SUPERVISOR: 'ROLE_SUPERVISOR',
    SALESMAN: 'ROLE_SALESMAN',
    PRODUCTION: 'ROLE_PRODUCTION',
    PACKING: 'ROLE_PACKING',
    ACCOUNTS: 'ROLE_ACCOUNTS',
    DELIVERY: 'ROLE_DELIVERY',
    DEALER: 'ROLE_DEALER',
});

/* ============================================================
   ROLE LABELS
============================================================ */

export const ROLE_LABELS = Object.freeze({
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.MANAGER]: 'Manager',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.SALESMAN]: 'Salesman',
    [ROLES.PRODUCTION]: 'Production',
    [ROLES.PACKING]: 'Packing',
    [ROLES.ACCOUNTS]: 'Accounts',
    [ROLES.DELIVERY]: 'Delivery',
    [ROLES.DEALER]: 'Dealer',
});

/* ============================================================
   ROLE GROUPINGS
============================================================ */

// Roles that can manage users
export const USER_MANAGEMENT_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
]);

// Roles allowed to select salesman in order creation
export const SALESMAN_SELECTION_ROLES = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
]);

// Assignable role order (Hierarchy)
const ASSIGNABLE_ROLE_ORDER = Object.freeze([
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SALESMAN,
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.ACCOUNTS,
    ROLES.DELIVERY,
]);

/* ============================================================
   ROLE HELPERS
============================================================ */

export const getRoleLabel = (role) =>
    ROLE_LABELS[role] || role || '';

export const canManageUsers = (currentRole) =>
    USER_MANAGEMENT_ROLES.includes(currentRole);

export const canSelectSalesman = (currentRole) =>
    SALESMAN_SELECTION_ROLES.includes(currentRole);

export const canManageTargetRole = (currentRole, targetRole) => {
    if (!canManageUsers(currentRole)) return false;

    if (
        currentRole === ROLES.SUPER_ADMIN ||
        currentRole === ROLES.ADMIN
    ) {
        return true;
    }

    if (currentRole === ROLES.MANAGER) {
        return !USER_MANAGEMENT_ROLES.includes(targetRole);
    }

    return false;
};

export const getAssignableRoles = (currentRole) => {
    if (
        currentRole === ROLES.SUPER_ADMIN ||
        currentRole === ROLES.ADMIN
    ) {
        return ASSIGNABLE_ROLE_ORDER;
    }

    if (currentRole === ROLES.MANAGER) {
        return ASSIGNABLE_ROLE_ORDER.filter(
            (role) => !USER_MANAGEMENT_ROLES.includes(role)
        );
    }

    return [];
};