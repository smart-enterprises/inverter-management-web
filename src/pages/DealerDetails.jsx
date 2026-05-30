import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox, FiCalendar,
  FiPackage, FiTruck, FiPercent, FiPlus, FiTrash2, FiSearch, FiEdit3,
  FiChevronLeft, FiChevronRight, FiAlertCircle, FiTag, FiX, FiCheck,
  FiChevronDown, FiRefreshCw, FiArrowRight, FiFilter, FiShield, FiUserCheck,
} from "react-icons/fi";
import Swal from "sweetalert2";

import {
  fetchDealerById, fetchDealerDiscounts, createDealerDiscounts,
  updateDealerDiscount, updateDealer,
} from "../api/dealer";
import { getBrandsByDealer, getAllBrands } from "../api/brands";
import { fetchOrders } from "../api/orders";
import { fetchProductsByBrands } from "../api/products";
import CustomSelect from "../components/CustomSelect";
import {
  getPriorityStyle, getStatusStyle,
  ORDER_STATUS_LIST, PRIORITY_OPTIONS,
} from "../utils/status";
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import { canManageDiscounts } from "../utils/discountPermissions";
import { useRouteAccess } from "../hooks/useRouteAccess";
import { fetchUsers } from "../api/user";
import { ROLES } from "../utils/roles";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ORDER_HISTORY_LIMIT = 5;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const createEmptyDiscountRow = () => ({
  id: crypto.randomUUID(),
  brand_name: "",
  model_name: "",
  product_ids: [],
  discount_value: "",
  is_percentage: true,
  description: "",
});

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "N/A";

const getTotalItems = (details = []) =>
  details.reduce((acc, item) => acc + (item.qty_ordered || 0), 0);

const buildBrandModelMap = (brands = []) =>
  brands.reduce((map, brand) => {
    if (!brand?.brand_name) return map;
    const models = Array.isArray(brand.brand_models) ? brand.brand_models : [];
    map[brand.brand_name] = models;
    if (brand.brand_id) map[brand.brand_id] = models;
    return map;
  }, {});

// ─────────────────────────────────────────────
// Shared Style Tokens
// ─────────────────────────────────────────────

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400";

// ─────────────────────────────────────────────
// Primitive UI Components
// ─────────────────────────────────────────────

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3.5 px-5 py-4 rounded-xl hover:bg-slate-50/60 transition-colors group">
    <div className="mt-0.5 p-2 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 group-hover:border-blue-200 transition-colors flex-shrink-0">
      {React.cloneElement(icon, { size: 13 })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">
        {value || <span className="text-slate-300 font-normal">—</span>}
      </p>
    </div>
  </div>
);

const FormField = ({ label, required, errorMsg, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
      {label}
      {required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
    {errorMsg && (
      <p className="flex items-center gap-1 text-xs text-rose-500 font-semibold mt-1">
        <FiAlertCircle size={11} />
        {errorMsg}
      </p>
    )}
  </div>
);

const SectionCard = ({ title, subtitle, action, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const StatPill = ({ title, value, color }) => {
  const palette = {
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    yellow: "text-amber-700 bg-amber-50 border-amber-200",
    purple: "text-amber-700 bg-amber-50 border-amber-200",
    orange: "text-blue-700 bg-blue-50 border-blue-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
  };
  const cls = palette[color] ?? "text-slate-700 bg-slate-50 border-slate-200";
  const [textCls, ...bgCls] = cls.split(" ");
  return (
    <div className={`rounded-xl border px-5 py-4 ${bgCls.join(" ")}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70 mb-1">{title}</p>
      <p className={`text-3xl font-black tabular-nums ${textCls}`}>{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getStatusStyle(status)}`}
  >
    {status}
  </span>
);

const PriorityBadge = ({ priority }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getPriorityStyle(priority)}`}
  >
    {priority || "N/A"}
  </span>
);

const AlertBanner = ({ message }) =>
  message ? (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
      <FiAlertCircle size={14} className="flex-shrink-0" />
      {message}
    </div>
  ) : null;

const PageLoader = ({ label = "Loading…" }) => (
  <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
  </div>
);

const Spinner = ({ size = "w-3.5 h-3.5", border = "border-white/40 border-t-white" }) => (
  <div className={`${size} border-2 ${border} rounded-full animate-spin`} />
);

// ─────────────────────────────────────────────
// Modal Shell Components
// ─────────────────────────────────────────────

const ModalShell = ({ maxWidth = "max-w-xl", children }) => (
  <>
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col`}
        style={{ maxHeight: "92vh" }}
      >
        {children}
      </div>
    </div>
  </>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-start justify-between">
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
    </div>
    <button
      onClick={onClose}
      aria-label="Close"
      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0 ml-4"
    >
      <FiX size={16} />
    </button>
  </div>
);

const ModalFooter = ({
  onClose,
  onSubmit,
  submitting,
  submitLabel = "Save",
  cancelLabel = "Cancel",
}) => (
  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex gap-3 flex-shrink-0">
    <button
      onClick={onClose}
      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
    >
      {cancelLabel}
    </button>
    <button
      onClick={onSubmit}
      disabled={submitting}
      className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-blue-200 inline-flex items-center justify-center gap-2"
    >
      {submitting ? (
        <>
          <Spinner />
          Saving…
        </>
      ) : (
        submitLabel
      )}
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Filter / Pagination Components
// ─────────────────────────────────────────────

const DateRangeFilter = ({ startDate, endDate, onStartChange, onEndChange }) => (
  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
    <FiCalendar size={11} className="text-slate-400 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">From</span>
      <input
        type="date"
        value={startDate}
        onChange={onStartChange}
        className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer min-w-[110px]"
      />
    </div>
    <FiArrowRight size={10} className="text-slate-300 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">To</span>
      <input
        type="date"
        value={endDate}
        onChange={onEndChange}
        className="text-[11px] font-medium text-slate-700 bg-transparent outline-none cursor-pointer min-w-[110px]"
      />
    </div>
    {(startDate || endDate) && (
      <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-full uppercase tracking-wide">
        Active
      </span>
    )}
  </div>
);

const MiniPagination = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <div className="flex items-center gap-1.5 mt-4 justify-end">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronLeft size={13} />
      </button>
      {visible.map((p, i) => (
        <div key={p} className="flex items-center">
          {i > 0 && p - visible[i - 1] > 1 && (
            <span className="px-1.5 text-slate-300 text-xs">…</span>
          )}
          <button
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === page
              ? "bg-blue-600 text-white shadow-sm"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {p}
          </button>
        </div>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronRight size={13} />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Multi-Select Components
// ─────────────────────────────────────────────

const ProductMultiSelect = ({ products = [], selected = [], onChange }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="min-h-[44px] flex flex-wrap gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm font-medium">Select products…</span>
        )}
        {selected.map((id) => {
          const product = products.find((p) => p.product_id === id);
          if (!product) return null;
          return (
            <span
              key={id}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-black"
            >
              {product.product_name}
              <button
                onMouseDown={(e) => { e.stopPropagation(); toggle(id); }}
                className="text-blue-400 hover:text-blue-700"
              >
                <FiX size={9} />
              </button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-400 text-center font-semibold">
                No products found
              </div>
            ) : (
              filtered.map((product) => {
                const active = selected.includes(product.product_id);
                return (
                  <div
                    key={product.product_id}
                    onMouseDown={(e) => { e.stopPropagation(); toggle(product.product_id); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer flex justify-between hover:bg-slate-50 transition-colors ${active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                      }`}
                  >
                    <span>{product.product_name} ({product.model})</span>
                    {active && <FiCheck size={13} className="text-blue-600 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BrandMultiSelect = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select brands…",
  disabled = false,
  loading = false,
  searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm, searchable]);

  const toggle = (value) =>
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
    );

  const removeTag = (value) => onChange(selectedValues.filter((v) => v !== value));

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => !disabled && !loading && setOpen((p) => !p)}
        className={`w-full px-3.5 py-2.5 rounded-lg border min-h-[42px] flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
          : "bg-white border-slate-200 hover:border-blue-300"
          } ${open ? "border-blue-400 ring-2 ring-blue-100" : ""}`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner border="border-blue-200 border-t-blue-600" />
            <span className="text-sm text-slate-400">{placeholder}</span>
          </div>
        ) : selectedValues.length > 0 ? (
          selectedValues.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 max-w-[120px]"
              >
                <span className="truncate">{option?.label || value}</span>
                <button
                  type="button"
                  onMouseDown={(e) => { e.stopPropagation(); removeTag(value); }}
                  className="text-blue-400 hover:text-blue-700 flex-shrink-0"
                >
                  <FiX size={9} />
                </button>
              </span>
            );
          })
        ) : (
          <span className="text-sm text-slate-400 font-medium">{placeholder}</span>
        )}
        <div className="ml-auto flex-shrink-0">
          <FiChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Search brands…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((option) => {
                const active = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onMouseDown={(e) => { e.stopPropagation(); toggle(option.value); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${active ? "bg-blue-50" : ""
                      }`}
                  >
                    <span className={`font-medium ${active ? "text-blue-700" : "text-slate-700"}`}>
                      {option.label}
                    </span>
                    {active && <FiCheck className="text-blue-600 flex-shrink-0" size={14} />}
                  </div>
                );
              })
            ) : (
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

// ─────────────────────────────────────────────
// Discount Toggle
// ─────────────────────────────────────────────

const DiscountToggle = ({ isPercentage, onChange }) => (
  <div className="flex bg-slate-100 rounded-full p-1 flex-shrink-0">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${!isPercentage ? "bg-white shadow text-blue-600" : "text-slate-500"
        }`}
    >
      ₹
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${isPercentage ? "bg-white shadow text-blue-600" : "text-slate-500"
        }`}
    >
      %
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────

const AddBrandModelsModal = ({ dealerId, existingBrands = [], onClose, onSuccess }) => {
  const [allBrands, setAllBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setBrandsLoading(true);
        const res = await getAllBrands("active");
        if (res?.success && Array.isArray(res.data)) setAllBrands(res.data);
      } catch (err) {
        console.error("Failed to load brands:", err);
      } finally {
        setBrandsLoading(false);
      }
    };
    load();
  }, []);

  const availableOptions = useMemo(
    () =>
      allBrands
        .filter((b) => !existingBrands.includes(b.brand_name))
        .map((b) => ({ value: b.brand_name, label: b.brand_name })),
    [allBrands, existingBrands]
  );

  const handleSubmit = async () => {
    setError("");
    if (!selectedBrands.length) {
      setError("Please select at least one brand.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await updateDealer(dealerId, { brand: selectedBrands, role: "ROLE_DEALER" });
      if (!res?.success) throw new Error(res?.message || "Failed to update brands.");
      onSuccess();
      onClose();
      Swal.fire({ icon: "success", title: "Brands Added", text: res.message || "Brands assigned successfully." });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell maxWidth="max-w-lg">
      <ModalHeader
        title="Add Brands"
        subtitle="Assign new brands to this dealer account"
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <AlertBanner message={error} />
        {existingBrands.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">
              Currently Assigned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingBrands.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wide"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}
        <FormField label="Select Brands to Add" required>
          <BrandMultiSelect
            options={availableOptions}
            selectedValues={selectedBrands}
            onChange={setSelectedBrands}
            placeholder={
              brandsLoading
                ? "Loading brands…"
                : availableOptions.length === 0
                  ? "All brands already assigned"
                  : "Select brands…"
            }
            disabled={brandsLoading || availableOptions.length === 0}
            loading={brandsLoading}
            searchable
          />
          {!brandsLoading && availableOptions.length === 0 && (
            <p className="text-xs text-slate-400 italic mt-1">
              All available brands are already assigned to this dealer.
            </p>
          )}
        </FormField>
      </div>
      <ModalFooter
        onClose={onClose}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Add Brands"
      />
    </ModalShell>
  );
};

const AddDiscountsModal = ({ dealerId, allBrands, brandToModels, onClose, onSuccess }) => {
  const [rows, setRows] = useState([createEmptyDiscountRow()]);
  const [productsByBrand, setProductsByBrand] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateRow = (idx, patch) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const fetchBrandProducts = async (brandName) => {
    if (productsByBrand[brandName]) return;
    try {
      const res = await fetchProductsByBrands([brandName]);
      if (res?.success && res.data)
        setProductsByBrand((prev) => ({ ...prev, [brandName]: res.data }));
    } catch (err) {
      console.error("Product fetch failed:", err);
    }
  };

  const handleBrandChange = async (idx, brandName) => {
    updateRow(idx, { brand_name: brandName, model_name: "", product_ids: [] });
    if (brandName) await fetchBrandProducts(brandName);
  };

  const handleSubmit = async () => {
    setError("");
    const payload = rows
      .filter((r) => r.brand_name && r.model_name && r.discount_value)
      .map((r) => ({
        dealer_id: dealerId,
        brand_name: r.brand_name,
        model_name: r.model_name,
        product_ids: r.product_ids,
        discount_value: Number(r.discount_value),
        is_percentage: Boolean(r.is_percentage),
        description: r.description?.trim() || "",
      }));
    if (!payload.length) {
      setError("Please configure at least one valid discount rule.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await createDealerDiscounts(payload);
      if (!res?.success) throw new Error(res?.message);
      onSuccess();
      onClose();
      Swal.fire({ icon: "success", title: "Discounts Saved", text: res.message || "Discounts added successfully." });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell maxWidth="max-w-5xl">
      <ModalHeader
        title="Add Dealer Discounts"
        subtitle="Configure pricing rules across brands, models and products"
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
        <AlertBanner message={error} />
        {rows.map((row, idx) => (
          <div key={row.id} className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Discount Rule {idx + 1}
              </p>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(idx)}
                  aria-label="Remove rule"
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <FiTrash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Brand" required>
                <CustomSelect
                  value={row.brand_name}
                  onChange={(e) => handleBrandChange(idx, e.target.value)}
                  options={allBrands.map((b) => b.brand_name)}
                  placeholder="Select Brand"
                />
              </FormField>
              <FormField label="Model" required>
                <CustomSelect
                  value={row.model_name}
                  onChange={(e) => updateRow(idx, { model_name: e.target.value })}
                  options={row.brand_name ? brandToModels[row.brand_name] || [] : []}
                  placeholder="Select Model"
                  disabled={!row.brand_name}
                />
              </FormField>
              <FormField label="Discount" required>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={row.is_percentage ? 100 : undefined}
                    value={row.discount_value}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (row.is_percentage && Number(v) > 100) v = "100";
                      updateRow(idx, { discount_value: v });
                    }}
                    placeholder="Enter value"
                    className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  />
                  <DiscountToggle
                    isPercentage={row.is_percentage}
                    onChange={(val) => updateRow(idx, { is_percentage: val })}
                  />
                </div>
              </FormField>
              <FormField label="Products">
                <ProductMultiSelect
                  products={(productsByBrand[row.brand_name] || []).filter((p) =>
                    row.model_name
                      ? p.model === row.model_name || p.model_name === row.model_name
                      : true
                  )}
                  selected={row.product_ids}
                  onChange={(ids) => updateRow(idx, { product_ids: ids })}
                />
              </FormField>
            </div>
            <FormField label="Description (Optional)">
              <div>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={row.description}
                  onChange={(e) => updateRow(idx, { description: e.target.value })}
                  placeholder="Enter description…"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
                />
                <p className="text-[10px] text-slate-400 text-right mt-1">
                  {row.description?.length || 0}/200
                </p>
              </div>
            </FormField>
          </div>
        ))}
      </div>
      <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center flex-shrink-0">
        <button
          onClick={() => setRows((prev) => [...prev, createEmptyDiscountRow()])}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-blue-300 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all"
        >
          <FiPlus size={13} />
          Add Rule
        </button>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-blue-200"
          >
            {submitting ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              "Save Discounts"
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const EditDiscountModal = ({
  discount,
  productsByBrand,
  onClose,
  onSave,
  onChange,
}) => (
  <ModalShell maxWidth="max-w-xl">
    <ModalHeader
      title="Edit Discount Rule"
      subtitle="Update pricing configuration for this dealer"
      onClose={onClose}
    />
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Brand">
          <input value={discount.brand_name} disabled className={inputCls} />
        </FormField>
        <FormField label="Model">
          <input value={discount.model_name} disabled className={inputCls} />
        </FormField>
      </div>
      <FormField label="Discount">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={discount.discount_value}
            onChange={(e) => onChange({ discount_value: e.target.value })}
            className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
          />
          <DiscountToggle
            isPercentage={discount.is_percentage}
            onChange={(val) => onChange({ is_percentage: val })}
          />
        </div>
      </FormField>
      <FormField label="Products">
        <ProductMultiSelect
          products={(productsByBrand[discount.brand_name] || []).filter((p) =>
            discount.model_name ? p.model === discount.model_name : true
          )}
          selected={discount.product_ids || []}
          onChange={(ids) => onChange({ product_ids: ids })}
        />
      </FormField>
      <FormField label="Description">
        <textarea
          rows={3}
          value={
            discount.description && discount.description.toLowerCase() !== "null"
              ? discount.description
              : ""
          }
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Enter description…"
          className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
        />
      </FormField>
    </div>
    <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
      <button
        onClick={onClose}
        className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
      >
        Update Discount
      </button>
    </div>
  </ModalShell>
);

// ─────────────────────────────────────────────
// Page Sections
// ─────────────────────────────────────────────

const BrandsModelsSection = ({ dealer, brandToModels, onAddBrand, showBrandActions }) => {
  const existingBrands = dealer?.brand || [];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FiTag size={14} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Brands & Models</h2>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
              Assigned product lines
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {existingBrands.length > 0 && (
            <span className="inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black bg-slate-100 text-slate-600 border-slate-200 uppercase tracking-wide">
              {existingBrands.length} brands
            </span>
          )}
          {showBrandActions && (
            <button
              onClick={onAddBrand}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
            >
              <FiPlus size={13} />
              Add Brands
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {existingBrands.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-3">
              <FiTag size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No brands assigned</p>
            <p className="text-xs text-slate-400 mt-1">
              Use "Add Brand & Models" to assign brands to this dealer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {existingBrands.map((brand, index) => {
              const models = brandToModels[brand] || [];
              return (
                <div key={index} className="relative pl-4">
                  <div className="absolute left-0 top-1 h-5 w-1 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{brand}</h3>
                  {models.length > 0 ? (
                    <ul className="space-y-1">
                      {models.map((model, i) => (
                        <li key={i} className="text-xs text-slate-500 font-medium italic">
                          {model}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No models assigned</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const DiscountsSection = ({
  discounts,
  discountState,
  showDiscountActions,
  onAddDiscount,
  onEditDiscount,
  onPageChange,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <FiPercent size={14} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">Dealer Discounts</h2>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
            Pricing rules & configurations
          </p>
        </div>
      </div>
      {showDiscountActions && (
        <button
          onClick={onAddDiscount}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
        >
          <FiPlus size={13} />
          Add Discounts
        </button>
      )}
    </div>
    <div className="p-6">
      {discountState.loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : discounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="p-4 bg-slate-100 rounded-2xl">
            <FiPercent size={22} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">No discounts configured</p>
          <p className="text-xs text-slate-400">
            {showDiscountActions
              ? "Start by adding pricing rules for this dealer."
              : "No pricing rules have been set up yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {[
                    "Brand", "Model", "Products", "Discount", "Status", "Created",
                    ...(showDiscountActions ? [""] : []),
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${showDiscountActions && i === 6 ? "text-right" : "text-left"
                        }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {discounts.map((d) => (
                  <tr key={d.dealer_discount_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{d.brand_name}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{d.model_name}</td>
                    <td className="px-5 py-4">
                      {d.products?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[280px] max-h-[60px] overflow-y-auto">
                          {d.products.map((p) => {
                            const base = p.price || 0;
                            const discount = d.is_percentage
                              ? (base * d.discount_value) / 100
                              : d.discount_value;
                            const final = Math.max(base - discount, 0);
                            return (
                              <div
                                key={p.product_id}
                                className="flex flex-col px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100"
                              >
                                <span className="text-xs font-semibold text-slate-800">
                                  {p.product_name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                  <span className="text-slate-400 line-through">₹{base}</span>
                                  <span className="font-bold text-blue-600">₹{final}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">All products</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black">
                        {d.is_percentage ? `− ${d.discount_value}%` : `− ₹${d.discount_value}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${d.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${d.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                        />
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(d.created_at)}
                    </td>
                    {showDiscountActions && (
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onEditDiscount(d)}
                          aria-label="Edit discount"
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <FiEdit3 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {discountState.total > 0 && (
            <MiniPagination
              page={discountState.page}
              total={discountState.total}
              limit={discountState.limit}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  </div>
);

const OrderHistorySection = ({ dealerId, canViewOrderDetails, onViewOrder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    if (!dealerId) return;
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit: ORDER_HISTORY_LIMIT,
        dealer: dealerId,
        status: selectedStatus !== "ALL" ? selectedStatus.toUpperCase() : undefined,
        priority: selectedPriority !== "ALL" ? selectedPriority.toUpperCase() : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const cleanedSearch = searchQuery?.trim();
      if (cleanedSearch && cleanedSearch.length >= 2) params.search = cleanedSearch;
      const res = await fetchOrders(params);
      if (res?.success) {
        setOrders(res.data || []);
        setTotal(res.pagination?.total || 0);
      } else {
        setError(res?.message || "Failed to load orders");
        setOrders([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [dealerId, page, selectedStatus, selectedPriority, searchQuery, startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const hasActiveFilters = Boolean(
    searchQuery || selectedStatus !== "ALL" || selectedPriority !== "ALL" || startDate || endDate
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedPriority("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Order History</h2>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
            {loading
              ? "Loading…"
              : `${total.toLocaleString()} total order${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          title="Refresh orders"
          className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            <FiFilter size={10} />
            Filter
          </span>

          {/* Status */}
          <div className="w-44">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Status
            </span>
            <CustomSelect
              name="status"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              options={ORDER_STATUS_LIST}
            />
          </div>

          {/* Priority */}
          <div className="w-44">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Priority
            </span>
            <CustomSelect
              name="priority"
              value={selectedPriority}
              onChange={(e) => { setSelectedPriority(e.target.value); setPage(1); }}
              options={PRIORITY_OPTIONS}
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate("");
                setPage(1);
              }}
              onEndChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
              >
                <FiX size={10} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition ml-auto"
            >
              <FiX size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Inline loading indicator when refreshing */}
      {loading && orders.length > 0 && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <Spinner border="border-blue-300 border-t-blue-600" />
          <span className="text-xs text-blue-600 font-semibold">Updating orders…</span>
        </div>
      )}

      {error && (
        <div className="px-6 py-4">
          <AlertBanner message={error} />
        </div>
      )}

      <div className="p-6">
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : !error && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-4 bg-slate-100 rounded-2xl">
              <FiPackage size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No orders found</p>
            <p className="text-xs text-slate-400">
              {hasActiveFilters
                ? "Try adjusting your filters."
                : "Orders placed by this dealer will appear here."}
            </p>
          </div>
        ) : (
          !error && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {[
                        "Order ID", "Date", "Items", "Priority", "Status",
                        ...(canViewOrderDetails ? [""] : []),
                      ].map((h, i) => (
                        <th
                          key={i}
                          className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${canViewOrderDetails && i === 5 ? "text-right" : "text-left"
                            }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map(({ order }) => (
                      <tr
                        key={order.order_number}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          {order.order_number}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700">
                          {getTotalItems(order.order_details)} Items
                        </td>
                        <td className="px-5 py-4">
                          <PriorityBadge priority={order.priority} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        {canViewOrderDetails && (
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => onViewOrder(order.order_number)}
                              className="inline-flex items-center gap-1 text-blue-600 font-bold hover:text-blue-800 text-sm transition-colors"
                            >
                              View <FiArrowRight size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > 0 && (
                <MiniPagination
                  page={page}
                  total={total}
                  limit={ORDER_HISTORY_LIMIT}
                  onPageChange={setPage}
                />
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────

const DealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canAccess, role } = useRouteAccess();

  const showDiscountActions = canManageDiscounts(role);
  const canViewOrderDetails = canAccess("/orders/:id");

  const showBrandActions = role == ROLES.SUPER_ADMIN || role == ROLES.ADMIN;

  // ── Dealer & UI state ──
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Discounts ──
  const [discounts, setDiscounts] = useState([]);
  const [discountState, setDiscountState] = useState({
    loading: false,
    error: "",
    page: 1,
    limit: 5,
    total: 0,
  });

  // ── Brands & products ──
  const [allBrands, setAllBrands] = useState([]);
  const [productsByBrand, setProductsByBrand] = useState({});

  // ── Order summary stats ──
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inProduction: 0,
    inPacking: 0,
    delivered: 0,
    cancelled: 0,
  });

  // ── User map for "Created By" resolution ──
  const [userMap, setUserMap] = useState({});

  // ── Modal state ──
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [originalDiscount, setOriginalDiscount] = useState(null);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setSelectedDiscount(null);
    setOriginalDiscount(null);
  }, []);

  const brandToModels = useMemo(() => buildBrandModelMap(allBrands), [allBrands]);

  // ── Data loaders ──

  const loadDealerData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDealerById(id);
      if (!res?.success) throw new Error(res?.message || "Failed to load dealer");
      setDealer(res.data);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDiscounts = useCallback(
    async (page = 1) => {
      try {
        setDiscountState((s) => ({ ...s, loading: true, error: "" }));
        const res = await fetchDealerDiscounts({ page, limit: discountState.limit, dealer_id: id });
        if (!res?.success) throw new Error(res?.message || "Failed to fetch discounts");
        setDiscounts(res.data || []);
        setDiscountState((s) => ({
          ...s,
          page: res.pagination?.page || page,
          total: res.pagination?.total || 0,
        }));
      } catch (err) {
        setDiscounts([]);
        setDiscountState((s) => ({ ...s, total: 0, error: err.message }));
      } finally {
        setDiscountState((s) => ({ ...s, loading: false }));
      }
    },
    [id, discountState.limit]
  );

  const loadOrderSummary = useCallback(async () => {
    if (!id) return;
    const statuses = [
      { key: "total", value: null },
      { key: "pending", value: "PENDING" },
      { key: "inProduction", value: "PRODUCTION" },
      { key: "inPacking", value: "PACKED" },
      { key: "delivered", value: "DELIVERED" },
      { key: "cancelled", value: "CANCELLED" },
    ];
    const stats = { total: 0, pending: 0, inProduction: 0, inPacking: 0, delivered: 0, cancelled: 0 };
    for (const { key, value } of statuses) {
      try {
        const res = await fetchOrders({ page: 1, limit: 1, dealer: id, status: value });
        if (res?.success) stats[key] = res.pagination?.total || 0;
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.error(`Order summary fetch failed for status "${value}":`, err);
      }
    }
    setOrderStats(stats);
  }, [id]);

  const loadBrands = useCallback(async () => {
    try {
      const res = await getBrandsByDealer(id, "active");
      if (!res?.success) throw new Error(res?.message || "Failed to load brands");
      setAllBrands(res.data || []);
    } catch (err) {
      console.error("Brand load failed:", err);
    }
  }, [id]);

  /** Builds a map of employee_id → employee_name for "Created By" display */
  const loadUserMap = useCallback(async () => {
    try {
      const res = await fetchUsers({
        page: 1,
        limit: 5000,
        status: "active",
        includePassword: false,
        includeDealers: true,
      });
      if (res?.success && res?.data?.employees) {
        const map = {};
        res.data.employees.forEach((u) => {
          map[u.employee_id] = u.employee_name;
        });
        setUserMap(map);
      }
    } catch (err) {
      console.error("User map load failed:", err);
    }
  }, []);

  // ── Bootstrap all data on mount ──
  useEffect(() => {
    if (!id) return;
    loadDealerData();
    loadDiscounts(1);
    loadOrderSummary();
    loadBrands();
    loadUserMap();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit discount helpers ──

  const handleOpenEditDiscountModal = async (discount) => {
    const clean = {
      ...discount,
      description: discount.description || "",
      product_ids: discount.product_ids || [],
    };
    setSelectedDiscount(clean);
    setOriginalDiscount(clean);
    if (!productsByBrand[discount.brand_name]) {
      try {
        const res = await fetchProductsByBrands([discount.brand_name]);
        if (res?.success)
          setProductsByBrand((prev) => ({ ...prev, [discount.brand_name]: res.data }));
      } catch (err) {
        console.error("Product fetch failed:", err);
      }
    }
    setActiveModal("editDiscount");
  };

  const buildUpdatePayload = (current, original) => {
    const payload = { dealer_discount_id: current.dealer_discount_id };
    if (Number(current.discount_value) !== Number(original.discount_value))
      payload.discount_value = Number(current.discount_value);
    if (Boolean(current.is_percentage) !== Boolean(original.is_percentage))
      payload.is_percentage = Boolean(current.is_percentage);
    if ((current.description || "") !== (original.description || ""))
      payload.description = current.description || "";
    if (JSON.stringify(current.product_ids || []) !== JSON.stringify(original.product_ids || []))
      payload.product_ids = current.product_ids || [];
    return payload;
  };

  const handleUpdateDiscount = async () => {
    try {
      const payload = buildUpdatePayload(selectedDiscount, originalDiscount);
      if (Object.keys(payload).length === 1) {
        Swal.fire({ icon: "info", title: "No Changes", text: "No changes detected." });
        return;
      }
      const res = await updateDealerDiscount(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to update discount");
      Swal.fire({ icon: "success", title: "Updated", text: res.message || "Discount updated successfully." });
      closeModal();
      await loadDiscounts(discountState.page);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update Failed", text: err.message });
    }
  };

  // ── Render guards ──

  if (loading) return <PageLoader label="Loading dealer details…" />;

  if (error)
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <FiAlertCircle size={24} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            onClick={() => navigate("/dealers")}
            className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-all"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );

  if (!dealer)
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <p className="text-sm text-slate-400">Dealer not found</p>
      </div>
    );

  const dealerIsActive = dealer.status?.toLowerCase() === "active";

  // ── Main render ──

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate("/dealers")}
              aria-label="Back to dealers"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <FiArrowLeft
                size={15}
                className="text-slate-400 group-hover:text-slate-700 transition-colors"
              />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dealer Profile</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Detailed overview and performance insights
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${dealerIsActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${dealerIsActive ? "bg-emerald-500" : "bg-rose-500"
                }`}
            />
            {capitalizeFirstLetter(dealer.status)}
          </span>
        </div>

        {/* ── Profile Card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

          {/* Card header */}
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9333EA] to-blue-400 flex items-center justify-center shadow-sm shadow-blue-200">
                <FiUser size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Profile & Registration
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Core account and contact details</p>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <InfoItem
                icon={<FiUser size={14} />}
                label="Full Name"
                value={formatName(dealer.employee_name)}
              />
              <InfoItem
                icon={<FiMail size={14} />}
                label="Shop Name"
                value={capitalizeFirstLetter(dealer.shop_name || "N/A")}
              />
              <InfoItem
                icon={<FiPhone size={14} />}
                label="Phone Number"
                value={dealer.employee_phone || "N/A"}
              />
              <InfoItem
                icon={<FiMail size={14} />}
                label="Email"
                value={dealer.employee_email || "N/A"}
              />
              <InfoItem
                icon={<FiShield size={14} />}
                label="Role"
                value={dealer.role || "N/A"}
              />
              <InfoItem
                icon={<FiMapPin size={14} />}
                label="Town"
                value={capitalizeFirstLetter(dealer.town) || "N/A"}
              />
              <InfoItem
                icon={<FiMapPin size={14} />}
                label="District"
                value={capitalizeFirstLetter(dealer.district) || "N/A"}
              />
              <InfoItem
                icon={<FiMapPin size={14} />}
                label="Address"
                value={capitalizeFirstLetter(dealer.address) || "N/A"}
              />
              <InfoItem
                icon={<FiUserCheck size={14} />}
                label="Created By"
                value={
                  dealer?.created_by
                    ? formatName(userMap[dealer.created_by] || dealer.created_by)
                    : "N/A"
                }
              />
              <InfoItem
                icon={<FiCalendar size={14} />}
                label="Created On"
                value={
                  dealer?.created_at
                    ? new Date(dealer.created_at).toLocaleString()
                    : "N/A"
                }
              />
            </div>
          </div>
        </div>

        {/* ── Brands & Models ── */}
        <BrandsModelsSection
          dealer={dealer}
          allBrands={allBrands}
          showBrandActions={showBrandActions}
          brandToModels={brandToModels}
          onAddBrand={() => setActiveModal("addBrand")}
        />

        {/* ── Discounts ── */}
        <DiscountsSection
          discounts={discounts}
          discountState={discountState}
          showDiscountActions={showDiscountActions}
          onAddDiscount={() => setActiveModal("addDiscount")}
          onEditDiscount={handleOpenEditDiscountModal}
          onPageChange={loadDiscounts}
        />

        {/* ── Orders Summary ── */}
        <SectionCard title="Orders Summary" subtitle="Dealer order activity">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatPill title="Total Orders" value={orderStats.total} color="blue" />
            <StatPill title="Pending" value={orderStats.pending} color="yellow" />
            <StatPill title="In Production" value={orderStats.inProduction} color="purple" />
            <StatPill title="In Packing" value={orderStats.inPacking} color="orange" />
            <StatPill title="Delivered" value={orderStats.delivered} color="emerald" />
          </div>
        </SectionCard>

        {/* ── Order History ── */}
        <OrderHistorySection
          dealerId={id}
          canViewOrderDetails={canViewOrderDetails}
          onViewOrder={(orderNumber) => navigate(`/orders/${orderNumber}`)}
        />
      </div>

      {/* ── Modals ── */}
      {activeModal === "addBrand" && (
        <AddBrandModelsModal
          dealerId={id}
          existingBrands={dealer.brand || []}
          onClose={closeModal}
          onSuccess={() => {
            loadDealerData();
            loadBrands();
          }}
        />
      )}

      {showDiscountActions && activeModal === "addDiscount" && (
        <AddDiscountsModal
          dealerId={id}
          allBrands={allBrands}
          brandToModels={brandToModels}
          onClose={closeModal}
          onSuccess={() => loadDiscounts(discountState.page)}
        />
      )}

      {showDiscountActions && activeModal === "editDiscount" && selectedDiscount && (
        <EditDiscountModal
          discount={selectedDiscount}
          originalDiscount={originalDiscount}
          productsByBrand={productsByBrand}
          onClose={closeModal}
          onSave={handleUpdateDiscount}
          onChange={(patch) => setSelectedDiscount((prev) => ({ ...prev, ...patch }))}
        />
      )}
    </div>
  );
};

export default DealerDetails;