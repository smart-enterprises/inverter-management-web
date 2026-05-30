// edit-product-modal.jsx
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { FiX, FiBox, FiEdit3, FiTag, FiAlertCircle, FiDollarSign, FiInfo } from "react-icons/fi";
import Swal from "sweetalert2";

import CustomSelect from "../components/CustomSelect";
import { fetchProductById, updateProduct } from "../api/products";
import { getAllBrands } from "../api/brands";
import { PRODUCT_CATEGORIES } from "../utils/constants.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
    product_name: "",
    model: "",
    product_type: "",
    product_category: "",
    brand: "",
    product_price: "",
    product_cost: "",
    status: "active",
    status_reason: "",
    price_change_reason: "",
    cost_change_reason: "",
};

const STATUS_OPTIONS = ["active", "inactive"];

const REQUIRED_FIELDS = [
    "product_name",
    "model",
    "product_type",
    "product_category",
    "brand",
    "product_price",
    "product_cost",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const cls = (...args) => args.filter(Boolean).join(" ");

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

const toFloat = (v) => parseFloat(String(v).trim());

const isValidPositiveNumber = (v) => {
    const n = toFloat(v);
    return !isNaN(n) && n >= 0;
};

const normalizePrice = (v) => (isBlank(v) ? "" : String(toFloat(v)));

const pricesEqual = (a, b) => {
    if (isBlank(a) || isBlank(b)) return false;
    return toFloat(a) === toFloat(b);
};

const validate = (data, { priceChanged, costChanged }) => {
    const missing = REQUIRED_FIELDS.filter((k) => isBlank(data[k]));
    if (missing.length) return "Please fill in all required fields.";
    if (!isValidPositiveNumber(data.product_price)) return "Enter a valid selling price.";
    if (!isValidPositiveNumber(data.product_cost)) return "Enter a valid cost price.";
    if (priceChanged && isBlank(data.price_change_reason))
        return "Please provide a reason for the selling price change.";
    if (costChanged && isBlank(data.cost_change_reason))
        return "Please provide a reason for the cost price change.";
    if (data.status === "inactive" && isBlank(data.status_reason))
        return "Please provide a reason for marking this product inactive.";
    return null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldLabel = memo(({ children, required, htmlFor }) => (
    <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-slate-500 mb-1.5 tracking-wide uppercase"
    >
        {children}
        {required && (
            <span className="text-rose-400 ml-0.5" aria-hidden="true">
                *
            </span>
        )}
    </label>
));

const inputBase =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 " +
    "placeholder-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 " +
    "transition-all duration-150 disabled:opacity-40 disabled:bg-slate-50 disabled:cursor-not-allowed";

const TextInput = memo(({ id, label, required, hint, ...props }) => (
    <div>
        <FieldLabel required={required} htmlFor={id}>
            {label}
        </FieldLabel>
        <input id={id} className={inputBase} {...props} />
        {hint && (
            <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <FiInfo size={11} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const NumberInput = memo(({ id, label, required, hint, prefix, ...props }) => (
    <div>
        <FieldLabel required={required} htmlFor={id}>
            {label}
        </FieldLabel>
        <div className="relative">
            {prefix && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none">
                    {prefix}
                </span>
            )}
            <input
                id={id}
                type="number"
                className={cls(inputBase, prefix && "pl-7")}
                {...props}
            />
        </div>
        {hint && (
            <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <FiInfo size={11} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const TextareaInput = memo(({ id, label, required, hint, rows = 2, ...props }) => (
    <div>
        <FieldLabel required={required} htmlFor={id}>
            {label}
        </FieldLabel>
        <textarea
            id={id}
            rows={rows}
            className={cls(inputBase, "resize-none")}
            {...props}
        />
        {hint && (
            <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <FiInfo size={11} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const ComboInput = memo(({ id, label, required, listId, options, hint, ...props }) => (
    <div>
        <FieldLabel required={required} htmlFor={id}>
            {label}
        </FieldLabel>
        <input id={id} list={listId} className={inputBase} {...props} />
        <datalist id={listId}>
            {options.map((opt) => (
                <option key={opt} value={opt} />
            ))}
        </datalist>
        {hint && (
            <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <FiInfo size={11} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const SelectField = memo(({ label, required, hint, ...props }) => (
    <div>
        <FieldLabel required={required}>{label}</FieldLabel>
        <CustomSelect {...props} />
        {hint && (
            <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <FiInfo size={11} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const AlertBanner = memo(({ type, message }) => {
    if (!message) return null;
    const config = {
        error: {
            wrapper: "bg-rose-50 border-rose-200 text-rose-700",
            icon: "text-rose-400",
        },
        success: {
            wrapper: "bg-emerald-50 border-emerald-200 text-emerald-700",
            icon: "text-emerald-400",
        },
        info: {
            wrapper: "bg-blue-50 border-blue-200 text-blue-700",
            icon: "text-blue-400",
        },
    };
    const { wrapper, icon } = config[type] ?? config.info;
    return (
        <div
            role="alert"
            className={cls(
                "flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm",
                wrapper
            )}
        >
            <FiAlertCircle size={15} className={cls("flex-shrink-0 mt-0.5", icon)} aria-hidden />
            <span>{message}</span>
        </div>
    );
});

const SectionHeader = memo(({ icon: Icon, title, accentClass = "text-blue-600" }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && (
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 border border-slate-100">
                <Icon size={13} className={accentClass} aria-hidden />
            </div>
        )}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
    </div>
));

const Divider = () => <div className="border-t border-slate-100 my-6" />;

const ChangeReasonBanner = memo(({ field, originalValue, currentValue, visible }) => {
    if (!visible) return null;
    return (
        <div className="col-span-full flex items-start gap-2 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <FiAlertCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-500" aria-hidden />
            <span>
                {field} changed from{" "}
                <strong className="font-semibold">₹{originalValue}</strong> to{" "}
                <strong className="font-semibold">₹{currentValue}</strong>. A reason is required.
            </span>
        </div>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

const EditProductModal = ({ isOpen, onClose, onProductUpdated, productId }) => {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [productTypeOptions, setProductTypeOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Tracks original prices to detect changes
    const originalPricesRef = useRef({ product_price: "", product_cost: "" });

    // ─── Derived state ─────────────────────────────────────────────────────

    const priceChanged =
        !isBlank(originalPricesRef.current.product_price) &&
        !pricesEqual(formData.product_price, originalPricesRef.current.product_price);

    const costChanged =
        !isBlank(originalPricesRef.current.product_cost) &&
        !pricesEqual(formData.product_cost, originalPricesRef.current.product_cost);

    // ─── Reset ──────────────────────────────────────────────────────────────

    const resetForm = useCallback(() => {
        setFormData(INITIAL_FORM);
        setAvailableModels([]);
        setProductTypeOptions([]);
        setError("");
        originalPricesRef.current = { product_price: "", product_cost: "" };
    }, []);

    // ─── Field update ────────────────────────────────────────────────────────

    const setField = useCallback((name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    // ─── Brand change ────────────────────────────────────────────────────────

    const handleBrandChange = useCallback(
        (brandName) => {
            const selected = brands.find((b) => b.brand_name === brandName);
            setAvailableModels(selected?.brand_models ?? []);
            setFormData((prev) => ({ ...prev, brand: brandName, model: "" }));
        },
        [brands]
    );

    // ─── Generic input handler ───────────────────────────────────────────────

    const handleChange = useCallback(
        (e) => {
            const { name, value } = e.target;
            if (name === "brand") {
                handleBrandChange(value);
            } else {
                setField(name, value);
            }
            // Clear change reasons when price is reverted to original
            if (name === "product_price") {
                if (pricesEqual(value, originalPricesRef.current.product_price)) {
                    setField("price_change_reason", "");
                }
            }
            if (name === "product_cost") {
                if (pricesEqual(value, originalPricesRef.current.product_cost)) {
                    setField("cost_change_reason", "");
                }
            }
        },
        [handleBrandChange, setField]
    );

    // ─── Product type blur ────────────────────────────────────────────────────

    const handleProductTypeBlur = useCallback(() => {
        const val = formData.product_type?.trim();
        if (!val) return;
        setProductTypeOptions((prev) => (prev.includes(val) ? prev : [...prev, val]));
    }, [formData.product_type]);

    // ─── Load data ───────────────────────────────────────────────────────────

    const loadProductData = useCallback(async () => {
        try {
            setError("");

            const [brandsRes, productRes] = await Promise.all([
                getAllBrands("active"),
                fetchProductById(productId),
            ]);

            if (brandsRes?.success && brandsRes?.data) {
                setBrands(brandsRes.data);
            }

            setCategories(PRODUCT_CATEGORIES);

            if (!productRes?.success || !productRes?.data) {
                setError("Failed to load product data.");
                return;
            }

            const p = productRes.data;
            const productType = p.product_type ?? "";
            const productPrice = normalizePrice(p.product_price ?? p.price ?? "");
            const productCost = normalizePrice(p.product_cost ?? p.cost ?? "");

            const populated = {
                product_name: p.product_name ?? "",
                model: p.model ?? "",
                product_type: productType,
                product_category: p.product_category ?? "",
                brand: p.brand ?? "",
                product_price: productPrice,
                product_cost: productCost,
                status: p.status ?? "active",
                status_reason: "",
                price_change_reason: "",
                cost_change_reason: "",
            };

            setFormData(populated);
            originalPricesRef.current = { product_price: productPrice, product_cost: productCost };

            if (productType) {
                setProductTypeOptions((prev) =>
                    prev.includes(productType) ? prev : [...prev, productType]
                );
            }

            if (p.brand && brandsRes?.data) {
                const sel = brandsRes.data.find((b) => b.brand_name === p.brand);
                if (sel?.brand_models) setAvailableModels(sel.brand_models);
            }
        } catch (err) {
            console.error("Error loading product:", err);
            setError("Failed to load product data.");
        }
    }, [productId]);

    // ─── Effects ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (isOpen && productId) loadProductData();
    }, [isOpen, productId, loadProductData]);

    useEffect(() => {
        if (!isOpen) resetForm();
    }, [isOpen, resetForm]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = prev; };
        }
    }, [isOpen]);

    // ─── Submit ──────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validate(formData, { priceChanged, costChanged });
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const payload = {
                product_name: formData.product_name.trim(),
                model: formData.model,
                product_type: formData.product_type.trim(),
                product_category: formData.product_category,
                brand: formData.brand,
                product_price: toFloat(formData.product_price),
                product_cost: toFloat(formData.product_cost),
                status: formData.status,
                ...(formData.status === "inactive" && !isBlank(formData.status_reason)
                    ? { status_reason: formData.status_reason.trim() }
                    : {}),
                ...(priceChanged && !isBlank(formData.price_change_reason)
                    ? { price_change_reason: formData.price_change_reason.trim() }
                    : {}),
                ...(costChanged && !isBlank(formData.cost_change_reason)
                    ? { cost_change_reason: formData.cost_change_reason.trim() }
                    : {}),
            };

            const response = await updateProduct(productId, payload);

            if (!response?.success) {
                setError(response?.message || "Failed to update product.");
                return;
            }

            onClose();
            onProductUpdated?.();

            setTimeout(async () => {
                await Swal.fire({
                    icon: "success",
                    title: "Updated",
                    text: response.message || "Product updated successfully.",
                    confirmButtonText: "OK",
                });
            }, 100);
        } catch (err) {
            setError(err?.message || "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // ─── UI ──────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-product-title"
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl shadow-slate-200/80 w-full max-w-2xl border border-slate-100 flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                                <FiEdit3 size={16} aria-hidden />
                            </div>
                            <div>
                                <h2
                                    id="edit-product-title"
                                    className="text-base font-bold text-slate-900 leading-tight"
                                >
                                    Edit Product
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Update product details below
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            disabled={loading}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 disabled:opacity-40"
                        >
                            <FiX size={18} />
                        </button>
                    </div>

                    {/* ── Form ── */}
                    <form
                        id="edit-product-form"
                        onSubmit={handleSubmit}
                        noValidate
                        className="flex flex-col flex-1 min-h-0"
                    >
                        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
                            {error && <AlertBanner type="error" message={error} />}

                            {/* ── Product Information ── */}
                            <section aria-labelledby="section-product-info">
                                <SectionHeader icon={FiBox} title="Product Information" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <SelectField
                                        label="Brand"
                                        required
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleChange}
                                        options={["", ...brands.map((b) => b.brand_name)]}
                                        placeholder="Select brand"
                                    />

                                    <TextInput
                                        id="edit-product-name"
                                        label="Product Name"
                                        required
                                        name="product_name"
                                        value={formData.product_name}
                                        onChange={handleChange}
                                        placeholder="e.g. OnePlus Super Save"
                                        autoComplete="off"
                                    />

                                    <SelectField
                                        label="Model"
                                        required
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        options={["", ...availableModels]}
                                        placeholder={
                                            formData.brand ? "Select model" : "Select brand first"
                                        }
                                        disabled={!formData.brand || availableModels.length === 0}
                                    />

                                    <ComboInput
                                        id="edit-product-type"
                                        label="Product Type"
                                        required
                                        listId="edit-product-type-options"
                                        name="product_type"
                                        value={formData.product_type}
                                        onChange={handleChange}
                                        onBlur={handleProductTypeBlur}
                                        placeholder="Select or type product type"
                                        options={productTypeOptions}
                                    />

                                    <SelectField
                                        label="Product Category"
                                        required
                                        name="product_category"
                                        value={formData.product_category}
                                        onChange={handleChange}
                                        options={["", ...categories]}
                                        placeholder="Select category"
                                    />
                                </div>
                            </section>

                            <Divider />

                            {/* ── Pricing ── */}
                            <section aria-labelledby="section-pricing">
                                <SectionHeader icon={FiTag} title="Pricing" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Selling Price */}
                                    <NumberInput
                                        id="edit-product-price"
                                        label="Selling Price"
                                        required
                                        name="product_price"
                                        value={formData.product_price}
                                        onChange={handleChange}
                                        placeholder="e.g. 17500"
                                        prefix="₹"
                                        min="0"
                                        step="0.01"
                                    />

                                    {/* Cost Price */}
                                    <NumberInput
                                        id="edit-product-cost"
                                        label="Cost Price"
                                        required
                                        name="product_cost"
                                        value={formData.product_cost}
                                        onChange={handleChange}
                                        placeholder="e.g. 5500"
                                        prefix="₹"
                                        min="0"
                                        step="0.5"
                                    />

                                    {/* Price Change Notice + Reason */}
                                    <ChangeReasonBanner
                                        field="Selling price"
                                        originalValue={originalPricesRef.current.product_price}
                                        currentValue={formData.product_price}
                                        visible={priceChanged}
                                    />
                                    {priceChanged && (
                                        <div className="col-span-full">
                                            <TextareaInput
                                                id="edit-price-change-reason"
                                                label="Reason for Selling Price Change"
                                                required
                                                name="price_change_reason"
                                                value={formData.price_change_reason}
                                                onChange={handleChange}
                                                placeholder="e.g. Seasonal discount, revised MRP, promotional pricing…"
                                                hint="This will be recorded in the product's pricing history."
                                            />
                                        </div>
                                    )}

                                    {/* Cost Change Notice + Reason */}
                                    <ChangeReasonBanner
                                        field="Cost price"
                                        originalValue={originalPricesRef.current.product_cost}
                                        currentValue={formData.product_cost}
                                        visible={costChanged}
                                    />
                                    {costChanged && (
                                        <div className="col-span-full">
                                            <TextareaInput
                                                id="edit-cost-change-reason"
                                                label="Reason for Cost Price Change"
                                                required
                                                name="cost_change_reason"
                                                value={formData.cost_change_reason}
                                                onChange={handleChange}
                                                placeholder="e.g. Supplier rate revision, bulk purchase discount…"
                                                hint="This will be recorded in the product's cost history."
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>

                            <Divider />

                            {/* ── Status ── */}
                            <section aria-labelledby="section-status">
                                <SectionHeader icon={FiBox} title="Status" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <SelectField
                                        label="Status"
                                        required
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        options={STATUS_OPTIONS}
                                        placeholder="Select status"
                                    />

                                    {formData.status === "inactive" && (
                                        <div className="sm:col-span-2">
                                            <TextareaInput
                                                id="edit-status-reason"
                                                label="Reason for Inactivation"
                                                required
                                                name="status_reason"
                                                value={formData.status_reason}
                                                onChange={handleChange}
                                                placeholder="e.g. Product discontinued, replaced by newer model…"
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex-shrink-0">
                            <p className="text-xs text-slate-400">
                                <span className="text-rose-400 mr-0.5">*</span>
                                Required fields
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all duration-150 disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="edit-product-form"
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-sm shadow-blue-200 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg
                                                className="animate-spin h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                />
                                            </svg>
                                            Updating…
                                        </>
                                    ) : (
                                        "Update Product"
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default EditProductModal;