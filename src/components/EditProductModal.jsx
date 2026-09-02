// edit-product-modal.jsx
import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { MdClose, MdInventory2, MdEdit, MdSell, MdErrorOutline, MdCurrencyRupee, MdInfoOutline } from "react-icons/md";
import { Button, IconButton, Banner } from "./m3";
import { T } from "./m3/tokens";
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
        className="block m3-label-medium mb-1.5"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
    >
        {children}
        {required && (
            <span className="ml-0.5" style={{ color: "var(--md-sys-color-error)" }} aria-hidden="true">
                *
            </span>
        )}
    </label>
));

const inputBase = "w-full px-3.5 h-11 m3-body-medium focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed";

/* Applied alongside inputBase so the field colours come from the tokens. */
const inputStyle = {
    border: `1px solid ${T.outline}`,
    borderRadius: T.cornerExtraSmall,
    backgroundColor: T.surface,
    color: T.onSurface,
};

const TextInput = memo(({ id, label, required, hint, ...props }) => (
    <div>
        <FieldLabel required={required} htmlFor={id}>
            {label}
        </FieldLabel>
        <input id={id} className={inputBase} style={inputStyle} {...props} />
        {hint && (
            <p className="mt-1.5 m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
                <MdInfoOutline size={14} aria-hidden />
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
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 m3-body-medium pointer-events-none select-none" style={{ color: T.onSurfaceVariant }}>
                    {prefix}
                </span>
            )}
            <input
                id={id}
                type="number"
                className={cls(inputBase, prefix && "pl-8")}
                style={inputStyle}
                {...props}
            />
        </div>
        {hint && (
            <p className="mt-1.5 m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
                <MdInfoOutline size={14} aria-hidden />
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
            <p className="mt-1.5 m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
                <MdInfoOutline size={14} aria-hidden />
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
            <p className="mt-1.5 m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
                <MdInfoOutline size={14} aria-hidden />
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
            <p className="mt-1.5 m3-body-small flex items-center gap-1" style={{ color: T.onSurfaceVariant }}>
                <MdInfoOutline size={14} aria-hidden />
                {hint}
            </p>
        )}
    </div>
));

const AlertBanner = memo(({ type, message }) => {
    if (!message) return null;
    /* "info" has no M3 status role of its own; it borrows the success
       container, which is the calm end of the scale. */
    const tone = type === "error" ? "error" : type === "success" ? "success" : "success";
    return <Banner tone={tone}>{message}</Banner>;
});

const SectionHeader = memo(({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && (
            <div
                className="flex items-center justify-center w-8 h-8"
                style={{
                    borderRadius: T.cornerFull,
                    backgroundColor: T.primaryContainer,
                    color: T.onPrimaryContainer,
                }}
            >
                <Icon size={16} aria-hidden />
            </div>
        )}
        <h3 className="m3-title-small" style={{ color: T.onSurface }}>{title}</h3>
    </div>
));

const Divider = () => (
    <div className="my-6" style={{ borderTop: `1px solid ${T.outlineVariant}` }} />
);

const ChangeReasonBanner = memo(({ field, originalValue, currentValue, visible }) => {
    if (!visible) return null;
    return (
        <div
            className="col-span-full flex items-start gap-2 px-3.5 py-3 m3-body-small"
            style={{
                backgroundColor: T.warningContainer,
                color: T.onWarningContainer,
                borderRadius: T.cornerMedium,
            }}
        >
            <MdErrorOutline size={16} className="flex-shrink-0 mt-0.5" aria-hidden />
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
                className="fixed inset-0 z-40 animate-in fade-in duration-200"
                style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
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
                    className="w-full max-w-2xl flex flex-col max-h-[90vh]"
                    style={{
                        backgroundColor: "var(--md-sys-color-surface-container-high)",
                        borderRadius: T.cornerExtraLarge,
                        boxShadow: T.elevation3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div
                        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                        style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center w-10 h-10"
                                style={{
                                    borderRadius: T.cornerFull,
                                    backgroundColor: T.secondaryContainer,
                                    color: T.onSecondaryContainer,
                                }}
                            >
                                <MdEdit size={20} aria-hidden />
                            </div>
                            <div>
                                <h2 id="edit-product-title" className="m3-title-medium" style={{ color: T.onSurface }}>
                                    Edit Product
                                </h2>
                                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                                    Update product details below
                                </p>
                            </div>
                        </div>
                        <IconButton icon={MdClose} onClick={onClose} aria-label="Close modal" disabled={loading} className="disabled:opacity-40" />
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
                                <SectionHeader icon={MdInventory2} title="Product Information" />

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
                                <SectionHeader icon={MdSell} title="Pricing" />

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
                                <SectionHeader icon={MdInventory2} title="Status" />

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
                        <div
                            className="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
                            style={{ borderTop: `1px solid ${T.outlineVariant}` }}
                        >
                            <p className="m3-body-small" style={{ color: T.onSurfaceVariant }}>
                                <span className="mr-0.5" style={{ color: T.error }}>*</span>
                                Required fields
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="text" type="button" onClick={onClose} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button variant="filled" type="submit" form="edit-product-form" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
                                            Updating…
                                        </>
                                    ) : (
                                        "Update Product"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default EditProductModal;