import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  FiSearch,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiX,
  FiTrash2,
  FiPlus
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { createUser, fetchUsers, fetchUserById, updateUser, deleteUser } from "../api/user";
import { useAuth } from "../hooks/useAuth";
import { ROLES, getRoleLabel } from "../utils/roles";
import { capitalizeFirstLetter } from "../utils/constants";

/* ============================================================
   ROLE COLORS
============================================================ */

const ROLE_COLORS = {
  ROLE_SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ROLE_ADMIN: "bg-blue-100 text-blue-700",
  ROLE_MANAGER: "bg-indigo-100 text-indigo-700",
  ROLE_SUPERVISOR: "bg-yellow-100 text-yellow-700",
  ROLE_SALESMAN: "bg-green-100 text-green-700",
  ROLE_PRODUCTION: "bg-orange-100 text-orange-700",
  ROLE_PACKING: "bg-pink-100 text-pink-700",
  ROLE_ACCOUNTS: "bg-cyan-100 text-cyan-700",
  ROLE_DELIVERY: "bg-teal-100 text-teal-700",
};

const getRoleColor = (role) =>
  ROLE_COLORS[role] || "bg-gray-100 text-gray-700";

/* PAGINATION */
const Pagination = ({ page = 1, totalPages = 1, onChange }) => {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (page > 3) pages.push("...");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push("...");

    pages.push(totalPages);

    return pages;
  };

  const pages = generatePages();

  const handlePageChange = (targetPage) => {
    if (targetPage < 1 || targetPage > totalPages) return;
    onChange(targetPage);
  };

  return (
    <div className="flex justify-end mt-4">

      <nav
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm"
        aria-label="Pagination Navigation"
      >

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={18} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, index) =>
            p === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-gray-400 select-none"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => handlePageChange(p)}
                className={`min-w-[36px] h-9 px-3 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 ${page === p
                  ? "bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow-md scale-[1.05]"
                  : "text-gray-600 hover:bg-gray-100 hover:scale-[1.03]"
                  }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={18} />
        </button>

      </nav>

    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const User = () => {
  const { user } = useAuth();

  const isSalesman = user?.role === ROLES.SALESMAN;

  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [includePassword, setIncludePassword] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});

  const canViewPasswords = useMemo(
    () =>
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(
        user?.role
      ),
    [user?.role]
  );

  const navigate = useNavigate();

  /* ================= FETCH USERS ================= */

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetchUsers({
        page,
        limit,
        ...(selectedRole !== "ALL" && { role: selectedRole }),
        ...(search.trim() && { search: search.trim() }),
        ...(status !== "ALL" && { status: status.toLowerCase() }),
        includePassword: canViewPasswords && includePassword,
        includeDealers: false,
      });

      if (!res?.success) throw new Error(res.message);

      setUsers(res.data?.employees || []);
      setTotalPages(res.data?.pages || 1);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    selectedRole,
    search,
    status,
    includePassword,
    canViewPasswords,
    limit,
  ]);

  useEffect(() => {
    loadUsers();
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [loadUsers, isModalOpen]);

  /* ================= CREATE ================= */

  const handleCreate = async () => {
    try {
      setLoading(true);

      if (!formData) return;

      const payload = {};

      /* 🔹 Required Fields Validation */
      const requiredFields = [
        "employee_name",
        "employee_email",
        "password",
        "confirm_password",
        "employee_phone",
        "role",
      ];

      requiredFields.forEach((field) => {
        if (!formData[field]?.toString().trim()) {
          throw new Error(
            `${field.replace(/_/g, " ")} is required`
          );
        }
      });

      /* 🔹 Password Match Validation */
      if (formData.password !== formData.confirm_password) {
        throw new Error("Password and Confirm Password must match");
      }

      /* 🔹 Build Payload Dynamically */
      const allowedFields = [
        "employee_name",
        "employee_email",
        "password",
        "employee_phone",
        "role",
        "photo",
        "district",
        "town",
        "address",
      ];

      allowedFields.forEach((field) => {
        const value = formData[field]?.toString().trim();

        if (value) {
          payload[field] =
            field === "employee_phone"
              ? value
              : value;
        }
      });

      console.log("📦 Create Payload:", payload);

      const res = await createUser(payload);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to create user");
      }

      await Swal.fire({
        icon: "success",
        title: "User Created",
        text: res.message || "User created successfully!",
        confirmButtonColor: "#9333EA",
      });

      /* 🔹 Reset Form */
      setFormData({
        employee_name: "",
        employee_email: "",
        password: "",
        confirm_password: "",
        employee_phone: "",
        role: "",
        photo: "",
        district: "",
        town: "",
        address: "",
      });

      fetchUsersList?.();

    } catch (err) {
      console.error("❌ Create Error:", err);
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT ================= */

  const handleEdit = async (id) => {
    try {
      setLoading(true);

      const res = await fetchUserById(id);

      if (!res?.success)
        throw new Error(res?.message || "Failed to fetch user");

      setFormData(res.data);
      setOriginalData(res.data);
      setEditingUser(id);

    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE ================= */

  const handleUpdate = async () => {
    try {
      if (!editingUser) return;

      setLoading(true);

      const payload = {};

      const fieldsToCompare = [
        "employee_name",
        "employee_email",
        "employee_phone",
        "role",
        "status",
        "shop_name",
        "district",
        "town",
        "address",
      ];

      fieldsToCompare.forEach((field) => {
        const newValue = formData[field]?.toString().trim() || "";
        const oldValue = originalData[field]?.toString().trim() || "";

        if (newValue !== oldValue) {
          payload[field] =
            field === "employee_phone"
              ? Number(newValue)
              : newValue;
        }
      });

      // 🔹 If nothing changed
      if (Object.keys(payload).length === 0) {
        Swal.fire("No Changes", "No data was modified", "info");
        return;
      }

      console.log("📦 Update Payload:", payload);

      const res = await updateUser(editingUser, payload);

      if (!res?.success)
        throw new Error(res?.message || "Update failed");

      Swal.fire("Success", "User updated successfully", "success");

      setEditingUser(null);
      loadUsers();

    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Delete User",
      input: "textarea",
      inputLabel: "Reason for deletion",
      inputPlaceholder: "Enter deletion reason...",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value?.trim()) {
          return "Reason is required!";
        }
      },
    });

    if (!isConfirmed) return;

    try {
      setLoading(true);

      const payload = {
        employeeId: id,
        reason: reason.trim(),
      };

      const res = await deleteUser(payload.employeeId, payload.reason);

      if (!res?.success)
        throw new Error(res?.message || "Delete failed");

      Swal.fire("Deleted!", "User deleted successfully", "success");

      loadUsers();

    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const roleTabs = [
    "ALL",
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SALESMAN,
    ROLES.PRODUCTION,
    ROLES.PACKING,
    ROLES.ACCOUNTS,
    ROLES.DELIVERY,
  ];

  /* ================= USER ACTIONS (Memoized Render) ================= */

  const UserActions = React.memo(({ user, onView, onEdit, onDelete }) => {
    if (!user || user?.status?.toLowerCase() === "deleted") return null;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="p-2 text-[#2563EB] hover:bg-[#2563EB]/5 rounded-lg transition"
        >
          <FiEye size={16} />
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-[#9333EA] hover:bg-[#9333EA]/5 rounded-lg transition"
        >
          <FiEdit2 size={16} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-[#DC2626] hover:bg-[#DC2626]/5 rounded-lg transition"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    );
  });

  /* ============================================================
     UI
  ============================================================ */

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            {/* ===================== Header ===================== */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

              {/* Title Section */}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Manage Users
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage all system users
                </p>
              </div>

              {/* Action Button */}
              {!isSalesman && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 
                        bg-gradient-to-r from-[#9333EA] to-[#7e22ce] 
                        text-white rounded-xl shadow-sm 
                        hover:shadow-md hover:scale-[1.02] 
                        transition-all duration-200 
                        text-sm font-medium"
                >
                  <FiPlus size={16} />
                  Add New User
                </button>
              )}

              {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">

                  <div className="relative w-full max-w-xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col">
                    {/* ================= HEADER (Fixed) ================= */}
                    <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition"
                      >
                        ✕
                      </button>

                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                        Add New User
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Fill in the details below to create a new user
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 scrollbar-hide">
                      {/* Form */}
                      <div className="space-y-4">

                        <input
                          type="text"
                          placeholder="Full Name"
                          value={formData.employee_name}
                          onChange={(e) =>
                            setFormData({ ...formData, employee_name: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                        />

                        <input
                          type="email"
                          placeholder="Email Address"
                          value={formData.employee_email}
                          onChange={(e) =>
                            setFormData({ ...formData, employee_email: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                          />

                          <input
                            type="password"
                            placeholder="Confirm Password"
                            value={formData.confirm_password}
                            onChange={(e) =>
                              setFormData({ ...formData, confirm_password: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                          />
                        </div>

                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={formData.employee_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, employee_phone: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                        />

                        <div className="relative">
                          <select
                            value={formData.role}
                            onChange={(e) =>
                              setFormData({ ...formData, role: e.target.value })
                            }
                            className="w-full appearance-none px-4 py-3 rounded-xl 
                                border border-gray-200 bg-gray-50 text-gray-700
                                focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 
                                focus:border-[#9333EA] focus:outline-none
                                transition-all duration-200 cursor-pointer"
                          >
                            <option value="" disabled>
                              Select Role
                            </option>

                            {roleTabs
                              .filter((role) => role !== "ALL")
                              .map((role) => {
                                const label = getRoleLabel(role);

                                return (
                                  <option key={role} value={role}>
                                    {label}
                                  </option>
                                );
                              })}
                          </select>

                          {/* Custom Dropdown Arrow */}
                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                            ▼
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="District"
                            value={formData.district}
                            onChange={(e) =>
                              setFormData({ ...formData, district: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                          />

                          <input
                            type="text"
                            placeholder="Town"
                            value={formData.town}
                            onChange={(e) =>
                              setFormData({ ...formData, town: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none transition"
                          />
                        </div>

                        <textarea
                          rows="3"
                          placeholder="Address"
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA] focus:outline-none resize-none transition"
                        />
                      </div>
                    </div>

                    {/* ================= FOOTER (Fixed Button) ================= */}
                    <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-white rounded-b-3xl">
                      <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] 
                          text-white font-semibold shadow-md hover:shadow-lg 
                          hover:scale-[1.01] transition-all duration-200 disabled:opacity-50"
                      >
                        {loading ? "Creating..." : "Create User"}
                      </button>
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* ===================== ROLE TABS ===================== */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex flex-wrap justify-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">

                {roleTabs.map((role) => {
                  const isActive = selectedRole === role;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setPage(1);
                      }}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                        ${isActive
                          ? "bg-[#9333EA] text-white shadow-md scale-105"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                    >
                      {getRoleLabel(role)}
                    </button>
                  );
                })}

              </div>
            </div>

            {/* FILTER ROW */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                />
              </div>

              <div className="w-48">
                <CustomSelect
                  name="status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  options={["ALL", "Active", "Inactive", "Deleted"]}
                />
              </div>

              {canViewPasswords && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <input
                    type="checkbox"
                    checked={includePassword}
                    onChange={(e) =>
                      setIncludePassword(e.target.checked)
                    }
                    className="accent-[#9333EA]"
                  />
                  Include Password
                </label>
              )}
            </div>

            {/* ================= USERS TABLE ================= */}
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  {/* Header */}
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10">
                    <tr>

                      <th className="px-6 py-4 text-left font-medium">User</th>

                      <th className="px-6 py-4 text-left font-medium">Email</th>

                      <th className="px-6 py-4 text-left font-medium">Phone</th>

                      <th className="px-6 py-4 text-left font-medium">Role</th>

                      <th className="px-6 py-4 text-left font-medium">Status</th>

                      <th className="px-6 py-4 text-left font-medium">Created</th>

                      {includePassword && canViewPasswords && (
                        <th className="px-6 py-4 text-left font-medium">Password</th>
                      )}

                      <th className="px-6 py-4 text-right font-medium">Actions</th>

                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-gray-100">

                    {/* Loading State */}
                    {loading && (
                      <tr>
                        <td colSpan="8" className="py-12 text-center">
                          <FiLoader className="animate-spin mx-auto text-[#9333EA]" size={24} />
                        </td>
                      </tr>
                    )}

                    {/* Empty State */}
                    {!loading && users.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    )}

                    {/* Data Rows */}
                    {!loading && users.map((u) => (

                      <tr
                        key={u.employee_id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >

                        {/* USER */}
                        <td className="px-6 py-4">

                          <div className="flex items-center gap-3">

                            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#9333EA]/10 text-[#9333EA] font-semibold text-sm">
                              {capitalizeFirstLetter(u.employee_name).charAt(0).toUpperCase()}
                            </div>

                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">
                                {capitalizeFirstLetter(u.employee_name)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {u.employee_id}
                              </span>
                            </div>

                          </div>

                        </td>

                        {/* EMAIL */}
                        <td className="px-6 py-4 text-gray-600">
                          {u.employee_email}
                        </td>

                        {/* PHONE */}
                        <td className="px-6 py-4 text-gray-600">
                          {u.employee_phone}
                        </td>

                        {/* ROLE */}
                        <td className="px-6 py-4">

                          <span
                            className={`px-3 py-1 text-xs rounded-full font-medium ${getRoleColor(u.role)}`}
                          >
                            {getRoleLabel(u.role)}
                          </span>

                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.status === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                              }`}
                          >
                            {u.status}
                          </span>

                        </td>

                        {/* CREATED DATE */}
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        {/* PASSWORD */}
                        {includePassword && canViewPasswords && (

                          <td className="px-6 py-4">

                            <div className="flex items-center gap-2">

                              <input
                                type={showPasswordMap[u.employee_id] ? "text" : "password"}
                                value={u.password || ""}
                                readOnly
                                className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-md bg-gray-50"
                              />

                              <button
                                onClick={() =>
                                  setShowPasswordMap((prev) => ({
                                    ...prev,
                                    [u.employee_id]: !prev[u.employee_id],
                                  }))
                                }
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {showPasswordMap[u.employee_id] ? (
                                  <FiEyeOff size={16} />
                                ) : (
                                  <FiEye size={16} />
                                )}
                              </button>

                            </div>

                          </td>

                        )}

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">

                          <div className="flex justify-end gap-2">

                            <UserActions
                              user={u}
                              onView={() => navigate(`/users/${u.employee_id}`)}
                              onEdit={() => handleEdit(u.employee_id)}
                              onDelete={() => handleDelete(u.employee_id)}
                            />

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        </div>

        {/* EDIT MODAL */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative overflow-y-auto max-h-[90vh]">

              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                onClick={() => setEditingUser(null)}
              >
                <FiX />
              </button>

              <h2 className="text-lg font-bold mb-6">Edit User</h2>

              {/* Name */}
              <input
                className="w-full border px-3 py-2 rounded-lg mb-3"
                placeholder="Name"
                value={formData.employee_name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, employee_name: e.target.value })
                }
              />

              {/* Email */}
              <input
                className="w-full border px-3 py-2 rounded-lg mb-3"
                placeholder="Email"
                value={formData.employee_email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, employee_email: e.target.value })
                }
              />

              {/* Phone */}
              <input
                className="w-full border px-3 py-2 rounded-lg mb-3"
                placeholder="Phone"
                value={formData.employee_phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, employee_phone: e.target.value })
                }
              />

              {/* Role */}
              <select
                className="w-full border px-3 py-2 rounded-lg mb-3"
                value={formData.role || ""}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                {Object.values(ROLES).map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                className="w-full border px-3 py-2 rounded-lg mb-3"
                value={formData.status || ""}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* District */}
              <input
                className="w-full border px-3 py-2 rounded-lg mb-3"
                placeholder="District"
                value={formData.district || ""}
                onChange={(e) =>
                  setFormData({ ...formData, district: e.target.value })
                }
              />

              {/* Town */}
              <input
                className="w-full border px-3 py-2 rounded-lg mb-3"
                placeholder="Town"
                value={formData.town || ""}
                onChange={(e) =>
                  setFormData({ ...formData, town: e.target.value })
                }
              />

              {/* Address */}
              <textarea
                className="w-full border px-3 py-2 rounded-lg mb-4"
                placeholder="Address"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <button
                onClick={handleUpdate}
                className="w-full bg-[#9333EA] text-white py-2.5 rounded-lg hover:bg-[#8829DD] transition"
              >
                Update User
              </button>
            </div>
          </div>
        )}
      </div >
    </>
  );
};

export default User;