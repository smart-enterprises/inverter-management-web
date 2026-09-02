// User.jsx — Material Design 3
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  MdSearch, MdVisibility, MdEdit, MdChevronLeft, MdChevronRight,
  MdClose, MdDeleteOutline, MdAdd, MdGroup, MdFilterList, MdLink,
  MdStorefront, MdExpandMore,
} from "react-icons/md";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { createUser, fetchUsers, fetchUserById, updateUser, deleteUser } from "../api/user";
import { useAuth } from "../hooks/useAuth";
import { ROLES, getRoleLabel } from "../utils/roles";
import { formatName } from "../utils/constants";
import { errorsToMap, validateEmployeeFields } from "../utils/validationUtils";
import ManageDealersModal from "../components/ManageDealersModal";
import {
  Surface, Button, IconButton, Chip, FilterChip, EmptyState,
  Table, Thead, Th, Tr, Td,
} from "../components/m3";
import { T, CHIP_TONES } from "../components/m3/tokens";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Deleted", value: "deleted" },
];

const DEALER_MANAGER_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

// ─── RBAC ─────────────────────────────────────────────────────────────────────

const VIEWABLE_ROLES_BY_VIEWER = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN,
    ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  [ROLES.ADMIN]: [
    ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN,
    ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  [ROLES.MANAGER]: [
    ROLES.MANAGER, ROLES.SALESMAN,
    ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
};

const CREATABLE_ROLES_BY_VIEWER = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN,
    ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  [ROLES.ADMIN]: [
    ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN,
    ROLES.PRODUCTION, ROLES.PACKING, ROLES.ACCOUNTS, ROLES.DELIVERY,
  ],
  [ROLES.MANAGER]: [],
};

const getViewableRoles = (viewerRole) =>
  VIEWABLE_ROLES_BY_VIEWER[(viewerRole || "").toUpperCase()] ?? [];

const getCreatableRoles = (viewerRole) =>
  CREATABLE_ROLES_BY_VIEWER[(viewerRole || "").toUpperCase()] ?? [];

// ─── Role Config ──────────────────────────────────────────────────────────────

/* Nine roles onto M3's tonal containers. The role name is always
   written next to the dot, so a repeated tone across two roles costs
   nothing — the label, not the hue, is what identifies the role. */
const ROLE_TONE = {
  ALL: "neutral",
  [ROLES.SUPER_ADMIN]: "warning",
  [ROLES.ADMIN]: "primary",
  [ROLES.MANAGER]: "secondary",
  [ROLES.SALESMAN]: "success",
  [ROLES.PRODUCTION]: "tertiary",
  [ROLES.PACKING]: "neutral",
  [ROLES.ACCOUNTS]: "primary",
  [ROLES.DELIVERY]: "secondary",
};

const ROLE_DOT = {
  ALL: T.outline,
  [ROLES.SUPER_ADMIN]: T.warning,
  [ROLES.ADMIN]: T.primary,
  [ROLES.MANAGER]: T.secondary,
  [ROLES.SALESMAN]: T.success,
  [ROLES.PRODUCTION]: T.tertiary,
  [ROLES.PACKING]: T.outline,
  [ROLES.ACCOUNTS]: T.primary,
  [ROLES.DELIVERY]: T.secondary,
};

const getRoleTone = (role) => ROLE_TONE[role] ?? "neutral";

// ─── Pagination ───────────────────────────────────────────────────────────────

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

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    onChange(p);
  };

  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderTop: `1px solid ${T.outlineVariant}` }}
    >
      <p className="m3-body-small hidden sm:block" style={{ color: T.onSurfaceVariant }}>
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <IconButton
          icon={MdChevronLeft}
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
        {generatePages().map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1.5 m3-body-small" style={{ color: T.onSurfaceVariant }}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              aria-current={page === p ? "page" : undefined}
              className="m3-label-large m3-state-layer m3-focus min-w-[32px] h-8 px-2.5 flex items-center justify-center"
              style={{
                borderRadius: T.cornerFull,
                backgroundColor: page === p ? T.secondaryContainer : "transparent",
                color: page === p ? T.onSecondaryContainer : T.onSurfaceVariant,
              }}
            >
              {p}
            </button>
          )
        )}
        <IconButton
          icon={MdChevronRight}
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
      </div>
    </div>
  );
};

// ─── Modal Input ──────────────────────────────────────────────────────────────

const ModalInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full m3-body-medium px-4 h-12 focus:outline-none ${className}`}
    style={{
      border: `1px solid ${T.outline}`,
      borderRadius: T.cornerExtraSmall,
      backgroundColor: T.surface,
      color: T.onSurface,
    }}
  />
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_TONE_MAP = { active: "success", inactive: "neutral", deleted: "error" };

const StatusBadge = ({ status }) => (
  <Chip tone={STATUS_TONE_MAP[(status || "").toLowerCase()] ?? "neutral"}>{status}</Chip>
);

// ─── User Actions ─────────────────────────────────────────────────────────────

const UserActions = React.memo(({ user: u, onView, onEdit, onDelete, onManageDealers, canManageDealers, editFetching, deleteFetching }) => {
  if (!u || u?.status?.toLowerCase() === "deleted") return null;
  const isSalesman = (u.role || "").toUpperCase() === ROLES.SALESMAN;

  return (
    <div className="flex items-center justify-end gap-1">
      {isSalesman && canManageDealers && (
        <IconButton
          icon={MdLink}
          onClick={onManageDealers}
          aria-label="Manage dealers"
          title="Manage Dealers"
        />
      )}
      <IconButton icon={MdVisibility} onClick={onView} aria-label="View user" title="View user" />
      <button
        type="button"
        onClick={onEdit}
        disabled={editFetching}
        className="m3-icon-button m3-state-layer m3-focus disabled:opacity-50"
        aria-label="Edit user"
        title="Edit user"
      >
        {editFetching ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <MdEdit size={20} />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteFetching}
        className="m3-icon-button m3-state-layer m3-focus disabled:opacity-50"
        aria-label="Delete user"
        title="Delete user"
        style={{ color: T.error }}
      >
        {deleteFetching ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <MdDeleteOutline size={20} />}
      </button>
    </div>
  );
});
UserActions.displayName = "UserActions";

// ─── Dealer Count Badge ───────────────────────────────────────────────────────
// Shown under employee_id in the User column — only for salesman rows

const DealerCountBadge = ({ count }) => {
  if (count === undefined || count === null) return null;
  return (
    <Chip tone="success" icon={MdStorefront}>
      {count} {count === 1 ? "dealer" : "dealers"}
    </Chip>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN — Users Page
───────────────────────────────────────────────────────────────────────────── */

const User = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();

  const viewerRole = (user?.role || "").toUpperCase();

  // ── RBAC ──────────────────────────────────────────────────────────────────

  const viewableRoles = useMemo(() => getViewableRoles(viewerRole), [viewerRole]);
  const creatableRoles = useMemo(() => getCreatableRoles(viewerRole), [viewerRole]);
  const roleTabs = useMemo(() => ["ALL", ...viewableRoles], [viewableRoles]);

  const canCreateUser = useMemo(() => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(viewerRole), [viewerRole]);
  const canManageDealers = useMemo(() => DEALER_MANAGER_ROLES.has(viewerRole), [viewerRole]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [users, setUsers] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [selectedRole, setSelectedRole] = useState(routeState?.role || "ALL");
  const [status, setStatus] = useState(routeState?.status || "ALL");
  const [search, setSearch] = useState(routeState?.search || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editFetching, setEditFetching] = useState(false);
  const [deleteFetching, setDeleteFetching] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});

  /** Salesman row currently targeted by the Manage Dealers modal (null = closed) */
  const [dealersSalesman, setDealersSalesman] = useState(null);

  // ── Guard: reset tab if no longer viewable ────────────────────────────────

  useEffect(() => {
    if (selectedRole !== "ALL" && !viewableRoles.includes(selectedRole)) {
      setSelectedRole("ALL");
    }
  }, [viewableRoles, selectedRole]);

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const usersResponse = await fetchUsers({
        page,
        limit,
        ...(selectedRole !== "ALL" && { role: selectedRole }),
        ...(search.trim() && { search: search.trim() }),
        ...(status !== "ALL" && { status: status.toLowerCase() }),
        includeDealers: false,
      });

      if (!usersResponse?.success) {
        throw new Error(usersResponse?.message || "Failed to fetch users");
      }
      const { employees = [], pages = 1 } = usersResponse.data || {};

      setUsers(employees);
      setTotalPages(pages);

      const mapResponse = await fetchUsers({
        page: 1,
        limit: 5000,
        status: "active",
        includeDealers: true,
      });

      if (mapResponse?.success && mapResponse?.data?.employees) {
        const userMapData = mapResponse.data.employees.reduce((acc, user) => {
          acc[user.employee_id] = user.employee_name;
          return acc;
        }, {});

        setUserMap(userMapData);
      }
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, selectedRole, search, status, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    document.body.style.overflow =
      isModalOpen || editingUser || dealersSalesman ? "hidden" : "auto";
  }, [isModalOpen, editingUser, dealersSalesman]);

  // ── Modal open/close helpers (reset stale form state) ────────────────────

  const openCreateModal = useCallback(() => {
    setFormData({});
    setOriginalData(null);
    setIsModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsModalOpen(false);
    setFormData({});
    setOriginalData(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingUser(null);
    setFormData({});
    setOriginalData(null);
  }, []);

  // ── CRUD Handlers ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      setLoading(true);
      if (!formData) return;

      if (formData.role && !creatableRoles.includes(formData.role)) {
        Swal.fire("Unauthorized", "You are not allowed to create a user with this role.", "error");
        return;
      }

      const errors = validateEmployeeFields({
        employee_name: formData.employee_name,
        employee_email: formData.employee_email,
        employee_phone: formData.employee_phone,
        password: formData.password,
        role: formData.role,
        isUpdate: false,
        allowedRoles: creatableRoles,
      });
      if (formData.password !== formData.confirm_password)
        errors.push({ field: "confirm_password", message: "Password and Confirm Password must match" });

      if (errors.length > 0) {
        const errorMap = errorsToMap(errors);
        const firstError = Object.values(errorMap)[0];
        throw new Error(firstError);
      }

      const ALLOWED_CREATE_FIELDS = [
        "employee_name", "employee_email", "password", "employee_phone", "role",
        "photo", "district", "town", "address",
      ];
      const payload = {};
      ALLOWED_CREATE_FIELDS.forEach((field) => {
        const value = formData[field]?.toString().trim();
        if (value) payload[field] = value;
      });

      const res = await createUser(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to create user");

      await Swal.fire({
        icon: "success",
        title: "User Created",
        text: res.message || "User created successfully!",
        confirmButtonColor: "#4f46e5",
      });
      closeCreateModal();
      loadUsers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setEditFetching(true);
      const res = await fetchUserById(id);
      if (!res?.success) throw new Error(res?.message || "Failed to fetch user");
      setFormData(res.data);
      setOriginalData(res.data);
      setEditingUser(id);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setEditFetching(false);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!editingUser) return;
      setLoading(true);
      const UPDATABLE_FIELDS = [
        "employee_name", "employee_email", "employee_phone", "role",
        "status", "shop_name", "district", "town", "address",
      ];
      const payload = {};
      UPDATABLE_FIELDS.forEach((field) => {
        const nv = formData[field]?.toString().trim() || "";
        const ov = originalData[field]?.toString().trim() || "";
        if (nv !== ov) payload[field] = field === "employee_phone" ? Number(nv) : nv;
      });
      if (!Object.keys(payload).length) {
        Swal.fire("No Changes", "No data was modified", "info");
        return;
      }
      const res = await updateUser(editingUser, payload);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      Swal.fire("Success", "User updated successfully", "success");
      closeEditModal();
      loadUsers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Delete User",
      input: "textarea",
      inputLabel: "Reason for deletion",
      inputPlaceholder: "Enter deletion reason…",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#6b7280",
      inputValidator: (v) => { if (!v?.trim()) return "Reason is required!"; },
    });
    if (!isConfirmed) return;
    try {
      setDeleteFetching(true);
      const res = await deleteUser(id, reason.trim());
      if (!res?.success) throw new Error(res?.message || "Delete failed");
      Swal.fire("Deleted!", "User deleted successfully", "success");
      loadUsers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setDeleteFetching(false);
    }
  };

  // ── Table Headers ─────────────────────────────────────────────────────────

  const tableHeaders = useMemo(
    () => ["User", "Email", "Role", "Status", "Created", ""],
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: T.surface }}>
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Users</h1>
            <p className="m3-body-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>
              Manage and track all system users
            </p>
          </div>
          {canCreateUser && (
            <Button variant="filled" icon={MdAdd} onClick={openCreateModal}>
              Add New User
            </Button>
          )}
        </div>

        {/* ── Role Tabs ── */}
        {/* A single-select filter row, which is what M3 filter chips are for. */}
        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max sm:flex-wrap sm:min-w-0">
            {roleTabs.map((role) => (
              <FilterChip
                key={role}
                selected={selectedRole === role}
                onClick={() => { setSelectedRole(role); setPage(1); }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {role !== "ALL" && (
                  <span
                    className="w-2 h-2 flex-shrink-0"
                    style={{ borderRadius: T.cornerFull, backgroundColor: ROLE_DOT[role] ?? T.outline }}
                  />
                )}
                {role === "ALL" ? "All" : getRoleLabel(role)}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* ── Main Table Card ── */}
        <Surface className="overflow-hidden">

          {/* Filters */}
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <MdSearch
                  size={20}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: T.onSurfaceVariant }}
                />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="m3-body-medium w-full pl-11 pr-4 h-10 focus:outline-none"
                  style={{
                    backgroundColor: T.surfaceContainerHigh,
                    borderRadius: T.cornerFull,
                    color: T.onSurface,
                  }}
                />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 m3-label-medium" style={{ color: T.onSurfaceVariant }}>
                  <MdFilterList size={16} />Filter
                </span>
                <div className="w-36">
                  <CustomSelect
                    name="status"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    options={STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <Table>
              <Thead>
                {tableHeaders.map((h, i) => (
                  <Th key={i} align={i === tableHeaders.length - 1 ? "right" : "left"}>{h}</Th>
                ))}
              </Thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-20 text-center">
                      <div className="flex justify-center">
                        <div className="relative w-10 h-10">
                          <div
                            className="absolute inset-0 border-4 rounded-full"
                            style={{ borderColor: T.surfaceContainerHighest }}
                          />
                          <div
                            className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
                            style={{ borderLeftColor: T.primary, borderRightColor: T.primary, borderBottomColor: T.primary }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length}>
                      <EmptyState icon={MdGroup} label="No users found" />
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSalesman = (u.role || "").toUpperCase() === ROLES.SALESMAN;
                    const dealerCount = isSalesman
                      ? (Array.isArray(u.dealers) ? u.dealers.length : u.dealer_count ?? undefined)
                      : undefined;

                    return (
                      <Tr key={u.employee_id}>
                        {/* ── User ── */}
                        <Td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 flex items-center justify-center m3-label-large flex-shrink-0"
                              style={{
                                borderRadius: T.cornerFull,
                                backgroundColor: CHIP_TONES[getRoleTone(u.role)].bg,
                                color: CHIP_TONES[getRoleTone(u.role)].fg,
                              }}
                            >
                              {formatName(u.employee_name)?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col leading-tight">
                              <p className="m3-body-medium" style={{ color: T.onSurface }}>
                                {formatName(u.employee_name)}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="m3-body-small font-mono" style={{ color: T.onSurfaceVariant }}>
                                  {u.employee_id}
                                </span>
                                <span className="m3-body-small" style={{ color: T.outline }}>•</span>
                                <span className="m3-body-small" style={{ color: T.onSurfaceVariant }}>
                                  {u.employee_phone}
                                </span>
                                {/* Dealer count — only for salesman */}
                                {isSalesman && dealerCount !== undefined && (
                                  <DealerCountBadge count={dealerCount} />
                                )}
                              </div>
                            </div>
                          </div>
                        </Td>

                        {/* ── Email ── */}
                        <Td muted>{u.employee_email}</Td>

                        {/* ── Role ── */}
                        <Td>
                          <Chip tone={getRoleTone(u.role)} className="whitespace-nowrap">
                            <span
                              className="w-1.5 h-1.5 flex-shrink-0"
                              style={{ borderRadius: T.cornerFull, backgroundColor: ROLE_DOT[u.role] ?? T.outline }}
                            />
                            {getRoleLabel(u.role)}
                          </Chip>
                        </Td>

                        {/* ── Status ── */}
                        <Td>
                          <Chip tone={u.status === "active" ? "success" : "error"}>
                            <span
                              className="w-1.5 h-1.5 flex-shrink-0"
                              style={{
                                borderRadius: T.cornerFull,
                                backgroundColor: u.status === "active" ? T.success : T.error,
                              }}
                            />
                            {u.status}
                          </Chip>
                        </Td>

                        {/* ── Created ── */}
                        <Td muted className="whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString()}
                        </Td>

                        {/* ── Actions ── */}
                        <Td align="right">
                          <UserActions
                            user={u}
                            onView={() => navigate(`/users/${u.employee_id}`)}
                            onEdit={() => handleEdit(u.employee_id)}
                            onDelete={() => handleDelete(u.employee_id)}
                            onManageDealers={() => setDealersSalesman(u)}
                            canManageDealers={canManageDealers}
                            editFetching={editFetching}
                            deleteFetching={deleteFetching}
                          />
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Surface>
      </div>

      {/* ── Create User Modal ── */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
            onClick={closeCreateModal}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <div
              className="w-full max-w-xl flex flex-col"
              style={{
                maxHeight: "90vh",
                backgroundColor: "var(--md-sys-color-surface-container-high)",
                borderRadius: T.cornerExtraLarge,
                boxShadow: T.elevation3,
              }}
            >
              <div
                className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5"
                    style={{
                      borderRadius: T.cornerFull,
                      backgroundColor: T.primaryContainer,
                      color: T.onPrimaryContainer,
                    }}
                  >
                    <MdGroup size={20} />
                  </div>
                  <div>
                    <h2 className="m3-title-medium" style={{ color: T.onSurface }}>Add New User</h2>
                    <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                      Create system account
                    </p>
                  </div>
                </div>
                <IconButton icon={MdClose} onClick={closeCreateModal} aria-label="Close dialog" />
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                <ModalInput
                  type="text"
                  placeholder="Full Name"
                  value={formData.employee_name || ""}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                />
                <ModalInput
                  type="email"
                  placeholder="Email Address"
                  value={formData.employee_email || ""}
                  onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalInput
                    type="password"
                    placeholder="Password"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <ModalInput
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirm_password || ""}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  />
                </div>
                <ModalInput
                  type="text"
                  placeholder="Phone Number"
                  value={formData.employee_phone || ""}
                  onChange={(e) => setFormData({ ...formData, employee_phone: e.target.value })}
                />
                <div className="relative">
                  <select
                    value={formData.role || ""}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full appearance-none m3-body-medium px-4 h-12 focus:outline-none cursor-pointer"
                    style={{
                      border: `1px solid ${T.outline}`,
                      borderRadius: T.cornerExtraSmall,
                      backgroundColor: T.surface,
                      color: T.onSurface,
                    }}
                  >
                    <option value="" disabled>Select Role</option>
                    {creatableRoles.map((role) => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center" style={{ color: T.onSurfaceVariant }}>
                    <MdExpandMore size={20} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ModalInput
                    type="text"
                    placeholder="District"
                    value={formData.district || ""}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                  <ModalInput
                    type="text"
                    placeholder="Town"
                    value={formData.town || ""}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  />
                </div>
                <textarea
                  rows="3"
                  placeholder="Address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full m3-body-medium px-4 py-3 focus:outline-none resize-none"
                  style={{
                    border: `1px solid ${T.outline}`,
                    borderRadius: T.cornerExtraSmall,
                    backgroundColor: T.surface,
                    color: T.onSurface,
                  }}
                />
              </div>

              <div
                className="px-6 py-4 flex justify-end gap-2 flex-shrink-0"
                style={{ borderTop: `1px solid ${T.outlineVariant}` }}
              >
                <Button variant="text" onClick={closeCreateModal}>Cancel</Button>
                <Button variant="filled" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating…" : "Create User"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
            onClick={closeEditModal}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <div
              className="w-full max-w-xl flex flex-col"
              style={{
                maxHeight: "90vh",
                backgroundColor: "var(--md-sys-color-surface-container-high)",
                borderRadius: T.cornerExtraLarge,
                boxShadow: T.elevation3,
              }}
            >
              <div
                className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5"
                    style={{
                      borderRadius: T.cornerFull,
                      backgroundColor: T.secondaryContainer,
                      color: T.onSecondaryContainer,
                    }}
                  >
                    <MdEdit size={20} />
                  </div>
                  <div>
                    <h2 className="m3-title-medium" style={{ color: T.onSurface }}>Edit User</h2>
                    <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                      Update user information
                    </p>
                  </div>
                </div>
                <IconButton icon={MdClose} onClick={closeEditModal} aria-label="Close dialog" />
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                {[
                  { placeholder: "Name", key: "employee_name" },
                  { placeholder: "Email", key: "employee_email", type: "email" },
                  { placeholder: "Phone", key: "employee_phone" },
                  { placeholder: "District", key: "district" },
                  { placeholder: "Town", key: "town" },
                ].map(({ placeholder, key, type = "text" }) => (
                  <ModalInput
                    key={key}
                    type={type}
                    placeholder={placeholder}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  />
                ))}

                <select
                  value={formData.role || ""}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full m3-body-medium px-4 h-12 focus:outline-none"
                  style={{
                    border: `1px solid ${T.outline}`,
                    borderRadius: T.cornerExtraSmall,
                    backgroundColor: T.surface,
                    color: T.onSurface,
                  }}
                >
                  {[...new Set([...(formData.role ? [formData.role] : []), ...creatableRoles])].map(
                    (role) => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    )
                  )}
                </select>

                <select
                  value={formData.status || ""}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full m3-body-medium px-4 h-12 focus:outline-none"
                  style={{
                    border: `1px solid ${T.outline}`,
                    borderRadius: T.cornerExtraSmall,
                    backgroundColor: T.surface,
                    color: T.onSurface,
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <textarea
                  placeholder="Address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full m3-body-medium px-4 py-3 focus:outline-none resize-none"
                  style={{
                    border: `1px solid ${T.outline}`,
                    borderRadius: T.cornerExtraSmall,
                    backgroundColor: T.surface,
                    color: T.onSurface,
                  }}
                />
              </div>

              <div
                className="px-6 py-4 flex justify-end gap-2 flex-shrink-0"
                style={{ borderTop: `1px solid ${T.outlineVariant}` }}
              >
                <Button variant="text" onClick={closeEditModal}>Cancel</Button>
                <Button variant="filled" onClick={handleUpdate}>Update User</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Manage Dealers Modal ── */}
      {dealersSalesman && canManageDealers && (
        <ManageDealersModal
          salesman={dealersSalesman}
          onClose={() => setDealersSalesman(null)}
          onSaved={loadUsers}
          userMap={userMap}
        />
      )}
    </div>
  );
};

export default User;