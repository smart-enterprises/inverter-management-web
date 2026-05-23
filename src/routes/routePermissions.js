// routePermissions.js code 
import { matchPath } from "react-router-dom";
import { ROLES } from "../utils/roles";

export const ROUTE_PERMISSIONS = {
  "/dashboard": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.ACCOUNTS, ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING, ROLES.DELIVERY,
  ],

  "/users": [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
  "/users/:id": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING,
    ROLES.ACCOUNTS, ROLES.DELIVERY, ROLES.DEALER,
  ],

  "/dealers": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN, ROLES.ACCOUNTS,
  ],
  "/dealers/:id": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN, ROLES.ACCOUNTS,
  ],

  "/products": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS,
  ],
  "/products/:id": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS,
  ],

  "/brands": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS,
  ],

  "/orders": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING,
    ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  "/orders/create": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN,
  ],
  "/orders/:id": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING,
    ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  "/orders/update/:id": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING,
    ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],

  "/delivery": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING,
    ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],

  "/production-summary": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.PRODUCTION, ROLES.PACKING,
  ],

  "/billing": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
    ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  "/purchase-analytics": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
  ],
  "/analytics": [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER,
  ],
};

export const getAllowedRoles = (pathname) => {
  const staticRoutes = [
    "/orders/create",
    "/orders/update/:id",
    "/orders/:id",
    "/users/:id",
    "/dealers/:id",
    "/products/:id",
    "/delivery"
  ];

  for (const route of staticRoutes) {
    const match = matchPath({ path: route, end: true }, pathname);
    if (match) return ROUTE_PERMISSIONS[route] ?? null;
  }

  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    if (staticRoutes.includes(route)) continue;
    const match = matchPath({ path: route, end: true }, pathname);
    if (match) return ROUTE_PERMISSIONS[route] ?? null;
  }

  return null;
};

export const isRouteAllowed = (role, pathname) => {
  const allowed = getAllowedRoles(pathname);
  if (allowed === null) return true;
  return allowed.includes(role);
};