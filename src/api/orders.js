import { apiRequest } from "./apiClient.js";

// ✅ Create Order
export const createOrder = async (orderData) => {
    return apiRequest("/order-details/create-order", {
        method: "POST",
        body: JSON.stringify(orderData),
    });
};

// ✅ Fetch Orders (with optional filters & search)
export const fetchOrders = async ({
    page = 1,
    limit = 10,
    includeRejected = false,
    status,
    priority,
    search,
    dealer,
    startDate,
    endDate,
    deliveryStartDate,
    deliveryEndDate,
} = {}) => {
    const queryParams = new URLSearchParams();

    // Pagination
    queryParams.append('page', page);
    queryParams.append('limit', limit);

    // Include rejected
    if (includeRejected) {
        queryParams.append('includeRejected', 'true');
    }

    // Status filter
    if (status && status !== 'ALL') {
        queryParams.append('status', status);
    }

    if (priority && priority !== 'ALL') {
        queryParams.append('priority', priority);
    }

    // Search filter (order number / dealer etc.)
    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
        queryParams.append("search", trimmedSearch);
    }

    // Dealer filter
    if (dealer) {
        queryParams.append('dealer', dealer);
    }

    // Date range filters
    if (startDate) {
        queryParams.append('startDate', startDate);
    }

    if (endDate) {
        queryParams.append('endDate', endDate);
    }

    // Delivery date range
    if (deliveryStartDate) {
        queryParams.append("deliveryStartDate", deliveryStartDate);
    }

    if (deliveryEndDate) {
        queryParams.append("deliveryEndDate", deliveryEndDate);
    }

    return apiRequest(`/order-details?${queryParams.toString()}`, {
        method: "GET",
    });
};

// ✅ Get Order by ID
export const fetchOrderById = async (orderId) => {
    return apiRequest(`/order-details/${orderId}`, {
        method: "GET",
    });
};

// ✅ Update Order Status
export const updateOrderStatus = async (orderNumber, payload) => {
    return apiRequest(`/order-details/status/${orderNumber}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
};

// ✅ Fetch Orders By Date Filter (Monthly)
export const fetchOrdersByDate = async ({
    year,
    month,
    start_date,
    end_date,
} = {}) => {
    const queryParams = new URLSearchParams();

    if (year) queryParams.append("year", year);
    if (month) queryParams.append("month", month);
    if (start_date) queryParams.append("start_date", start_date);
    if (end_date) queryParams.append("end_date", end_date);

    return apiRequest(
        `/order-details/date-filter?${queryParams.toString()}`,
        { method: "GET" }
    );
};