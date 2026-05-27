// Products.jsx 
import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from "react";
import {
  FiPlus, FiSearch, FiBox, FiX, FiChevronLeft, FiChevronRight,
  FiEdit3, FiPackage, FiEye, FiAlertCircle, FiRefreshCw,
  FiTrendingUp, FiLayers, FiCheckCircle, FiInfo,
  FiSliders, FiArrowRight, FiChevronDown, FiZap,
  FiTag,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import {
  fetchProducts, createProduct, getProductTypes, getProductCategories,
} from "../api/products";
import { getAllBrands } from "../api/brands";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import EditProductModal from "../components/EditProductModal";
import StockUpdateModal from "../components/StockUpdateModal";
import {
  canCreateProduct, canEditProduct,
  canUpdateProductStock, canViewProductPrice,
} from "../utils/productPermissions";

/* ─────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────*/
const ALL_TYPES = "All Types";
const ALL_CATEGORIES = "All Categories";
const ALL_STATUS = "All Status";
const ALL_BRANDS = "All Brands";
const ALL_MODELS = "All Models";
const PAGE_LIMIT = 10;

// Category check — case-insensitive
const isBatteryCategory = (category) =>
  (category || "").toLowerCase().trim() === "battery";

const STATUS_FILTER_OPTIONS = [ALL_STATUS, "active", "inactive"];

const INITIAL_FORM = {
  brand: "", product_name: "", model: "",
  product_type: "", product_category: "",
  product_price: "", product_cost: "",
  unpackedStock: 0, packedStock: 0,
  unpackedNotes: "", packedNotes: "",
};

/* ─────────────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────────────────*/
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";
const toFloat = (v) => parseFloat(String(v).trim());
const isValidPos = (v) => { const n = toFloat(v); return !isNaN(n) && n >= 0; };
const fmtINR = (n) => n != null ? `₹\u202F${Number(n).toLocaleString("en-IN")}` : "—";

const buildQueryString = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

/* ─────────────────────────────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────────────────────────────────*/
const STATUS_CONFIG = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100",
    dot: "bg-emerald-400",
    pulse: true,
  },
  inactive: {
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-300",
    pulse: false,
  },
};

const StatusBadge = memo(({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {cfg.pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      </span>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
});
StatusBadge.displayName = "StatusBadge";

/* ─────────────────────────────────────────────────────────────────────
   STOCK LEVEL STYLE
───────────────────────────────────────────────────────────────────────*/
const stockLevelStyle = (qty) => {
  if (qty === 0) return "bg-rose-50 text-rose-600 border-rose-200 ring-1 ring-rose-100";
  if (qty < 5) return "bg-amber-50 text-amber-600 border-amber-200 ring-1 ring-amber-100";
  return "bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-100";
};

/* ─────────────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────────────────*/
const Field = memo(({ label, required, hint, children, id }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400 select-none">
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
Field.displayName = "Field";

const FormInput = React.forwardRef(({ prefix, className = "", ...props }, ref) => (
  <div className="relative">
    {prefix && (
      <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none">
        {prefix}
      </span>
    )}
    <input
      ref={ref}
      {...props}
      className={[
        "w-full border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-800",
        "placeholder-slate-300 bg-white transition-all",
        "focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400",
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
      <span className="p-1.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-500">
        <Icon size={11} />
      </span>
    )}
    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">
      {children}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
  </div>
));
SectionHeading.displayName = "SectionHeading";

const AlertBanner = memo(({ variant = "error", icon: Icon = FiAlertCircle, children, onDismiss }) => {
  const styles = {
    error: "bg-rose-50   border-rose-200   text-rose-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50  border-amber-200  text-amber-700",
  }[variant] ?? "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div role="alert" className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl text-sm font-semibold ${styles}`}>
      <Icon size={14} className="flex-shrink-0" aria-hidden />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
          <FiX size={13} />
        </button>
      )}
    </div>
  );
});
AlertBanner.displayName = "AlertBanner";

const Spinner = memo(({ size = 14, className = "" }) => (
  <div
    aria-hidden
    style={{ width: size, height: size }}
    className={`border-2 border-current border-t-transparent rounded-full animate-spin opacity-60 ${className}`}
  />
));
Spinner.displayName = "Spinner";

const StockRow = memo(({ type, qty, notes, onQtyChange, onNotesChange, qtyName, notesName }) => (
  <>
    <Field label={`${type} Qty`} id={qtyName}>
      <FormInput id={qtyName} type="number" name={qtyName} value={qty} onChange={onQtyChange} min="0" />
    </Field>
    {Number(qty) > 0 && (
      <Field label={`${type} Notes`} id={notesName}>
        <FormInput id={notesName} type="text" name={notesName} value={notes} onChange={onNotesChange} placeholder="Optional note" />
      </Field>
    )}
  </>
));
StockRow.displayName = "StockRow";

/* ─────────────────────────────────────────────────────────────────────
   VALIDATION & PAYLOAD
───────────────────────────────────────────────────────────────────────*/
const REQUIRED_FIELDS = ["brand", "product_name", "model", "product_price", "product_cost"];

const validateCreateForm = (form) => {
  const missing = REQUIRED_FIELDS.filter((k) => isBlank(form[k]));
  if (missing.length) return "Please fill in all required fields.";
  if (!isValidPos(form.product_price)) return "Enter a valid selling price.";
  if (!isValidPos(form.product_cost)) return "Enter a valid cost price.";
  return null;
};

const buildCreatePayload = (form) => {
  const stocks = [];
  const isBattery = isBatteryCategory(form.product_category);

  if (!isBattery && Number(form.unpackedStock) > 0) {
    stocks.push({
      stock: parseInt(form.unpackedStock, 10),
      stock_type: "UNPACKED",
      type: "ADD",
      stock_notes: form.unpackedNotes || `added stock ${form.unpackedStock} - unpacked`,
    });
  }
  if (Number(form.packedStock) > 0)
    stocks.push({ stock: parseInt(form.packedStock, 10), stock_type: "PACKED", type: "ADD", stock_notes: form.packedNotes || `added stock ${form.packedStock} - packed` });
  return {
    brand: form.brand, product_name: form.product_name.trim(), model: form.model,
    product_type: form.product_type.trim(), product_category: form.product_category,
    product_price: toFloat(form.product_price), product_cost: toFloat(form.product_cost), stocks,
  };
};

/* ─────────────────────────────────────────────────────────────────────
   CREATE PRODUCT MODAL
───────────────────────────────────────────────────────────────────────*/
const CreateProductModal = ({ isOpen, onClose, onProductCreated, productTypes = [], productCategories = [] }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [brands, setBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM); setAvailableModels([]); setError("");
    getAllBrands("active").then((r) => { if (r?.success && r?.data) setBrands(r.data); }).catch(console.error);
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

  const setField = useCallback((name, value) => setForm((prev) => ({ ...prev, [name]: value })), []);

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
    if (v && !productTypes.includes(v)) setCustomTypes((prev) => prev.includes(v) ? prev : [...prev, v]);
  }, [form.product_type, productTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateCreateForm(form);
    if (err) { setError(err); return; }
    setLoading(true); setError("");
    try {
      const res = await createProduct(buildCreatePayload(form));
      if (res?.success) {
        onClose(); onProductCreated?.();
        setTimeout(() => Swal.fire({ icon: "success", title: "Product Created", text: res.message || "Product created successfully" }), 100);
      } else { setError(res?.message || "Failed to create product."); }
    } catch (ex) { setError(ex?.message || "Network error. Please try again."); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;
  const typeDatalistId = "create-product-type-opts";
  const modelDisabled = !form.brand || availableModels.length === 0;
  const allTypeOptions = [...productTypes, ...customTypes];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200/80 flex flex-col overflow-hidden"
          style={{ maxHeight: "min(90dvh, 90vh)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                <FiBox size={14} aria-hidden />
              </div>
              <div>
                <h2 id="create-product-title" className="text-sm font-bold text-slate-900 leading-tight">Create New Product</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">Add to inventory</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close dialog" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <FiX size={16} />
            </button>
          </header>

          <form id="create-product-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {error && <AlertBanner onDismiss={() => setError("")}>{error}</AlertBanner>}

            <section className="space-y-4">
              <SectionHeading icon={FiBox}>Product Information</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Brand" required id="cp-brand">
                  <CustomSelect name="brand" value={form.brand} onChange={handleChange} options={["", ...brands.map((b) => b.brand_name)]} placeholder="Select brand" inputRef={firstFieldRef} />
                </Field>
                <Field label="Product Name" required id="cp-product-name">
                  <FormInput id="cp-product-name" type="text" name="product_name" value={form.product_name} onChange={handleChange} placeholder="e.g. Super Save Pro" autoComplete="off" />
                </Field>
                <Field label="Model" required id="cp-model" hint={form.brand && availableModels.length === 0 ? "No models available for this brand." : undefined}>
                  <CustomSelect name="model" value={form.model} onChange={handleChange} options={["", ...availableModels]} placeholder={form.brand ? "Select model" : "Select brand first"} disabled={modelDisabled} />
                </Field>
                <Field label="Product Type" id="cp-product-type">
                  <FormInput id="cp-product-type" list={typeDatalistId} name="product_type" value={form.product_type} onChange={handleChange} onBlur={handleTypeBlur} placeholder="Select or type product type" autoComplete="off" />
                  <datalist id={typeDatalistId}>{allTypeOptions.map((t) => <option key={t} value={t} />)}</datalist>
                </Field>
                <Field label="Product Category" id="cp-product-category">
                  <CustomSelect name="product_category" value={form.product_category} onChange={(e) => setField("product_category", e.target.value)} placeholder="Select category" options={["", ...productCategories]} />
                </Field>
                <div className="hidden sm:block" aria-hidden />
                <Field label="Unit Price (₹)" required id="cp-product-price">
                  <FormInput id="cp-product-price" type="number" name="product_price" value={form.product_price} onChange={handleChange} placeholder="0.00" min="0" step="0.5" prefix="₹" />
                </Field>
                <Field label="Product Cost (₹)" required id="cp-product-cost">
                  <FormInput id="cp-product-cost" type="number" name="product_cost" value={form.product_cost} onChange={handleChange} placeholder="0.00" min="0" step="0.5" prefix="₹" />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeading icon={FiPackage}>Initial Stock</SectionHeading>

              {isBatteryCategory(form.product_category) ? (
                // 🔋 BATTERY → ONLY PACKED STOCK
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1">
                    <FiZap size={10} /> Battery products only use packed stock
                  </p>

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
              ) : (
                // 📦 NORMAL → BOTH
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
              )}
            </section>
          </form>

          <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" form="create-product-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-blue-200">
              {loading ? <><Spinner size={13} className="text-white" />Creating…</> : <><FiPlus size={13} aria-hidden />Create Product</>}
            </button>
          </footer>
        </div>
      </div >
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────────*/
const STAT_COLOR_MAP = {
  indigo: { wrap: "bg-blue-600", text: "text-white" },
  emerald: { wrap: "bg-emerald-500", text: "text-white" },
  rose: { wrap: "bg-rose-500", text: "text-white" },
  amber: { wrap: "bg-amber-400", text: "text-amber-900" },
};

const StatCard = memo(({ label, value, icon, color }) => {
  const cfg = STAT_COLOR_MAP[color] ?? STAT_COLOR_MAP.indigo;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow duration-200 min-w-0">
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${cfg.wrap}`} aria-hidden>
        {React.cloneElement(icon, { size: 14, className: cfg.text })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 truncate">{label}</p>
        <p className="text-xl font-black tabular-nums text-slate-900 leading-tight mt-0.5">{value ?? "—"}</p>
      </div>
    </div>
  );
});
StatCard.displayName = "StatCard";

/* ─────────────────────────────────────────────────────────────────────
   PAGINATION
───────────────────────────────────────────────────────────────────────*/
const PaginationBtn = memo(({ children, active, ...props }) => (
  <button
    {...props}
    className={[
      "min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
      active ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
      "disabled:opacity-40 disabled:cursor-not-allowed",
    ].join(" ")}
  >
    {children}
  </button>
));
PaginationBtn.displayName = "PaginationBtn";

const Pagination = memo(({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = allPages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-400 font-medium">
        Showing <span className="font-bold text-slate-600">{from}–{to}</span> of <span className="font-bold text-slate-600">{total}</span> products
      </p>
      <div className="flex items-center gap-1.5">
        <PaginationBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page"><FiChevronLeft size={13} /></PaginationBtn>
        {visible.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - visible[i - 1] > 1 && <span className="px-1.5 text-slate-300 text-xs" aria-hidden>…</span>}
            <PaginationBtn onClick={() => onPageChange(p)} active={p === page} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined}>{p}</PaginationBtn>
          </React.Fragment>
        ))}
        <PaginationBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page"><FiChevronRight size={13} /></PaginationBtn>
      </div>
    </nav>
  );
});
Pagination.displayName = "Pagination";

/* ─────────────────────────────────────────────────────────────────────
   STOCK BADGE
───────────────────────────────────────────────────────────────────────*/
const STOCK_BADGE_STYLES = {
  blue: { wrapper: "bg-sky-50 text-sky-700 border-sky-100", dot: "bg-sky-400" },
  violet: { wrapper: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-400" },
  amber: { wrapper: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-400" },
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
StockBadge.displayName = "StockBadge";

const ActionBtn = memo(({ children, label, colorClass, onClick }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`p-2 rounded-lg text-slate-400 transition-all active:scale-90 ${colorClass}`}>
    {children}
  </button>
));
ActionBtn.displayName = "ActionBtn";

const Pill = memo(({ children }) => (
  <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold uppercase tracking-wide">
    {children || "—"}
  </span>
));
Pill.displayName = "Pill";

/* ─────────────────────────────────────────────────────────────────────
   PRODUCT ROW — with merged Product+Brand+Model cell & battery logic
───────────────────────────────────────────────────────────────────────*/
const ProductRow = memo(({
  product,
  userCanEdit, userCanUpdateStock, userCanViewPrice,
  onView, onEdit, onStock,
}) => {
  const {
    product_id, product_name, brand, model,
    product_type, product_category, price,
    available_stock, status, stocks = [],
  } = product;

  /* Stock resolution */
  const unpackedStock =
    stocks.find((s) => s.stock_type === "UNPACKED")?.stock ??
    stocks[0]?.unpacked_stock ?? 0;
  const packedStock =
    stocks.find((s) => s.stock_type === "PACKED")?.stock ??
    stocks[0]?.packed_stock ?? 0;

  const qty = available_stock ?? 0;
  const stockStyle = stockLevelStyle(qty);
  const isBattery = isBatteryCategory(product_category);

  return (
    <tr className="group border-b border-slate-100 hover:bg-blue-50/20 transition-colors duration-100">

      {/* ── MERGED: Product + Brand + Model ── */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-blue-200 group-hover:from-blue-100 transition-all duration-150">
            {isBattery
              ? <FiZap size={13} className="text-amber-500 group-hover:text-amber-600 transition-colors" />
              : <FiBox size={13} className="text-blue-400 group-hover:text-blue-500 transition-colors" />
            }
          </div>
          {/* Text block */}
          <div className="min-w-0">
            {/* Product name */}
            <p className="font-semibold text-slate-800 truncate max-w-[160px] xl:max-w-[220px] text-sm leading-tight">
              {product_name}
            </p>
            {/* Brand · Model row */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {brand && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wide">
                  <FiTag size={8} aria-hidden />
                  {brand}
                </span>
              )}
              {model && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black uppercase tracking-wide">
                  <FiLayers size={8} aria-hidden />
                  {model}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Product ID */}
              <span className="text-[9px] font-mono text-slate-300">
                {product_id}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3.5"><Pill>{product_type}</Pill></td>

      {/* Category */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Pill>{product_category}</Pill>
          {isBattery && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase tracking-wide">
              <FiZap size={8} />BTY
            </span>
          )}
        </div>
      </td>

      {/* Price */}
      {userCanViewPrice && (
        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-bold text-slate-900 tabular-nums">
          {fmtINR(price)}
        </td>
      )}

      {/* Available stock */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-black tabular-nums ${stockStyle}`}>
          {qty}
        </span>
      </td>

      {/* Stock breakdown — Battery shows ONLY packed */}
      <td className="px-4 py-3.5">
        <div className="flex gap-1.5 flex-wrap">
          {isBattery ? (
            // Battery: PACKED only
            <StockBadge color="violet" label="P" value={packedStock} />
          ) : (
            // Normal: both
            <>
              <StockBadge color="blue" label="U" value={unpackedStock} />
              <StockBadge color="violet" label="P" value={packedStock} />
            </>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5"><StatusBadge status={status} /></td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <ActionBtn onClick={onView} label="View product" colorClass="hover:text-blue-600 hover:bg-blue-50"><FiEye size={14} /></ActionBtn>
          {userCanEdit && (
            <ActionBtn onClick={onEdit} label="Edit product" colorClass="hover:text-sky-600 hover:bg-sky-50"><FiEdit3 size={14} /></ActionBtn>
          )}
          {userCanUpdateStock && status === "active" && (
            <ActionBtn onClick={onStock} label="Update stock" colorClass="hover:text-emerald-600 hover:bg-emerald-50"><FiPackage size={14} /></ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
});
ProductRow.displayName = "ProductRow";

/* ─────────────────────────────────────────────────────────────────────
   FILTER BAR
───────────────────────────────────────────────────────────────────────*/
const FilterBar = memo(({
  searchInput, onSearchInput, onSearchClear,
  filterBrands, filterModels, productTypes, productCategories,
  selectedBrand, selectedModel, selectedType, selectedCategory, selectedStatus,
  onBrandChange, onModelChange, onTypeChange, onCategoryChange, onStatusChange,
  hasActiveFilters, onClearFilters, loadingMeta,
}) => {
  const typeOptions = [ALL_TYPES, ...productTypes];
  const categoryOptions = [ALL_CATEGORIES, ...productCategories];

  return (
    <div className="flex items-center gap-0 h-12 bg-white border border-slate-100 rounded-xl overflow-x-auto scrollbar-none px-1">
      {/* Search */}
      <div className="relative flex-shrink-0 w-[294px] px-1.5">
        <FiSearch size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search" placeholder="Search products…" value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)} aria-label="Search products"
          className="w-full h-8 pl-7 pr-6 text-[12.5px] text-slate-800 placeholder-slate-300 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-150"
        />
        {searchInput && (
          <button onClick={onSearchClear} aria-label="Clear search" className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-[15px] h-[15px] rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all duration-100">
            <FiX size={9} />
          </button>
        )}
      </div>

      <div className="w-8 flex-shrink-0" />

      <div className="flex items-center gap-1.5 px-2.5 flex-shrink-0">
        <FiSliders size={11} className="text-slate-400" />
        <span className="text-[10px] font-semibold tracking-[.1em] uppercase text-slate-400 whitespace-nowrap">FILTER</span>
        {loadingMeta && <Spinner size={10} className="text-blue-400 ml-0.5" />}
      </div>

      <div className="w-px h-5 bg-slate-200 flex-shrink-0 mx-0.5" />

      {[
        { value: selectedBrand || ALL_BRANDS, onChange: (e) => onBrandChange(e.target.value), options: [ALL_BRANDS, ...filterBrands.map((b) => b.brand_name)], width: "116px", disabled: false },
        { value: selectedModel || ALL_MODELS, onChange: (e) => onModelChange(e.target.value), options: [ALL_MODELS, ...filterModels], width: "108px", disabled: !selectedBrand || filterModels.length === 0 },
        { value: selectedType || ALL_TYPES, onChange: (e) => onTypeChange(e.target.value), options: typeOptions, width: "108px", disabled: loadingMeta },
        { value: selectedCategory || ALL_CATEGORIES, onChange: (e) => onCategoryChange(e.target.value), options: categoryOptions, width: "122px", disabled: loadingMeta },
        { value: selectedStatus || ALL_STATUS, onChange: (e) => onStatusChange(e.target.value), options: STATUS_FILTER_OPTIONS, width: "100px", disabled: false },
      ].map(({ value, onChange, options, width, disabled }, i) => (
        <div key={i} className="relative flex-shrink-0 px-0.5" style={{ width }}>
          <select
            value={value} onChange={onChange} disabled={disabled}
            className="w-full h-8 appearance-none pl-2.5 pr-5 text-[12px] font-medium text-slate-600 bg-transparent border-none rounded-lg outline-none cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-blue-100 disabled:opacity-35 disabled:cursor-not-allowed transition-all duration-150"
          >
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
          <FiChevronDown size={9} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      ))}

      {hasActiveFilters && (
        <button
          onClick={onClearFilters} aria-label="Clear all filters" title="Clear all filters"
          className="ml-auto mr-1 flex-shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-medium text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 transition-all duration-150 whitespace-nowrap"
        >
          <FiX size={9} />Clear
        </button>
      )}
    </div>
  );
});
FilterBar.displayName = "FilterBar";

/* ─────────────────────────────────────────────────────────────────────
   TABLE HEADER — updated to match merged cell
───────────────────────────────────────────────────────────────────────*/
const TableHeader = memo(({ headers }) => (
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50/80">
      {headers.map((h, i) => (
        <th key={i} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap ${!h ? "text-right" : "text-left"}`}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
));
TableHeader.displayName = "TableHeader";

/* ─────────────────────────────────────────────────────────────────────
   EMPTY / LOADING / ERROR STATES
───────────────────────────────────────────────────────────────────────*/
const EmptyState = memo(({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <FiBox size={24} className="text-slate-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-600">No products found</p>
          <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
        </div>
      </div>
    </td>
  </tr>
));
EmptyState.displayName = "EmptyState";

const LoadingState = memo(() => (
  <div className="flex flex-col items-center justify-center py-28 gap-5">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
      <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <p className="text-sm text-slate-400 font-semibold tracking-wide">Loading products…</p>
  </div>
));
LoadingState.displayName = "LoadingState";

const ErrorState = memo(({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
      <FiAlertCircle size={24} className="text-rose-400" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-bold text-rose-600">Something went wrong</p>
      <p className="text-xs text-slate-400">{message}</p>
    </div>
    <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-bold px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 transition-all hover:bg-blue-100">
      <FiRefreshCw size={13} />Try again
    </button>
  </div>
));
ErrorState.displayName = "ErrorState";

/* ─────────────────────────────────────────────────────────────────────
   PRODUCTS PAGE
───────────────────────────────────────────────────────────────────────*/
const Products = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const userCanCreate = canCreateProduct(role);
  const userCanEdit = canEditProduct(role);
  const userCanUpdateStock = canUpdateProductStock(role);
  const userCanViewPrice = canViewProductPrice(role);

  /* ── Modals ─────────────────────────────────────────────────────────*/
  const [modal, setModal] = useState({ create: false, edit: false, stock: false });
  const [selectedProduct, setSelectedProduct] = useState({
    id: null,
    name: "",
    category: "",
  });

  const openModal = useCallback((key) => setModal((m) => ({ ...m, [key]: true })), []);
  const closeModal = useCallback((key) => setModal((m) => ({ ...m, [key]: false })), []);

  const openEditModal = useCallback((id, name) => {
    if (!userCanEdit) return;
    setSelectedProduct({ id, name }); openModal("edit");
  }, [userCanEdit, openModal]);

  const openStockModal = useCallback((id, name, category) => {
    if (!userCanUpdateStock) return;
    setSelectedProduct({ id, name, category });
    openModal("stock");
  }, [userCanUpdateStock, openModal]);

  /* ── Filter state ────────────────────────────────────────────────── */
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [page, setPage] = useState(1);

  /* ── Meta ────────────────────────────────────────────────────────── */
  const [filterBrands, setFilterBrands] = useState([]);
  const [filterModels, setFilterModels] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      getAllBrands("active").catch(() => null),
      getProductTypes().catch(() => null),
      getProductCategories().catch(() => null),
    ]).then(([brandsRes, typesRes, categoriesRes]) => {
      if (brandsRes?.success && brandsRes.data) setFilterBrands(brandsRes.data);
      if (typesRes?.success && typesRes.data) setProductTypes(typesRes.data);
      if (categoriesRes?.success && categoriesRes.data) setProductCategories(categoriesRes.data);
    }).finally(() => setLoadingMeta(false));
  }, []);

  /* ── Products data ───────────────────────────────────────────────── */
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
    setLoading(true); setError("");
    try {
      const params = {
        page, limit: PAGE_LIMIT, search: searchQuery, type: selectedType,
        category: selectedCategory, status: selectedStatus, brand: selectedBrand, model: selectedModel,
      };
      const allParams = { page: 1, limit: 10000 };
      const [pagedRes, allRes] = await Promise.all([
        fetchProducts(params, buildQueryString(params)),
        fetchProducts(allParams, buildQueryString(allParams)),
      ]);
      if (!pagedRes?.success) throw new Error(pagedRes?.message || "Failed to fetch products");
      setProducts(pagedRes.data ?? []);
      const pp = pagedRes.pagination;
      const ap = allRes?.pagination;
      setPagination({ totalPages: pp?.totalPages || ap?.totalPages || 1, total: pp?.total || ap?.total || (allRes?.data?.length ?? 0) });
      if (allRes?.success) setAllProducts(allRes.data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedType, selectedCategory, selectedStatus, selectedBrand, selectedModel]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const stats = useMemo(() => ({
    active: allProducts.filter((p) => p.status === "active").length,
    zeroStock: allProducts.filter((p) => (p.available_stock ?? 0) === 0).length,
  }), [allProducts]);

  const hasActiveFilters = Boolean(searchQuery || selectedType || selectedCategory || selectedStatus || selectedBrand || selectedModel);

  const clearFilters = useCallback(() => {
    setSearchInput(""); setSearchQuery("");
    setSelectedType(""); setSelectedCategory(""); setSelectedStatus("");
    setSelectedBrand(""); setSelectedModel(""); setFilterModels([]);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((field, displayValue) => {
    const sentinels = { type: ALL_TYPES, category: ALL_CATEGORIES, status: ALL_STATUS, model: ALL_MODELS };
    const apiValue = displayValue === sentinels[field] ? "" : displayValue;
    const setters = { type: setSelectedType, category: setSelectedCategory, status: setSelectedStatus, model: setSelectedModel };
    setters[field]?.(apiValue); setPage(1);
  }, []);

  const handleBrandFilterChange = useCallback((displayValue) => {
    const apiValue = displayValue === ALL_BRANDS ? "" : displayValue;
    setSelectedBrand(apiValue); setSelectedModel("");
    if (apiValue) {
      const match = filterBrands.find((b) => b.brand_name === apiValue);
      setFilterModels(match?.brand_models ?? []);
    } else { setFilterModels([]); }
    setPage(1);
  }, [filterBrands]);

  // Table headers — no separate Brand/Model columns (merged into first col)
  const colHeaders = useMemo(() => [
    "Product", "Type", "Category",
    ...(userCanViewPrice ? ["Price"] : []),
    "Available", "Stock", "Status",
    ...(userCanEdit || userCanUpdateStock ? [""] : []),
  ], [userCanViewPrice, userCanEdit, userCanUpdateStock]);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="w-full overflow-x-hidden p-4 sm:p-6">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {success && (
          <AlertBanner variant="success" icon={FiCheckCircle} onDismiss={() => setSuccess("")}>
            {success}
          </AlertBanner>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white flex-shrink-0"><FiBox size={13} /></div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Products</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-0.5">
              {loading ? "Loading inventory…" : `${pagination.total.toLocaleString()} product${pagination.total !== 1 ? "s" : ""} in your catalog`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={loadProducts} disabled={loading} title="Refresh" aria-label="Refresh products" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all disabled:opacity-50 group">
              <FiRefreshCw size={14} className={`transition-transform ${loading ? "animate-spin" : "group-hover:rotate-180 duration-500"}`} aria-hidden />
            </button>
            {userCanCreate && (
              <button onClick={() => openModal("create")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 whitespace-nowrap">
                <FiPlus size={14} aria-hidden />Create Product<FiArrowRight size={13} className="opacity-70" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={pagination.total.toLocaleString()} icon={<FiBox />} color="indigo" />
          <StatCard label="Active" value={stats.active} icon={<FiTrendingUp />} color="emerald" />
          <StatCard label="Zero Stock" value={stats.zeroStock} icon={<FiAlertCircle />} color="rose" />
          <StatCard label="Showing" value={products.length} icon={<FiLayers />} color="amber" />
        </div>

        {/* Main panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <FilterBar
            searchInput={searchInput} onSearchInput={setSearchInput}
            onSearchClear={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
            filterBrands={filterBrands} filterModels={filterModels}
            productTypes={productTypes} productCategories={productCategories}
            selectedBrand={selectedBrand} selectedModel={selectedModel}
            selectedType={selectedType} selectedCategory={selectedCategory} selectedStatus={selectedStatus}
            onBrandChange={handleBrandFilterChange}
            onModelChange={(v) => handleFilterChange("model", v)}
            onTypeChange={(v) => handleFilterChange("type", v)}
            onCategoryChange={(v) => handleFilterChange("category", v)}
            onStatusChange={(v) => handleFilterChange("status", v)}
            hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters}
            loadingMeta={loadingMeta}
          />

          {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadProducts} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "780px" }} aria-label="Products table">
                <TableHeader headers={colHeaders} />
                <tbody className="divide-y divide-slate-100 bg-white">
                  {products.length === 0 ? <EmptyState colSpan={colHeaders.length} /> : (
                    products.map((product) => (
                      <ProductRow
                        key={product.product_id}
                        product={product}
                        userCanEdit={userCanEdit}
                        userCanUpdateStock={userCanUpdateStock}
                        userCanViewPrice={userCanViewPrice}
                        onView={() => navigate(`/products/${product.product_id}`)}
                        onEdit={() => openEditModal(product.product_id, product.product_name)}
                        onStock={() =>
                          openStockModal(
                            product.product_id,
                            product.product_name,
                            product.product_category
                          )
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && pagination.total > 0 && (
            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={PAGE_LIMIT} onPageChange={setPage} />
          )}
        </div>
      </div>

      {/* Modals */}
      {userCanCreate && (
        <CreateProductModal isOpen={modal.create} onClose={() => closeModal("create")} onProductCreated={loadProducts} productTypes={productTypes} productCategories={productCategories} />
      )}
      {userCanEdit && (
        <EditProductModal isOpen={modal.edit} onClose={() => closeModal("edit")} onProductUpdated={() => { loadProducts(); setSuccess("Product updated successfully!"); }} productId={selectedProduct.id} />
      )}
      {userCanUpdateStock && (
        <StockUpdateModal
          isOpen={modal.stock}
          onClose={() => closeModal("stock")}
          onStockUpdated={() => {
            loadProducts();
            setSuccess("Stock updated successfully!");
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          category={selectedProduct.category}   // 🔥 FIXED
        />
      )}
    </div>
  );
};

export default Products;