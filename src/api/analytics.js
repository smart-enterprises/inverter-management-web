// src/api/analytics.js
import { apiRequest } from "./apiClient.js";

const build = (params) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const str = qs.toString();
    return str ? `?${str}` : "";
};

// GET /api/v1/analytics/summary
export const fetchAnalyticsSummary = ({ from, to, dealer_id, salesman_id } = {}) =>
    apiRequest(`/analytics/summary${build({ from, to, dealer_id, salesman_id })}`);

// GET /api/v1/analytics/sales-trend
export const fetchSalesTrend = ({ from, to, interval = "day", dealer_id, salesman_id } = {}) =>
    apiRequest(`/analytics/sales-trend${build({ from, to, interval, dealer_id, salesman_id })}`);

// GET /api/v1/analytics/top-products
// `view`: "delivered" (default) | "booked"
export const fetchTopProducts = ({ from, to, limit = 10, metric = "revenue", view = "delivered", dealer_id, salesman_id } = {}) =>
    apiRequest(`/analytics/top-products${build({ from, to, limit, metric, view, dealer_id, salesman_id })}`);

// GET /api/v1/analytics/top-dealers
export const fetchTopDealers = ({ from, to, limit = 10, view = "delivered", salesman_id } = {}) =>
    apiRequest(`/analytics/top-dealers${build({ from, to, limit, view, salesman_id })}`);

// GET /api/v1/analytics/top-brands
export const fetchTopBrands = ({ from, to, limit = 8, metric = "qty", view = "delivered", dealer_id, salesman_id } = {}) =>
    apiRequest(`/analytics/top-brands${build({ from, to, limit, metric, view, dealer_id, salesman_id })}`);

// GET /api/v1/analytics/top-salesmen
export const fetchTopSalesmen = ({ from, to, limit = 10, view = "delivered", dealer_id } = {}) =>
    apiRequest(`/analytics/top-salesmen${build({ from, to, limit, view, dealer_id })}`);

// GET /api/v1/analytics/salesman-achievement
export const fetchSalesmanAchievement = ({ from, to, dealer_id } = {}) =>
    apiRequest(`/analytics/salesman-achievement${build({ from, to, dealer_id })}`);
