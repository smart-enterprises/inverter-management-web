import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchDealers = async (page = 1, limit = 1000) => {
  const response = await fetch(`${API_BASE_URL}/employees/dealers/get/?page=${page}&limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const fetchDealerById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const createDealer = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/employees/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const updateDealer = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const deleteDealerById = async (employeeId, reason) => {
  const response = await fetch(`${API_BASE_URL}/employees/update/delete-employee`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ employeeId, reason }),
  });
  return response.json();
}; 


export const fetchDealerDiscounts = async ({ page = 1, limit = 30, dealer_id } = {}) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  const payload = {};
  if (dealer_id) payload.dealer_id = dealer_id;

  const response = await fetch(`${API_BASE_URL}/employees/dealer/get-discounts?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const createDealerDiscounts = async (payloadArray) => {
  const response = await fetch(`${API_BASE_URL}/employees/dealer/create-discounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payloadArray),
  });
  return response.json();
};

export const getDealerDiscountByProduct = async (dealerId, productId, page = 1, limit = 30) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  const payload = {
    dealer_id: dealerId,
    product_id: productId
  };

  const response = await fetch(`${API_BASE_URL}/employees/dealer/get-discounts?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};