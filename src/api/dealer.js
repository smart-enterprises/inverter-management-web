import { API_BASE_URL } from "../utils/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/* ========================= CORE REQUEST ========================= */
const request = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data && typeof data.message === "string"
          ? data.message
          : "Request failed";

      throw new Error(message);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message:
        error && typeof error.message === "string"
          ? error.message
          : "Unexpected error occurred",
    };
  }
};

/* ========================= DEALER APIs ========================= */

export const fetchDealers = ({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  includePassword = false,
} = {}) => {
  const query = new URLSearchParams();

  query.set("page", String(page));
  query.set("limit", String(limit));
  query.set("role", "ROLE_DEALER");

  if (search.trim()) {
    query.set("search", search.trim());
  }

  if (status) {
    query.set("status", status);
  }

  query.set("includePassword", String(Boolean(includePassword)));
  query.set("includeDealers", "true");

  return request(`/employees?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchDealerById = (id) =>
  request(`/employees/${id}`, {
    method: "GET",
  });

export const createDealer = (payload) =>
  request(`/employees/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateDealer = (id, payload) =>
  request(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteDealer = (employeeId, reason) =>
  request(`/employees/update/delete-employee`, {
    method: "PUT",
    body: JSON.stringify({ employeeId, reason }),
  });

/* ========================= DEALER DISCOUNT APIs ========================= */

export const fetchDealerDiscounts = ({
  page = 1,
  limit = 100,
  dealer_id,
  product_id,
  brand_name,
  model_name,
}) => {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const payload = {};
  if (dealer_id) payload.dealer_id = dealer_id;
  if (product_id) payload.product_id = product_id;
  if (brand_name) payload.brand_name = brand_name;
  if (model_name) payload.model_name = model_name;

  return request(
    `/employees/dealer/get-discounts?${query.toString()}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

export const createDealerDiscount = (payload) =>
  request(`/employees/dealer/create-discount`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createDealerDiscounts = (payloadArray) =>
  request(`/employees/dealer/create-discounts`, {
    method: "POST",
    body: JSON.stringify(payloadArray),
  });

export const updateDealerDiscount = (payload) =>
  request(`/employees/dealer/update-discount`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });