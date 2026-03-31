// dealers.jsx — Redesigned

import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus, FiSearch, FiX, FiCheck, FiChevronDown,
  FiEdit2, FiTrash2, FiEye, FiEyeOff, FiChevronLeft, FiChevronRight,
  FiAlertCircle, FiUsers, FiFilter,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchDealers, fetchDealerById, createDealer, updateDealer, deleteDealer } from "../api/dealer";
import { getAllBrands } from "../api/brands";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";

/* ================================================================
   MULTI-SELECT DROPDOWN  (logic unchanged)
   ================================================================ */
const MultiSelectDropdown = ({ options = [], selectedValues = [], onChange, placeholder, disabled, loading, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm, searchable]);

  const handleToggleOption = (optionValue) => {
    if (selectedValues.includes(optionValue)) onChange(selectedValues.filter((val) => val !== optionValue));
    else onChange([...selectedValues, optionValue]);
  };

  const handleRemoveTag = (valueToRemove) => onChange(selectedValues.filter((val) => val !== valueToRemove));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".multiselect-container")) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative multiselect-container">
      <div
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-lg border min-h-[42px] flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-indigo-300"
          } ${isOpen ? "border-indigo-400 ring-2 ring-indigo-100" : ""}`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm text-slate-400">{placeholder}</span>
          </div>
        ) : selectedValues.length > 0 ? (
          <>
            {selectedValues.map((value, index) => {
              const option = options.find((opt) => opt.value === value);
              return (
                <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-[120px]">
                  <span className="truncate">{option?.label || value}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveTag(value); }} className="text-indigo-400 hover:text-indigo-700 flex-shrink-0">
                    <FiX size={9} />
                  </button>
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-sm text-slate-400 font-medium">{placeholder}</span>
        )}
        <div className="ml-auto flex-shrink-0">
          <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <input
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brands…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
              <div
                key={index}
                className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedValues.includes(option.value) ? "bg-indigo-50" : ""}`}
                onClick={() => handleToggleOption(option.value)}
              >
                <span className={`font-medium ${selectedValues.includes(option.value) ? "text-indigo-700" : "text-slate-700"}`}>{option.label}</span>
                {selectedValues.includes(option.value) && <FiCheck className="text-indigo-600" size={14} />}
              </div>
            )) : (
              <div className="px-4 py-5 text-sm text-slate-400 text-center font-semibold">
                {searchTerm ? "No brands found" : "No brands available"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   CREATE / EDIT DEALER MODAL
   ================================================================ */
const CreateDealerModal = ({ isOpen, onClose, onDealerChanged, editingDealerId, editingDealerData }) => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", shop_name: "", district: "", town: "", brands: [], address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || brands.length > 0) return;
    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        const response = await getAllBrands("active");
        setBrands(response?.success && Array.isArray(response.data) ? response.data : []);
      } catch { setBrands([]); }
      finally { setBrandsLoading(false); }
    };
    fetchBrands();
  }, [isOpen, brands.length]);

  useEffect(() => {
    if (editingDealerId && editingDealerData) {
      setFormData({ name: editingDealerData.employee_name || "", email: editingDealerData.employee_email || "", phone: editingDealerData.employee_phone || "", password: "", shop_name: editingDealerData.shop_name || "", district: editingDealerData.district || "", town: editingDealerData.town || "", brands: Array.isArray(editingDealerData.brand) ? editingDealerData.brand : editingDealerData.brand ? [editingDealerData.brand] : [], address: editingDealerData.address || "" });
    } else {
      setFormData({ name: "", email: "", phone: "", password: "", shop_name: "", district: "", town: "", brands: [], address: "" });
    }
  }, [editingDealerId, editingDealerData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});
    if (!formData.name.trim()) { setFieldErrors({ employee_name: ["Dealer name is required"] }); setLoading(false); return; }
    if (!formData.email.trim()) { setFieldErrors({ employee_email: ["Email is required"] }); setLoading(false); return; }
    if (!formData.phone || String(formData.phone).trim() === "") { setFieldErrors({ employee_phone: ["Phone number is required"] }); setLoading(false); return; }
    if (!formData.brands.length) { setFieldErrors({ brand: ["Please select at least one brand"] }); setLoading(false); return; }
    try {
      let res;
      if (!editingDealerId) {
        const payload = { employee_name: formData.name.trim(), employee_email: formData.email.trim(), employee_phone: formData.phone.trim(), password: formData.password, role: "ROLE_DEALER", shop_name: formData.shop_name.trim(), district: formData.district.trim(), town: formData.town.trim(), brand: formData.brands, address: formData.address.trim() };
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
        if (!Object.keys(payload).length) { setLoading(false); Swal.fire({ icon: "info", title: "No changes detected", text: "Please modify at least one field before updating." }); return; }
        payload.role = "ROLE_DEALER";
        res = await updateDealer(editingDealerId, payload);
      }
      if (res?.success) { onDealerChanged(); onClose(); Swal.fire({ icon: "success", title: editingDealerId ? "Dealer Updated" : "Dealer Created", text: res.message || "Operation successful" }); }
      else setError(res?.message || "Failed to save dealer");
    } catch (err) { setError(err?.message || "Network error"); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const Field = ({ label, required, error: fieldError, children }) => (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {fieldError && <p className="text-xs text-rose-500 font-semibold">{fieldError}</p>}
    </div>
  );

  const Input = ({ className = "", ...props }) => (
    <input {...props} className={`w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all ${className}`} />
  );

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FiUsers size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{editingDealerId ? "Edit Dealer" : "Add New Dealer"}</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  {editingDealerId ? "Update dealer information" : "Create dealer account"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <FiX size={16} />
            </button>
          </div>

          {/* Form */}
          <form id="dealer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                <FiAlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Dealer Name" required error={fieldErrors["employee_name"]?.[0]}>
                <Input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter dealer name" autoComplete="name" />
              </Field>
              <Field label="Email" required error={fieldErrors["employee_email"]?.[0]}>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" autoComplete="email" />
              </Field>
              <Field label="Phone Number" required error={fieldErrors["employee_phone"]?.[0]}>
                <Input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter phone" />
              </Field>
              {!editingDealerId && (
                <Field label="Password" error={fieldErrors["password"]?.[0]}>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Enter password" className="pr-10" autoComplete="password" />
                    <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </Field>
              )}
              <Field label="Shop Name">
                <Input type="text" name="shop_name" value={formData.shop_name} onChange={handleChange} placeholder="Enter shop name" />
              </Field>
              <Field label="District">
                <Input type="text" name="district" value={formData.district} onChange={handleChange} placeholder="Enter district" />
              </Field>
              <Field label="Town">
                <Input type="text" name="town" value={formData.town} onChange={handleChange} placeholder="Enter town" />
              </Field>
            </div>
            <Field label="Brands" required error={fieldErrors["brand"]?.[0]}>
              <MultiSelectDropdown
                options={brandsLoading ? [] : Array.isArray(brands) ? brands.map((brand) => ({ value: brand.brand_name || brand.name || brand, label: brand.brand_name || brand.name || brand })) : []}
                selectedValues={formData.brands}
                onChange={(selectedBrands) => setFormData((prev) => ({ ...prev, brands: selectedBrands }))}
                placeholder={brandsLoading ? "Loading brands…" : "Select brands"}
                disabled={brandsLoading} loading={brandsLoading} searchable
              />
            </Field>
            <Field label="Address">
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Enter complete address"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
              />
            </Field>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all">Cancel</button>
            <button type="submit" form="dealer-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
              {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{editingDealerId ? "Updating…" : "Adding…"}</> : editingDealerId ? "Update Dealer" : "Add Dealer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ================================================================
   DEALER ACTIONS
   ================================================================ */
const DealerActions = ({ dealerId, onEdit, onDelete, dealerStatus, isSalesman }) => {
  if (dealerStatus?.toLowerCase() === "deleted") return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/dealers/${dealerId}`} title="View Details" className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
        <FiEye size={14} />
      </Link>
      {!isSalesman && (
        <>
          <button onClick={onEdit} title="Edit Dealer" className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all">
            <FiEdit2 size={14} />
          </button>
          <button onClick={onDelete} title="Delete Dealer" className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
            <FiTrash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

/* ================================================================
   PAGINATION
   ================================================================ */
const DealersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [...Array(totalPages)].map((_, i) => i + 1);
  const visiblePages = pages.filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);
  const handleChange = (page) => { if (page < 1 || page > totalPages) return; onPageChange(page); };

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">Page {currentPage} of {totalPages}</p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button onClick={() => handleChange(currentPage - 1)} disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronLeft size={13} />
        </button>
        {visiblePages.map((page, index) => {
          const showDots = index > 0 && page - visiblePages[index - 1] > 1;
          return (
            <div key={page} className="flex items-center">
              {showDots && <span className="px-1.5 text-slate-300 text-xs">…</span>}
              <button onClick={() => handleChange(page)}
                className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === currentPage ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"}`}>
                {page}
              </button>
            </div>
          );
        })}
        <button onClick={() => handleChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT — Dealers
   ================================================================ */
const Dealers = () => {
  const { user } = useAuth();
  const isSalesman = user?.role === ROLES.SALESMAN;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [includePassword, setIncludePassword] = useState(false);
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
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [error, setError] = useState("");

  const canViewPasswords = useMemo(() => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role), [user?.role]);

  const fetchDealersList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchDealers({ page: currentPage, limit: 10, role: "ROLE_DEALER", search: searchQuery, includePassword: canViewPasswords && includePassword, includeDealers: true, status: selectedStatus !== "ALL" ? selectedStatus.toLowerCase() : undefined });
      if (res?.success && res?.data?.employees) {
        setDealers(res.data.employees);
        setTotalPages(res?.data?.pages || 1);
      } else { setDealers([]); setError(res?.message || "Unexpected response"); }
    } catch { setDealers([]); setError("Failed to load dealers. Please try again."); }
    finally { setLoading(false); }
  };

  const fetchUsersForCreatedByMap = async () => {
    try {
      const response = await fetchUsers({ page: 1, limit: 500, status: "active", includePassword: false, includeDealers: false });
      if (response?.success && response?.data?.employees) {
        const map = {};
        response.data.employees.forEach((u) => { map[u.employee_id] = u.employee_name; });
        setUserMap(map);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchDealersList(); fetchUsersForCreatedByMap(); }, [currentPage, searchQuery, selectedStatus, canViewPasswords, includePassword]);

  const handlePageChange = (page) => { if (page < 1 || page > totalPages) return; setCurrentPage(page); };
  const handleDealerChanged = () => { fetchDealersList(); setEditingDealerId(null); setEditingDealerData(null); };
  const handleEditDealer = async (dealerId) => {
    if (isSalesman) return;
    setEditingDealerId(dealerId); setIsModalOpen(true);
    try { const res = await fetchDealerById(dealerId); if (res?.success && res?.data) setEditingDealerData(res.data); } catch { }
  };
  const handleOpenDeleteModal = (dealerId) => {
    if (isSalesman) return;
    setSelectedDealerId(dealerId); setDeleteReason(""); setDeleteError(""); setShowDeleteModal(true);
  };
  const handleDeleteDealer = async () => {
    setDeleteLoading(true); setDeleteError("");
    try {
      const res = await deleteDealer(selectedDealerId, deleteReason);
      if (res?.success) { setShowDeleteModal(false); await Swal.fire({ icon: "success", title: "Dealer Deleted", text: res.message || "Dealer deleted successfully!" }); fetchDealersList(); }
      else setDeleteError(res?.message || "Failed to delete dealer");
    } catch (err) { setDeleteError(err?.message || "Network error"); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dealers</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Manage and track dealer accounts</p>
          </div>
          {!isSalesman && (
            <button onClick={() => { setIsModalOpen(true); setEditingDealerId(null); setEditingDealerData(null); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200">
              <FiPlus size={14} />Add New Dealer
            </button>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Filter Bar */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

              {/* Search Bar */}
              <div className="relative w-full lg:max-w-sm">
                <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text"
                  placeholder="Search by name or shop…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>
                <div className="w-36">
                  <CustomSelect name="status" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} options={["ALL", "Active", "Inactive", "Deleted"]} />
                </div>
                {canViewPasswords && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={includePassword} onChange={(e) => setIncludePassword(e.target.checked)} className="accent-indigo-600 w-3.5 h-3.5" />
                    Show Passwords
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Loading dealers…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100"><FiAlertCircle size={22} className="text-rose-500" /></div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button onClick={fetchDealersList} className="text-sm text-indigo-600 font-bold hover:text-indigo-700 transition-colors">Try Again</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Dealer", "Shop", "Phone", "District", "Status", "Created By", "Created Date", ...(includePassword && canViewPasswords ? ["Password"] : []), ""].map((h, i, arr) => (
                      <th key={i} className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ${i === arr.length - 1 ? "text-right" : "text-left"} whitespace-nowrap`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dealers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-5 bg-slate-100 rounded-2xl"><FiUsers size={24} className="text-slate-400" /></div>
                          <p className="text-sm font-semibold text-slate-500">No dealers found</p>
                          <p className="text-xs text-slate-400">Try adjusting filters or search terms</p>
                        </div>
                      </td>
                    </tr>
                  ) : dealers.map((dealer) => (
                    <tr key={dealer.employee_id} className="hover:bg-slate-50/60 transition-colors duration-100 group">
                      {/* Dealer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm border border-indigo-100 flex-shrink-0">
                            {dealer.employee_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{capitalizeFirstLetter(dealer.employee_name)}</p>
                            <span className="text-[9px] font-mono text-slate-400">{dealer.employee_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{capitalizeFirstLetter(dealer.shop_name)}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">{dealer.employee_phone}</td>
                      <td className="px-5 py-4 text-slate-600 font-medium">{dealer.district}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${(dealer.status || "").toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(dealer.status || "").toLowerCase() === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {dealer.status || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium text-xs">{userMap[dealer.created_by] || dealer.created_by}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">{dealer.created_at ? new Date(dealer.created_at).toLocaleDateString() : ""}</td>
                      {includePassword && canViewPasswords && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input type={showPasswordMap[dealer.employee_id] ? "text" : "password"} value={dealer.password || ""} readOnly className="w-24 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50" />
                            <button onClick={() => setShowPasswordMap((prev) => ({ ...prev, [dealer.employee_id]: !prev[dealer.employee_id] }))} className="text-slate-400 hover:text-slate-700 transition-colors">
                              {showPasswordMap[dealer.employee_id] ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <DealerActions dealerId={dealer.employee_id} onEdit={() => handleEditDealer(dealer.employee_id)} onDelete={() => handleOpenDeleteModal(dealer.employee_id)} dealerStatus={dealer.status} isSalesman={isSalesman} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DealersPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateDealerModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingDealerId(null); setEditingDealerData(null); }} onDealerChanged={handleDealerChanged} editingDealerId={editingDealerId} editingDealerData={editingDealerData} />

      {/* Delete Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6">
              <div className="flex flex-col items-center mb-5">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-3"><FiTrash2 size={22} className="text-rose-500" /></div>
                <h2 className="text-base font-bold text-slate-900">Delete Dealer</h2>
                <p className="text-sm text-slate-400 mt-1 text-center">This action cannot be undone. Please provide a reason.</p>
              </div>
              <textarea className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all resize-none mb-3" placeholder="Reason for deletion (optional)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} />
              {deleteError && <p className="text-xs text-rose-500 font-semibold mb-3">{deleteError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleDeleteDealer} disabled={deleteLoading} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-60">
                  {deleteLoading ? "Deleting…" : "Delete Dealer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dealers;
