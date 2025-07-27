import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchDealers = async () => {
  const response = await fetch(`${API_BASE_URL}/employees/?role=ROLE_DEALER`, {
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