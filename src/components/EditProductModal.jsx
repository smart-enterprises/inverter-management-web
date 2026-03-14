import React, { useEffect, useState, useCallback } from "react";
import { FiX, FiBox, FiEdit3 } from "react-icons/fi";
import Swal from "sweetalert2";

import CustomSelect from "../components/CustomSelect";
import { fetchProductById, updateProduct } from "../api/products";
import { getAllBrands } from "../api/brands";

/* ================= INITIAL STATE ================= */

const initialFormState = {
    product_name: "",
    model: "",
    product_type: "",
    brand: "",
    product_price: "",
    status: "active",
    status_reason: ""
};

const baseProductTypes = [];

/* ================= COMPONENT ================= */

const EditProductModal = ({
    isOpen,
    onClose,
    onProductUpdated,
    productId
}) => {

    const [formData, setFormData] = useState(initialFormState);
    const [brands, setBrands] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [productTypeOptions, setProductTypeOptions] = useState(baseProductTypes);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* ================= RESET FORM ================= */

    const resetForm = () => {
        setFormData(initialFormState);
        setAvailableModels([]);
        setError("");
        setSuccess("");
    };

    /* ================= UPDATE FORM FIELD ================= */

    const updateFormField = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    /* ================= LOAD PRODUCT DATA ================= */

    const loadProductData = useCallback(async () => {

        try {

            setError("");
            setSuccess("");

            /* ---------- Load Brands ---------- */

            const brandsResponse = await getAllBrands("active");

            if (brandsResponse?.success && brandsResponse?.data) {
                setBrands(brandsResponse.data);
            }

            /* ---------- Load Product ---------- */

            const productResponse = await fetchProductById(productId);

            if (!productResponse?.success || !productResponse?.data) {
                setError("Failed to load product data");
                return;
            }

            const product = productResponse.data;
            const productType = product.product_type || "";

            setFormData({
                product_name: product.product_name || "",
                model: product.model || "",
                product_type: productType,
                brand: product.brand || "",
                product_price: product.product_price || product.price || "",
                status: product.status || "active",
                status_reason: ""
            });

            /* ---------- Add Product Type Option ---------- */

            setProductTypeOptions(prev => {
                if (!productType || prev.includes(productType)) return prev;
                return [...prev, productType];
            });

            /* ---------- Load Brand Models ---------- */

            if (product.brand && brandsResponse?.data) {

                const selectedBrand = brandsResponse.data.find(
                    b => b.brand_name === product.brand
                );

                if (selectedBrand?.brand_models) {
                    setAvailableModels(selectedBrand.brand_models);
                }

            }

        } catch (err) {
            console.error("Error loading product:", err);
            setError("Failed to load product data");
        }

    }, [productId]);

    /* ================= EFFECTS ================= */

    useEffect(() => {
        if (!isOpen || !productId) return;
        loadProductData();
    }, [isOpen, productId, loadProductData]);

    useEffect(() => {
        if (!isOpen) resetForm();
    }, [isOpen]);

    /* ================= INPUT HANDLERS ================= */

    const handleChange = (e) => {

        const { name, value } = e.target;

        updateFormField(name, value);

        if (name === "brand") {

            const selectedBrand = brands.find(
                b => b.brand_name === value
            );

            if (selectedBrand?.brand_models) {
                setAvailableModels(selectedBrand.brand_models);
            } else {
                setAvailableModels([]);
            }

            updateFormField("model", "");
        }
    };

    const handleProductTypeChange = (e) => {
        updateFormField("product_type", e.target.value);
    };

    const handleProductTypeBlur = () => {

        const value = formData.product_type?.trim();

        if (!value) return;

        setProductTypeOptions(prev => {
            if (prev.includes(value)) return prev;
            return [...prev, value];
        });
    };

    /* ================= SUBMIT ================= */

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");

        try {

            if (
                !formData.product_name ||
                !formData.model ||
                !formData.product_type ||
                !formData.brand ||
                !formData.product_price
            ) {
                setError("Please fill in all required fields.");
                return;
            }

            const payload = {
                product_name: formData.product_name,
                model: formData.model,
                product_type: formData.product_type,
                brand: formData.brand,
                product_price: parseFloat(formData.product_price),
                status: formData.status
            };

            if (formData.status === "inactive" && formData.status_reason) {
                payload.status_reason = formData.status_reason;
            }

            const response = await updateProduct(productId, payload);

            if (!response?.success) {
                setError(response?.message || "Failed to update product");
                return;
            }

            onClose();
            onProductUpdated?.();

            setTimeout(async () => {
                await Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: response.message || "Product updated successfully",
                    confirmButtonText: "OK"
                });
            }, 100);

        } catch (err) {

            setError(err?.message || "Network error. Please try again.");

        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    /* ================= UI ================= */

    return (
        <>
            {/* BACKDROP */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">

                <div
                    className="bg-white rounded-xl shadow-sm w-full max-w-2xl"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}

                    <div className="flex items-center justify-between p-6 border-b border-gray-100">

                        <div className="flex items-center gap-3">

                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50">
                                <FiEdit3 className="text-purple-600" size={18} />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Edit Product
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Update product information
                                </p>
                            </div>

                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-50 rounded-lg transition"
                        >
                            <FiX className="text-gray-500" size={20} />
                        </button>

                    </div>

                    {/* FORM */}

                    <form
                        onSubmit={handleSubmit}
                        className="p-6 max-h-[70vh] overflow-y-auto"
                    >

                        {/* ERROR */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}

                        {/* SUCCESS */}
                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                                {success}
                            </div>
                        )}

                        {/* PRODUCT SECTION */}

                        <div className="space-y-6">

                            <div>

                                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                                    <FiBox className="text-[#9333EA]" />
                                    Product Information
                                </h3>

                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

                                    {/* BRAND */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Brand <span className="text-red-500">*</span>
                                        </label>

                                        <CustomSelect
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            options={["", ...brands.map(b => b.brand_name)]}
                                            placeholder="Select brand"
                                            required
                                        />
                                    </div>

                                    {/* PRODUCT NAME */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Product Name <span className="text-red-500">*</span>
                                        </label>

                                        <input
                                            type="text"
                                            name="product_name"
                                            value={formData.product_name}
                                            onChange={handleChange}
                                            placeholder="e.g. ONE PLUS Super Save"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                            required
                                        />
                                    </div>

                                    {/* MODEL */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Model <span className="text-red-500">*</span>
                                        </label>

                                        <CustomSelect
                                            name="model"
                                            value={formData.model}
                                            onChange={handleChange}
                                            options={["", ...availableModels]}
                                            placeholder={formData.brand ? "Select model" : "Select brand first"}
                                            disabled={!formData.brand || availableModels.length === 0}
                                            required
                                        />
                                    </div>

                                    {/* PRODUCT TYPE */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Product Type <span className="text-red-500">*</span>
                                        </label>

                                        <input
                                            list="edit-product-type-options"
                                            name="product_type"
                                            value={formData.product_type}
                                            onChange={handleProductTypeChange}
                                            onBlur={handleProductTypeBlur}
                                            placeholder="Select or type product type"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                            required
                                        />

                                        <datalist id="edit-product-type-options">
                                            {productTypeOptions.map((type, index) => (
                                                <option key={index} value={type} />
                                            ))}
                                        </datalist>

                                    </div>

                                    {/* PRICE */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Price (₹ ) <span className="text-red-500">*</span>
                                        </label>

                                        <input
                                            type="number"
                                            name="product_price"
                                            value={formData.product_price}
                                            onChange={handleChange}
                                            placeholder="e.g. 17500"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                            required
                                        />

                                    </div>

                                    {/* STATUS */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status <span className="text-red-500">*</span>
                                        </label>

                                        <CustomSelect
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            options={["active", "inactive"]}
                                            placeholder="Select status"
                                            required
                                        />

                                    </div>

                                    {/* STATUS REASON */}

                                    {formData.status === "inactive" && (
                                        <div className="sm:col-span-2">

                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Status Reason
                                            </label>

                                            <input
                                                type="text"
                                                name="status_reason"
                                                value={formData.status_reason}
                                                onChange={handleChange}
                                                placeholder="e.g. Product discontinued"
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                            />

                                        </div>
                                    )}

                                </div>

                            </div>

                        </div>

                        {/* FOOTER */}

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Update Product"}
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        </>
    );
};

export default EditProductModal;