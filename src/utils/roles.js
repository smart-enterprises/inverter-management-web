export const ROLES = {
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
};

export const ROLE_LABELS = {
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
};

const ASSIGNABLE_ROLE_ORDER = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.SUPERVISOR,
  ROLES.SALESMAN,
  ROLES.PRODUCTION,
  ROLES.PACKING,
  ROLES.ACCOUNTS,
  ROLES.DELIVERY,
];

export const getRoleLabel = (role) => ROLE_LABELS[role] || role || '';

export const canManageUsers = (currentRole) =>
  [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(currentRole);

export const canManageTargetRole = (currentRole, targetRole) => {
  if (!canManageUsers(currentRole)) return false;
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(currentRole)) return true;
  if (currentRole === ROLES.MANAGER) {
    return ![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(targetRole);
  }
  return false;
};

export const getAssignableRoles = (currentRole) => {
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(currentRole)) {
    return ASSIGNABLE_ROLE_ORDER;
  }
  if (currentRole === ROLES.MANAGER) {
    return ASSIGNABLE_ROLE_ORDER.filter(
      (role) => ![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(role)
    );
  }
  return [];
};
