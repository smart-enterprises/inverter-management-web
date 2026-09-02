import React, { useState, useEffect } from "react";
import { MdClose, MdInventory, MdBolt } from "react-icons/md";
import { Button, IconButton, Banner } from "./m3";
import { T } from "./m3/tokens";
import Swal from "sweetalert2";
import { updateProductStock } from "../api/products";
import { useAuth } from "../hooks/useAuth";
import { canUpdatePackedStock, canUpdateUnpackedStock } from "../utils/productPermissions";

const initialFormState = {
    unpackedStock: 0,
    packedStock: 0,
    unpackedNotes: "",
    packedNotes: ""
};

const isBatteryCategory = (category) =>
    (category || "").toLowerCase().trim() === "battery";

const StockUpdateModal = ({
    isOpen,
    onClose,
    onStockUpdated,
    productId,
    productName,
    category
}) => {

    const { user } = useAuth();
    const canPacked = canUpdatePackedStock(user?.role);
    const canUnpacked = canUpdateUnpackedStock(user?.role);

    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* ================= RESET FORM ================= */

    useEffect(() => {
        if (!isOpen) return;

        setFormData(initialFormState);
        setError("");
    }, [isOpen]);

    /* ================= FORCE RESET FOR BATTERY ================= */

    useEffect(() => {
        if (!isOpen) return;

        if (isBatteryCategory(category)) {
            setFormData(prev => ({
                ...prev,
                unpackedStock: 0,
                unpackedNotes: ""
            }));
        }
    }, [category, isOpen]);

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

        try {

            /* ---------- VALIDATION ---------- */

            if (
                (!isBatteryCategory(category) &&
                    formData.unpackedStock <= 0 &&
                    formData.packedStock <= 0) ||
                (isBatteryCategory(category) &&
                    formData.packedStock <= 0)
            ) {
                setError("Please add stock quantity.");
                return;
            }

            /* ---------- BUILD STOCK PAYLOAD ---------- */

            const stocks = [];

            // Only allow unpacked if NOT battery
            if (!isBatteryCategory(category) && formData.unpackedStock > 0) {
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
                className="fixed inset-0 z-40"
                style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
                <div
                    className="w-full max-w-lg"
                    style={{
                        backgroundColor: "var(--md-sys-color-surface-container-high)",
                        borderRadius: T.cornerExtraLarge,
                        boxShadow: T.elevation3,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div
                        className="flex items-center justify-between p-6"
                        style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center w-10 h-10"
                                style={{
                                    borderRadius: T.cornerFull,
                                    backgroundColor: T.successContainer,
                                    color: T.onSuccessContainer,
                                }}
                            >
                                <MdInventory size={20} />
                            </div>

                            <div>
                                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>
                                    Update Stock
                                </h2>
                                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                                    {productName}
                                </p>
                            </div>
                        </div>

                        <IconButton icon={MdClose} onClick={onClose} aria-label="Close dialog" />
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="p-6">

                        {error && (
                            <div className="mb-4">
                                <Banner tone="error">{error}</Banner>
                            </div>
                        )}

                        {/* 🔥 BATTERY WARNING */}
                        {isBatteryCategory(category) && (
                            <div className="mb-3">
                                <Banner tone="warning">Battery products only use packed stock</Banner>
                            </div>
                        )}

                        <div className="space-y-4">

                            {/* UNPACKED (ONLY NON-BATTERY) */}
                            {!isBatteryCategory(category) && canUnpacked && (
                                <>
                                    <div>
                                        <label className="block m3-label-large mb-1.5" style={{ color: T.onSurfaceVariant }}>
                                            Unpacked Stock Quantity
                                        </label>
                                        <input
                                            type="number"
                                            name="unpackedStock"
                                            value={formData.unpackedStock}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-4 h-12 m3-body-medium focus:outline-none"
                                            style={{
                                                border: `1px solid ${T.outline}`,
                                                borderRadius: T.cornerExtraSmall,
                                                backgroundColor: T.surface,
                                                color: T.onSurface,
                                            }}
                                        />
                                    </div>

                                    {formData.unpackedStock > 0 && (
                                        <div>
                                            <label className="block m3-label-large mb-1.5" style={{ color: T.onSurfaceVariant }}>
                                                Unpacked Notes (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="unpackedNotes"
                                                value={formData.unpackedNotes}
                                                onChange={handleChange}
                                                placeholder="e.g. New stock addition"
                                                className="w-full px-4 h-12 m3-body-medium focus:outline-none"
                                            style={{
                                                border: `1px solid ${T.outline}`,
                                                borderRadius: T.cornerExtraSmall,
                                                backgroundColor: T.surface,
                                                color: T.onSurface,
                                            }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* PACKED */}
                            {canPacked && (
                                <>
                                    <div>
                                        <label className="block m3-label-large mb-1.5" style={{ color: T.onSurfaceVariant }}>
                                            Packed Stock Quantity
                                        </label>
                                        <input
                                            type="number"
                                            name="packedStock"
                                            value={formData.packedStock}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-4 h-12 m3-body-medium focus:outline-none"
                                            style={{
                                                border: `1px solid ${T.outline}`,
                                                borderRadius: T.cornerExtraSmall,
                                                backgroundColor: T.surface,
                                                color: T.onSurface,
                                            }}
                                        />
                                    </div>

                                    {formData.packedStock > 0 && (
                                        <div>
                                            <label className="block m3-label-large mb-1.5" style={{ color: T.onSurfaceVariant }}>
                                                Packed Notes (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="packedNotes"
                                                value={formData.packedNotes}
                                                onChange={handleChange}
                                                placeholder="e.g. New stock addition"
                                                className="w-full px-4 h-12 m3-body-medium focus:outline-none"
                                            style={{
                                                border: `1px solid ${T.outline}`,
                                                borderRadius: T.cornerExtraSmall,
                                                backgroundColor: T.surface,
                                                color: T.onSurface,
                                            }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                        </div>

                        {/* FOOTER */}
                        <div
                            className="flex items-center justify-end gap-2 mt-6 pt-4"
                            style={{ borderTop: `1px solid ${T.outlineVariant}` }}
                        >
                            <Button variant="text" type="button" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button variant="filled" type="submit" disabled={loading}>
                                {loading ? "Updating…" : "Update Stock"}
                            </Button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );
};

export default StockUpdateModal;