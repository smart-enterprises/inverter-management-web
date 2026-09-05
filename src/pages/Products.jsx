// Products.jsx — Material Design 3
import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from "react";
import {
  MdAdd, MdSearch, MdInventory2, MdClose, MdChevronLeft, MdChevronRight,
  MdEdit, MdInventory, MdVisibility, MdErrorOutline, MdRefresh,
  MdTrendingUp, MdLayers, MdCheckCircle, MdInfoOutline,
  MdTune, MdExpandMore, MdBolt, MdSell,
} from "react-icons/md";
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
import {
  Surface, Button, IconButton, Chip, EmptyState as M3EmptyState,
  Banner, Table, Thead, Th, Tr, Td, KpiCard,
} from "../components/m3";
import { T } from "../components/m3/tokens";

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
/* Active/inactive keeps a dot beside the label, so the state is never
   carried by colour alone. */
const StatusBadge = memo(({ status }) => {
  const isActive = status === "active";
  return (
    <Chip tone={isActive ? "success" : "neutral"}>
      <span
        className="w-1.5 h-1.5 flex-shrink-0"
        style={{
          borderRadius: T.cornerFull,
          backgroundColor: isActive ? T.success : T.outline,
        }}
      />
      {isActive ? "Active" : "Inactive"}
    </Chip>
  );
});
StatusBadge.displayName = "StatusBadge";

/* ─────────────────────────────────────────────────────────────────────
   STOCK LEVEL STYLE
───────────────────────────────────────────────────────────────────────*/
const stockLevelTone = (qty) => {
  if (qty === 0) return "error";
  if (qty < 5) return "warning";
  return "success";
};

/* ─────────────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────────────────*/
const Field = memo(({ label, required, hint, children, id }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block m3-label-medium select-none" style={{ color: T.onSurfaceVariant }}>
      {label}
      {required && <span className="ml-0.5" style={{ color: T.error }} aria-hidden>*</span>}
    </label>
    {children}
    {hint && (
      <p className="m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
        <MdInfoOutline size={14} aria-hidden />
        {hint}
      </p>
    )}
  </div>
));
Field.displayName = "Field";

const FormInput = React.forwardRef(({ prefix, className = "", ...props }, ref) => (
  <div className="relative">
    {prefix && (
      <span
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 m3-body-medium pointer-events-none select-none"
        style={{ color: T.onSurfaceVariant }}
      >
        {prefix}
      </span>
    )}
    <input
      ref={ref}
      {...props}
      className={[
        "w-full m3-body-medium h-11 focus:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        prefix ? "pl-7 pr-3" : "px-3",
        className,
      ].join(" ")}
      style={{
        border: `1px solid ${T.outline}`,
        borderRadius: T.cornerExtraSmall,
        backgroundColor: T.surface,
        color: T.onSurface,
      }}
    />
  </div>
));
FormInput.displayName = "FormInput";

const SectionHeading = memo(({ icon: Icon, children }) => (
  <div className="flex items-center gap-3">
    {Icon && (
      <span
        className="p-1.5 flex-shrink-0"
        style={{
          borderRadius: T.cornerFull,
          backgroundColor: T.primaryContainer,
          color: T.onPrimaryContainer,
        }}
      >
        <Icon size={16} />
      </span>
    )}
    <span className="m3-title-small whitespace-nowrap" style={{ color: T.onSurface }}>
      {children}
    </span>
    <div className="flex-1 h-px" style={{ backgroundColor: T.outlineVariant }} />
  </div>
));
SectionHeading.displayName = "SectionHeading";

const AlertBanner = memo(({ variant = "error", children, onDismiss }) => (
  <div role="alert" className="relative">
    <Banner tone={variant}>{children}</Banner>
    {onDismiss && (
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <MdClose size={18} />
      </button>
    )}
  </div>
));
AlertBanner.displayName = "AlertBanner";

const Spinner = memo(({ size = 14, className = "" }) => (
  <div
    aria-hidden
    style={{ width: size, height: size }}
    className={`border-2 border-current border-t-transparent rounded-full animate-spin opacity-60 ${className}`.trim()}
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
    product_type: form.product_type.trim(), product_category: form.product_category.trim(),
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
  const [customCategories, setCustomCategories] = useState([]);
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

  const handleCategoryBlur = useCallback(() => {
    const v = form.product_category?.trim().toUpperCase();
    if (v && !productCategories.includes(v)) setCustomCategories((prev) => prev.includes(v) ? prev : [...prev, v]);
  }, [form.product_category, productCategories]);

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
  const categoryDatalistId = "create-product-category-opts";
  const modelDisabled = !form.brand || availableModels.length === 0;
  const allTypeOptions = [...productTypes, ...customTypes];
  const allCategoryOptions = [...productCategories, ...customCategories];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
        <div
          className="relative w-full max-w-2xl flex flex-col overflow-hidden"
          style={{
            maxHeight: "min(90dvh, 90vh)",
            backgroundColor: "var(--md-sys-color-surface-container-high)",
            borderRadius: T.cornerExtraLarge,
            boxShadow: T.elevation3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className="flex items-center justify-between px-6 py-5 flex-shrink-0"
            style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="p-2.5"
                style={{
                  borderRadius: T.cornerFull,
                  backgroundColor: T.primaryContainer,
                  color: T.onPrimaryContainer,
                }}
              >
                <MdInventory2 size={20} aria-hidden />
              </div>
              <div>
                <h2 id="create-product-title" className="m3-title-medium" style={{ color: T.onSurface }}>
                  Create New Product
                </h2>
                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>Add to inventory</p>
              </div>
            </div>
            <IconButton icon={MdClose} onClick={onClose} aria-label="Close dialog" />
          </header>

          <form id="create-product-form" onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {error && <AlertBanner onDismiss={() => setError("")}>{error}</AlertBanner>}

            <section className="space-y-4">
              <SectionHeading icon={MdInventory2}>Product Information</SectionHeading>
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
                <Field label="Product Category" id="cp-product-category" hint="Pick one, or type a new category to create it.">
                  <FormInput id="cp-product-category" list={categoryDatalistId} name="product_category" value={form.product_category} onChange={handleChange} onBlur={handleCategoryBlur} placeholder="Select or type product category" autoComplete="off" />
                  <datalist id={categoryDatalistId}>{allCategoryOptions.map((c) => <option key={c} value={c} />)}</datalist>
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
              <SectionHeading icon={MdInventory}>Initial Stock</SectionHeading>

              {isBatteryCategory(form.product_category) ? (
                // 🔋 BATTERY → ONLY PACKED STOCK
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p className="m3-body-small flex items-center gap-1" style={{ color: T.warning }}>
                    <MdBolt size={14} /> Battery products only use packed stock
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

          <footer
            className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: `1px solid ${T.outlineVariant}` }}
          >
            <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="filled" type="submit" form="create-product-form" disabled={loading}>
              {loading ? <><Spinner size={14} />Creating…</> : <><MdAdd size={18} aria-hidden />Create Product</>}
            </Button>
          </footer>
        </div>
      </div >
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   PAGINATION
───────────────────────────────────────────────────────────────────────*/
const PaginationBtn = memo(({ children, active, ...props }) => (
  <button
    type="button"
    {...props}
    className="m3-label-large m3-state-layer m3-focus min-w-[32px] h-8 px-2.5 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
    style={{
      borderRadius: T.cornerFull,
      backgroundColor: active ? T.secondaryContainer : "transparent",
      color: active ? T.onSecondaryContainer : T.onSurfaceVariant,
    }}
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
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      style={{ borderTop: `1px solid ${T.outlineVariant}` }}
    >
      <p className="m3-body-small" style={{ color: T.onSurfaceVariant }}>
        Showing {from}–{to} of {total} products
      </p>
      <div className="flex items-center gap-1.5">
        <PaginationBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page"><MdChevronLeft size={20} /></PaginationBtn>
        {visible.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - visible[i - 1] > 1 && <span className="px-1.5 m3-body-small" style={{ color: T.onSurfaceVariant }} aria-hidden>…</span>}
            <PaginationBtn onClick={() => onPageChange(p)} active={p === page} aria-label={`Page ${p}`} aria-current={p === page ? "page" : undefined}>{p}</PaginationBtn>
          </React.Fragment>
        ))}
        <PaginationBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page"><MdChevronRight size={20} /></PaginationBtn>
      </div>
    </nav>
  );
});
Pagination.displayName = "Pagination";

/* ─────────────────────────────────────────────────────────────────────
   STOCK BADGE
───────────────────────────────────────────────────────────────────────*/
/* Unpacked / packed read as two tones of the same idea, each labelled. */
const STOCK_BADGE_TONE = { blue: "secondary", violet: "warning", amber: "warning" };

const StockBadge = memo(({ color, label, value }) => (
  <Chip tone={STOCK_BADGE_TONE[color] ?? "secondary"} className="m3-numeric whitespace-nowrap">
    {label}: {value}
  </Chip>
));
StockBadge.displayName = "StockBadge";

const Pill = memo(({ children }) => (
  <Chip tone="neutral">{children || "—"}</Chip>
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
  const isBattery = isBatteryCategory(product_category);

  return (
    <Tr className="group">

      {/* ── MERGED: Product + Brand + Model ── */}
      <Td>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{
              borderRadius: T.cornerFull,
              backgroundColor: isBattery ? T.warningContainer : T.primaryContainer,
              color: isBattery ? T.onWarningContainer : T.onPrimaryContainer,
            }}
          >
            {isBattery ? <MdBolt size={20} /> : <MdInventory2 size={20} />}
          </div>
          <div className="min-w-0">
            <p
              className="m3-body-medium truncate max-w-[160px] xl:max-w-[220px]"
              style={{ color: T.onSurface }}
            >
              {product_name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {brand && <Chip tone="primary" icon={MdSell}>{brand}</Chip>}
              {model && <Chip tone="neutral" icon={MdLayers}>{model}</Chip>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="m3-body-small font-mono" style={{ color: T.onSurfaceVariant }}>
                {product_id}
              </span>
            </div>
          </div>
        </div>
      </Td>

      <Td><Pill>{product_type}</Pill></Td>

      <Td>
        <div className="flex items-center gap-1.5">
          <Pill>{product_category}</Pill>
          {isBattery && <Chip tone="warning" icon={MdBolt}>BTY</Chip>}
        </div>
      </Td>

      {userCanViewPrice && (
        <Td numeric className="whitespace-nowrap">{fmtINR(price)}</Td>
      )}

      {/* Available stock — tone signals the level, the number states it. */}
      <Td>
        <Chip tone={stockLevelTone(qty)} className="m3-numeric">{qty}</Chip>
      </Td>

      {/* Stock breakdown — Battery shows ONLY packed */}
      <Td>
        <div className="flex gap-1.5 flex-wrap">
          {isBattery ? (
            <StockBadge color="violet" label="P" value={packedStock} />
          ) : (
            <>
              <StockBadge color="blue" label="U" value={unpackedStock} />
              <StockBadge color="violet" label="P" value={packedStock} />
            </>
          )}
        </div>
      </Td>

      <Td><StatusBadge status={status} /></Td>

      <Td align="right">
        <div className="flex items-center justify-end gap-0.5">
          <IconButton icon={MdVisibility} onClick={onView} aria-label="View product" title="View product" />
          {userCanEdit && (
            <IconButton icon={MdEdit} onClick={onEdit} aria-label="Edit product" title="Edit product" />
          )}
          {userCanUpdateStock && status === "active" && (
            <IconButton icon={MdInventory} onClick={onStock} aria-label="Update stock" title="Update stock" />
          )}
        </div>
      </Td>
    </Tr>
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
    <div
      className="flex items-center gap-0 h-14 overflow-x-auto scrollbar-none px-2"
      style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
    >
      {/* Search */}
      <div className="relative flex-shrink-0 w-[294px] px-1.5">
        <MdSearch
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: T.onSurfaceVariant }}
        />
        <input
          type="search" placeholder="Search products…" value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)} aria-label="Search products"
          className="m3-body-medium w-full h-10 pl-10 pr-8 focus:outline-none"
          style={{
            backgroundColor: T.surfaceContainerHigh,
            borderRadius: T.cornerFull,
            color: T.onSurface,
          }}
        />
        {searchInput && (
          <button
            type="button"
            onClick={onSearchClear}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2"
            style={{ color: T.onSurfaceVariant }}
          >
            <MdClose size={16} />
          </button>
        )}
      </div>

      <div className="w-6 flex-shrink-0" />

      <div className="flex items-center gap-1.5 px-2.5 flex-shrink-0">
        <MdTune size={16} style={{ color: T.onSurfaceVariant }} />
        <span className="m3-label-medium whitespace-nowrap" style={{ color: T.onSurfaceVariant }}>
          Filter
        </span>
        {loadingMeta && <Spinner size={12} className="ml-0.5" />}
      </div>

      <div className="w-px h-5 flex-shrink-0 mx-1" style={{ backgroundColor: T.outlineVariant }} />

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
            className="m3-body-medium w-full h-8 appearance-none pl-2.5 pr-6 bg-transparent border-none outline-none cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ color: T.onSurfaceVariant, borderRadius: T.cornerSmall }}
          >
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
          <MdExpandMore
            size={16}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: T.onSurfaceVariant }}
          />
        </div>
      ))}

      {hasActiveFilters && (
        <Button
          variant="text"
          icon={MdClose}
          iconSize={16}
          onClick={onClearFilters}
          aria-label="Clear all filters"
          title="Clear all filters"
          className="ml-auto mr-1 flex-shrink-0 whitespace-nowrap"
          style={{ height: 32, color: T.error }}
        >
          Clear
        </Button>
      )}
    </div>
  );
});
FilterBar.displayName = "FilterBar";

/* ─────────────────────────────────────────────────────────────────────
   TABLE HEADER — updated to match merged cell
───────────────────────────────────────────────────────────────────────*/
const TableHeader = memo(({ headers }) => (
  <Thead>
    {headers.map((h, i) => (
      <Th key={i} align={!h ? "right" : "left"}>{h}</Th>
    ))}
  </Thead>
));
TableHeader.displayName = "TableHeader";

/* ─────────────────────────────────────────────────────────────────────
   EMPTY / LOADING / ERROR STATES
───────────────────────────────────────────────────────────────────────*/
const EmptyRow = memo(({ colSpan }) => (
  <tr>
    <td colSpan={colSpan}>
      <M3EmptyState icon={MdInventory2} label="No products found" />
      <p className="m3-body-small text-center -mt-8 pb-8" style={{ color: T.onSurfaceVariant }}>
        Try adjusting your search or filters
      </p>
    </td>
  </tr>
));
EmptyRow.displayName = "EmptyRow";

const LoadingState = memo(() => (
  <div className="flex flex-col items-center justify-center py-28 gap-5">
    <div className="relative w-12 h-12">
      <div
        className="absolute inset-0 border-4 rounded-full"
        style={{ borderColor: T.surfaceContainerHighest }}
      />
      <div
        className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderLeftColor: T.primary, borderRightColor: T.primary, borderBottomColor: T.primary }}
      />
    </div>
    <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>Loading products…</p>
  </div>
));
LoadingState.displayName = "LoadingState";

const ErrorState = memo(({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="p-4" style={{ backgroundColor: T.errorContainer, borderRadius: T.cornerFull }}>
      <MdErrorOutline size={24} style={{ color: T.onErrorContainer }} />
    </div>
    <div className="text-center space-y-1">
      <p className="m3-title-small" style={{ color: T.error }}>Something went wrong</p>
      <p className="m3-body-small" style={{ color: T.onSurfaceVariant }}>{message}</p>
    </div>
    <Button variant="tonal" icon={MdRefresh} onClick={onRetry}>Try again</Button>
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
    <div className="w-full overflow-x-hidden p-4 sm:p-6" style={{ backgroundColor: T.surface }}>
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {success && (
          <AlertBanner variant="success" onDismiss={() => setSuccess("")}>
            {success}
          </AlertBanner>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Products</h1>
            <p className="m3-body-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>
              {loading ? "Loading inventory…" : `${pagination.total.toLocaleString()} product${pagination.total !== 1 ? "s" : ""} in your catalog`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <IconButton
              icon={MdRefresh}
              onClick={loadProducts}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh products"
              className={`disabled:opacity-50 ${loading ? "[&>svg]:animate-spin" : ""}`}
            />
            {userCanCreate && (
              <Button variant="filled" icon={MdAdd} onClick={() => openModal("create")} className="whitespace-nowrap">
                Create Product
              </Button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard icon={MdInventory2} tone="primary" label="Total Products"
            value={pagination.total.toLocaleString()} valueClass="m3-title-large" />
          <KpiCard icon={MdTrendingUp} tone="success" label="Active"
            value={stats.active} valueClass="m3-title-large" />
          <KpiCard icon={MdErrorOutline} tone="error" label="Zero Stock"
            value={stats.zeroStock} valueClass="m3-title-large" />
          <KpiCard icon={MdLayers} tone="warning" label="Showing"
            value={products.length} valueClass="m3-title-large" />
        </div>

        {/* Main panel */}
        <Surface className="overflow-hidden">
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
              <table className="w-full" style={{ minWidth: "780px" }} aria-label="Products table">
                <TableHeader headers={colHeaders} />
                <tbody>
                  {products.length === 0 ? <EmptyRow colSpan={colHeaders.length} /> : (
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
        </Surface>
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