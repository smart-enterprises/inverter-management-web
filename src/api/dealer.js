import { apiRequest } from "./apiClient.js";

/* ========================= DEALER APIs ========================= */
export const fetchDealers = ({
  page = 1,
  limit = 10,
  role = "ROLE_DEALER",
  search = "",
  status = "",
  includePassword = false,
  includeDealers = true,
} = {}) => {
  const query = new URLSearchParams();

  query.set("page", String(page));
  query.set("limit", String(limit));

  if (role) query.append("role", role);
  if (search.trim()) {
    query.set("search", search.trim());
  }

  if (status) {
    query.set("status", status);
  }

  query.set("includePassword", String(Boolean(includePassword)));
  query.set("includeDealers", String(Boolean(includeDealers)));

  return apiRequest(`/employees?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchDealerById = (id) =>
  apiRequest(`/employees/${id}`, {
    method: "GET",
  });

export const createDealer = (payload) =>
  apiRequest(`/employees/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateDealer = (id, payload) =>
  apiRequest(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteDealer = (employeeId, reason) =>
  apiRequest(`/employees/update/delete-employee`, {
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

  return apiRequest(
    `/employees/dealer/get-discounts?${query.toString()}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
};

export const createDealerDiscount = (payload) =>
  apiRequest(`/employees/dealer/create-discount`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createDealerDiscounts = (payloadArray) =>
  apiRequest(`/employees/dealer/create-discounts`, {
    method: "POST",
    body: JSON.stringify(payloadArray),
  });

export const updateDealerDiscount = (payload) =>
  apiRequest(`/employees/dealer/update-discount`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });