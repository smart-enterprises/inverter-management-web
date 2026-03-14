import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
    FiArrowLeft,
    FiBox,
    FiTag,
    FiLayers,
    FiDollarSign,
    FiPackage,
    FiClock,
    FiUser,
    FiEdit3
} from "react-icons/fi";

import { fetchProductById } from "../api/products";

import EditProductModal from "../components/EditProductModal.jsx";
import StockUpdateModal from "../components/StockUpdateModal.jsx";
import { fetchUsers } from "../api/user";
import StockHistoryModal from "../components/StockHistoryModal.jsx";
import PriceHistoryModal from "../components/PriceHistoryModal.jsx";

/* ================= FORMATTERS ================= */

const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
        : "—";

const capitalizeFirstLetter = (text) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : "";

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }) => {
    const style =
        status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700";

    return (
        <span
            className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full font-medium ${style}`}
        >
            <span
                className={`w-2 h-2 rounded-full ${status === "active" ? "bg-green-500" : "bg-red-500"
                    }`}
            />
            {capitalizeFirstLetter(status)}
        </span>
    );
};

/* ================= REUSABLE INFO ================= */

const Info = ({ icon, label, children }) => (
    <div className="flex items-start gap-3">

        {/* Icon */}
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
            {icon}
        </div>

        {/* Content */}
        <div className="flex flex-col">

            {/* Label */}
            <span className="text-xs text-gray-500">
                {label}
            </span>

            {/* Value */}
            <div className="text-sm font-semibold text-gray-900">
                {children}
            </div>

        </div>

    </div>
);

/* ================= MAIN COMPONENT ================= */

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [userMap, setUserMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStockOpen, setIsStockOpen] = useState(false);

    const [isStockHistoryOpen, setIsStockHistoryOpen] = useState(false);
    const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);

    /* ================= FETCH USERS ================= */

    const fetchUsersForCreatedByMap = useCallback(async () => {
        try {
            const response = await fetchUsers({
                page: 1,
                limit: 500,
                status: "active",
                includePassword: false,
                includeDealers: false
            });

            if (response?.success && Array.isArray(response?.data?.employees)) {
                const mappedUsers = response.data.employees.reduce((acc, user) => {
                    if (user?.employee_id) {
                        acc[user.employee_id] = capitalizeFirstLetter(
                            user.employee_name
                        );
                    }
                    return acc;
                }, {});

                setUserMap(mappedUsers);
            }
        } catch (err) {
            console.error("Failed to fetch users for mapping:", err);
        }
    }, []);

    /* ================= LOAD PRODUCT ================= */

    const loadProduct = useCallback(async () => {
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
    }, [id]);

    useEffect(() => {
        loadProduct();
        fetchUsersForCreatedByMap();
    }, [loadProduct, fetchUsersForCreatedByMap]);

    /* ================= STATES ================= */

    if (loading)
        return (
            <div className="p-10 flex justify-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-purple-600 rounded-full" />
            </div>
        );

    if (error)
        return <div className="p-10 text-center text-red-600">{error}</div>;

    if (!product)
        return <div className="p-10 text-center">Product not found</div>;

    const {
        product_name,
        product_id,
        brand,
        model,
        product_type,
        price,
        available_stock,
        status,
        created_at,
        created_by,
        stocks = [],
        price_history = [],
        stock_history = []
    } = product;

    const unpackedStock = stocks.find((s) => s.stock_type === "UNPACKED")?.stock ??
        stocks[0]?.unpacked_stock ??
        0;

    const packedStock = stocks.find((s) => s.stock_type === "PACKED")?.stock ??
        stocks[0]?.packed_stock ??
        0;

    /* ================= UI ================= */

    return (
        <div className="p-6 lg:p-8 space-y-8">

            {/* ================= HEADER ================= */}
            <div className="flex items-start justify-between p-6">

                {/* LEFT SECTION */}
                <div className="flex items-start gap-4">

                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
                        aria-label="Back to Products"
                        title="Go Back"
                    >
                        <FiArrowLeft size={18} />
                    </button>

                    {/* Product Identity */}
                    <div className="flex flex-col">

                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            {product_name}
                        </h1>

                        <div className="flex items-center gap-2 mt-1">

                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-mono">
                                {product_id}
                            </span>

                        </div>

                    </div>

                </div>

                {/* RIGHT SECTION */}
                <div className="flex flex-col items-end gap-3">

                    {/* Status */}
                    <StatusBadge status={status} />

                    {/* Actions */}
                    <div className="flex items-center gap-2">

                        {/* Edit Product */}
                        <button
                            onClick={() => setIsEditOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg
                                bg-gradient-to-r from-purple-600 to-purple-700
                                hover:from-purple-700 hover:to-purple-800
                                shadow-sm hover:shadow-md
                                transition duration-200 hover:-translate-y-[1px]
                            "
                            title="Edit Product"
                        >
                            <FiEdit3 size={16} />
                            Edit
                        </button>

                        {/* Update Stock */}
                        <button
                            onClick={() => setIsStockOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg
                                bg-gradient-to-r from-green-600 to-green-700
                                hover:from-green-700 hover:to-green-800
                                shadow-sm hover:shadow-md
                                transition duration-200 hover:-translate-y-[1px]
                            "
                            title="Update Stock"
                        >
                            <FiPackage size={16} />
                            Update Stock
                        </button>

                    </div>

                </div>

            </div>

            {/* ================= PRODUCT OVERVIEW ================= */}

            <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">

                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">

                    <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                        Product Summary
                    </h2>

                    <span className="text-xs uppercase tracking-wide text-gray-400">
                        Overview
                    </span>

                </div>

                {/* Overview Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Brand */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
                                <FiTag size={16} />
                            </div>
                        }
                        label="Brand"
                    >
                        {brand}
                    </Info>

                    {/* Model */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
                                <FiLayers size={16} />
                            </div>
                        }
                        label="Model"
                    >
                        {model}
                    </Info>

                    {/* Product Type */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
                                <FiBox size={16} />
                            </div>
                        }
                        label="Product Type"
                    >
                        {product_type}
                    </Info>

                    {/* Price */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-50 text-purple-600">
                                <FiDollarSign size={16} />
                            </div>
                        }
                        label="Price"
                    >

                        <div className="flex items-center gap-3">

                            <span className="text-lg font-semibold text-purple-700">
                                {formatCurrency(price)}
                            </span>

                            {/* Price History Button */}
                            <button
                                onClick={() => setIsPriceHistoryOpen(true)}
                                className="p-1.5 rounded-md border border-gray-200 text-gray-500
                                    hover:bg-gray-100 hover:text-gray-700 transition
                                    cursor-pointer
                                "
                                title="View Price History"
                            >
                                <FiClock size={14} />
                            </button>

                        </div>

                    </Info>

                    {/* Available Stock */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
                                <FiPackage size={16} />
                            </div>
                        }
                        label="Available Stock"
                    >
                        <span className="text-lg font-semibold text-indigo-600">
                            {available_stock}
                        </span>
                    </Info>

                    {/* Created By */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
                                <FiUser size={16} />
                            </div>
                        }
                        label="Created By"
                    >
                        <div className="flex flex-col leading-tight">

                            {/* Employee Name */}
                            <span className="text-sm font-medium text-gray-900">
                                {userMap[created_by] || "Unknown"}
                            </span>

                            {/* Employee ID */}
                            {created_by && (
                                <span className="text-xs text-gray-400 font-mono">
                                    {created_by}
                                </span>
                            )}

                        </div>
                    </Info>

                    {/* Created At */}
                    <Info
                        icon={
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600">
                                <FiClock size={16} />
                            </div>
                        }
                        label="Created At"
                    >
                        {formatDate(created_at)}
                    </Info>

                </div>

            </section>

            {/* ================= STOCK DETAILS ================= */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                            Stock Details
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Current product inventory
                        </p>
                    </div>

                    {/* History Button */}
                    <button
                        onClick={() => setIsStockHistoryOpen(true)}
                        className="p-2.5 rounded-lg border border-gray-200 text-gray-600 
                       hover:bg-gray-100 hover:border-gray-300
                       transition duration-200"
                        title="View Stock History"
                    >
                        <FiClock size={18} />
                    </button>

                </div>

                {/* Stock Cards */}
                <div className="grid sm:grid-cols-2 gap-6">

                    {/* Packed Stock */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-6
                          hover:shadow-sm transition duration-200">

                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                            Packed Stock
                        </p>

                        <p className="text-3xl font-bold text-purple-700 mt-2">
                            {packedStock}
                        </p>

                    </div>

                    {/* Unpacked Stock */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6
                          hover:shadow-sm transition duration-200">

                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                            Unpacked Stock
                        </p>

                        <p className="text-3xl font-bold text-blue-700 mt-2">
                            {unpackedStock}
                        </p>

                    </div>

                </div>

            </section>

            {/* ================= MODALS ================= */}

            <EditProductModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                productId={product_id}
                onProductUpdated={loadProduct}
            />

            <StockUpdateModal
                isOpen={isStockOpen}
                onClose={() => setIsStockOpen(false)}
                productId={product_id}
                productName={product_name}
                onStockUpdated={loadProduct}
            />

            {/* ================= STOCK HISTORY MODAL ================= */}
            <StockHistoryModal
                isOpen={isStockHistoryOpen}
                onClose={() => setIsStockHistoryOpen(false)}
                stockHistory={stock_history}
                userMap={userMap}
                formatDate={formatDate}
            />

            {/* ================= PRICE HISTORY MODAL ================= */}
            <PriceHistoryModal
                isOpen={isPriceHistoryOpen}
                onClose={() => setIsPriceHistoryOpen(false)}
                priceHistory={price_history}
                userMap={userMap}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

        </div>
    );
};

export default ProductDetails;