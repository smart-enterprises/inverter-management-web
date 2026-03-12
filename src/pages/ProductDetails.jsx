import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft,
    FiBox,
    FiTag,
    FiLayers,
    FiDollarSign,
    FiPackage,
    FiClock
} from "react-icons/fi";

import { fetchProductById } from "../api/products";

/* ================= FORMATTERS ================= */

const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

/* ================= REUSABLE INFO ================= */

const Info = ({ icon, label, children }) => (
    <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
            {icon}
        </div>

        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-gray-900">
                {children || "—"}
            </p>
        </div>
    </div>
);

/* ================= STATUS BADGE ================= */

const getStatusStyle = (status) => {
    if (status === "active")
        return "bg-green-100 text-green-700";

    if (status === "inactive")
        return "bg-red-100 text-red-700";

    return "bg-gray-100 text-gray-700";
};

/* ================= MAIN COMPONENT ================= */

const ProductDetails = () => {

    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ================= LOAD PRODUCT ================= */

    useEffect(() => {

        const loadProduct = async () => {

            try {

                setLoading(true);

                const res = await fetchProductById(id);

                if (res?.success && res?.data) {
                    setProduct(res.data);
                } else {
                    setError("Failed to load product");
                }

            } catch (err) {
                setError("Failed to load product");
            } finally {
                setLoading(false);
            }

        };

        loadProduct();

    }, [id]);

    /* ================= STATES ================= */

    if (loading)
        return (
            <div className="p-10 flex justify-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-purple-600 rounded-full" />
            </div>
        );

    if (error)
        return (
            <div className="p-10 text-center text-red-600">
                {error}
            </div>
        );

    if (!product)
        return (
            <div className="p-10 text-center">
                Product not found
            </div>
        );

    const {
        product_name,
        product_id,
        brand,
        model,
        product_type,
        price,
        available_stock,
        status,
        stocks = [],
        price_history = [],
    } = product;

    const unpackedStock =
        stocks.find((s) => s.stock_type === "UNPACKED")?.stock ?? 0;

    const packedStock =
        stocks.find((s) => s.stock_type === "PACKED")?.stock ?? 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">

            {/* ================= HEADER ================= */}

            <div className="flex items-center gap-4">

                <button
                    onClick={() => navigate(-1)}
                    className="p-2 border rounded-lg hover:bg-gray-100"
                >
                    <FiArrowLeft />
                </button>

                <div className="flex-1 flex items-center justify-between">

                    <div>

                        <h1 className="text-2xl font-semibold text-gray-900">
                            {product_name}
                        </h1>

                        <p className="text-sm text-gray-500 font-mono">
                            {product_id}
                        </p>

                    </div>

                    <span
                        className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusStyle(
                            status
                        )}`}
                    >
                        {status}
                    </span>

                </div>

            </div>

            {/* ================= PRODUCT SUMMARY ================= */}

            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Product Overview
                    </h2>

                    <span className="text-xs text-gray-400 uppercase">
                        Details
                    </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">

                    <Info icon={<FiTag />} label="Brand">
                        {brand}
                    </Info>

                    <Info icon={<FiLayers />} label="Model">
                        {model}
                    </Info>

                    <Info icon={<FiBox />} label="Product Type">
                        {product_type}
                    </Info>

                    <Info icon={<FiDollarSign />} label="Price">
                        {formatCurrency(price)}
                    </Info>

                    <Info icon={<FiPackage />} label="Available Stock">
                        {available_stock}
                    </Info>

                </div>

            </section>

            {/* ================= STOCK DETAILS ================= */}

            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Stock Details
                    </h2>

                    <span className="text-xs text-gray-400 uppercase">
                        Inventory
                    </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                        <p className="text-xs text-blue-600 uppercase">
                            Unpacked Stock
                        </p>

                        <p className="text-2xl font-bold text-blue-700 mt-2">
                            {unpackedStock}
                        </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                        <p className="text-xs text-purple-600 uppercase">
                            Packed Stock
                        </p>

                        <p className="text-2xl font-bold text-purple-700 mt-2">
                            {packedStock}
                        </p>
                    </div>

                </div>

            </section>

            {/* ================= PRICE HISTORY ================= */}

            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">

                <div className="flex items-center justify-between mb-8">

                    <h2 className="text-lg font-semibold text-gray-900">
                        Price History
                    </h2>

                    <FiClock className="text-gray-400" />

                </div>

                {price_history.length === 0 ? (

                    <p className="text-sm text-gray-500">
                        No price changes recorded
                    </p>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="w-full text-sm">

                            <thead className="text-xs uppercase text-gray-500 border-b">
                                <tr>
                                    <th className="py-3 text-left">Old Price</th>
                                    <th className="py-3 text-left">New Price</th>
                                    <th className="py-3 text-left">Reason</th>
                                    <th className="py-3 text-left">Changed At</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">

                                {price_history.map((p) => (

                                    <tr key={p.price_history_id}>

                                        <td className="py-3">
                                            {formatCurrency(p.old_price)}
                                        </td>

                                        <td className="py-3 font-semibold text-purple-600">
                                            {formatCurrency(p.new_price)}
                                        </td>

                                        <td className="py-3 text-gray-600">
                                            {p.change_reason || "Manual update"}
                                        </td>

                                        <td className="py-3 text-gray-500 text-xs">
                                            {formatDate(p.changed_at)}
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>

        </div>
    );
};

export default ProductDetails;