import { apiRequest } from "./apiClient.js";

/* ========================= BRAND APIs ========================= */
export const getAllBrands = async (status) => {
  const params = new URLSearchParams();

  if (status) {
    params.append('status', status);
  }

  const queryString = params.toString();

  const url = queryString
    ? `/product-details/getAll/brands?${queryString}`
    : `/product-details/getAll/brands`;

  return apiRequest(url, {
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
    ? `/product-details/getAll/brands?${queryString}`
    : `/product-details/getAll/brands`;

  return apiRequest(url, {
    method: 'GET',
  });
};

export const getBrandById = async (brandId) => {
  return apiRequest(
    `/product-details/product-brand/${brandId}`,
    {
      method: 'GET',
    }
  );
};

export const createBrands = async (brandsArray) => {
  return apiRequest(
    `/product-details/create/brands`,
    {
      method: 'POST',
      body: JSON.stringify(brandsArray),
    }
  );
};

export const updateBrand = async (brandName, updateData) => {
  return apiRequest(
    `/product-details/brand/${encodeURIComponent(brandName)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }
  );
};
