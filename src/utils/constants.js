// src/utils/constants.js
import { ORDER_STATUSES } from "./status";

const getEnv = (key) => {
    const value = import.meta.env[key];
    if (!value) {
        console.error(`[ENV ERROR] Missing environment variable: ${key}`);
    }
    return value;
};

export const API_KEY = getEnv("VITE_FIREBASE_API_KEY");
export const AUTH_DOMAIN = getEnv("VITE_FIREBASE_AUTH_DOMAIN");
export const PROJECT_ID = getEnv("VITE_FIREBASE_PROJECT_ID");
export const STORAGE_BUCKET = getEnv("VITE_FIREBASE_STORAGE_BUCKET");
export const MESSAGING_SENDER_ID = getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID");
export const APP_ID = getEnv("VITE_FIREBASE_APP_ID");

export const FIREBASE_CONFIG = Object.freeze({
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID,
});

export const FIREBASE_VAPID_KEY = getEnv("VITE_FIREBASE_VAPID_KEY");
export const API_BASE_URL = getEnv("VITE_API_BASE_URL");
export const APP_VERSION = getEnv("VITE_APP_VERSION") || "1.0.0";

export const INITIAL_ORDER_ITEM = {
    product_id: '',
    product_brand: '',
    product_name: '',
    product_model: '',
    product_type: '',
    product_price: 0,
    discount_price: 0,
    qty_ordered: 1,
    delivery_date: '',
    dealer_discount_id: null,
    is_product_scheme: false
};

export const INITIAL_FORM_STATE = {
    dealer_id: '',
    priority: 'LOW',
    order_note: '',
    salesman_id: '',
    amount_paid: 0,
    payment_method: 'CASH',
    order_details: [{ ...INITIAL_ORDER_ITEM }]
};

export const PRODUCT_CATEGORIES = [
    "INVERTER",
    "BATTERY",
];

export const capitalizeFirstLetter = (value) => {
    if (typeof value !== "string" || value.length === 0) {
        return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
};

export const STOCK_ACTIONS = {
    STOCK_ADD: 'ADD',
    STOCK_RETURN: 'RETURN',
    STOCK_SALE: 'SALE',
};

export const STOCK_TYPES = {
    STOCK_PACKED: 'PACKED',
    STOCK_UNPACKED: 'UNPACKED'
};

export const ONGOING_STATUSES = [ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PRODUCTION, ORDER_STATUSES.PACKED, ORDER_STATUSES.INVOICE, ORDER_STATUSES.SHIPPED];
export const COMPLETED_STATUSES = [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.COMPLETED];
export const CANCELLED_STATUSES = [ORDER_STATUSES.CANCELLED];
