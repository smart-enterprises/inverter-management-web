// ProductDetails.jsx — Senior Refactor with strict RBAC
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArchive,
  MdArrowBack,
  MdCurrencyRupee,
  MdEdit,
  MdErrorOutline,
  MdInventory,
  MdInventory2,
  MdLayers,
  MdPersonOutline,
  MdSchedule,
  MdSell,
  MdTrendingUp,
} from "react-icons/md";

import { useAuth } from "../hooks/useAuth";
import { fetchProductById } from "../api/products";
import EditProductModal from "../components/EditProductModal.jsx";
import StockUpdateModal from "../components/StockUpdateModal.jsx";
import { fetchUsers } from "../api/user";
import { formatName } from "../utils/constants";
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
                ? "m3-tone-success"
                : "m3-tone-error"
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
const InfoCard = ({ icon, label, iconBg = "m3-surface-container-high-bg m3-on-surface-variant", children }) => (
    <div className="flex items-start gap-3.5 p-4 rounded-xl m3-surface-container-low-bg border m3-outline-variant-border hover:m3-outline-variant-border hover:m3-surface-bg transition-all duration-150">
        <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${iconBg}`}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant mb-1">
                {label}
            </p>
            <div className="text-sm font-semibold m3-on-surface break-words">{children}</div>
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
                includeDealers: false,
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
                    <MdErrorOutline size={24} className="text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-rose-600">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 m3-solid-primary text-sm font-bold rounded-lg transition"
                >
                    Go Back
                </button>
            </div>
        );

    if (!product)
        return (
            <div className="flex items-center justify-center py-32">
                <p className="text-sm m3-on-surface-variant">Product not found.</p>
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
        <div className="min-h-screen m3-surface-container-low-bg p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="max-w-screen-xl mx-auto space-y-6">

                {/* ── HEADER ──────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-xl border m3-outline-variant-border m3-surface-bg hover:m3-outline-border hover:shadow-sm transition-all group"
                            aria-label="Go back"
                        >
                            <MdArrowBack
                                size={15}
                                className="m3-on-surface-variant group-hover:m3-on-surface transition-colors"
                            />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold m3-on-surface tracking-tight">
                                {product_name}
                            </h1>
                            <span className="text-[10px] font-mono m3-on-surface-variant m3-surface-container-high-bg px-2 py-0.5 rounded-md">
                                {product_id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <StatusBadge status={status} />

                        {userCanUpdateStock && status === "active" && (
                            <button
                                onClick={() => setIsStockOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 m3-solid-success text-sm font-bold rounded-xl active:scale-95 transition-all shadow-sm shadow-emerald-200"
                            >
                                <MdInventory size={14} />
                                Update Stock
                            </button>
                        )}

                        {userCanEdit && (
                            <button
                                onClick={() => setIsEditOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 m3-solid-primary text-sm font-bold rounded-xl active:scale-95 transition-all shadow-sm shadow-blue-200"
                            >
                                <MdEdit size={14} />
                                Edit Product
                            </button>
                        )}
                    </div>
                </div>

                {/* ── PRODUCT SUMMARY ─────────────────────────────────────── */}
                <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b m3-outline-variant-border m3-surface-container-low-bg">
                        <div>
                            <h2 className="text-sm font-bold m3-on-surface">Product Summary</h2>
                            <p className="text-[10px] font-semibold m3-on-surface-variant uppercase tracking-[0.1em] mt-0.5">
                                Overview & specifications
                            </p>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <MdInventory2 size={14} />
                        </div>
                    </div>

                    <div className="p-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">

                        {/* Brand */}
                        <InfoCard icon={<MdSell size={15} />} label="Brand">
                            {brand || "—"}
                        </InfoCard>

                        {/* Model */}
                        <InfoCard icon={<MdLayers size={15} />} label="Model">
                            {model || "—"}
                        </InfoCard>

                        {/* Product Type */}
                        <InfoCard icon={<MdInventory2 size={15} />} label="Product Type">
                            {product_type || "—"}
                        </InfoCard>

                        {/* Product Category */}
                        <InfoCard icon={<MdArchive size={15} />} label="Product Category">
                            {product_category || "—"}
                        </InfoCard>

                        {/* Price — visible to roles allowed by canViewProductPrice */}
                        {userCanViewPrice && (
                            <InfoCard
                                icon={<MdCurrencyRupee size={15} />}
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
                                            className="p-1.5 rounded-lg border m3-outline-variant-border m3-on-surface-variant hover:m3-surface-container-high-bg hover:m3-on-surface transition"
                                            title="View Price History"
                                        >
                                            <MdSchedule size={13} />
                                        </button>
                                    )}
                                </div>
                            </InfoCard>
                        )}

                        {/* Cost — SUPER_ADMIN / ADMIN ONLY via canViewProductCost */}
                        {userCanViewCost && (
                            <InfoCard
                                icon={<MdTrendingUp size={15} />}
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
                                            className="p-1.5 rounded-lg border m3-outline-variant-border m3-on-surface-variant hover:m3-surface-container-high-bg hover:m3-on-surface transition"
                                            title="View Cost History"
                                        >
                                            <MdSchedule size={13} />
                                        </button>
                                    )}
                                </div>
                            </InfoCard>
                        )}

                        {/* Available Stock */}
                        <InfoCard
                            icon={<MdInventory size={15} />}
                            label="Available Stock"
                            iconBg="bg-blue-50 text-blue-600"
                        >
                            <span className="text-base font-black text-blue-700">
                                {available_stock ?? 0}
                            </span>
                        </InfoCard>

                        {/* Created By */}
                        <InfoCard icon={<MdPersonOutline size={15} />} label="Created By">
                            <div className="flex flex-col">
                                <span>{formatName(userMap[created_by] || created_by) || "Unknown"}</span>
                                {created_by && (
                                    <span className="text-[10px] font-mono m3-on-surface-variant">{created_by}</span>
                                )}
                            </div>
                        </InfoCard>

                        {/* Created At */}
                        <InfoCard icon={<MdSchedule size={15} />} label="Created At">
                            <span className="text-xs">{formatDate(created_at)}</span>
                        </InfoCard>

                    </div>
                </div>

                {/* ── STOCK DETAILS ────────────────────────────────────────── */}
                <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b m3-outline-variant-border m3-surface-container-low-bg">
                        <div>
                            <h2 className="text-sm font-bold m3-on-surface">Stock Details</h2>
                            <p className="text-[10px] font-semibold m3-on-surface-variant uppercase tracking-[0.1em] mt-0.5">
                                Current inventory breakdown
                            </p>
                        </div>
                        <button
                            onClick={() => setIsStockHistoryOpen(true)}
                            className="p-2 rounded-xl border m3-outline-variant-border m3-on-surface-variant hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                            title="View Stock History"
                        >
                            <MdSchedule size={15} />
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