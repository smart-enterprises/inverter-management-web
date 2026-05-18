import { ROLES } from "./roles";

// What each role can see on the dashboard
export const DASHBOARD_SECTIONS = Object.freeze({
    STATS_USERS: "STATS_USERS",         // admin/salesman counts
    STATS_ORDERS: "STATS_ORDERS",        // total orders count
    STATS_DEALERS: "STATS_DEALERS",      // dealer count
    BUSINESS_METRICS: "BUSINESS_METRICS",
    RECENT_ORDERS: "RECENT_ORDERS",
    LOW_STOCK_ALERT: "LOW_STOCK_ALERT",  // the alert banner + "5 products below threshold"
    LOW_STOCK_PRODUCTS: "LOW_STOCK_PRODUCTS", // the products table
});

const ALL_SECTIONS = Object.values(DASHBOARD_SECTIONS);

export const DASHBOARD_PERMISSIONS = Object.freeze({
    [ROLES.SUPER_ADMIN]: ALL_SECTIONS,
    [ROLES.ADMIN]: ALL_SECTIONS,
    [ROLES.MANAGER]: ALL_SECTIONS,

    // Accounts: only recent orders section
    [ROLES.ACCOUNTS]: [
        DASHBOARD_SECTIONS.RECENT_ORDERS,
    ],

    // Salesman: full view but NO low stock anything and NO total dealer count
    [ROLES.SALESMAN]: [
        DASHBOARD_SECTIONS.STATS_ORDERS,
        DASHBOARD_SECTIONS.BUSINESS_METRICS,
        DASHBOARD_SECTIONS.RECENT_ORDERS,
        // NO low stock alert, NO low stock products, NO total dealers (only assigned dealers)
    ],

    // Production & Packing: only order + stock related
    [ROLES.PRODUCTION]: [
        DASHBOARD_SECTIONS.STATS_ORDERS,
        DASHBOARD_SECTIONS.BUSINESS_METRICS,
        DASHBOARD_SECTIONS.RECENT_ORDERS,
        DASHBOARD_SECTIONS.LOW_STOCK_ALERT,
        DASHBOARD_SECTIONS.LOW_STOCK_PRODUCTS,
    ],
    [ROLES.PACKING]: [
        DASHBOARD_SECTIONS.STATS_ORDERS,
        DASHBOARD_SECTIONS.BUSINESS_METRICS,
        DASHBOARD_SECTIONS.RECENT_ORDERS,
        DASHBOARD_SECTIONS.LOW_STOCK_ALERT,
        DASHBOARD_SECTIONS.LOW_STOCK_PRODUCTS,
    ],

    // Delivery: only order-related content
    [ROLES.DELIVERY]: [
        DASHBOARD_SECTIONS.STATS_ORDERS,
        DASHBOARD_SECTIONS.RECENT_ORDERS,
    ],
});

export const canViewDashboardSection = (role, section) => {
    const allowed = DASHBOARD_PERMISSIONS[role];
    if (!allowed) return false;
    return allowed.includes(section);
};