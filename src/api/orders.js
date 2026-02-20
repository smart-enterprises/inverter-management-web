import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Create Order
export const createOrder = async(orderData) => {
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

// ✅ Get Orders with params
export const fetchOrders = async({
    page = 1,
    limit = 10,
    includeRejected = false,
    status,
} = {}) => {
    const queryParams = new URLSearchParams({
        page,
        limit,
        includeRejected,
    });

    if (status && status !== 'ALL') {
        queryParams.append('status', status);
    }

    const response = await fetch(
        `${API_BASE_URL}/order-details?${queryParams.toString()}`, {
            headers: {...getAuthHeaders() },
        }
    );

    return response.json();
};

// ✅ Get Order by ID
export const fetchOrderById = async(orderId) => {
    const response = await fetch(
        `${API_BASE_URL}/order-details/${orderId}`, {
            headers: {...getAuthHeaders() },
        }
    );
    return response.json();
};

// ✅ Update Order Status
export const updateOrderStatus = async(orderNumber, payload) => {
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
export const fetchOrdersByDateFilter = async({
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