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
          data.message : "Request failed";

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

/* ========================= EMPLOYEE APIs ========================= */

export const fetchUsers = ({
  page = 1,
  limit = 10,
  role,
  search,
  status,
  includePassword = false,
  includeDealers = false,
} = {}) => {
  const query = new URLSearchParams();

  query.append("page", String(page));
  query.append("limit", String(limit));

  if (role) query.append("role", role);
  if (search) query.append("search", search);
  if (status) query.append("status", status);

  query.append("includePassword", String(includePassword));
  query.append("includeDealers", String(includeDealers));

  return request(`/employees?${query.toString()}`, {
    method: "GET",
  });
};

export const fetchDeletedUsers = (page = 1, limit = 10) =>
  request(`/employees/get/deleted-employees?page=${page}&limit=${limit}`);

export const fetchUserById = (id) =>
  request(`/employees/${id}`);

export const fetchUserByRole = (role) =>
  request(`/employees/getByRole/${role}`);

export const fetchProfile = () =>
  request(`/employees/get/profile`);

export const fetchEmployeeCount = (role) =>
  request(`/employees/count${role ? `?role=${role}` : ""}`);

export const createUser = (payload) =>
  request(`/employees/signup`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateUser = (id, payload) =>
  request(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteUser = (employeeId, reason) =>
  request(`/employees/update/delete-employee`, {
    method: "PUT",
    body: JSON.stringify({ employeeId, reason }),
  });

export const resetPasswordById = (employeeId, payload) =>
  request(`/employees/update/reset-password/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const resetOwnPassword = (payload) =>
  request(`/employees/update/reset-password`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const fetchEmployeesWithPassword = (page = 1, limit = 10) =>
  request(`/employees/get/employees-password?page=${page}&limit=${limit}`);