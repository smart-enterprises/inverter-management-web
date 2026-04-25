// src/pages/products.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  FiPlus,
  FiSearch,
  FiBox,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiPackage,
  FiEye,
  FiAlertCircle,
  FiFilter,
  FiRefreshCw,
  FiTrendingUp,
  FiLayers,
  FiCheckCircle,
  FiInfo,
  FiZap,
  FiBarChart2,
  FiSliders,
  FiArrowRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchProducts, createProduct } from "../api/products";
import { getAllBrands } from "../api/brands";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import EditProductModal from "../components/EditProductModal";
import StockUpdateModal from "../components/StockUpdateModal";
import {
  canCreateProduct,
  canEditProduct,
  canUpdateProductStock,
  canViewProductPrice,
} from "../utils/productPermissions";
import { PRODUCT_CATEGORIES } from "../utils/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_OPTIONS = [
  "INV 12V", "INV 24V", "INV 48V", "INV 96V",
  "SOLAR 12V", "SOLAR 24V", "SOLAR 48V", "SOLAR 96V",
];

const ALL_TYPES = "All Types";
const ALL_CATEGORIES = "All Categories";
const ALL_STATUS = "All Status";
const ALL_BRANDS = "All Brands";
const ALL_MODELS = "All Models";

const TYPE_FILTER_OPTIONS = [ALL_TYPES, ...PRODUCT_TYPE_OPTIONS];
const CATEGORY_FILTER_OPTIONS = [ALL_CATEGORIES, ...(PRODUCT_CATEGORIES ?? [])];
const STATUS_FILTER_OPTIONS = [ALL_STATUS, "active", "inactive"];

const PAGE_LIMIT = 10;

const INITIAL_FORM = {
  brand: "",
  product_name: "",
  model: "",
  product_type: "",
  product_category: "",
  product_price: "",
  product_cost: "",
  unpackedStock: 0,
  packedStock: 0,
  unpackedNotes: "",
  packedNotes: "",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";
const toFloat = (v) => parseFloat(String(v).trim());
const isValidPositiveNum = (v) => { const n = toFloat(v); return !isNaN(n) && n >= 0; };
const fmtINR = (n) => n != null ? `₹\u202F${Number(n).toLocaleString("en-IN")}` : "—";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: "Active",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100",
    pulse: true,
  },
  inactive: {
    label: "Inactive",
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    pulse: false,
  },
};

const StatusBadge = memo(({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}
    >
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {cfg.pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      </span>
      {cfg.label}
    </span>
  );
});

// ─── Stock Level Config ───────────────────────────────────────────────────────

const stockLevelStyle = (qty) => {
  if (qty === 0) return "bg-rose-50 text-rose-600 border-rose-200 ring-1 ring-rose-100";
  if (qty < 5) return "bg-amber-50 text-amber-600 border-amber-200 ring-1 ring-amber-100";
  return "bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-100";
};

// ─── Shared Primitives ────────────────────────────────────────────────────────

const Field = memo(({ label, required, hint, children, id }) => (
  <div className="space-y-1.5">
    <label
      htmlFor={id}
      className="block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400 select-none"
    >
      {label}
      {required && <span className="text-rose-400 ml-0.5" aria-hidden>*</span>}
    </label>
    {children}
    {hint && (
      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
        <FiInfo size={10} aria-hidden />
        {hint}
      </p>
    )}
  </div>
));

const FormInput = React.forwardRef(({ prefix, className = "", ...props }, ref) => (
  <div className="relative">
    {prefix && (
      <span
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none"
      >
        {prefix}
      </span>
    )}
    <input
      ref={ref}
      {...props}
      className={[
        "w-full border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-800",
        "placeholder-slate-300 bg-white transition-all",
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
        "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
        prefix ? "pl-7 pr-3" : "px-3",
        className,
      ].join(" ")}
    />
  </div>
));
FormInput.displayName = "FormInput";

const SectionHeading = memo(({ icon: Icon, children }) => (
  <div className="flex items-center gap-3">
    {Icon && (
      <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
        <Icon size={11} />
      </span>
    )}
    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
      {children}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
  </div>
));

const Alert = memo(({ variant = "error", icon: Icon = FiAlertCircle, children, onDismiss }) => {
  const styles = {
    error: "bg-rose-50   border-rose-200   text-rose-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50  border-amber-200  text-amber-700",
  }[variant] ?? "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div
      role="alert"
      className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl text-sm font-semibold ${styles}`}
    >
      <Icon size={14} className="flex-shrink-0" aria-hidden />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <FiX size={13} />
        </button>
      )}
    </div>
  );
});

const Spinner = memo(({ size = 14, className = "" }) => (
  <div
    aria-hidden
    style={{ width: size, height: size }}
    className={`border-2 border-current border-t-transparent rounded-full animate-spin opacity-60 ${className}`}
  />
));

// ─── Stock Row ────────────────────────────────────────────────────────────────

const StockRow = memo(({ type, qty, notes, onQtyChange, onNotesChange, qtyName, notesName }) => (
  <>
    <Field label={`${type} Qty`} id={qtyName}>
      <FormInput
        id={qtyName}
        type="number"
        name={qtyName}
        value={qty}
        onChange={onQtyChange}
        min="0"
      />
    </Field>
    {Number(qty) > 0 && (
      <Field label={`${type} Notes`} id={notesName}>
        <FormInput
          id={notesName}
          type="text"
          name={notesName}
          value={notes}
          onChange={onNotesChange}
          placeholder="Optional note"
        />
      </Field>
    )}
  </>
));

// ─── Create Product — validation & payload ────────────────────────────────────

const REQUIRED_FIELDS = ["brand", "product_name", "model", "product_price", "product_cost"];

const validateCreateForm = (form) => {
  const missing = REQUIRED_FIELDS.filter((k) => isBlank(form[k]));
  if (missing.length) return "Please fill in all required fields.";
  if (!isValidPositiveNum(form.product_price)) return "Enter a valid selling price.";
  if (!isValidPositiveNum(form.product_cost)) return "Enter a valid cost price.";
  return null;
};

const buildCreatePayload = (form) => {
  const stocks = [];
  if (Number(form.unpackedStock) > 0) {
    stocks.push({
      stock: parseInt(form.unpackedStock, 10),
      stock_type: "UNPACKED",
      type: "ADD",
      stock_notes: form.unpackedNotes || `added stock ${form.unpackedStock} - unpacked`,
    });
  }
  if (Number(form.packedStock) > 0) {
    stocks.push({
      stock: parseInt(form.packedStock, 10),
      stock_type: "PACKED",
      type: "ADD",
      stock_notes: form.packedNotes || `added stock ${form.packedStock} - packed`,
    });
  }
  return {
    brand: form.brand,
    product_name: form.product_name.trim(),
    model: form.model,
    product_type: form.product_type.trim(),
    product_category: form.product_category,
    product_price: toFloat(form.product_price),
    product_cost: toFloat(form.product_cost),
    stocks,
  };
};

// ─── Create Product Modal ─────────────────────────────────────────────────────

const CreateProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [brands, setBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setAvailableModels([]);
    setError("");
    getAllBrands("active")
      .then((r) => { if (r?.success && r?.data) setBrands(r.data); })
      .catch(console.error);
    setTimeout(() => firstFieldRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const setField = useCallback(
    (name, value) => setForm((prev) => ({ ...prev, [name]: value })),
    [],
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "brand") {
      const match = brands.find((b) => b.brand_name === value);
      setAvailableModels(match?.brand_models ?? []);
      setForm((prev) => ({ ...prev, brand: value, model: "" }));
      return;
    }
    setField(name, value);
  }, [brands, setField]);

  const handleTypeBlur = useCallback(() => {
    const v = form.product_type?.trim();
    if (v && !PRODUCT_TYPE_OPTIONS.includes(v)) {
      setCustomTypes((prev) => prev.includes(v) ? prev : [...prev, v]);
    }
  }, [form.product_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateCreateForm(form);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError("");
    try {
      const res = await createProduct(buildCreatePayload(form));
      if (res?.success) {
        onClose();
        onProductCreated?.();
        setTimeout(() =>
          Swal.fire({ icon: "success", title: "Product Created", text: res.message || "Product created successfully" }),
          100,
        );
      } else {
        setError(res?.message || "Failed to create product.");
      }
    } catch (ex) {
      setError(ex?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeDatalistId = "create-product-type-opts";
  const modelDisabled = !form.brand || availableModels.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-product-title"
        className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200/80 flex flex-col"
          style={{ maxHeight: "90dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 rounded-t-2xl bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                <FiBox size={14} aria-hidden />
              </div>
              <div>
                <h2 id="create-product-title" className="text-sm font-bold text-slate-900 leading-tight">
                  Create New Product
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">
                  Add to inventory
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
            >
              <FiX size={16} />
            </button>
          </header>

          {/* Body */}
          <form
            id="create-product-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
          >
            {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}

            <section className="space-y-4">
              <SectionHeading icon={FiBox}>Product Information</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <Field label="Brand" required id="cp-brand">
                  <CustomSelect
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    options={["", ...brands.map((b) => b.brand_name)]}
                    placeholder="Select brand"
                    inputRef={firstFieldRef}
                  />
                </Field>

                <Field label="Product Name" required id="cp-product-name">
                  <FormInput
                    id="cp-product-name"
                    type="text"
                    name="product_name"
                    value={form.product_name}
                    onChange={handleChange}
                    placeholder="e.g. Super Save Pro"
                    autoComplete="off"
                  />
                </Field>

                <Field
                  label="Model"
                  required
                  id="cp-model"
                  hint={form.brand && availableModels.length === 0 ? "No models available for this brand." : undefined}
                >
                  <CustomSelect
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    options={["", ...availableModels]}
                    placeholder={form.brand ? "Select model" : "Select brand first"}
                    disabled={modelDisabled}
                  />
                </Field>

                <Field label="Product Type" id="cp-product-type">
                  <FormInput
                    id="cp-product-type"
                    list={typeDatalistId}
                    name="product_type"
                    value={form.product_type}
                    onChange={handleChange}
                    onBlur={handleTypeBlur}
                    placeholder="Select or type product type"
                    autoComplete="off"
                  />
                  <datalist id={typeDatalistId}>
                    {[...PRODUCT_TYPE_OPTIONS, ...customTypes].map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Product Category" id="cp-product-category">
                  <CustomSelect
                    name="product_category"
                    value={form.product_category}
                    onChange={(e) => setField("product_category", e.target.value)}
                    placeholder="Select category"
                    options={["", ...(PRODUCT_CATEGORIES ?? [])]}
                  />
                </Field>

                <div className="hidden sm:block" aria-hidden />

                <Field label="Unit Price (₹)" required id="cp-product-price">
                  <FormInput
                    id="cp-product-price"
                    type="number"
                    name="product_price"
                    value={form.product_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.5"
                    prefix="₹"
                  />
                </Field>

                <Field label="Product Cost (₹)" required id="cp-product-cost">
                  <FormInput
                    id="cp-product-cost"
                    type="number"
                    name="product_cost"
                    value={form.product_cost}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.5"
                    prefix="₹"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeading icon={FiPackage}>Initial Stock</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StockRow
                  type="Unpacked"
                  qty={form.unpackedStock}
                  notes={form.unpackedNotes}
                  qtyName="unpackedStock"
                  notesName="unpackedNotes"
                  onQtyChange={handleChange}
                  onNotesChange={handleChange}
                />
                <StockRow
                  type="Packed"
                  qty={form.packedStock}
                  notes={form.packedNotes}
                  qtyName="packedStock"
                  notesName="packedNotes"
                  onQtyChange={handleChange}
                  onNotesChange={handleChange}
                />
              </div>
            </section>
          </form>

          {/* Footer */}
          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-product-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-indigo-200"
            >
              {loading
                ? <><Spinner size={13} className="text-white" />Creating…</>
                : <><FiPlus size={13} aria-hidden />Create Product</>}
            </button>
          </footer>
        </div>
      </div>
    </>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const STAT_COLOR_MAP = {
  indigo: { wrap: "bg-indigo-600", text: "text-white", ring: "" },
  emerald: { wrap: "bg-emerald-500", text: "text-white", ring: "" },
  rose: { wrap: "bg-rose-500", text: "text-white", ring: "" },
  amber: { wrap: "bg-amber-400", text: "text-amber-900", ring: "" },
};

const StatCard = memo(({ label, value, icon, color, trend }) => {
  const cfg = STAT_COLOR_MAP[color] ?? STAT_COLOR_MAP.indigo;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className={`p-3 rounded-xl flex-shrink-0 ${cfg.wrap}`} aria-hidden>
        {React.cloneElement(icon, { size: 15, className: cfg.text })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 truncate">{label}</p>
        <p className="text-2xl font-black tabular-nums text-slate-900 leading-tight mt-0.5">{value ?? "—"}</p>
      </div>
      {trend !== undefined && (
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full flex-shrink-0">
          {trend}
        </span>
      )}
    </div>
  );
});

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationBtn = memo(({ children, active, ...props }) => (
  <button
    {...props}
    className={[
      "min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
      active
        ? "bg-indigo-600 text-white shadow-sm"
        : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
      "disabled:opacity-40 disabled:cursor-not-allowed",
    ].join(" ")}
  >
    {children}
  </button>
));

const Pagination = memo(({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = allPages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-white rounded-b-2xl"
    >
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Showing{" "}
        <span className="font-bold text-slate-600">{from}–{to}</span>{" "}
        of{" "}
        <span className="font-bold text-slate-600">{total}</span>{" "}
        products
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <PaginationBtn
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <FiChevronLeft size={13} />
        </PaginationBtn>
        {visible.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - visible[i - 1] > 1 && (
              <span className="px-1.5 text-slate-300 text-xs" aria-hidden>…</span>
            )}
            <PaginationBtn
              onClick={() => onPageChange(p)}
              active={p === page}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </PaginationBtn>
          </React.Fragment>
        ))}
        <PaginationBtn
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <FiChevronRight size={13} />
        </PaginationBtn>
      </div>
    </nav>
  );
});

// ─── Stock Badge ──────────────────────────────────────────────────────────────

const STOCK_BADGE_STYLES = {
  blue: { wrapper: "bg-sky-50 text-sky-700 border-sky-100", dot: "bg-sky-400" },
  violet: { wrapper: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-400" },
};

const StockBadge = memo(({ color, label, value }) => {
  const { wrapper, dot } = STOCK_BADGE_STYLES[color] ?? STOCK_BADGE_STYLES.blue;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 border rounded-lg text-[10px] font-black whitespace-nowrap ${wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden />
      {label}: {value}
    </span>
  );
});

// ─── Action Button ────────────────────────────────────────────────────────────

const ActionBtn = memo(({ children, label, colorClass, onClick }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`p-2 rounded-lg text-slate-400 transition-all active:scale-90 ${colorClass}`}
  >
    {children}
  </button>
));

// ─── Type / Category Pill ─────────────────────────────────────────────────────

const Pill = memo(({ children }) => (
  <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold uppercase tracking-wide">
    {children || "—"}
  </span>
));

// ─── Product Row ──────────────────────────────────────────────────────────────

const ProductRow = memo(({
  product,
  userCanEdit,
  userCanUpdateStock,
  userCanViewPrice,
  onView,
  onEdit,
  onStock,
}) => {
  const {
    product_id,
    product_name,
    brand,
    model,
    product_type,
    product_category,
    price,
    available_stock,
    status,
    stocks = [],
  } = product;

  const unpackedStock =
    stocks.find((s) => s.stock_type === "UNPACKED")?.stock ??
    stocks[0]?.unpacked_stock ??
    0;
  const packedStock =
    stocks.find((s) => s.stock_type === "PACKED")?.stock ??
    stocks[0]?.packed_stock ??
    0;

  const qty = available_stock ?? 0;
  const stockStyle = stockLevelStyle(qty);

  return (
    <tr className="group border-b border-slate-100 hover:bg-indigo-50/20 transition-colors duration-100">

      {/* Product */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:border-indigo-200 transition-colors">
            <FiBox size={13} className="text-indigo-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate max-w-[180px] xl:max-w-[220px] text-sm">
              {product_name}
            </p>
            <span className="inline-flex mt-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-100 text-slate-400 border border-slate-200">
              {product_id}
            </span>
          </div>
        </div>
      </td>

      {/* Brand */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-700">
        {brand}
      </td>

      {/* Model */}
      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
        {model}
      </td>

      {/* Type */}
      <td className="px-5 py-3.5">
        <Pill>{product_type}</Pill>
      </td>

      {/* Category */}
      <td className="px-5 py-3.5">
        <Pill>{product_category}</Pill>
      </td>

      {/* Price */}
      {userCanViewPrice && (
        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-bold text-slate-900 tabular-nums">
          {fmtINR(price)}
        </td>
      )}

      {/* Available Stock */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-black tabular-nums ${stockStyle}`}>
          {qty}
        </span>
      </td>

      {/* Split Stock */}
      <td className="px-5 py-3.5">
        <div className="flex gap-1.5">
          <StockBadge color="blue" label="U" value={unpackedStock} />
          <StockBadge color="violet" label="P" value={packedStock} />
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <StatusBadge status={status} />
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <ActionBtn
            onClick={onView}
            label="View product"
            colorClass="hover:text-indigo-600 hover:bg-indigo-50"
          >
            <FiEye size={14} />
          </ActionBtn>

          {userCanEdit && (
            <ActionBtn
              onClick={onEdit}
              label="Edit product"
              colorClass="hover:text-sky-600 hover:bg-sky-50"
            >
              <FiEdit3 size={14} />
            </ActionBtn>
          )}

          {userCanUpdateStock && status === "active" && (
            <ActionBtn
              onClick={onStock}
              label="Update stock"
              colorClass="hover:text-emerald-600 hover:bg-emerald-50"
            >
              <FiPackage size={14} />
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
});

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const FilterBar = memo(({
  searchInput, onSearchInput,
  onSearchClear,
  filterBrands, filterModels,
  selectedBrand, selectedModel,
  selectedType, selectedCategory, selectedStatus,
  onBrandChange, onModelChange,
  onTypeChange, onCategoryChange, onStatusChange,
  hasActiveFilters, onClearFilters,
}) => (
  <div className="px-5 py-3.5 bg-white border-b border-slate-100">
    <div className="flex flex-wrap items-center gap-3">

      {/* Search */}
      <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search products…"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          aria-label="Search products"
        />
        {searchInput && (
          <button
            onClick={onSearchClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            aria-label="Clear search"
          >
            <FiX size={13} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400 whitespace-nowrap">
        <FiSliders size={12} />
        Filters
      </div>

      {[
        {
          key: "brand",
          value: selectedBrand || ALL_BRANDS,
          options: [ALL_BRANDS, ...filterBrands.map((b) => b.brand_name)],
          onChange: (e) => onBrandChange(e.target.value),
        },
        {
          key: "model",
          value: selectedModel || ALL_MODELS,
          options: [ALL_MODELS, ...filterModels],
          onChange: (e) => onModelChange(e.target.value),
          disabled: !selectedBrand || filterModels.length === 0,
        },
        {
          key: "type",
          value: selectedType || ALL_TYPES,
          options: TYPE_FILTER_OPTIONS,
          onChange: (e) => onTypeChange(e.target.value),
        },
        {
          key: "category",
          value: selectedCategory || ALL_CATEGORIES,
          options: CATEGORY_FILTER_OPTIONS,
          onChange: (e) => onCategoryChange(e.target.value),
        },
        {
          key: "status",
          value: selectedStatus || ALL_STATUS,
          options: STATUS_FILTER_OPTIONS,
          onChange: (e) => onStatusChange(e.target.value),
        },
      ].map((filter) => (
        <div key={filter.key} className="w-36 flex-shrink-0">
          <CustomSelect
            name={filter.key}
            value={filter.value}
            options={filter.options}
            onChange={filter.onChange}
            disabled={filter.disabled}
            className="text-sm rounded-xl border-slate-200 bg-slate-50"
          />
        </div>
      ))}

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-100 transition-all"
          title="Clear all filters"
          aria-label="Clear all filters"
        >
          <FiX size={12} />
          Clear
        </button>
      )}
    </div>
  </div>
));

// ─── Table Header ─────────────────────────────────────────────────────────────

const TableHeader = memo(({ headers }) => (
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50/80">
      {headers.map((h, i) => (
        <th
          key={i}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 ${!h ? "text-right" : "text-left"}`}
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>
));

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = memo(({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <FiBox size={24} className="text-slate-400" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-600">No products found</p>
          <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
        </div>
      </div>
    </td>
  </tr>
));

// ─── Loading State ────────────────────────────────────────────────────────────

const LoadingState = memo(() => (
  <div className="flex flex-col items-center justify-center py-28 gap-5">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
      <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <p className="text-sm text-slate-400 font-semibold tracking-wide">Loading products…</p>
  </div>
));

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState = memo(({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
      <FiAlertCircle size={24} className="text-rose-400" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-bold text-rose-600">Something went wrong</p>
      <p className="text-xs text-slate-400">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-bold px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 transition-all hover:bg-indigo-100"
    >
      <FiRefreshCw size={13} />
      Try again
    </button>
  </div>
));

// ─── Build query string without URLSearchParams (avoids + encoding) ───────────

/**
 * Builds a query string manually so that spaces are encoded as %20
 * (not as + which URLSearchParams produces). This ensures the API
 * receives "SOLAR 12V" rather than "SOLAR+12V".
 */
const buildQueryString = (params) => {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
};

// ─── Products Page ────────────────────────────────────────────────────────────

const Products = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const userCanCreate = canCreateProduct(role);
  const userCanEdit = canEditProduct(role);
  const userCanUpdateStock = canUpdateProductStock(role);
  const userCanViewPrice = canViewProductPrice(role);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modal, setModal] = useState({ create: false, edit: false, stock: false });
  const [selectedProduct, setSelectedProduct] = useState({ id: null, name: "" });

  const openModal = useCallback((key) => setModal((m) => ({ ...m, [key]: true })), []);
  const closeModal = useCallback((key) => setModal((m) => ({ ...m, [key]: false })), []);

  const openEditModal = useCallback((id, name) => {
    if (!userCanEdit) return;
    setSelectedProduct({ id, name });
    openModal("edit");
  }, [userCanEdit, openModal]);

  const openStockModal = useCallback((id, name) => {
    if (!userCanUpdateStock) return;
    setSelectedProduct({ id, name });
    openModal("stock");
  }, [userCanUpdateStock, openModal]);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [page, setPage] = useState(1);

  // ── Brand / Model data for filter bar ─────────────────────────────────────
  const [filterBrands, setFilterBrands] = useState([]);
  const [filterModels, setFilterModels] = useState([]);

  useEffect(() => {
    getAllBrands("active")
      .then((res) => { if (res?.success && res.data) setFilterBrands(res.data); })
      .catch(console.error);
  }, []);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Debounce search 400 ms
  useEffect(() => {
    const t = setTimeout(() => { setSearchQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // ── Build query params object (raw values, no pre-encoding) ────────────
      const rawParams = {
        page,
        limit: PAGE_LIMIT,
        search: searchQuery,
        type: selectedType,       // e.g. "SOLAR 12V" — space kept as-is here
        category: selectedCategory,
        status: selectedStatus,
        brand: selectedBrand,
        model: selectedModel,
      };

      // ── Build a clean query string where spaces → %20, not + ──────────────
      const qs = buildQueryString(rawParams);
      const fullQs = buildQueryString({ page: 1, limit: 10000 });

      const [paginatedResponse, completeProductsResponse] = await Promise.all([
        fetchProducts(rawParams, qs),
        fetchProducts({ page: 1, limit: 10000 }, fullQs),
      ]);

      if (!paginatedResponse?.success) {
        throw new Error(paginatedResponse?.message || "Failed to fetch products");
      }

      const paginatedData = paginatedResponse?.data ?? [];
      const paginatedPagination = paginatedResponse?.pagination;

      const fallbackData = completeProductsResponse?.data ?? [];
      const fallbackPagination = completeProductsResponse?.pagination;

      setProducts(paginatedData);

      const totalPages =
        paginatedPagination?.totalPages > 0
          ? paginatedPagination.totalPages
          : fallbackPagination?.totalPages ?? 1;

      const total =
        paginatedPagination?.total > 0
          ? paginatedPagination.total
          : fallbackPagination?.total ??
          fallbackData.length ??
          0;

      setPagination({ totalPages, total });

      if (completeProductsResponse?.success) {
        setAllProducts(completeProductsResponse.data ?? []);
      }
    } catch (err) {
      setError(err.message || "Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedType, selectedCategory, selectedStatus, selectedBrand, selectedModel]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Auto-dismiss success banner after 5 s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const stats = useMemo(() => ({
    active: allProducts.filter((p) => p.status === "active").length,
    zeroStock: allProducts.filter((p) => (p.available_stock ?? 0) === 0).length,
  }), [allProducts]);

  const hasActiveFilters = Boolean(
    searchQuery || selectedType || selectedCategory || selectedStatus || selectedBrand || selectedModel,
  );

  const clearFilters = useCallback(() => {
    setSearchInput(""); setSearchQuery("");
    setSelectedType(""); setSelectedCategory(""); setSelectedStatus("");
    setSelectedBrand(""); setSelectedModel("");
    setFilterModels([]);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((field, displayValue) => {
    const sentinels = {
      type: ALL_TYPES,
      category: ALL_CATEGORIES,
      status: ALL_STATUS,
      model: ALL_MODELS,
    };
    // Keep the raw string value (with spaces) — do NOT encode here.
    // Encoding happens only when building the URL query string.
    const apiValue = displayValue === sentinels[field] ? "" : displayValue;
    const setters = {
      type: setSelectedType,
      category: setSelectedCategory,
      status: setSelectedStatus,
      model: setSelectedModel,
    };
    setters[field]?.(apiValue);
    setPage(1);
  }, []);

  const handleBrandFilterChange = useCallback((displayValue) => {
    const apiValue = displayValue === ALL_BRANDS ? "" : displayValue;
    setSelectedBrand(apiValue);
    setSelectedModel("");
    if (apiValue) {
      const match = filterBrands.find((b) => b.brand_name === apiValue);
      setFilterModels(match?.brand_models ?? []);
    } else {
      setFilterModels([]);
    }
    setPage(1);
  }, [filterBrands]);

  const colHeaders = useMemo(() => [
    "Product", "Brand", "Model", "Type", "Category",
    ...(userCanViewPrice ? ["Price"] : []),
    "Available", "Stock", "Status",
    ...(userCanEdit || userCanUpdateStock ? [""] : []),
  ], [userCanViewPrice, userCanEdit, userCanUpdateStock]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto w-full space-y-5">

        {/* Success banner */}
        {success && (
          <Alert variant="success" icon={FiCheckCircle} onDismiss={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <FiBox size={13} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Products</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-0.5">
              {loading
                ? "Loading inventory…"
                : `${pagination.total.toLocaleString()} product${pagination.total !== 1 ? "s" : ""} in your catalog`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadProducts}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh products"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all disabled:opacity-50 group"
            >
              <FiRefreshCw
                size={14}
                className={`transition-transform ${loading ? "animate-spin" : "group-hover:rotate-180 duration-500"}`}
                aria-hidden
              />
            </button>
            {userCanCreate && (
              <button
                onClick={() => openModal("create")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
              >
                <FiPlus size={14} aria-hidden />
                Create Product
                <FiArrowRight size={13} className="opacity-70" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Products"
            value={pagination.total.toLocaleString()}
            icon={<FiBox />}
            color="indigo"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={<FiTrendingUp />}
            color="emerald"
          />
          <StatCard
            label="Zero Stock"
            value={stats.zeroStock}
            icon={<FiAlertCircle />}
            color="rose"
          />
          <StatCard
            label="Showing"
            value={products.length}
            icon={<FiLayers />}
            color="amber"
          />
        </div>

        {/* Main panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Filter bar */}
          <FilterBar
            searchInput={searchInput}
            onSearchInput={(v) => setSearchInput(v)}
            onSearchClear={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
            filterBrands={filterBrands}
            filterModels={filterModels}
            selectedBrand={selectedBrand}
            selectedModel={selectedModel}
            selectedType={selectedType}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onBrandChange={handleBrandFilterChange}
            onModelChange={(v) => handleFilterChange("model", v)}
            onTypeChange={(v) => handleFilterChange("type", v)}
            onCategoryChange={(v) => handleFilterChange("category", v)}
            onStatusChange={(v) => handleFilterChange("status", v)}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />

          {/* Content area */}
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={loadProducts} />
          ) : (
            <div className="w-full overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ minWidth: "1100px" }}
                aria-label="Products table"
              >
                <TableHeader headers={colHeaders} />
                <tbody className="divide-y divide-slate-100 bg-white">
                  {products.length === 0 ? (
                    <EmptyState colSpan={colHeaders.length} />
                  ) : (
                    products.map((product) => (
                      <ProductRow
                        key={product.product_id}
                        product={product}
                        userCanEdit={userCanEdit}
                        userCanUpdateStock={userCanUpdateStock}
                        userCanViewPrice={userCanViewPrice}
                        onView={() => navigate(`/products/${product.product_id}`)}
                        onEdit={() => openEditModal(product.product_id, product.product_name)}
                        onStock={() => openStockModal(product.product_id, product.product_name)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && pagination.total > 0 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {userCanCreate && (
        <CreateProductModal
          isOpen={modal.create}
          onClose={() => closeModal("create")}
          onProductCreated={loadProducts}
        />
      )}
      {userCanEdit && (
        <EditProductModal
          isOpen={modal.edit}
          onClose={() => closeModal("edit")}
          onProductUpdated={() => { loadProducts(); setSuccess("Product updated successfully!"); }}
          productId={selectedProduct.id}
        />
      )}
      {userCanUpdateStock && (
        <StockUpdateModal
          isOpen={modal.stock}
          onClose={() => closeModal("stock")}
          onStockUpdated={() => { loadProducts(); setSuccess("Stock updated successfully!"); }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
        />
      )}
    </div>
  );
};

export default Products;