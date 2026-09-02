// Dealers.jsx — Material Design 3
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdAdd, MdSearch, MdClose, MdCheck, MdExpandMore,
  MdEdit, MdDeleteOutline, MdVisibility, MdVisibilityOff,
  MdChevronLeft, MdChevronRight,
  MdErrorOutline, MdStorefront, MdFilterList,
} from "react-icons/md";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

import CustomSelect from "../components/CustomSelect";
import { ROLES } from "../utils/roles";
import { validateEmployeeFields } from "../utils/validationUtils";

import { fetchDealers, fetchDealerById, createDealer, updateDealer, deleteDealer } from "../api/dealer";
import { getAllBrands } from "../api/brands";
import { useAuth } from "../hooks/useAuth";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import {
  Surface, Button, IconButton, Chip, Banner, EmptyState,
  Table, Thead, Th, Tr, Td,
} from "../components/m3";
import { T } from "../components/m3/tokens";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES — defined at module level so they never re-mount and
// never cause inputs to lose focus between keystrokes.
// ─────────────────────────────────────────────────────────────────────────────

/** Labelled field wrapper with optional inline error message. */
const FormField = ({ label, required, errorMsg, children }) => (
  <div className="space-y-1.5">
    <label className="block m3-label-medium" style={{ color: T.onSurfaceVariant }}>
      {label}{required && <span className="ml-0.5" style={{ color: T.error }}>*</span>}
    </label>
    {children}
    {errorMsg && (
      <p className="flex items-center gap-1 m3-body-small mt-1" style={{ color: T.error }}>
        <MdErrorOutline size={14} />{errorMsg}
      </p>
    )}
  </div>
);

/** Styled text input. */
const FormInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full m3-body-medium px-3.5 h-11 focus:outline-none ${className}`}
    style={{
      border: `1px solid ${T.outline}`,
      borderRadius: T.cornerExtraSmall,
      backgroundColor: T.surface,
      color: T.onSurface,
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
const MultiSelectDropdown = ({
  options = [], selectedValues = [], onChange,
  placeholder, disabled, loading, searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm, searchable]);

  const handleToggleOption = (value) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
    );
  };

  const handleRemoveTag = (value) => onChange(selectedValues.filter((v) => v !== value));

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".multiselect-container")) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative multiselect-container">
      <div
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 min-h-[44px] flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{
          border: `1px solid ${isOpen ? T.primary : T.outline}`,
          borderRadius: T.cornerExtraSmall,
          backgroundColor: T.surface,
        }}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: T.primary, borderTopColor: "transparent" }}
            />
            <span className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>{placeholder}</span>
          </div>
        ) : selectedValues.length > 0 ? (
          <>
            {selectedValues.map((value) => {
              const option = options.find((o) => o.value === value);
              return (
                <Chip key={value} tone="primary" className="max-w-[140px]">
                  <span className="truncate">{option?.label || value}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveTag(value); }}
                    aria-label={`Remove ${option?.label || value}`}
                    className="flex-shrink-0 opacity-70 hover:opacity-100"
                  >
                    <MdClose size={12} />
                  </button>
                </Chip>
              );
            })}
          </>
        ) : (
          <span className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>{placeholder}</span>
        )}
        <div className="ml-auto flex-shrink-0">
          <MdExpandMore
            className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            style={{ color: T.onSurfaceVariant }}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 max-h-60 overflow-hidden"
          style={{
            backgroundColor: T.surfaceContainer,
            borderRadius: T.cornerSmall,
            boxShadow: T.elevation2,
          }}
        >
          {searchable && (
            <div className="p-2" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brands…"
                className="w-full px-3 h-10 m3-body-medium focus:outline-none"
                style={{
                  border: `1px solid ${T.outline}`,
                  borderRadius: T.cornerExtraSmall,
                  backgroundColor: T.surface,
                  color: T.onSurface,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0
              ? filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="px-4 h-12 cursor-pointer flex items-center justify-between m3-state-layer m3-body-large"
                  style={{
                    backgroundColor: selectedValues.includes(option.value) ? T.secondaryContainer : "transparent",
                    color: selectedValues.includes(option.value) ? T.onSecondaryContainer : T.onSurface,
                  }}
                  onClick={() => handleToggleOption(option.value)}
                >
                  <span>{option.label}</span>
                  {selectedValues.includes(option.value) && <MdCheck size={18} />}
                </div>
              ))
              : (
                <div className="px-4 py-5 m3-body-medium text-center" style={{ color: T.onSurfaceVariant }}>
                  {searchTerm ? "No brands found" : "No brands available"}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL FORM STATE — stable reference outside the component
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DEALER_FORM = {
  name: "", email: "", phone: "", password: "",
  shop_name: "", district: "", town: "", brands: [], address: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD KEY REMAPPER
// validateEmployeeFields returns errors keyed as "employee_name", "employee_email",
// "employee_phone", "password". The form state uses "name", "email", "phone",
// "password". This remapper bridges the gap so errors display on the right fields
// and the fieldErrors guard doesn't silently block valid submissions.
// ─────────────────────────────────────────────────────────────────────────────
const VALIDATOR_KEY_TO_FORM_KEY = {
  employee_name: "name",
  employee_email: "email",
  employee_phone: "phone",
  password: "password",
};

/**
 * Converts the raw errors array from validateEmployeeFields into a map
 * keyed by the *form* field names used in this component.
 */
const remapErrors = (errors) => {
  const map = {};
  errors.forEach(({ field, message }) => {
    const formKey = VALIDATOR_KEY_TO_FORM_KEY[field] ?? field;
    map[formKey] = message;
  });
  return map;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / EDIT DEALER MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CreateDealerModal = ({
  isOpen, onClose, onDealerChanged,
  editingDealerId, editingDealerData,
}) => {
  const [formData, setFormData] = useState(INITIAL_DEALER_FORM);
  const [loading, setLoading] = useState(false);
  /** Global API-level error message */
  const [apiError, setApiError] = useState("");
  /** Per-field validation errors: Record<formFieldKey, message> */
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Fetch brands once when modal first opens
  useEffect(() => {
    if (!isOpen || brands.length > 0) return;
    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        const response = await getAllBrands("active");
        setBrands(response?.success && Array.isArray(response.data) ? response.data : []);
      } catch {
        setBrands([]);
      } finally {
        setBrandsLoading(false);
      }
    };
    fetchBrands();
  }, [isOpen, brands.length]);

  // Populate form when editing
  useEffect(() => {
    if (editingDealerId && editingDealerData) {
      setFormData({
        name: editingDealerData.employee_name || "",
        email: editingDealerData.employee_email || "",
        phone: editingDealerData.employee_phone || "",
        password: "",
        shop_name: editingDealerData.shop_name || "",
        district: editingDealerData.district || "",
        town: editingDealerData.town || "",
        brands: Array.isArray(editingDealerData.brand)
          ? editingDealerData.brand
          : editingDealerData.brand ? [editingDealerData.brand] : [],
        address: editingDealerData.address || "",
      });
    } else if (isOpen && !editingDealerId) {
      setFormData(INITIAL_DEALER_FORM);
    }
    setApiError("");
    setFieldErrors({});
  }, [editingDealerId, editingDealerData, isOpen]);

  // Generic change handler — clears the field's own error on change
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setApiError("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    const errors = validateEmployeeFields({
      employee_name: formData.name,
      employee_email: formData.email,
      employee_phone: formData.phone,
      ...(editingDealerId ? {} : { password: formData.password }),
      role: "ROLE_DEALER",
      isUpdate: Boolean(editingDealerId),
      allowedRoles: [],
    });

    if (!formData.brands.length) {
      errors.push({ field: "brands", message: "Please select at least one brand" });
    }

    if (errors.length > 0) {
      setFieldErrors(remapErrors(errors));
      return;
    }

    setLoading(true);
    try {
      let res;

      if (!editingDealerId) {
        const payload = {
          employee_name: formData.name.trim(),
          employee_email: formData.email.trim(),
          employee_phone: formData.phone.trim(),
          password: formData.password,
          role: "ROLE_DEALER",
          shop_name: formData.shop_name.trim(),
          district: formData.district.trim(),
          town: formData.town.trim(),
          brand: formData.brands,
          address: formData.address.trim(),
        };
        res = await createDealer(payload);
      } else {
        const payload = {};
        if (formData.name !== editingDealerData.employee_name) payload.employee_name = formData.name;
        if (formData.email !== editingDealerData.employee_email) payload.employee_email = formData.email;
        if (formData.phone !== editingDealerData.employee_phone) payload.employee_phone = formData.phone;
        if (formData.shop_name !== editingDealerData.shop_name) payload.shop_name = formData.shop_name;
        if (formData.district !== editingDealerData.district) payload.district = formData.district;
        if (formData.town !== editingDealerData.town) payload.town = formData.town;
        if (formData.address !== editingDealerData.address) payload.address = formData.address;

        const originalBrands = editingDealerData.brand || [];
        const addedBrands = formData.brands.filter((b) => !originalBrands.includes(b));
        const removedBrands = originalBrands.filter((b) => !formData.brands.includes(b));
        if (addedBrands.length) payload.brand = addedBrands;
        if (removedBrands.length) payload.remove_brands = removedBrands;

        if (!Object.keys(payload).length) {
          setLoading(false);
          Swal.fire({ icon: "info", title: "No changes detected", text: "Please modify at least one field before updating." });
          return;
        }
        payload.role = "ROLE_DEALER";
        res = await updateDealer(editingDealerId, payload);
      }

      if (res?.success) {
        onDealerChanged();
        onClose();
        Swal.fire({
          icon: "success",
          title: editingDealerId ? "Dealer Updated" : "Dealer Created",
          text: res.message || "Operation successful",
        });
      } else {
        setApiError(res?.message || "Failed to save dealer");
      }
    } catch (err) {
      setApiError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const brandOptions = Array.isArray(brands)
    ? brands.map((b) => ({
      value: b.brand_name || b.name || b,
      label: b.brand_name || b.name || b,
    }))
    : [];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
        onClick={onClose}
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
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
                <MdStorefront size={20} />
              </div>
              <div>
                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>
                  {editingDealerId ? "Edit Dealer" : "Add New Dealer"}
                </h2>
                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                  {editingDealerId ? "Update dealer information" : "Create dealer account"}
                </p>
              </div>
            </div>
            <IconButton icon={MdClose} onClick={onClose} aria-label="Close dialog" />
          </div>

          {/* Form */}
          <form
            id="dealer-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
            noValidate
          >
            {/* API-level error */}
            {apiError && <Banner tone="error">{apiError}</Banner>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ✅ errorMsg now reads "name" key, matching remapped fieldErrors */}
              <FormField label="Dealer Name" required errorMsg={fieldErrors["name"]}>
                <FormInput
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter dealer name"
                  autoComplete="off"
                />
              </FormField>

              <FormField label="Email" required errorMsg={fieldErrors["email"]}>
                <FormInput
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  autoComplete="off"
                />
              </FormField>

              <FormField label="Phone Number" required errorMsg={fieldErrors["phone"]}>
                <FormInput
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone"
                />
              </FormField>

              {!editingDealerId && (
                <FormField label="Password" errorMsg={fieldErrors["password"]}>
                  <div className="relative">
                    <FormInput
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-3 flex items-center"
                      style={{ color: T.onSurfaceVariant }}
                    >
                      {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                    </button>
                  </div>
                </FormField>
              )}

              <FormField label="Shop Name">
                <FormInput
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  placeholder="Enter shop name"
                />
              </FormField>

              <FormField label="District">
                <FormInput
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="Enter district"
                />
              </FormField>

              <FormField label="Town">
                <FormInput
                  type="text"
                  name="town"
                  value={formData.town}
                  onChange={handleChange}
                  placeholder="Enter town"
                />
              </FormField>
            </div>

            <FormField label="Brands" required errorMsg={fieldErrors["brands"]}>
              <MultiSelectDropdown
                options={brandOptions}
                selectedValues={formData.brands}
                onChange={(selectedBrands) => {
                  setFormData((prev) => ({ ...prev, brands: selectedBrands }));
                  setFieldErrors((prev) => { const n = { ...prev }; delete n.brands; return n; });
                }}
                placeholder={brandsLoading ? "Loading brands…" : "Select brands"}
                disabled={brandsLoading}
                loading={brandsLoading}
                searchable
              />
            </FormField>

            <FormField label="Address">
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter complete address"
                className="w-full m3-body-medium px-3.5 py-2.5 focus:outline-none resize-none"
                style={{
                  border: `1px solid ${T.outline}`,
                  borderRadius: T.cornerExtraSmall,
                  backgroundColor: T.surface,
                  color: T.onSurface,
                }}
              />
            </FormField>
          </form>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: `1px solid ${T.outlineVariant}` }}
          >
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button variant="filled" type="submit" form="dealer-form" disabled={loading}>
              {loading
                ? <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />{editingDealerId ? "Updating…" : "Adding…"}</>
                : editingDealerId ? "Update Dealer" : "Add Dealer"
              }
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DEALER ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
const DealerActions = ({ dealerId, onEdit, onDelete, dealerStatus, canUpdateDealer, canDeleteDealer }) => {
  if (dealerStatus?.toLowerCase() === "deleted") return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        to={`/dealers/${dealerId}`}
        title="View Details"
        aria-label="View dealer details"
        className="m3-icon-button m3-state-layer m3-focus"
      >
        <MdVisibility size={20} />
      </Link>
      {canUpdateDealer && canDeleteDealer && (
        <>
          <IconButton icon={MdEdit} onClick={onEdit} title="Edit Dealer" aria-label="Edit dealer" />
          <IconButton
            icon={MdDeleteOutline}
            onClick={onDelete}
            title="Delete Dealer"
            aria-label="Delete dealer"
            style={{ color: T.error }}
          />
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────
const DealersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [...Array(totalPages)].map((_, i) => i + 1);
  const visiblePages = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);
  const handleChange = (p) => { if (p < 1 || p > totalPages) return; onPageChange(p); };

  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderTop: `1px solid ${T.outlineVariant}` }}
    >
      <p className="m3-body-small hidden sm:block" style={{ color: T.onSurfaceVariant }}>
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <IconButton
          icon={MdChevronLeft}
          onClick={() => handleChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
        {visiblePages.map((page, index) => {
          const showDots = index > 0 && page - visiblePages[index - 1] > 1;
          const current = page === currentPage;
          return (
            <div key={page} className="flex items-center">
              {showDots && (
                <span className="px-1.5 m3-body-small" style={{ color: T.onSurfaceVariant }}>…</span>
              )}
              <button
                type="button"
                onClick={() => handleChange(page)}
                aria-current={current ? "page" : undefined}
                className="m3-label-large m3-state-layer m3-focus min-w-[32px] h-8 px-2.5 flex items-center justify-center"
                style={{
                  borderRadius: T.cornerFull,
                  backgroundColor: current ? T.secondaryContainer : "transparent",
                  color: current ? T.onSecondaryContainer : T.onSurfaceVariant,
                }}
              >
                {page}
              </button>
            </div>
          );
        })}
        <IconButton
          icon={MdChevronRight}
          onClick={() => handleChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — Dealers
// ─────────────────────────────────────────────────────────────────────────────
const Dealers = () => {
  const { user } = useAuth();

  const canCreateDealer = useMemo(() => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role), [user?.role]);
  const canUpdateDealer = useMemo(() => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role), [user?.role]);
  const canDeleteDealer = useMemo(() => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role), [user?.role]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [totalPages, setTotalPages] = useState(1);
  const [dealers, setDealers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDealerId, setEditingDealerId] = useState(null);
  const [editingDealerData, setEditingDealerData] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDealersList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchDealers({
        page: currentPage, limit: 10, role: "ROLE_DEALER",
        search: searchQuery,
        includeDealers: true,
        status: selectedStatus !== "ALL" ? selectedStatus.toLowerCase() : undefined,
      });
      if (res?.success && res?.data?.employees) {
        setDealers(res.data.employees);
        setTotalPages(res?.data?.pages || 1);
      } else {
        setDealers([]);
        setError(res?.message || "Unexpected response");
      }
    } catch {
      setDealers([]);
      setError("Failed to load dealers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedStatus]);

  const fetchUsersForCreatedByMap = useCallback(async () => {
    try {
      const response = await fetchUsers({ page: 1, limit: 500, status: "active", includeDealers: false });
      if (response?.success && response?.data?.employees) {
        const map = {};
        response.data.employees.forEach((u) => { map[u.employee_id] = u.employee_name; });
        setUserMap(map);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDealersList();
    fetchUsersForCreatedByMap();
  }, [fetchDealersList, fetchUsersForCreatedByMap]);

  const handlePageChange = (page) => { if (page < 1 || page > totalPages) return; setCurrentPage(page); };

  const handleDealerChanged = () => {
    fetchDealersList();
    setEditingDealerId(null);
    setEditingDealerData(null);
  };

  const handleEditDealer = async (dealerId) => {
    if (!canUpdateDealer) return;
    setEditingDealerId(dealerId);
    setIsModalOpen(true);
    try {
      const res = await fetchDealerById(dealerId);
      if (res?.success && res?.data) setEditingDealerData(res.data);
    } catch {
      // ignore fetch errors here; modal will show empty state
    }
  };

  const handleOpenDeleteModal = (dealerId) => {
    if (!canDeleteDealer) return;
    setSelectedDealerId(dealerId);
    setDeleteReason("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleDeleteDealer = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await deleteDealer(selectedDealerId, deleteReason);
      if (res?.success) {
        setShowDeleteModal(false);
        await Swal.fire({ icon: "success", title: "Dealer Deleted", text: res.message || "Dealer deleted successfully!" });
        fetchDealersList();
      } else {
        setDeleteError(res?.message || "Failed to delete dealer");
      }
    } catch (err) {
      setDeleteError(err?.message || "Network error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: T.surface }}>
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Dealers</h1>
            <p className="m3-body-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>
              Manage and track dealer accounts
            </p>
          </div>
          {canCreateDealer && (
            <Button
              variant="filled"
              icon={MdAdd}
              onClick={() => { setIsModalOpen(true); setEditingDealerId(null); setEditingDealerData(null); }}
            >
              Add New Dealer
            </Button>
          )}
        </div>

        {/* Main Card */}
        <Surface className="overflow-hidden">

          {/* Filter Bar */}
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="relative w-full lg:max-w-sm">
                <MdSearch
                  size={20}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: T.onSurfaceVariant }}
                />
                <input
                  type="text"
                  placeholder="Search by name or shop…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    options={["ALL", "Active", "Inactive", "Deleted"]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
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
              <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>Loading dealers…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4" style={{ backgroundColor: T.errorContainer, borderRadius: T.cornerFull }}>
                <MdErrorOutline size={24} style={{ color: T.onErrorContainer }} />
              </div>
              <p className="m3-body-medium" style={{ color: T.error }}>{error}</p>
              <Button variant="text" onClick={fetchDealersList}>Try Again</Button>
            </div>
          ) : (
            <Table>
                <Thead>
                  {[
                    "Dealer", "Shop", "Phone", "District", "Status",
                    "Created By", "Created Date",
                    "",
                  ].map((h, i, arr) => (
                    <Th key={i} align={i === arr.length - 1 ? "right" : "left"}>{h}</Th>
                  ))}
                </Thead>
                <tbody>
                  {dealers.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState icon={MdStorefront} label="No dealers found" />
                        <p className="m3-body-small text-center -mt-8 pb-8" style={{ color: T.onSurfaceVariant }}>
                          Try adjusting filters or search terms
                        </p>
                      </td>
                    </tr>
                  ) : dealers.map((dealer) => (
                    <Tr key={dealer.employee_id}>
                      {/* Dealer */}
                      <Td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center flex-shrink-0 m3-label-large"
                            style={{
                              borderRadius: T.cornerFull,
                              backgroundColor: T.primaryContainer,
                              color: T.onPrimaryContainer,
                            }}
                          >
                            {dealer.employee_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="m3-body-medium" style={{ color: T.onSurface }}>
                              {formatName(dealer.employee_name)}
                            </p>
                            <span className="m3-body-small font-mono" style={{ color: T.onSurfaceVariant }}>
                              {dealer.employee_id}
                            </span>
                          </div>
                        </div>
                      </Td>
                      <Td muted>{capitalizeFirstLetter(dealer.shop_name)}</Td>
                      <Td muted className="whitespace-nowrap">{dealer.employee_phone}</Td>
                      <Td muted>{dealer.district}</Td>
                      <Td>
                        {/* Dot plus label: state is never carried by colour alone. */}
                        <Chip tone={(dealer.status || "").toLowerCase() === "active" ? "success" : "error"}>
                          <span
                            className="w-1.5 h-1.5 flex-shrink-0"
                            style={{
                              borderRadius: T.cornerFull,
                              backgroundColor: (dealer.status || "").toLowerCase() === "active" ? T.success : T.error,
                            }}
                          />
                          {dealer.status || "N/A"}
                        </Chip>
                      </Td>
                      <Td muted>{formatName(userMap[dealer.created_by] || dealer.created_by)}</Td>
                      <Td muted className="whitespace-nowrap">
                        {dealer.created_at ? new Date(dealer.created_at).toLocaleDateString() : ""}
                      </Td>
                      <Td align="right">
                        <DealerActions
                          dealerId={dealer.employee_id}
                          onEdit={() => handleEditDealer(dealer.employee_id)}
                          onDelete={() => handleOpenDeleteModal(dealer.employee_id)}
                          dealerStatus={dealer.status}
                          canUpdateDealer={canUpdateDealer}
                          canDeleteDealer={canDeleteDealer}
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
            </Table>
          )}

          <DealersPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </Surface>
      </div>

      {/* Create/Edit Modal */}
      <CreateDealerModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDealerId(null); setEditingDealerData(null); }}
        onDealerChanged={handleDealerChanged}
        editingDealerId={editingDealerId}
        editingDealerData={editingDealerData}
      />

      {/* Delete Modal */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-md p-6"
              style={{
                backgroundColor: "var(--md-sys-color-surface-container-high)",
                borderRadius: T.cornerExtraLarge,
                boxShadow: T.elevation3,
              }}
            >
              <div className="flex flex-col items-center mb-5">
                <div
                  className="p-4 mb-3"
                  style={{ backgroundColor: T.errorContainer, borderRadius: T.cornerFull }}
                >
                  <MdDeleteOutline size={24} style={{ color: T.onErrorContainer }} />
                </div>
                <h2 className="m3-headline-small" style={{ color: T.onSurface }}>Delete Dealer</h2>
                <p className="m3-body-medium mt-2 text-center" style={{ color: T.onSurfaceVariant }}>
                  This action cannot be undone. Please provide a reason.
                </p>
              </div>
              <textarea
                className="w-full m3-body-medium px-3.5 py-3 focus:outline-none resize-none mb-3"
                style={{
                  border: `1px solid ${T.outline}`,
                  borderRadius: T.cornerExtraSmall,
                  backgroundColor: T.surface,
                  color: T.onSurface,
                }}
                placeholder="Reason for deletion (optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
              {deleteError && (
                <p className="m3-body-small mb-3" style={{ color: T.error }}>{deleteError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="text" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button
                  variant="filled"
                  onClick={handleDeleteDealer}
                  disabled={deleteLoading}
                  style={{ backgroundColor: T.error, color: T.onError }}
                >
                  {deleteLoading ? "Deleting…" : "Delete Dealer"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dealers;