import React, { useState, useEffect } from "react";
import { FiX, FiPackage } from "react-icons/fi";
import Swal from "sweetalert2";

import { updateProductStock } from "../api/products";

const initialFormState = {
    unpackedStock: 0,
    packedStock: 0,
    unpackedNotes: "",
    packedNotes: ""
};

const StockUpdateModal = ({
    isOpen,
    onClose,
    onStockUpdated,
    productId,
    productName
}) => {

    const [formData, setFormData] = useState(initialFormState);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /* ================= RESET FORM ================= */

    useEffect(() => {
        if (!isOpen) return;

        setFormData(initialFormState);
        setError("");
        setSuccess("");
    }, [isOpen]);

    /* ================= HANDLE INPUT ================= */

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    /* ================= SUBMIT ================= */

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);
        setError("");
        setSuccess("");

        try {

            /* ---------- VALIDATION ---------- */

            if (formData.unpackedStock <= 0 && formData.packedStock <= 0) {
                setError("Please add stock quantity for at least one type.");
                return;
            }

            /* ---------- BUILD STOCK PAYLOAD ---------- */

            const stocks = [];

            if (formData.unpackedStock > 0) {

                stocks.push({
                    stock: parseInt(formData.unpackedStock),
                    stock_type: "UNPACKED",
                    type: "ADD",
                    stock_notes:
                        formData.unpackedNotes ||
                        `Added stock ${formData.unpackedStock} - unpacked`
                });

            }

            if (formData.packedStock > 0) {

                stocks.push({
                    stock: parseInt(formData.packedStock),
                    stock_type: "PACKED",
                    type: "ADD",
                    stock_notes:
                        formData.packedNotes ||
                        `Added stock ${formData.packedStock} - packed`
                });

            }

            /* ---------- API PAYLOAD ---------- */

            const payload = {
                stock_map: {
                    [productId]: stocks
                }
            };

            const response = await updateProductStock(payload);

            if (!response?.success) {
                setError(response?.message || "Failed to update stock");
                return;
            }

            /* ---------- SUCCESS ---------- */

            onClose();
            onStockUpdated?.();

            setTimeout(async () => {

                await Swal.fire({
                    icon: "success",
                    title: "Stock Updated Successfully 🎉",
                    text:
                        response.message ||
                        "Product stock has been updated successfully!",
                    confirmButtonText: "OK",
                    timer: 3000,
                    timerProgressBar: true
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
                    className="bg-white rounded-xl shadow-sm w-full max-w-lg"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}

                    <div className="flex items-center justify-between p-6 border-b border-gray-100">

                        <div className="flex items-center gap-3">

                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-50">
                                <FiPackage className="text-green-600" size={18} />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Update Stock
                                </h2>

                                <p className="text-sm text-gray-500 mt-0.5">
                                    {productName}
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

                    <form onSubmit={handleSubmit} className="p-6">

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

                        <div className="space-y-4">

                            {/* UNPACKED STOCK */}

                            <div>

                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unpacked Stock Quantity
                                </label>

                                <input
                                    type="number"
                                    name="unpackedStock"
                                    value={formData.unpackedStock}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                />

                            </div>

                            {/* UNPACKED NOTES */}

                            {formData.unpackedStock > 0 && (

                                <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unpacked Stock Notes (Optional)
                                    </label>

                                    <input
                                        type="text"
                                        name="unpackedNotes"
                                        value={formData.unpackedNotes}
                                        onChange={handleChange}
                                        placeholder="e.g. New stock addition"
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                    />

                                </div>

                            )}

                            {/* PACKED STOCK */}

                            <div>

                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Packed Stock Quantity
                                </label>

                                <input
                                    type="number"
                                    name="packedStock"
                                    value={formData.packedStock}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                />

                            </div>

                            {/* PACKED NOTES */}

                            {formData.packedStock > 0 && (

                                <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Packed Stock Notes (Optional)
                                    </label>

                                    <input
                                        type="text"
                                        name="packedNotes"
                                        value={formData.packedNotes}
                                        onChange={handleChange}
                                        placeholder="e.g. New stock addition"
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                                    />

                                </div>

                            )}

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
                                {loading ? "Updating..." : "Update Stock"}
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        </>
    );
};

export default StockUpdateModal;