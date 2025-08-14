import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const createOrder = async (orderData) => {
  const response = await fetch(`${API_BASE_URL}/order-details/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(orderData),
  });
  return response.json();
};

export const fetchOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/order-details`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const fetchOrderById = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/order-details/${orderId}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};
