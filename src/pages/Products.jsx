// products.jsx
import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from "react";
import {
  FiPlus, FiSearch, FiBox, FiX, FiChevronLeft, FiChevronRight,
  FiEdit3, FiPackage, FiEye, FiAlertCircle, FiFilter, FiRefreshCw,
  FiTrendingUp, FiLayers, FiCheckCircle, FiInfo,
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
  canCreateProduct, canEditProduct,
  canUpdateProductStock, canViewProductPrice,
} from "../utils/productPermissions";
import { PRODUCT_CATEGORIES } from "../utils/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_OPTIONS = [
  "INV 12V", "INV 24V", "INV 48V", "INV 96V",
  "SOLAR 12V", "SOLAR 24V", "SOLAR 48V", "SOLAR 96V",
];

// Sentinel display labels for "show all" filter options
const ALL_TYPES = "All Types";
const ALL_CATEGORIES = "All Categories";
const ALL_STATUS = "All Status";

const TYPE_FILTER_OPTIONS = [ALL_TYPES, ...PRODUCT_TYPE_OPTIONS];
const CATEGORY_FILTER_OPTIONS = [ALL_CATEGORIES, ...PRODUCT_CATEGORIES];
const STATUS_FILTER_OPTIONS = [ALL_STATUS, "active", "inactive"];

const LIMIT = 10;

const INITIAL_FORM = {
  brand: "", product_name: "", model: "", product_type: "",
  product_category: "", product_price: "", product_cost: "",
  unpackedStock: 0, packedStock: 0, unpackedNotes: "", packedNotes: "",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";
const toFloat = (v) => parseFloat(String(v).trim());
const isValidPositiveNumber = (v) => { const n = toFloat(v); return !isNaN(n) && n >= 0; };

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

const Input = React.forwardRef(({ prefix, className = "", ...props }, ref) => (
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
        "w-full border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-800",
        "placeholder-slate-300 bg-white transition-all",
        "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
        "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
        prefix ? "pl-7 pr-3" : "px-3",
        className,
      ].join(" ")}
    />
  </div>
));
Input.displayName = "Input";

const Textarea = React.forwardRef(({ className = "", rows = 2, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    {...props}
    className={[
      "w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium text-slate-800",
      "placeholder-slate-300 bg-white transition-all resize-none",
      "focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
      "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
      className,
    ].join(" ")}
  />
));
Textarea.displayName = "Textarea";

const SectionHeading = memo(({ children }) => (
  <div className="flex items-center gap-3">
    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
      {children}
    </span>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
));

const Alert = memo(({ variant = "error", icon: Icon = FiAlertCircle, children, onDismiss }) => {
  const styles = {
    error: "bg-rose-50 border-rose-200 text-rose-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
  }[variant] ?? "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div role="alert" className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl text-sm font-semibold ${styles}`}>
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
      <Input id={qtyName} type="number" name={qtyName} value={qty} onChange={onQtyChange} min="0" />
    </Field>
    {Number(qty) > 0 && (
      <Field label={`${type} Notes`} id={notesName}>
        <Input
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

// ─── Create Product Modal — validation & payload builders ─────────────────────

const REQUIRED_CREATE_FIELDS = ["brand", "product_name", "model", "product_price", "product_cost"];

const validateCreateForm = (form) => {
  const missing = REQUIRED_CREATE_FIELDS.filter((k) => isBlank(form[k]));
  if (missing.length) return "Please fill in all required fields.";
  if (!isValidPositiveNumber(form.product_price)) return "Enter a valid selling price.";
  if (!isValidPositiveNumber(form.product_cost)) return "Enter a valid cost price.";
  return null;
};

const buildCreatePayload = (form) => {
  const stocks = [];
  if (Number(form.unpackedStock) > 0) {
    stocks.push({
      stock: parseInt(form.unpackedStock),
      stock_type: "UNPACKED",
      type: "ADD",
      stock_notes: form.unpackedNotes || `added stock ${form.unpackedStock} - unpacked`,
    });
  }
  if (Number(form.packedStock) > 0) {
    stocks.push({
      stock: parseInt(form.packedStock),
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

  // Reset & load brands on open
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

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Body scroll lock
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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-product-title"
        className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col"
          style={{ maxHeight: "90dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <FiBox size={14} aria-hidden />
              </div>
              <div>
                <h2 id="create-product-title" className="text-sm font-bold text-slate-900 leading-tight">
                  Create New Product
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
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

            {/* Product Information */}
            <section className="space-y-4">
              <SectionHeading>Product Information</SectionHeading>
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
                  <Input
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

                <Field label="Product Type" required id="cp-product-type">
                  <Input
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

                <Field label="Product Category" required id="cp-product-category">
                  <CustomSelect
                    name="product_category"
                    value={form.product_category}
                    onChange={(e) => setField("product_category", e.target.value)}
                    placeholder="Select category"
                    options={["", ...PRODUCT_CATEGORIES]}
                  />
                </Field>

                {/* spacer: keeps the 2-col grid aligned */}
                <div className="hidden sm:block" aria-hidden />

                <Field label="Unit Price (₹)" required id="cp-product-price">
                  <Input
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
                  <Input
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

            {/* Initial Stock */}
            <section className="space-y-4">
              <SectionHeading>Initial Stock</SectionHeading>
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
          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex-shrink-0 rounded-b-2xl">
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

const COLOR_MAP = {
  indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  amber: "bg-amber-50 border-amber-100 text-amber-600",
  rose: "bg-rose-50 border-rose-100 text-rose-600",
};

const StatCard = memo(({ label, value, icon, color }) => {
  const cls = COLOR_MAP[color] ?? "bg-slate-50 border-slate-200 text-slate-600";
  const textCls = cls.split(" ").find((s) => s.startsWith("text-"));
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <div className={`p-2.5 rounded-xl border ${cls} flex-shrink-0`} aria-hidden>
        {React.cloneElement(icon, { size: 14, className: textCls })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className={`text-xl font-black tabular-nums ${textCls}`}>{value ?? "—"}</p>
      </div>
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
      className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/30"
    >
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Showing <span className="font-bold text-slate-600">{from}–{to}</span> of{" "}
        <span className="font-bold text-slate-600">{total}</span> products
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <PaginationBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page">
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
        <PaginationBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page">
          <FiChevronRight size={13} />
        </PaginationBtn>
      </div>
    </nav>
  );
});

// ─── Stock Badge ──────────────────────────────────────────────────────────────

const STOCK_BADGE_STYLES = {
  blue: { wrapper: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  violet: { wrapper: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" },
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
    className={`p-2 rounded-lg text-slate-400 transition-all ${colorClass}`}
  >
    {children}
  </button>
));

// ─── Product Row ──────────────────────────────────────────────────────────────

const STOCK_QTY_STYLES = {
  zero: "text-rose-600 bg-rose-50 border-rose-200",
  low: "text-amber-600 bg-amber-50 border-amber-200",
  ok: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const ProductRow = memo(({
  product, userCanEdit, userCanUpdateStock, userCanViewPrice,
  onView, onEdit, onStock,
}) => {
  const {
    product_id, product_name, brand, model, product_type,
    product_category, price, available_stock, status, stocks = [],
  } = product;

  const unpackedStock = stocks.find((s) => s.stock_type === "UNPACKED")?.stock
    ?? stocks[0]?.unpacked_stock ?? 0;
  const packedStock = stocks.find((s) => s.stock_type === "PACKED")?.stock
    ?? stocks[0]?.packed_stock ?? 0;

  const isActive = status === "active";
  const qty = available_stock ?? 0;
  const stockStyle = qty === 0 ? STOCK_QTY_STYLES.zero : qty < 5 ? STOCK_QTY_STYLES.low : STOCK_QTY_STYLES.ok;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors duration-100">

      {/* Product */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0"
            aria-hidden
          >
            <FiBox size={13} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate max-w-[180px]">{product_name}</p>
            <span className="inline-flex mt-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded-md bg-slate-100 text-slate-500 border border-slate-200">
              {product_id}
            </span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm font-semibold text-slate-700">{brand}</span>
      </td>
      <td className="px-5 py-4">
        <span className="text-sm font-medium text-slate-500">{model}</span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
          {product_type}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
          {product_category}
        </span>
      </td>

      {userCanViewPrice && (
        <td className="px-5 py-4 whitespace-nowrap">
          <span className="text-sm font-bold text-slate-900">
            {price != null ? `₹ ${price.toLocaleString("en-IN")}` : "—"}
          </span>
        </td>
      )}

      <td className="px-5 py-4">
        <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-black tabular-nums ${stockStyle}`}>
          {qty}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex gap-1.5">
          <StockBadge color="blue" label="U" value={unpackedStock} />
          <StockBadge color="violet" label="P" value={packedStock} />
        </div>
      </td>

      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden />
          {isActive ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <ActionBtn onClick={onView} label="View product" colorClass="hover:text-indigo-600 hover:bg-indigo-50">
            <FiEye size={14} />
          </ActionBtn>
          {userCanEdit && (
            <ActionBtn onClick={onEdit} label="Edit product" colorClass="hover:text-sky-600 hover:bg-sky-50">
              <FiEdit3 size={14} />
            </ActionBtn>
          )}
          {userCanUpdateStock && isActive && (
            <ActionBtn onClick={onStock} label="Update stock" colorClass="hover:text-emerald-600 hover:bg-emerald-50">
              <FiPackage size={14} />
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
});

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

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(""); // "" = all
  const [selectedCategory, setSelectedCategory] = useState(""); // "" = all
  const [selectedStatus, setSelectedStatus] = useState(""); // "" = all
  const [page, setPage] = useState(1);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Debounce search → commit after 400 ms idle
  useEffect(() => {
    const t = setTimeout(() => { setSearchQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProducts({
        page, limit: LIMIT,
        search: searchQuery,
        type: selectedType,
        category: selectedCategory,
        status: selectedStatus,
      });
      if (res?.success) {
        setProducts(res.data ?? []);
        setPagination({
          totalPages: res.pagination?.totalPages ?? 1,
          total: res.pagination?.total ?? res.data?.length ?? 0,
        });
      } else {
        setError(res?.message || "Failed to fetch products.");
      }
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedType, selectedCategory, selectedStatus]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Auto-dismiss success banner
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const stats = useMemo(() => ({
    active: products.filter((p) => p.status === "active").length,
    zeroStock: products.filter((p) => (p.available_stock ?? 0) === 0).length,
  }), [products]);

  const hasActiveFilters = Boolean(searchQuery || selectedType || selectedCategory || selectedStatus);

  const clearFilters = useCallback(() => {
    setSearchInput(""); setSearchQuery("");
    setSelectedType(""); setSelectedCategory(""); setSelectedStatus("");
    setPage(1);
  }, []);

  /**
   * Maps the display sentinel ("All Types", "All Categories", "All Status")
   * back to an empty string for the API. Anything else is used as-is.
   */
  const handleFilterChange = useCallback((field, displayValue) => {
    const sentinels = { type: ALL_TYPES, category: ALL_CATEGORIES, status: ALL_STATUS };
    const apiValue = displayValue === sentinels[field] ? "" : displayValue;

    if (field === "type") setSelectedType(apiValue);
    if (field === "category") setSelectedCategory(apiValue);
    if (field === "status") setSelectedStatus(apiValue);
    setPage(1);
  }, []);

  // Column headers derived from permission flags — stable across renders
  const colHeaders = useMemo(() => [
    "Product", "Brand", "Model", "Type", "Category",
    ...(userCanViewPrice ? ["Price"] : []),
    "Available", "Stock", "Status",
    ...(userCanEdit || userCanUpdateStock ? [""] : []),
  ], [userCanViewPrice, userCanEdit, userCanUpdateStock]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {success && (
          <Alert variant="success" icon={FiCheckCircle} onDismiss={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Products</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {loading
                ? "Loading…"
                : `${pagination.total} product${pagination.total !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadProducts}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh products"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
            </button>
            {userCanCreate && (
              <button
                onClick={() => openModal("create")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
              >
                <FiPlus size={14} aria-hidden />Create Product
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={pagination.total} icon={<FiBox />} color="indigo" />
          <StatCard label="Active (page)" value={stats.active} icon={<FiTrendingUp />} color="emerald" />
          <StatCard label="Zero Stock" value={stats.zeroStock} icon={<FiAlertCircle />} color="rose" />
          <StatCard label="Per Page" value={products.length} icon={<FiLayers />} color="amber" />
        </div>

        {/* Main card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Filter bar */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

              {/* Search */}
              <div className="relative flex-1 lg:max-w-xs">
                <FiSearch
                  size={13}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Search name, brand, model, ID…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search products"
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
                  aria-hidden
                >
                  <FiFilter size={10} />Filter
                </span>

                {/* add BRAND, Model filters 
                {/* BRAND }
                MODEL*/}

                {/* Type */}
                <div className="w-44">
                  <CustomSelect
                    name="type"
                    value={selectedType || ALL_TYPES}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    options={TYPE_FILTER_OPTIONS}
                    aria-label="Filter by type"
                  />
                </div>

                {/* Category */}
                <div className="w-44">
                  <CustomSelect
                    name="category"
                    value={selectedCategory || ALL_CATEGORIES}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                    options={CATEGORY_FILTER_OPTIONS}
                    aria-label="Filter by category"
                  />
                </div>

                {/* Status */}
                <div className="w-36">
                  <CustomSelect
                    name="status"
                    value={selectedStatus || ALL_STATUS}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    options={STATUS_FILTER_OPTIONS}
                    aria-label="Filter by status"
                  />
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wide hover:bg-rose-100 transition-all"
                  >
                    <FiX size={10} aria-hidden />Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table / empty / error states */}
          {loading ? (
            <div
              className="flex flex-col items-center justify-center py-24 gap-4"
              aria-live="polite"
              aria-label="Loading"
            >
              <div className="relative w-10 h-10" aria-hidden>
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Loading products…</p>
            </div>

          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3" role="alert">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <FiAlertCircle size={22} className="text-rose-500" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                onClick={loadProducts}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
              >
                <FiRefreshCw size={12} aria-hidden />Try Again
              </button>
            </div>

          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" aria-label="Products table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {colHeaders.map((h, i) => (
                      <th
                        key={i}
                        scope="col"
                        className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${!h ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={colHeaders.length} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-5 bg-slate-100 rounded-2xl">
                            <FiBox size={24} className="text-slate-400" aria-hidden />
                          </div>
                          <p className="text-sm font-semibold text-slate-500">No products found</p>
                          <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : products.map((product) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && pagination.total > 0 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* ── Modals ── */}
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
          onProductUpdated={() => { loadProducts(); setSuccess("Product updated successfully! 🎉"); }}
          productId={selectedProduct.id}
        />
      )}
      {userCanUpdateStock && (
        <StockUpdateModal
          isOpen={modal.stock}
          onClose={() => closeModal("stock")}
          onStockUpdated={() => { loadProducts(); setSuccess("Stock updated! 📦"); }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
        />
      )}
    </div>
  );
};

export default Products;