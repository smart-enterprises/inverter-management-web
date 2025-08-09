import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const getAllBrands = async () => {
  const response = await fetch(`${API_BASE_URL}/product-details/getAll/brands`, {
    headers: { ...getAuthHeaders() },
  });
  return response.json();
};

export const createBrand = async (brandData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/create/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(brandData),
  });
  return response.json();
};

export const updateBrand = async (brandName, brandData) => {
  const response = await fetch(`${API_BASE_URL}/product-details/brand/${brandName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(brandData),
  });
  return response.json();
};

// export const deleteBrand = async (brandId) => {
//   const response = await fetch(`${API_BASE_URL}/product-details/brands/${brandId}`, {
//     method: 'DELETE',
//     headers: { ...getAuthHeaders() },
//   });
//   return response.json();
// };
