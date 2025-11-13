import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/employees/?page=1&limit=100`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const fetchUserById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const createUser = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/employees/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const updateUser = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const resetUserPasswordById = async (employeeId, data) => {
  const response = await fetch(`${API_BASE_URL}/employees/update/reset-password/${employeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const deleteUserById = async (employeeId, reason) => {
  const response = await fetch(`${API_BASE_URL}/employees/update/delete-employee`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ employeeId, reason }),
  });
  return response.json();
};

export const fetchSalespersons = async () => {
  const response = await fetch(`${API_BASE_URL}/employees/?page=1&limit=100`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await response.json();
  
  if (data.success && data.data && data.data.employees) {
    // Filter only salespersons (ROLE_SALESMAN) from the employees array
    const salespersonEmployees = data.data.employees.filter(employee => employee.role === 'ROLE_SALESMAN');
    return {
      success: true,
      data: {
        employees: salespersonEmployees
      }
    };
  }
  
  return data;
}; 