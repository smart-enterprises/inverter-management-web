import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FiSearch,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";
import CustomSelect from "../components/CustomSelect";
import { fetchUsers, fetchUserById, updateUser } from "../api/user";
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

const Pagination = ({ page, totalPages, onChange }) => (
  <div className="border-t border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
    <span className="text-sm text-gray-600">
      Page <span className="font-semibold">{page}</span> of{" "}
      <span className="font-semibold">{totalPages}</span>
    </span>

    <div className="flex gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
      >
        <FiChevronLeft />
      </button>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
      >
        <FiChevronRight />
      </button>
    </div>
  </div>
);

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
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});

  const canViewPasswords = useMemo(
    () =>
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(
        user?.role
      ),
    [user?.role]
  );

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
      setEditingUser(id);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await updateUser(editingUser, formData);
      if (!res?.success) throw new Error(res.message);

      Swal.fire("Success", "User updated successfully", "success");
      setEditingUser(null);
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

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Users
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all system users
            </p>
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedRole === role
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
                        {u.employee_name}
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
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.status === "active"
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
                        <button
                          onClick={() =>
                            handleEdit(u.employee_id)
                          }
                          className="inline-flex items-center justify-center p-2 text-[#9333EA] hover:bg-[#9333EA]/10 rounded-lg transition"
                        >
                          <FiEdit2 size={16} />
                        </button>
                      </td>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setEditingUser(null)}
            >
              <FiX />
            </button>

            <h2 className="text-lg font-bold mb-4">
              Edit User
            </h2>

            <input
              className="w-full border px-3 py-2 rounded-lg mb-4"
              value={formData.employee_name || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  employee_name: e.target.value,
                })
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
    </div>
  );
};

export default User;