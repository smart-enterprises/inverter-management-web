import { API_BASE_URL } from "../utils/api";

/* ========================= AUTH HEADER ========================= */
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ========================= CORE REQUEST ========================= */
const request = async (endpoint, options = {}) => {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = null;

    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data && typeof data.message === "string" ?
          data.message :
          "Request failed";

      throw new Error(message);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      message: error && typeof error.message === "string" ?
        error.message : "Unexpected error occurred",
    };
  }
};

/* ========================= DEALER APIs ========================= */

export const fetchDealers = (page = 1, limit = 20) =>
  request(`/employees/dealers/get/?page=${page}&limit=${limit}`);

export const fetchDeletedDealers = (page = 1, limit = 20) =>
  request(`/employees/dealers/deleted?page=${page}&limit=${limit}`);

export const fetchDealerById = (id) =>
  request(`/employees/${id}`);

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
  limit = 30,
  dealer_id,
  product_id,
}) => {
  const params = new URLSearchParams({ page, limit });

  const payload = {};
  if (dealer_id) payload.dealer_id = dealer_id;
  if (product_id) payload.product_id = product_id;

  return request(
    `/employees/dealer/get-discounts?${params.toString()}`, {
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