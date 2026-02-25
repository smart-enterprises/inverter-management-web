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
  FiTrash2
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchUsers, fetchUserById, updateUser, deleteUser } from "../api/user";
import { useAuth } from "../hooks/useAuth";
import { ROLES, getRoleLabel } from "../utils/roles";

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

/* ============================================================
   PAGINATION
============================================================ */

const Pagination = ({ page = 1, totalPages = 1, onChange }) => {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = generatePages();

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">

      {/* Left Text */}
      <p className="text-sm text-gray-600">
        Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </p>

      {/* Right Controls */}
      <div className="flex items-center gap-2">

        {/* Previous */}
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <FiChevronLeft size={18} />
        </button>

        {/* Page Numbers */}
        {pages.map((p, index) =>
          p === "..." ? (
            <span key={index} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition
                ${page === p
                  ? "bg-[#9333EA] text-white shadow-sm"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <FiChevronRight size={18} />
        </button>

      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const User = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [includePassword, setIncludePassword] = useState(false);

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
  }, [loadUsers]);

  /* ================= EDIT ================= */

  const handleEdit = async (id) => {
    try {
      const res = await fetchUserById(id);
      if (!res?.success) throw new Error(res.message);

      setFormData(res.data);
      setOriginalData(res.data);
      setEditingUser(id);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {};

      // Compare each field individually
      if (formData.employee_name !== originalData.employee_name) {
        payload.employee_name = formData.employee_name;
      }

      if (formData.employee_email !== originalData.employee_email) {
        payload.employee_email = formData.employee_email;
      }

      if (Number(formData.employee_phone) !== Number(originalData.employee_phone)) {
        payload.employee_phone = Number(formData.employee_phone);
      }

      if (formData.role !== originalData.role) {
        payload.role = formData.role;
      }

      if (formData.status !== originalData.status) {
        payload.status = formData.status;
      }

      if (formData.shop_name !== originalData.shop_name) {
        payload.shop_name = formData.shop_name;
      }

      if (formData.district !== originalData.district) {
        payload.district = formData.district;
      }

      if (formData.town !== originalData.town) {
        payload.town = formData.town;
      }

      if (formData.address !== originalData.address) {
        payload.address = formData.address;
      }

      // ✅ If nothing changed
      if (Object.keys(payload).length === 0) {
        Swal.fire("No Changes", "No data was modified", "info");
        return;
      }
      const res = await updateUser(editingUser, payload);

      if (!res?.success) throw new Error(res.message);

      Swal.fire("Success", "User updated successfully", "success");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Delete User",
      input: "textarea",
      inputLabel: "Reason for deletion",
      inputPlaceholder: "Enter deletion reason...",
      inputAttributes: {
        "aria-label": "Type your reason here"
      },
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value) {
          return "Reason is required!";
        }
      }
    });

    if (!isConfirmed) return;

    try {
      const payload = {
        employeeId: id,
        reason: reason.trim(),
      };

      const res = await deleteUser(payload.employeeId, payload.reason);

      if (!res?.success) throw new Error(res.message);

      Swal.fire("Deleted!", "User deleted successfully", "success");
      loadUsers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const roleTabs = [
    "ALL",
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Manage Users
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage all system users
                </p>
              </div>
              {/* {!isSalesman && (
                <button
                  onClick={() => {
                    setIsModalOpen(true);
                    setEditingUserId(null);
                    setEditingUserData(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
                >
                  <FiPlus className="text-lg" />
                  Add New User
                </button>
              )} */}
            </div>

            {/* ROLE TABS */}
            <div className="flex flex-wrap gap-2 mb-6">
              {roleTabs.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(role);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedRole === role
                    ? "bg-[#9333EA] text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {role === "ALL" ? "ALL" : getRoleLabel(role)}
                </button>
              ))}
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

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Created Date
                    </th>
                    {includePassword && canViewPasswords && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Password
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center">
                        <FiLoader className="animate-spin mx-auto text-[#9333EA]" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.employee_id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {u.employee_name?.charAt(0).toUpperCase() + u.employee_name?.slice(1)}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {u.employee_email}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {u.employee_phone}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-3 py-1 text-xs rounded-full font-medium ${getRoleColor(
                              u.role
                            )}`}
                          >
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                              }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        {includePassword && canViewPasswords && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <input
                                type={
                                  showPasswordMap[u.employee_id]
                                    ? "text"
                                    : "password"
                                }
                                value={u.password || ""}
                                readOnly
                                className="border px-2 py-1 rounded w-24 text-xs"
                              />
                              <button
                                onClick={() =>
                                  setShowPasswordMap((prev) => ({
                                    ...prev,
                                    [u.employee_id]:
                                      !prev[u.employee_id],
                                  }))
                                }
                              >
                                {showPasswordMap[u.employee_id] ? (
                                  <FiEyeOff />
                                ) : (
                                  <FiEye />
                                )}
                              </button>
                            </div>
                          </td>
                        )}

                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <UserActions
                              user={u}
                              onView={() => navigate(`/users/${u.employee_id}`)}
                              onEdit={() => handleEdit(u.employee_id)}
                              onDelete={() => handleDelete(u.employee_id)}
                            />
                          </div>
                        </td>

                        {/* VIEW */}
                        {/* <button
                            onClick={() => navigate(`/users/${u.employee_id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <FiEye size={16} />
                          </button> */}

                        {/* EDIT */}
                        {/* <button
                            onClick={() => handleEdit(u.employee_id)}
                            className="p-2 text-[#9333EA] hover:bg-[#9333EA]/10 rounded-lg transition"
                          >
                            <FiEdit2 size={16} />
                          </button> */}

                        {/* DELETE */}
                        {/* <button
                            onClick={() => handleDelete(u.employee_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <FiTrash2 size={16} />
                          </button> */}

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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