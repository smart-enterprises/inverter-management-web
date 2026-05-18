import { apiRequest } from "./apiClient.js";

// QUERY BUILDER
const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  return query.toString();
};

/* ========================= EMPLOYEE APIs ========================= */

// FETCH EMPLOYEES (PAGINATED)
export const fetchUsers = async ({
  page = 1,
  limit = 10,
  role,
  search,
  status,
  includePassword = false,
  includeDealers = false,
  scope = "ALL",
} = {}) => {
  const query = buildQuery({ page, limit, role, search, status, includePassword, includeDealers, scope });

  return apiRequest(`/employees?${query}`, {
    method: "GET",
  });
};

// FETCH DELETED EMPLOYEES (PAGINATED)
export const fetchDeletedUsers = async (page = 1, limit = 10) => {
  const query = buildQuery({ page, limit });

  return apiRequest(`/employees/get/deleted-employees?${query}`, {
    method: "GET",
  });
};

// FETCH EMPLOYEE BY ID
export const fetchUserById = async (employeeId) => {
  return apiRequest(`/employees/${employeeId}`, {
    method: "GET",
  });
};

export const fetchUserByRole = async (role) =>
  apiRequest(`/employees/getByRole/${role}`, {
    method: "GET",
  });

export const fetchProfile = async () =>
  apiRequest(`/employees/get/profile`, {
    method: "GET",
  });

export const fetchEmployeeCount = async (role) => {

  const query = buildQuery({ role });

  return apiRequest(`/employees/count${query ? `?${query}` : ""}`, {
    method: "GET",
  });
};

export const createUser = async (payload) =>
  apiRequest(`/employees/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateUser = async (employeeId, payload) =>
  apiRequest(`/employees/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteUser = async (employeeId, reason) =>
  apiRequest(`/employees/update/delete-employee`, {
    method: "PUT",
    body: JSON.stringify({ employeeId, reason }),
  });

export const resetPasswordById = async (employeeId, payload) =>
  apiRequest(`/employees/update/reset-password/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const resetOwnPassword = async (payload) =>
  apiRequest(`/employees/update/reset-password`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const fetchEmployeesWithPassword = async (page = 1, limit = 10) => {

  const query = buildQuery({ page, limit });

  return apiRequest(`/employees/get/employees-password?${query}`, {
    method: "GET",
  });
};