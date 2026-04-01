// users.jsx — Redesigned with colorful role tabs

<<<<<<< HEAD
const ROLE_LABELS = {
  ROLE_SUPER_ADMIN: 'SUPER ADMIN',
  ROLE_ADMIN: 'ADMIN',
  ROLE_MANAGER: 'MANAGER',
  ROLE_SUPERVISOR: 'SUPERVISOR',
  ROLE_SALESMAN: 'SALESMAN',
  ROLE_PRODUCTION: 'PRODUCTION',
  ROLE_PACKING: 'PACKING',
  ROLE_ACCOUNTS: 'ACCOUNTS',
  ROLE_DELIVERY: 'DELIVERY',
};

const ALL_TABS = [
  'ALL USERS',
  'SUPER ADMIN',
  'ADMIN',
  'MANAGER',
  'SUPERVISOR',
  'SALESMAN',
  'PRODUCTION',
  'PACKING',
  'ACCOUNTS',
  'DELIVERY',
];
=======
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FiSearch, FiEye, FiEyeOff, FiEdit2, FiChevronLeft, FiChevronRight,
  FiX, FiTrash2, FiPlus, FiAlertCircle, FiUsers, FiShield,
  FiFilter,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { createUser, fetchUsers, fetchUserById, updateUser, deleteUser } from "../api/user";
import { useAuth } from "../hooks/useAuth";
import { ROLES, getRoleLabel } from "../utils/roles";
import { capitalizeFirstLetter } from "../utils/constants";
import { errorsToMap, validateEmployeeFields } from "../utils/validationUtils";

//  ROLE CONFIG — color + label for tabs and badges
const ROLE_CONFIG = {
  ALL: {
    tab: "bg-slate-800 text-white shadow-md",
    tabInactive: "text-slate-600 hover:bg-slate-100",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
    label: "All",
  },
  [ROLES.SUPER_ADMIN]: {
    tab: "bg-violet-600 text-white shadow-md shadow-violet-200",
    tabInactive: "text-violet-600 hover:bg-violet-50",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  [ROLES.ADMIN]: {
    tab: "bg-blue-600 text-white shadow-md shadow-blue-200",
    tabInactive: "text-blue-600 hover:bg-blue-50",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  [ROLES.MANAGER]: {
    tab: "bg-indigo-600 text-white shadow-md shadow-indigo-200",
    tabInactive: "text-indigo-600 hover:bg-indigo-50",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  [ROLES.SALESMAN]: {
    tab: "bg-emerald-600 text-white shadow-md shadow-emerald-200",
    tabInactive: "text-emerald-600 hover:bg-emerald-50",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  [ROLES.PRODUCTION]: {
    tab: "bg-orange-500 text-white shadow-md shadow-orange-200",
    tabInactive: "text-orange-600 hover:bg-orange-50",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  [ROLES.PACKING]: {
    tab: "bg-pink-500 text-white shadow-md shadow-pink-200",
    tabInactive: "text-pink-600 hover:bg-pink-50",
    badge: "bg-pink-50 text-pink-700 border-pink-200",
    dot: "bg-pink-500",
  },
  [ROLES.ACCOUNTS]: {
    tab: "bg-cyan-600 text-white shadow-md shadow-cyan-200",
    tabInactive: "text-cyan-600 hover:bg-cyan-50",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  [ROLES.DELIVERY]: {
    tab: "bg-teal-600 text-white shadow-md shadow-teal-200",
    tabInactive: "text-teal-600 hover:bg-teal-50",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
};

const getRoleColor = (role) =>
  ROLE_CONFIG[role]?.badge || "bg-slate-50 text-slate-600 border-slate-200";
>>>>>>> 843b7bd7fa825b6c8772625928e493e4cb26d285

//  PAGINATION
const Pagination = ({ page = 1, totalPages = 1, onChange }) => {
  if (totalPages <= 1) return null;
  const generatePages = () => {
    const pages = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); return pages; }
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1), end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };
  const pages = generatePages();
  const handlePageChange = (p) => { if (p < 1 || p > totalPages) return; onChange(p); };

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page <span className="font-bold text-slate-600">{page}</span> of{" "}
        <span className="font-bold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronLeft size={13} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1.5 text-slate-300 text-xs">…</span>
          ) : (
            <button key={p} type="button" onClick={() => handlePageChange(p)}
              className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === p
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                }`}>
              {p}
            </button>
          )
        )}
        <button type="button" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

//  MODAL INPUT
const ModalInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all ${className}`}
  />
);

//  MAIN — Users
const User = () => {
  const { user } = useAuth();

  const canCreateUser = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  const canUpdateUser = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  const canDeleteUser = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  const canManageUser = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  const canViewPasswords = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  const navigate = useNavigate();

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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchUsers({
        page, limit,
        ...(selectedRole !== "ALL" && { role: selectedRole }),
        ...(search.trim() && { search: search.trim() }),
        ...(status !== "ALL" && { status: status.toLowerCase() }),
        includePassword: canViewPasswords && includePassword,
        includeDealers: false,
      });
      if (!res?.success) throw new Error(res.message);
      setUsers(res.data?.employees || []);
      setTotalPages(res.data?.pages || 1);
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally { setLoading(false); }
  }, [page, selectedRole, search, status, includePassword, canViewPasswords, limit]);

  useEffect(() => {
    loadUsers();
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [loadUsers, isModalOpen]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      if (!formData) return;

      const errors = validateEmployeeFields({
        employee_name: formData.employee_name,
        employee_email: formData.employee_email,
        employee_phone: formData.employee_phone,
        password: formData.password,
        role: formData.role,
        isUpdate: false,
        allowedRoles: Object.values(ROLES),
      });

      if (formData.password !== formData.confirm_password) {
        errors.push({
          field: "confirm_password",
          message: "Password and Confirm Password must match",
        });
      }

      if (errors.length > 0) {
        const errorMap = errorsToMap(errors);
        const firstError = Object.values(errorMap)[0];
        throw new Error(firstError);
      }

      const payload = {};
      [
        "employee_name",
        "employee_email",
        "password",
        "employee_phone",
        "role",
        "photo",
        "district",
        "town",
        "address",
      ].forEach((field) => {
        const value = formData[field]?.toString().trim();
        if (value) payload[field] = value;
      });

      const res = await createUser(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create user");

      await Swal.fire({ icon: "success", title: "User Created", text: res.message || "User created successfully!", confirmButtonColor: "#4f46e5" });
      setFormData({});
      setIsModalOpen(false);
      loadUsers();
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const res = await fetchUserById(id);
      if (!res?.success) throw new Error(res?.message || "Failed to fetch user");
      setFormData(res.data); setOriginalData(res.data); setEditingUser(id);
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    try {
      if (!editingUser) return;
      setLoading(true);
      const payload = {};
      ["employee_name", "employee_email", "employee_phone", "role", "status", "shop_name", "district", "town", "address"].forEach((field) => {
        const nv = formData[field]?.toString().trim() || "", ov = originalData[field]?.toString().trim() || "";
        if (nv !== ov) payload[field] = field === "employee_phone" ? Number(nv) : nv;
      });
      if (!Object.keys(payload).length) { Swal.fire("No Changes", "No data was modified", "info"); return; }
      const res = await updateUser(editingUser, payload);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      Swal.fire("Success", "User updated successfully", "success");
      setEditingUser(null); loadUsers();
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Delete User", input: "textarea", inputLabel: "Reason for deletion",
      inputPlaceholder: "Enter deletion reason…", showCancelButton: true,
      confirmButtonText: "Delete", confirmButtonColor: "#e11d48", cancelButtonColor: "#6b7280",
      inputValidator: (v) => { if (!v?.trim()) return "Reason is required!"; },
    });
    if (!isConfirmed) return;
    try {
      setLoading(true);
      const res = await deleteUser(id, reason.trim());
      if (!res?.success) throw new Error(res?.message || "Delete failed");
      Swal.fire("Deleted!", "User deleted successfully", "success");
      loadUsers();
    } catch (err) { Swal.fire("Error", err.message, "error"); }
    finally { setLoading(false); }
  };

  const roleTabs = ["ALL", ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN, ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY];

  const UserActions = React.memo(({ user: u, onView, onEdit, onDelete }) => {
    if (!u || u?.status?.toLowerCase() === "deleted") return null;
    return (
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={onView} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><FiEye size={14} /></button>
        <button type="button" onClick={onEdit} className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all"><FiEdit2 size={14} /></button>
        <button type="button" onClick={onDelete} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><FiTrash2 size={14} /></button>
      </div>
    );
  });

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Manage and track all system users</p>
          </div>
          {canManageUser && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 
                text-white text-sm font-bold rounded-xl hover:bg-indigo-700 
                active:scale-95 transition-all shadow-sm shadow-indigo-200 cursor-pointer
              "
            >
              <FiPlus size={14} /> Add New User
            </button>
          )}
        </div>

        {/* ── ROLE TABS — colorful, styled ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max sm:flex-wrap sm:min-w-0">
            {roleTabs.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setSelectedRole(role); setPage(1); }}
                  className={`
                    relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black
                    uppercase tracking-wide transition-all duration-200 whitespace-nowrap
                    ${isActive ? cfg?.tab || "bg-slate-800 text-white shadow-md" : `text-slate-500 hover:text-slate-800 hover:bg-slate-100 ${cfg?.tabInactive || ""}`}
                  `}
                >
                  {/* Colored dot for each role (visible in inactive state) */}
                  {role !== "ALL" && !isActive && (
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg?.dot || "bg-slate-400"}`} />
                  )}
                  {isActive && role !== "ALL" && (
                    <span className="w-2 h-2 rounded-full bg-white/70 flex-shrink-0" />
                  )}
                  {getRoleLabel(role)}
                  {/* Active indicator glow */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl ring-2 ring-white/30 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

<<<<<<< HEAD
const User = () => {
  const [activeTab, setActiveTab] = useState('ALL USERS');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployeeData, setEditingEmployeeData] = useState(null);
  const itemsPerPage = 5;
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchUsers();
      if (res && res.success && res.data && res.data.employees) {
        setEmployees(res.data.employees);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // When a user is created or updated, re-fetch the user list from the backend
  const handleUserChanged = () => {
    fetchEmployees();
    setEditingEmployeeId(null);
    setEditingEmployeeData(null);
  };

  // Edit button handler
  const handleEditUser = async (employeeId) => {
    setEditingEmployeeId(employeeId);
    setIsModalOpen(true);
    // Fetch employee details
    try {
      const res = await fetchUserById(employeeId);
      if (res && res.success && res.data) {
        setEditingEmployeeData(res.data);
      }
    } catch {
      // Optionally handle error
    }
  };

  // Reset Password Handler
  const handleOpenResetModal = (userId) => {
    setSelectedUserId(userId);
    setResetPassword('');
    setResetError('');
    setShowResetModal(true);
  };
  const handleResetPassword = async () => {
    setResetLoading(true);
    setResetError('');
    try {
      const res = await resetUserPasswordById(selectedUserId, {
        password: resetPassword,
      });
      if (res && res.success) {
        setShowResetModal(false);
        await Swal.fire({ icon: 'success', title: 'Password Reset', text: res.message || 'Password reset successfully!', confirmButtonText: 'OK' });
      } else {
        setResetError(res?.message || 'Failed to reset password');
      }
    } catch (err) {
      setResetError(err?.message || 'Network error');
    } finally {
      setResetLoading(false);
    }
  };

  // Delete User Handler
  const handleOpenDeleteModal = (userId) => {
    setSelectedUserId(userId);
    setDeleteReason('');
    setDeleteError('');
    setShowDeleteModal(true);
  };
  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await deleteUserById(selectedUserId, deleteReason);
      if (res && res.success) {
        setShowDeleteModal(false);
        await Swal.fire({ icon: 'success', title: 'User Deleted', text: res.message || 'User deleted successfully!', confirmButtonText: 'OK' });
        fetchEmployees();
      } else {
        setDeleteError(res?.message || 'Failed to delete user');
      }
    } catch (err) {
      setDeleteError(err?.message || 'Network error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter employees based on active tab, but exclude ROLE_DEALER
  const filteredEmployees = activeTab === 'ALL USERS'
    ? employees.filter(emp => emp && emp.role !== 'ROLE_DEALER')
    : employees.filter(emp => emp && getRoleLabel(emp.role) === activeTab && emp.role !== 'ROLE_DEALER');

  const currentUsers = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-[#F9FAFB]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Manage Users</h1>
          <p className="text-sm text-gray-500">Add and manage system users</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingEmployeeId(null); setEditingEmployeeData(null); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Add New User
        </button>
      </div>

      <div className="mb-6 -mx-4 sm:mx-0">
        <FilterTabs activeTab={activeTab} onTabChange={tab => { setActiveTab(tab); setCurrentPage(1); }} />
      </div>
      
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
            <button 
              onClick={fetchEmployees}
              className="mt-2 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <UserTable 
            users={currentUsers}
            onEdit={handleEditUser}
            onResetPassword={handleOpenResetModal}
            onDeleteUser={handleOpenDeleteModal}
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))}
            onPageChange={page => setCurrentPage(page)}
          />
        )}
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              onClick={() => setShowResetModal(false)}
              aria-label="Close"
            >
              <FiX size={22} />
            </button>
            {/* Icon and Title */}
            <div className="flex flex-col items-center mb-6">
              <div className="bg-[#F3E8FF] text-[#9333EA] rounded-full p-3 mb-2">
                <FiKey size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Reset User Password</h2>
              <p className="text-sm text-gray-500 mt-1">Set a new password for this user</p>
            </div>
            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
              <div>
                <label htmlFor="resetPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
=======
        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

              {/* search bar */}
              <div className="relative flex-1 sm:max-w-xs">
                <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
>>>>>>> 843b7bd7fa825b6c8772625928e493e4cb26d285
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* status filter */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>
                <div className="w-36">
                  <CustomSelect name="status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={["ALL", "Active", "Inactive", "Deleted"]} />
                </div>
                {canViewPasswords && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={includePassword} onChange={(e) => setIncludePassword(e.target.checked)} className="accent-indigo-600 w-3.5 h-3.5 rounded" />
                    Show Passwords
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["User", "Email", "Phone", "Role", "Status", "Created", ...(includePassword && canViewPasswords ? ["Password"] : []), ""].map((h, i, arr) => (
                    <th key={i} className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${i === arr.length - 1 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex justify-center">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-5 bg-slate-100 rounded-2xl"><FiUsers size={24} className="text-slate-400" /></div>
                        <p className="text-sm font-semibold text-slate-500">No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.employee_id} className="hover:bg-slate-50/60 transition-colors duration-100">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar with role-colored background */}
                        <div
                          className={`w-9 h-9 flex items-center justify-center rounded-xl font-black text-sm border flex-shrink-0 ${getRoleColor(u.role)}`}
                        >
                          {capitalizeFirstLetter(u.employee_name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{capitalizeFirstLetter(u.employee_name)}</p>
                          <span className="text-[9px] font-mono text-slate-400">{u.employee_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{u.employee_email}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">{u.employee_phone}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${getRoleColor(u.role)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ROLE_CONFIG[u.role]?.dot || "bg-slate-400"}`} />
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${u.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {u.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>

                    {includePassword && canViewPasswords && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {u.role === ROLES.SUPER_ADMIN || u.role === ROLES.ADMIN ? (
                            <span className="text-slate-400 tracking-widest select-none">••••••••</span>
                          ) : (
                            <>
                              <input
                                type={showPasswordMap[u.employee_id] ? "text" : "password"}
                                value={u.password || ""}
                                readOnly
                                className="w-28 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
                              />

                              <button
                                onClick={() =>
                                  setShowPasswordMap((prev) => ({
                                    ...prev,
                                    [u.employee_id]: !prev[u.employee_id],
                                  }))
                                }
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                {showPasswordMap[u.employee_id] ? (
                                  <FiEyeOff size={14} />
                                ) : (
                                  <FiEye size={14} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="px-5 py-4">
                      <UserActions user={u} onView={() => navigate(`/users/${u.employee_id}`)} onEdit={() => handleEdit(u.employee_id)} onDelete={() => handleDelete(u.employee_id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {/* ── CREATE USER MODAL ── */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><FiUsers size={14} /></div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Add New User</h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">Create system account</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><FiX size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                <ModalInput type="text" placeholder="Full Name" value={formData.employee_name || ""} onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })} />
                <ModalInput type="email" placeholder="Email Address" value={formData.employee_email || ""} onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalInput type="password" placeholder="Password" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  <ModalInput type="password" placeholder="Confirm Password" value={formData.confirm_password || ""} onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} />
                </div>
                <ModalInput type="text" placeholder="Phone Number" value={formData.employee_phone || ""} onChange={(e) => setFormData({ ...formData, employee_phone: e.target.value })} />
                <div className="relative">
                  <select value={formData.role || ""} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer">
                    <option value="" disabled>Select Role</option>
                    {roleTabs.filter((r) => r !== "ALL").map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-xs">▼</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalInput type="text" placeholder="District" value={formData.district || ""} onChange={(e) => setFormData({ ...formData, district: e.target.value })} />
                  <ModalInput type="text" placeholder="Town" value={formData.town || ""} onChange={(e) => setFormData({ ...formData, town: e.target.value })} />
                </div>
                <textarea rows="3" placeholder="Address" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition-all"
                />
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                <button onClick={handleCreate} disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
                  {loading ? "Creating…" : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editingUser && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setEditingUser(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100"><FiEdit2 size={14} /></div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Edit User</h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">Update user information</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><FiX size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                {[
                  { placeholder: "Name", key: "employee_name" },
                  { placeholder: "Email", key: "employee_email", type: "email" },
                  { placeholder: "Phone", key: "employee_phone" },
                  { placeholder: "District", key: "district" },
                  { placeholder: "Town", key: "town" },
                ].map(({ placeholder, key, type = "text" }) => (
                  <ModalInput key={key} type={type} placeholder={placeholder} value={formData[key] || ""} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                ))}
                <select value={formData.role || ""} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all">
                  {Object.values(ROLES).map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}
                </select>
                <select value={formData.status || ""} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <textarea placeholder="Address" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none transition-all"
                />
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
                <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleUpdate} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200">
                  Update User
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default User;