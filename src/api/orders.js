import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Create Order
export const createOrder = async (orderData) => {
    const response = await fetch(
        `${API_BASE_URL}/order-details/create-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(orderData),
    }
    );
    return response.json();
};

// ✅ Fetch Orders (with optional filters & search)
export const fetchOrders = async ({
    page = 1,
    limit = 10,
    includeRejected = false,
    status,
    priority,
    search,
} = {}) => {
    try {
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
        if (search && search.trim() !== '') {
            queryParams.append('search', search.trim());
        }

        const response = await fetch(
            `${API_BASE_URL}/order-details?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        }
        );

        return await response.json();
    } catch (error) {
        console.error('❌ fetchOrders error:', error);
        throw error;
    }
};

// ✅ Get Order by ID
export const fetchOrderById = async (orderId) => {
    const response = await fetch(
        `${API_BASE_URL}/order-details/${orderId}`, {
        headers: { ...getAuthHeaders() },
    }
    );
    return response.json();
};

// ✅ Update Order Status
export const updateOrderStatus = async (orderNumber, payload) => {
    const response = await fetch(
        `${API_BASE_URL}/order-details/status/${orderNumber}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
    }
    );
    return response.json();
};

// ✅ Get Orders by Date Filter
export const fetchOrdersByDateFilter = async ({
    year,
    month,
    start_date,
    end_date,
}) => {
    const queryParams = new URLSearchParams();

    if (year) queryParams.append('year', year);
    if (month) queryParams.append('month', month);
    if (start_date) queryParams.append('start_date', start_date);
    if (end_date) queryParams.append('end_date', end_date);

    const response = await fetch(
        `${API_BASE_URL}/order-details/date-filter?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
        },
    }
    );

    return response.json();
};