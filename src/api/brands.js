import { API_BASE_URL } from '../utils/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const request = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type');
    const data =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      throw new Error(data?.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
};

export const getAllBrands = async (status) => {
  const params = new URLSearchParams();

  if (status) {
    params.append('status', status);
  }

  const queryString = params.toString();

  const url = queryString
    ? `${API_BASE_URL}/product-details/getAll/brands?${queryString}`
    : `${API_BASE_URL}/product-details/getAll/brands`;

  return request(url, {
    method: 'GET',
  });
};

export const getBrandsByDealer = async (dealerId, status = 'active') => {
  const params = new URLSearchParams();

  if (dealerId) {
    params.append('dealerId', dealerId);
  }

  if (status) {
    params.append('status', status);
  }

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE_URL}/product-details/getAll/brands?${queryString}`
    : `${API_BASE_URL}/product-details/getAll/brands`;

  return request(url, {
    method: 'GET',
  });
};

export const getBrandById = async (brandId) => {
  return request(
    `${API_BASE_URL}/product-details/product-brand/${brandId}`,
    {
      method: 'GET',
    }
  );
};

export const createBrands = async (brandsArray) => {
  return request(
    `${API_BASE_URL}/product-details/create/brands`,
    {
      method: 'POST',
      body: JSON.stringify(brandsArray),
    }
  );
};

export const updateBrand = async (brandName, updateData) => {
  return request(
    `${API_BASE_URL}/product-details/brand/${encodeURIComponent(brandName)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }
  );
};
