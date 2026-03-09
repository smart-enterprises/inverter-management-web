import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import Swal from "sweetalert2";
import { Link } from "react-router-dom";

import CustomSelect from "../components/CustomSelect";
import {
  fetchDealers,
  fetchDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
} from "../api/dealer";
import { getAllBrands } from "../api/brands";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";

// MultiSelectDropdown component remains unchanged
const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder,
  disabled,
  loading,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, searchable]);

  const handleToggleOption = (optionValue) => {
    if (selectedValues.includes(optionValue)) {
      onChange(selectedValues.filter((val) => val !== optionValue));
    } else {
      onChange([...selectedValues, optionValue]);
    }
  };

  const handleRemoveTag = (valueToRemove) => {
    onChange(selectedValues.filter((val) => val !== valueToRemove));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".multiselect-container")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative multiselect-container">
      <div
        className={`w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm min-h-[42px] flex flex-wrap items-center gap-1 cursor-pointer ${disabled
          ? "opacity-50 cursor-not-allowed bg-gray-50"
          : "bg-white hover:border-gray-300"
          } ${isOpen ? "ring-1 ring-gray-300 focus:ring-gray-300" : ""}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#9333EA]"></div>
            <span className="text-gray-500">{placeholder}</span>
          </div>
        ) : selectedValues.length > 0 ? (
          <>
            {selectedValues.map((value, index) => {
              const option = options.find((opt) => opt.value === value);
              return (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#9333EA]/10 text-[#9333EA] max-w-[120px] truncate"
                >
                  <span className="truncate">{option?.label || value}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(value);
                    }}
                    className="ml-1 text-[#9333EA]/70 hover:text-[#9333EA] flex-shrink-0"
                  >
                    <FiX size={10} />
                  </button>
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <div className="ml-auto flex-shrink-0">
          <FiChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
              }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search brands..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectedValues.includes(option.value) ? "bg-[#9333EA]/5" : ""
                    }`}
                  onClick={() => handleToggleOption(option.value)}
                >
                  <span>{option.label}</span>
                  {selectedValues.includes(option.value) && (
                    <FiCheck className="w-4 h-4 text-[#9333EA]" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? "No brands found" : "No brands available"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateDealerModal = ({
  isOpen,
  onClose,
  onDealerChanged,
  editingDealerId,
  editingDealerData,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    shop_name: "",
    district: "",
    town: "",
    brands: [],
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  // Fetch brands data
  useEffect(() => {
    if (!isOpen || brands.length > 0) return;
    const fetchBrands = async () => {
      try {
        setBrandsLoading(true);
        const response = await getAllBrands("active");
        if (response?.success && Array.isArray(response.data)) {
          setBrands(response.data);
        } else {
          setBrands([]);
        }
      } catch {
        setBrands([]);
      } finally {
        setBrandsLoading(false);
      }
    };
    fetchBrands();
  }, [isOpen, brands.length]);

  // Populate form when editingDealerData changes
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
          : editingDealerData.brand
            ? [editingDealerData.brand]
            : [],
        address: editingDealerData.address || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        shop_name: "",
        district: "",
        town: "",
        brands: [],
        address: "",
      });
    }
  }, [editingDealerId, editingDealerData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors({});
  };

  // 🔹 IMPROVED: Clean & dynamic payload handling

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    // 🔹 BASIC VALIDATION
    if (!formData.name.trim()) {
      setFieldErrors({ employee_name: ["Dealer name is required"] });
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setFieldErrors({ employee_email: ["Email is required"] });
      setLoading(false);
      return;
    }

    if (!formData.phone || String(formData.phone).trim() === "") {
      setFieldErrors({ employee_phone: ["Phone number is required"] });
      setLoading(false);
      return;
    }

    if (!formData.brands.length) {
      setFieldErrors({ brand: ["Please select at least one brand"] });
      setLoading(false);
      return;
    }

    try {
      let res;

      // 🔹 CREATE DEALER
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
      }

      // 🔹 UPDATE DEALER (IMPORTANT)
      else {
        const payload = {};

        // 🔹 NEW: Field comparison logic
        if (formData.name !== editingDealerData.employee_name)
          payload.employee_name = formData.name;

        if (formData.email !== editingDealerData.employee_email)
          payload.employee_email = formData.email;

        if (formData.phone !== editingDealerData.employee_phone)
          payload.employee_phone = formData.phone;

        if (formData.shop_name !== editingDealerData.shop_name)
          payload.shop_name = formData.shop_name;

        if (formData.district !== editingDealerData.district)
          payload.district = formData.district;

        if (formData.town !== editingDealerData.town)
          payload.town = formData.town;

        if (formData.address !== editingDealerData.address)
          payload.address = formData.address;

        // 🔹 NEW: Brand comparison
        const originalBrands = editingDealerData.brand || [];
        const newBrands = formData.brands;

        const addedBrands = newBrands.filter(
          (b) => !originalBrands.includes(b)
        );

        const removedBrands = originalBrands.filter(
          (b) => !newBrands.includes(b)
        );

        if (addedBrands.length) payload.brand = addedBrands;
        if (removedBrands.length) payload.remove_brands = removedBrands;

        // 🔹 NEW: Prevent empty update call
        if (!Object.keys(payload).length) {
          setLoading(false);
          Swal.fire({
            icon: "info",
            title: "No changes detected",
            text: "Please modify at least one field before updating.",
          });
          return;
        }

        payload.role = "ROLE_DEALER";

        res = await updateDealer(editingDealerId, payload);
      }

      // 🔹 SUCCESS HANDLING
      if (res?.success) {
        onDealerChanged();
        onClose();

        Swal.fire({
          icon: "success",
          title: editingDealerId ? "Dealer Updated" : "Dealer Created",
          text: res.message || "Operation successful",
        });
      } else {
        setError(res?.message || "Failed to save dealer");
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div
          className="bg-white rounded-3xl shadow-2xl border w-full max-w-lg sm:max-w-xl mx-auto relative flex flex-col animate-fade-in"
          style={{ minHeight: 0, maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white rounded-t-3xl flex items-center justify-between px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center w-full">
              {editingDealerId ? "Edit Dealer" : "Add New Dealer"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4">
              <FiX className="text-gray-500" size={22} />
            </button>
          </div>
          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
            <form className="space-y-6" onSubmit={handleSubmit} id="dealer-form">
              {error && !Object.keys(fieldErrors).length && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
              )}
              {/* Dealer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dealer Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter dealer name"
                  autoComplete="name"
                />
                {fieldErrors["employee_name"] && (
                  <div className="text-red-600 text-xs mt-1">{fieldErrors["employee_name"].map((msg, idx) => <div key={idx}>{msg}</div>)}</div>
                )}
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter email"
                  autoComplete="email"
                />
                {fieldErrors["employee_email"] && (
                  <div className="text-red-600 text-xs mt-1">{fieldErrors["employee_email"].map((msg, idx) => <div key={idx}>{msg}</div>)}</div>
                )}
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter phone number"
                />
                {fieldErrors["employee_phone"] && (
                  <div className="text-red-600 text-xs mt-1">{fieldErrors["employee_phone"].map((msg, idx) => <div key={idx}>{msg}</div>)}</div>
                )}
              </div>
              {/* Password (only if creating) */}
              {!editingDealerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm pr-10"
                      placeholder="Enter password"
                      autoComplete="password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  {fieldErrors["password"] && (
                    <div className="text-red-600 text-xs mt-1">{fieldErrors["password"].map((msg, idx) => <div key={idx}>{msg}</div>)}</div>
                  )}
                </div>
              )}
              {/* Shop Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter shop name"
                />
              </div>
              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter district"
                />
              </div>
              {/* Town */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Town</label>
                <input
                  type="text"
                  name="town"
                  value={formData.town}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter town"
                />
              </div>
              {/* Brands MultiSelect */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brands <span className="text-red-500">*</span>
                </label>
                <MultiSelectDropdown
                  options={
                    brandsLoading
                      ? []
                      : Array.isArray(brands)
                        ? brands.map((brand) => ({
                          value: brand.brand_name || brand.name || brand,
                          label: brand.brand_name || brand.name || brand,
                        }))
                        : []
                  }
                  selectedValues={formData.brands}
                  onChange={(selectedBrands) =>
                    setFormData((prev) => ({ ...prev, brands: selectedBrands }))
                  }
                  placeholder={
                    brandsLoading ? "Loading brands..." : "Select brands"
                  }
                  disabled={brandsLoading}
                  loading={brandsLoading}
                  searchable={true}
                />
                {fieldErrors["brand"] && (
                  <div className="text-red-600 text-xs mt-1">
                    {fieldErrors["brand"].map((msg, idx) => (
                      <div key={idx}>{msg}</div>
                    ))}
                  </div>
                )}
              </div>
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter complete address"
                />
              </div>
            </form>
          </div>
          {/* Footer Buttons */}
          <div className="sticky bottom-0 z-20 bg-white rounded-b-3xl flex items-center justify-end gap-3 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="dealer-form"
              className="px-8 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] shadow-md transition-colors text-base font-semibold"
              disabled={loading}
            >
              {loading
                ? editingDealerId
                  ? "Updating..."
                  : "Adding..."
                : editingDealerId
                  ? "Update Dealer"
                  : "Add Dealer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const DealerActions = ({
  dealerId,
  onEdit,
  onDelete,
  dealerStatus,
  isSalesman,
}) => {
  // Show action buttons only if status is not "Deleted"
  if (dealerStatus?.toLowerCase() === "deleted") return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        to={`/dealers/${dealerId}`}
        className="inline-flex items-center justify-center p-2 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#2563EB]/5 rounded-lg transition-colors"
        title="View Details"
      >
        <FiEye size={16} />
      </Link>
      {!isSalesman && (
        <>
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center p-2 text-[#9333EA] hover:text-[#8829DD] hover:bg-[#9333EA]/5 rounded-lg transition-colors"
            title="Edit Dealer"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center p-2 text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#DC2626]/5 rounded-lg transition-colors"
            title="Delete Dealer"
          >
            <FiTrash2 size={16} />
          </button>
        </>
      )}
    </div>
  );
};

// Pagination component remains unchanged
function DealersPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [...Array(totalPages)].map((_, i) => i + 1);

  const visiblePages = pages.filter((page) => {
    return (
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
    );
  });

  const handleChange = (page) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <div className="flex justify-end p-4">

      <nav
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm"
        aria-label="Dealers pagination"
      >

        {/* Previous */}
        <button
          onClick={() => handleChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={18} />
        </button>

        {/* Pages */}
        <div className="flex items-center gap-1">

          {visiblePages.map((page, index) => {

            const showDots =
              index > 0 &&
              page - visiblePages[index - 1] > 1;

            return (
              <div key={page} className="flex items-center">

                {showDots && (
                  <span className="px-2 text-gray-400 select-none">
                    ...
                  </span>
                )}

                <button
                  onClick={() => handleChange(page)}
                  className={`min-w-[36px] h-9 px-3 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 ${page === currentPage
                    ? "bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow-md scale-[1.05]"
                    : "text-gray-600 hover:bg-gray-100 hover:scale-[1.03]"
                    }`}
                >
                  {page}
                </button>

              </div>
            );
          })}

        </div>

        {/* Next */}
        <button
          onClick={() => handleChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={18} />
        </button>

      </nav>

    </div>
  );
}

const Dealers = () => {
  const { user } = useAuth();
  const isSalesman = user?.role === ROLES.SALESMAN;

  // State variables
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

  const canViewPasswords = useMemo(
    () =>
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(user?.role),
    [user?.role]
  );

  // Fetch dealers with pagination
  const fetchDealersList = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetchDealers({
        page: currentPage,
        limit: 10,
        role: "ROLE_DEALER",
        search: searchQuery,
        includePassword: canViewPasswords && includePassword, // Use only if you want to fetch passwords
        includeDealers: true,
        status: selectedStatus !== "ALL" ? selectedStatus.toLowerCase() : undefined,
      });

      if (res?.success && res?.data?.employees) {
        setDealers(res.data.employees);
        const totalItems = res?.data?.pagination || 0;
        const totalPageCount = res?.data?.pages || 1;
        setTotalPages(totalPageCount);
      } else {
        setDealers([]);
        setError(res?.message || "Unexpected response from server");
      }
    } catch (err) {
      setDealers([]);
      setError("Failed to load dealers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch users for created_by mapping
  const fetchUsersForCreatedByMap = async () => {
    try {
      const response = await fetchUsers({
        page: 1,
        limit: 500,
        status: "active",
        includePassword: false,
        includeDealers: false,
      });

      if (response && response.success && response.data && response.data.employees) {
        const userMap = {};
        response.data.employees.forEach((user) => {
          userMap[user.employee_id] = user.employee_name;
        });
        setUserMap(userMap);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDealersList();
    fetchUsersForCreatedByMap();
  }, [currentPage, searchQuery, selectedStatus, canViewPasswords, includePassword]);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Handle dealer creation/editing
  const handleDealerChanged = () => {
    fetchDealersList();
    setEditingDealerId(null);
    setEditingDealerData(null);
  };

  const handleEditDealer = async (dealerId) => {
    if (isSalesman) return;
    setEditingDealerId(dealerId);
    setIsModalOpen(true);
    try {
      const res = await fetchDealerById(dealerId);
      if (res?.success && res?.data) {
        setEditingDealerData(res.data);
      }
    } catch {
      // handle error if needed
    }
  };

  // Handle delete modal
  const handleOpenDeleteModal = (dealerId) => {
    if (isSalesman) return;
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
        await Swal.fire({
          icon: "success",
          title: "Dealer Deleted",
          text: res.message || "Dealer deleted successfully!",
          confirmButtonText: "OK",
        });
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Dealers</h1>
            {!isSalesman && (
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setEditingDealerId(null);
                  setEditingDealerData(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
              >
                <FiPlus className="text-lg" />
                Add New Dealer
              </button>
            )}
          </div>

          {/* Dealers List */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or shop name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <CustomSelect
                name="status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
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

          {/* ================= DEALERS TABLE ================= */}

          {loading ? (

            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#9333EA] mb-4"></div>
              <p className="text-sm text-gray-500">Loading dealers...</p>
            </div>

          ) : error ? (

            <div className="py-16 text-center">
              <p className="text-sm text-red-600">{error}</p>

              <button
                onClick={fetchDealersList}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-[#9333EA] rounded-lg hover:bg-[#7e22ce] transition"
              >
                Try Again
              </button>
            </div>

          ) : (

            <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  {/* Header */}
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10">

                    <tr>

                      <th className="px-6 py-4 text-left font-medium">Dealer</th>

                      <th className="px-6 py-4 text-left font-medium">Shop</th>

                      <th className="px-6 py-4 text-left font-medium">Phone</th>

                      <th className="px-6 py-4 text-left font-medium">District</th>

                      <th className="px-6 py-4 text-left font-medium">Status</th>

                      <th className="px-6 py-4 text-left font-medium">Created By</th>

                      <th className="px-6 py-4 text-left font-medium">Created Date</th>

                      {includePassword && canViewPasswords && (
                        <th className="px-6 py-4 text-left font-medium">Password</th>
                      )}

                      <th className="px-6 py-4 text-right font-medium">Actions</th>

                    </tr>

                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-gray-100">

                    {dealers.length > 0 ? (

                      dealers.map((dealer) => (

                        <tr
                          key={dealer.employee_id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >

                          {/* Dealer */}
                          <td className="px-6 py-4">

                            <div className="flex items-center gap-3">

                              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#9333EA]/10 text-[#9333EA] font-semibold text-sm">
                                {dealer.employee_name?.charAt(0).toUpperCase()}
                              </div>

                              <div className="flex flex-col">

                                <span className="font-semibold text-gray-900">
                                  {capitalizeFirstLetter(dealer.employee_name)}
                                </span>

                                <span className="text-xs text-gray-400">
                                  {dealer.employee_id}
                                </span>

                              </div>

                            </div>

                          </td>

                          {/* Shop */}
                          <td className="px-6 py-4 text-gray-600">
                            {capitalizeFirstLetter(dealer.shop_name)}
                          </td>

                          {/* Phone */}
                          <td className="px-6 py-4 text-gray-600">
                            {dealer.employee_phone}
                          </td>

                          {/* District */}
                          <td className="px-6 py-4 text-gray-600">
                            {dealer.district}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">

                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${(dealer.status || "").toLowerCase() === "active"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                                }`}
                            >
                              {dealer.status || "N/A"}
                            </span>

                          </td>

                          {/* Created By */}
                          <td className="px-6 py-4 text-gray-600">
                            {userMap[dealer.created_by] || dealer.created_by}
                          </td>

                          {/* Created Date */}
                          <td className="px-6 py-4 text-gray-500">
                            {dealer.created_at
                              ? new Date(dealer.created_at).toLocaleDateString()
                              : ""}
                          </td>

                          {/* Password */}
                          {includePassword && canViewPasswords && (

                            <td className="px-6 py-4">

                              <div className="flex items-center gap-2">

                                <input
                                  type={
                                    showPasswordMap[dealer.employee_id]
                                      ? "text"
                                      : "password"
                                  }
                                  value={dealer.password || ""}
                                  readOnly
                                  className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-md bg-gray-50"
                                />

                                <button
                                  onClick={() =>
                                    setShowPasswordMap((prev) => ({
                                      ...prev,
                                      [dealer.employee_id]:
                                        !prev[dealer.employee_id],
                                    }))
                                  }
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {showPasswordMap[dealer.employee_id] ? (
                                    <FiEyeOff size={16} />
                                  ) : (
                                    <FiEye size={16} />
                                  )}
                                </button>

                              </div>

                            </td>

                          )}

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">

                            <DealerActions
                              dealerId={dealer.employee_id}
                              onEdit={() => handleEditDealer(dealer.employee_id)}
                              onDelete={() => handleOpenDeleteModal(dealer.employee_id)}
                              dealerStatus={dealer.status}
                              isSalesman={isSalesman}
                            />

                          </td>

                        </tr>

                      ))

                    ) : (

                      <tr>

                        <td colSpan="9" className="py-20 text-center">

                          <div className="flex flex-col items-center gap-3">

                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <FiSearch size={22} />
                            </div>

                            <p className="text-sm font-medium text-gray-700">
                              No dealers found
                            </p>

                            <p className="text-xs text-gray-500">
                              Try adjusting filters or search terms
                            </p>

                          </div>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

              {/* Pagination */}
              <DealersPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />

            </div>

          )}
        </div>

        {/* Add/Edit Dealer Modal */}
        <CreateDealerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingDealerId(null);
            setEditingDealerData(null);
          }}
          onDealerChanged={handleDealerChanged}
          editingDealerId={editingDealerId}
          editingDealerData={editingDealerData}
        />

        {/* Delete Dealer Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close"
              >
                <FiX size={22} />
              </button>
              <div className="flex flex-col items-center mb-6">
                <div className="bg-[#fde5e5] text-[#fd2c2c] rounded-full p-3 mb-2">
                  <FiTrash2 size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Dealer</h2>
                <p className="text-sm text-gray-500 mt-1">Are you sure you want to delete this dealer?</p>
              </div>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-gray-200 mb-3"
                placeholder="Reason for deletion (optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
              />
              {deleteError && <div className="text-red-600 text-sm mb-2">{deleteError}</div>}
              <button
                className="w-full bg-[#fd2c2c] hover:bg-[#ff4747] text-white py-2.5 rounded-lg font-semibold transition-all duration-200 mt-2 shadow-md hover:shadow-lg hover:scale-105"
                onClick={handleDeleteDealer}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Dealer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dealers;