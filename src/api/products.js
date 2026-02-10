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
  const response = await fetch(`${API_BASE_URL}/product-details/${productId}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const createProduct = async (productData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/create-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(productData),
  });
  return response.json();
};

export const updateProduct = async (productId, productData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/${productId}`, {
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

export const updateProductStock = async (stockData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/createOrUpdate/product-stocks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(stockData),
  });
  return response.json();
};

export const fetchProductsByBrands = async (brands) => {
  const response = await fetch(`${API_BASE_URL}/product-details/getAllProductsByBrand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ brands }),
  });
  return response.json();
};
