// routes/routePermissions.js

import { matchPath } from "react-router-dom";
import { ROLES } from "../utils/roles";

export const ROUTE_PERMISSIONS = {
  "/users": [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],

  "/dealers": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.SALESMAN,
  ],

  "/products": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
  ],

  "/brands": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
  ],

  "/orders": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
  ],

  "/orders/:id": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
  ],

  "/orders/update/:id": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.ACCOUNTS,
    ROLES.DELIVERY,
    ROLES.SUPERVISOR
  ],

  "/delivery": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.ACCOUNTS,
    ROLES.DELIVERY,
  ],

  "/billing": [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.ACCOUNTS,
    ROLES.DELIVERY,
  ],
};

export const getAllowedRoles = (pathname) => {
  for (const route in ROUTE_PERMISSIONS) {
    const match = matchPath({ path: route, end: true }, pathname);
    if (match) {
      return ROUTE_PERMISSIONS[route];
    }
  }
  return null;
};