import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchProducts = async () => {
  const response = await fetch(`${API_BASE_URL}/product-details/get/all`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const fetchProductById = async (productId) => {
  const response = await fetch(`${API_BASE_URL}/product-details/get/${productId}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const createProduct = async (productData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(productData),
  });
  return response.json();
};

export const updateProduct = async (productId, productData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/update/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(productData),
  });
  return response.json();
};

export const deleteProduct = async (productId) => {
  const response = await fetch(`${API_BASE_URL}/product-details/delete/${productId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

// Additional product-specific endpoints (if needed)
export const updateProductStock = async (productId, stockData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/stock/update/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(stockData),
  });
  return response.json();
};
