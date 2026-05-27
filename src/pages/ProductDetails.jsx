// ProductDetails.jsx — Senior Refactor with strict RBAC
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    FiArrowLeft, FiBox, FiTag, FiLayers, FiDollarSign,
    FiPackage, FiClock, FiUser, FiEdit3, FiAlertCircle,
    FiTrendingUp, FiArchive,
} from "react-icons/fi";

import { useAuth } from "../hooks/useAuth";
import { fetchProductById } from "../api/products";
import EditProductModal from "../components/EditProductModal.jsx";
import StockUpdateModal from "../components/StockUpdateModal.jsx";
import { fetchUsers } from "../api/user";
import StockHistoryModal from "../components/StockHistoryModal.jsx";
import {
    canEditProduct,
    canUpdateProductStock,
    canViewProductCost,
    canViewProductPrice,
} from "../utils/productPermissions";
import { CostHistoryModal, PriceHistoryModal } from "../components/HistoryModals.jsx";
import { ROLES } from "../utils/roles";

/* ─────────────────────────────────────────────────────────────────────
   RBAC — Price History & Cost History strictly for SUPER_ADMIN / ADMIN
───────────────────────────────────────────────────────────────────────*/
const PRICE_COST_HISTORY_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
const canViewPriceCostHistory = (role) =>
    PRICE_COST_HISTORY_ROLES.has((role || "").toUpperCase());

/* ─────────────────────────────────────────────────────────────────────
   FORMATTERS
───────────────────────────────────────────────────────────────────────*/
const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

const cap = (text) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : "";

/* ─────────────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────────────────*/
const StatusBadge = ({ status }) => {
    const isActive = status === "active";
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border ${isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
            />
            {cap(status)}
        </span>
    );
};

/* ─────────────────────────────────────────────────────────────────────
   INFO CARD
───────────────────────────────────────────────────────────────────────*/
const InfoCard = ({ icon, label, iconBg = "bg-slate-100 text-slate-600", children }) => (
    <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all duration-150">
        <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${iconBg}`}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1">
                {label}
            </p>
            <div className="text-sm font-semibold text-slate-800 break-words">{children}</div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────
   STOCK CARD
───────────────────────────────────────────────────────────────────────*/
const StockCard = ({ label, value, colorClass, bgClass }) => (
    <div
        className={`rounded-2xl border p-6 flex flex-col gap-2 hover:shadow-sm transition-all duration-200 ${bgClass}`}
    >
        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${colorClass}`}>
            {label}
        </p>
        <p className={`text-4xl font-black tabular-nums ${colorClass}`}>{value}</p>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────
   PAGE LOADING
───────────────────────────────────────────────────────────────────────*/
const PageLoader = () => (
    <div className="flex items-center justify-center py-32">
        <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────*/
const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.role;

    /* ── Permission flags ─────────────────────────────────────────────*/
    const userCanEdit = canEditProduct(role);
    const userCanUpdateStock = canUpdateProductStock(role);
    const userCanViewPrice = canViewProductPrice(role);
    const userCanViewCost = canViewProductCost(role);

    // STRICT: Price History & Cost History — SUPER_ADMIN / ADMIN only
    const userCanViewPriceHistory = canViewPriceCostHistory(role);

    /* ── State ────────────────────────────────────────────────────────*/
    const [product, setProduct] = useState(null);
    const [userMap, setUserMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStockOpen, setIsStockOpen] = useState(false);
    const [isStockHistoryOpen, setIsStockHistoryOpen] = useState(false);
    const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
    const [isCostHistoryOpen, setIsCostHistoryOpen] = useState(false);

    /* ── Fetch users for name map ─────────────────────────────────────*/
    const fetchUsersForMap = useCallback(async () => {
        try {
            const res = await fetchUsers({
                page: 1, limit: 500, status: "active",
                includePassword: false, includeDealers: false,
            });
            if (res?.success && Array.isArray(res?.data?.employees)) {
                const map = res.data.employees.reduce((acc, u) => {
                    if (u?.employee_id) acc[u.employee_id] = cap(u.employee_name);
                    return acc;
                }, {});
                setUserMap(map);
            }
        } catch (err) {
            console.error("Failed to fetch users for mapping:", err);
        }
    }, []);

    /* ── Load product ─────────────────────────────────────────────────*/
    const loadProduct = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchProductById(id);
            if (res?.success && res?.data) {
                setProduct(res.data);
            } else {
                setError("Failed to load product details.");
            }
        } catch {
            setError("Failed to load product details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProduct();
        fetchUsersForMap();
    }, [loadProduct, fetchUsersForMap]);

    /* ── Loading / error guards ───────────────────────────────────────*/
    if (loading) return <PageLoader />;

    if (error)
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <FiAlertCircle size={24} className="text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-rose-600">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition"
                >
                    Go Back
                </button>
            </div>
        );

    if (!product)
        return (
            <div className="flex items-center justify-center py-32">
                <p className="text-sm text-slate-400">Product not found.</p>
            </div>
        );

    /* ── Destructure product ──────────────────────────────────────────*/
    const {
        product_name, product_id, brand, model,
        product_type, product_category,
        price, cost,
        available_stock, status,
        created_at, created_by,
        stocks = [],
        price_history: rawPriceHistory = [],
        stock_history = [],
    } = product;

    const unpackedStock =
        stocks.find((s) => s.stock_type === "UNPACKED")?.stock ??
        stocks[0]?.unpacked_stock ?? 0;

    const packedStock =
        stocks.find((s) => s.stock_type === "PACKED")?.stock ??
        stocks[0]?.packed_stock ?? 0;

    // Split price vs cost history — Cost History: SUPER_ADMIN / ADMIN only
    const cost_history = rawPriceHistory.filter((h) => h.is_cost_update === true);
    const price_history = rawPriceHistory.filter((h) => !h.is_cost_update);

    /* ── Render ───────────────────────────────────────────────────────*/
    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="max-w-screen-xl mx-auto space-y-6">

                {/* ── HEADER ──────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                            aria-label="Go back"
                        >
                            <FiArrowLeft
                                size={15}
                                className="text-slate-400 group-hover:text-slate-700 transition-colors"
                            />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                {product_name}
                            </h1>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                {product_id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <StatusBadge status={status} />

                        {userCanUpdateStock && status === "active" && (
                            <button
                                onClick={() => setIsStockOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
                            >
                                <FiPackage size={14} />
                                Update Stock
                            </button>
                        )}

                        {userCanEdit && (
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
                            >
                                <FiEdit3 size={14} />
                                Edit Product
                            </button>
                        )}
                    </div>
                </div>

                {/* ── PRODUCT SUMMARY ─────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Product Summary</h2>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                Overview & specifications
                            </p>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <FiBox size={14} />
                        </div>
                    </div>

                    <div className="p-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">

                        {/* Brand */}
                        <InfoCard icon={<FiTag size={15} />} label="Brand">
                            {brand || "—"}
                        </InfoCard>

                        {/* Model */}
                        <InfoCard icon={<FiLayers size={15} />} label="Model">
                            {model || "—"}
                        </InfoCard>

                        {/* Product Type */}
                        <InfoCard icon={<FiBox size={15} />} label="Product Type">
                            {product_type || "—"}
                        </InfoCard>

                        {/* Product Category */}
                        <InfoCard icon={<FiArchive size={15} />} label="Product Category">
                            {product_category || "—"}
                        </InfoCard>

                        {/* Price — visible to roles allowed by canViewProductPrice */}
                        {userCanViewPrice && (
                            <InfoCard
                                icon={<FiDollarSign size={15} />}
                                label="Selling Price"
                                iconBg="bg-amber-50 text-amber-600"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base font-black text-amber-700">
                                        {formatCurrency(price)}
                                    </span>
                                    {/* Price History — SUPER_ADMIN / ADMIN ONLY — not rendered otherwise */}
                                    {userCanViewPriceHistory && (
                                        <button
                                            onClick={() => setIsPriceHistoryOpen(true)}
                                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                            title="View Price History"
                                        >
                                            <FiClock size={13} />
                                        </button>
                                    )}
                                </div>
                            </InfoCard>
                        )}

                        {/* Cost — SUPER_ADMIN / ADMIN ONLY via canViewProductCost */}
                        {userCanViewCost && (
                            <InfoCard
                                icon={<FiTrendingUp size={15} />}
                                label="Cost Price"
                                iconBg="bg-amber-50 text-amber-600"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-base font-black text-amber-700">
                                        {formatCurrency(cost)}
                                    </span>
                                    {/* Cost History — SUPER_ADMIN / ADMIN ONLY — not rendered otherwise */}
                                    {userCanViewPriceHistory && (
                                        <button
                                            onClick={() => setIsCostHistoryOpen(true)}
                                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                            title="View Cost History"
                                        >
                                            <FiClock size={13} />
                                        </button>
                                    )}
                                </div>
                            </InfoCard>
                        )}

                        {/* Available Stock */}
                        <InfoCard
                            icon={<FiPackage size={15} />}
                            label="Available Stock"
                            iconBg="bg-blue-50 text-blue-600"
                        >
                            <span className="text-base font-black text-blue-700">
                                {available_stock ?? 0}
                            </span>
                        </InfoCard>

                        {/* Created By */}
                        <InfoCard icon={<FiUser size={15} />} label="Created By">
                            <div className="flex flex-col">
                                <span>{userMap[created_by] || "Unknown"}</span>
                                {created_by && (
                                    <span className="text-[10px] font-mono text-slate-400">{created_by}</span>
                                )}
                            </div>
                        </InfoCard>

                        {/* Created At */}
                        <InfoCard icon={<FiClock size={15} />} label="Created At">
                            <span className="text-xs">{formatDate(created_at)}</span>
                        </InfoCard>

                    </div>
                </div>

                {/* ── STOCK DETAILS ────────────────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Stock Details</h2>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                Current inventory breakdown
                            </p>
                        </div>
                        <button
                            onClick={() => setIsStockHistoryOpen(true)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                            title="View Stock History"
                        >
                            <FiClock size={15} />
                        </button>
                    </div>

                    <div className="p-6 grid sm:grid-cols-2 gap-4">
                        <StockCard
                            label="Packed Stock"
                            value={packedStock}
                            colorClass="text-amber-700"
                            bgClass="bg-amber-50 border-amber-100"
                        />
                        <StockCard
                            label="Unpacked Stock"
                            value={unpackedStock}
                            colorClass="text-blue-700"
                            bgClass="bg-blue-50 border-blue-100"
                        />
                    </div>
                </div>

            </div>

            {/* ── MODALS ──────────────────────────────────────────────────── */}
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
                category={product_category}
                onStockUpdated={loadProduct}
            />

            <StockHistoryModal
                isOpen={isStockHistoryOpen}
                onClose={() => setIsStockHistoryOpen(false)}
                stockHistory={stock_history}
                userMap={userMap}
                formatDate={formatDate}
            />

            {/* Price & Cost History — only mounted for SUPER_ADMIN / ADMIN */}
            {userCanViewPriceHistory && (
                <>
                    <PriceHistoryModal
                        isOpen={isPriceHistoryOpen}
                        onClose={() => setIsPriceHistoryOpen(false)}
                        priceHistory={price_history}
                        userMap={userMap}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                    />
                    <CostHistoryModal
                        isOpen={isCostHistoryOpen}
                        onClose={() => setIsCostHistoryOpen(false)}
                        costHistory={cost_history}
                        userMap={userMap}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                    />
                </>
            )}
        </div>
    );
};

export default ProductDetails;