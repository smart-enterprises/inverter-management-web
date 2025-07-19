import { API_BASE_URL } from '../utils/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_email: email, password }),
  });
  return response.json();
};

export const logout = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.setItem('logout-event', Date.now().toString());
}; 