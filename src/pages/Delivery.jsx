// delivery.jsx

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  FiSearch, FiEye, FiChevronLeft, FiChevronRight, FiEdit2,
  FiPackage, FiFilter, FiAlertCircle, FiX, FiCalendar,
  FiRefreshCw, FiTruck, FiArrowRight,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchOrders } from "../api/orders";
import { getRoleBasedStatusOptions, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import ProductionStatusBadge from "../components/ProductionStatusBadge";

// ─── Utilities ────────────────────────────────────────────────────────────────

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN") : "—";

const getTotalItems = (details) =>
  details?.reduce((sum, item) => sum + (item.qty_ordered || 0), 0) || 0;

const fmtINR = (n) =>
  n != null ? `₹\u202F${Number(n).toLocaleString("en-IN")}` : "—";

// ─── Pagination ───────────────────────────────────────────────────────────────

const OrdersPagination = memo(({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white"
    >
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page{" "}
        <span className="font-bold text-slate-600">{currentPage}</span>{" "}
        of{" "}
        <span className="font-bold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={13} />
        </button>

        {visiblePages.map((p, i) => {
          const showEllipsis = i > 0 && p - visiblePages[i - 1] > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <span className="px-1.5 text-slate-300 text-xs select-none" aria-hidden>…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? "page" : undefined}
                className={[
                  "min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                  p === currentPage
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
                ].join(" ")}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={13} />
        </button>
      </div>
    </nav>
  );
});

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  HIGH: { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  MEDIUM: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  LOW: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

const PriorityBadge = memo(({ priority }) => {
  const key = priority?.toUpperCase();
  const cfg = PRIORITY_CONFIG[key] ?? { badge: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} aria-hidden />
      {priority}
    </span>
  );
});

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PRODUCTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PACKED: "bg-violet-50 text-violet-700 border-violet-200",
  INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const StatusBadge = memo(({ status }) => {
  const key = status?.toUpperCase();
  const cls = STATUS_CONFIG[key] ?? "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${cls}`}>
      {status}
    </span>
  );
});

// ─── Date Input ───────────────────────────────────────────────────────────────

const DateInput = memo(({ value, onChange, label, max, min }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 px-0.5">
        {label}
      </span>
    )}

    <div className="relative">
      <FiCalendar
        size={11}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="date"
        value={value}
        onChange={onChange}
        max={max}
        min={min}
        className="pl-7 pr-7 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer w-full"
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          aria-label={`Clear ${label ?? "date"}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <FiX size={10} />
        </button>
      )}
    </div>
  </div>
));

// ─── Inline Refresh Banner ────────────────────────────────────────────────────

const RefreshBanner = memo(() => (
  <div className="px-5 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center gap-2" role="status" aria-live="polite">
    <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin flex-shrink-0" aria-hidden />
    <span className="text-xs text-indigo-600 font-semibold">Updating results…</span>
  </div>
));

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = memo(() => (
  <tr>
    <td colSpan={9} className="px-5 py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <FiPackage size={24} className="text-slate-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-600">No orders found</p>
          <p className="text-xs text-slate-400">Try adjusting your filters</p>
        </div>
      </div>
    </td>
  </tr>
));

// ─── Action Button ────────────────────────────────────────────────────────────

const ActionBtn = memo(({ onClick, label, colorClass, children }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`p-2 rounded-lg text-slate-400 transition-all active:scale-90 ${colorClass}`}
  >
    {children}
  </button>
));

// ─── Order Row ────────────────────────────────────────────────────────────────

const OrderRow = memo(({ orderData, canViewOrderPrice, onView, onEdit }) => {
  const { order } = orderData;
  if (!order) return null;

  const orderDetails = order.order_details ?? [];

  const detailDeliveryDates = orderDetails
    .map((d) => (d.delivery_date ? new Date(d.delivery_date) : null))
    .filter(Boolean);

  const maxDetailDate = detailDeliveryDates.length
    ? new Date(Math.max(...detailDeliveryDates))
    : null;

  const finalDeliveryDate = order.promised_delivery_date
    ? new Date(order.promised_delivery_date)
    : maxDetailDate;

  const hasProduction = orderDetails.some((d) => d.stock_flags?.hasProduction === true);
  const hasUnpacked = orderDetails.some((d) => d.stock_flags?.hasUnpacked === true);
  const showProduction = hasProduction || hasUnpacked;

  return (
    <tr className="group border-b border-slate-100 hover:bg-indigo-50/20 transition-colors duration-100">

      {/* Dealer + Order */}
      <td className="px-5 py-3.5">
        <p className="font-bold text-slate-900 text-sm">
          {capitalizeFirstLetter(order.dealer?.employee_name)}
        </p>
        <span className="inline-flex mt-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-100 text-slate-400 border border-slate-200">
          {order.order_number}
        </span>
      </td>

      {/* Shop */}
      <td className="px-5 py-3.5 text-slate-600 font-medium text-sm">
        {capitalizeFirstLetter(order.dealer?.shop_name)}
      </td>

      {/* Created */}
      <td className="px-5 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
        {formatDate(order.created_at)}
      </td>

      {/* Delivery */}
      <td className="px-5 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
        {formatDate(finalDeliveryDate)}
      </td>

      {/* Items */}
      <td className="px-5 py-3.5">
        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
          {getTotalItems(order.order_details)}
        </span>
      </td>

      {/* Total */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        {canViewOrderPrice ? (
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {fmtINR(order.order_total_price)}
          </span>
        ) : (
          <span className="text-sm text-slate-300 select-none">—</span>
        )}
      </td>

      {/* Priority */}
      <td className="px-5 py-3.5">
        <PriorityBadge priority={order.priority} />
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        {showProduction ? (
          <ProductionStatusBadge
            hasProduction={hasProduction}
            hasUnpacked={hasUnpacked}
            variant="table"
          />
        ) : (
          <StatusBadge status={order.status} />
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <ActionBtn
            onClick={onView}
            label="View order"
            colorClass="hover:text-indigo-600 hover:bg-indigo-50"
          >
            <FiEye size={14} />
          </ActionBtn>
          <ActionBtn
            onClick={onEdit}
            label="Edit order"
            colorClass="hover:text-sky-600 hover:bg-sky-50"
          >
            <FiEdit2 size={14} />
          </ActionBtn>
        </div>
      </td>
    </tr>
  );
});

// ─── Table Header ─────────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  "Dealer & Order", "Shop", "Created", "Delivery",
  "Items", "Total", "Priority", "Status", "",
];

const TableHeader = memo(() => (
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50/80">
      {TABLE_HEADERS.map((h, i) => (
        <th
          key={i}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap ${i === TABLE_HEADERS.length - 1 ? "text-right" : "text-left"}`}
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>
));

// ─── Loading State ────────────────────────────────────────────────────────────

const LoadingScreen = memo(() => (
  <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-slate-400 font-semibold tracking-wide">Loading deliveries…</p>
    </div>
  </div>
));

// ─── Error Screen ─────────────────────────────────────────────────────────────

const ErrorScreen = memo(({ message }) => (
  <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
        <FiAlertCircle size={24} className="text-rose-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-rose-600">Something went wrong</p>
        <p className="text-xs text-slate-400">{message}</p>
      </div>
    </div>
  </div>
));

// ─── Delivery Page ────────────────────────────────────────────────────────────

const Delivery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();

  const role = user?.role;

  const isProduction = role === ROLES.PRODUCTION;
  const isPacking = role === ROLES.PACKING;
  const isDelivery = role === ROLES.DELIVERY;

  const canViewOrderPrice = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN].includes(role),
    [role],
  );

  const cannotRemoveClear = useMemo(
    () => [ROLES.PRODUCTION, ROLES.PACKING].includes(role),
    [role],
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  // Delivery date range (separate from order-created date range)
  const [deliveryStartDate, setDeliveryStartDate] = useState(routeState?.deliveryStartDate || "");
  const [deliveryEndDate, setDeliveryEndDate] = useState(routeState?.deliveryEndDate || "");

  // ── Role-based default status ──────────────────────────────────────────────
  useEffect(() => {
    if (isProduction) setSelectedStatus("PRODUCTION");
    else if (isPacking) setSelectedStatus("PACKED");
    else if (isDelivery) setSelectedStatus("SHIPPED");
  }, [isProduction, isPacking, isDelivery]);

  // ── Debounce search input → searchQuery (400 ms) ───────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Derived query params ───────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    page: pagination.page,
    limit: pagination.limit,
    status: selectedStatus !== "ALL" ? selectedStatus : undefined,
    priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
    search: searchQuery || undefined,
    deliveryStartDate: deliveryStartDate || undefined,
    deliveryEndDate: deliveryEndDate || undefined,
  }), [
    pagination.page,
    pagination.limit,
    selectedStatus,
    selectedPriority,
    searchQuery,
    deliveryStartDate,
    deliveryEndDate,
  ]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOrders(queryParams);
      if (response.success) {
        setOrders(response.data || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.pagination?.totalPages || 1,
          total: response.pagination?.total || 0,
        }));
      } else {
        setError(response?.message || "Failed to load orders.");
      }
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedStatus !== "ALL" ||
    selectedPriority !== "ALL" ||
    Boolean(deliveryStartDate) ||
    Boolean(deliveryEndDate);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedPriority("ALL");
    setDeliveryStartDate("");
    setDeliveryEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDeliveryStartChange = useCallback((e) => {
    const val = e.target.value;
    setDeliveryStartDate(val);
    if (deliveryEndDate && val > deliveryEndDate) setDeliveryEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [deliveryEndDate]);

  const handleDeliveryEndChange = useCallback((e) => {
    setDeliveryEndDate(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // ── Full-screen states ─────────────────────────────────────────────────────
  if (loading && orders.length === 0) return <LoadingScreen />;
  if (error && orders.length === 0) return <ErrorScreen message={error} />;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/70 px-4 sm:px-6 py-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── PAGE HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <FiTruck size={13} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Deliveries</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium pl-0.5">
              {loading
                ? "Loading…"
                : `${pagination.total.toLocaleString()} order${pagination.total !== 1 ? "s" : ""} in queue`}
            </p>
          </div>

          <button
            onClick={loadOrders}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh deliveries"
            className="self-start sm:self-auto p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all disabled:opacity-50 group"
          >
            <FiRefreshCw
              size={14}
              className={`transition-transform ${loading ? "animate-spin" : "group-hover:rotate-180 duration-500"}`}
              aria-hidden
            />
          </button>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* ── FILTER BAR ── */}
          <div className="px-5 py-3.5 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <FiSearch
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search orders, dealers, shops…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search orders"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                />

                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                      setPagination((p) => ({ ...p, page: 1 })); 0
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"                  >
                    <FiX size={13} />
                  </button>
                )}
              </div>

              {/* Filter label */}
              <div className="flex items-center gap-2 flex-wrap">

                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>

                {/* Status */}
                <div className="w-36">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Status</span>
                  <CustomSelect
                    name="status"
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    options={getRoleBasedStatusOptions(role)}
                    className="text-sm rounded-xl"
                  />
                </div>

                {/* Priority */}
                <div className="w-36">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Priority</span>
                  <CustomSelect
                    name="priority"
                    value={selectedPriority}
                    onChange={(e) => { setSelectedPriority(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    options={PRIORITY_OPTIONS}
                    className="text-sm rounded-xl"
                  />
                </div>

                {/* Delivery Date Range */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <FiTruck size={12} className="text-slate-400" title="Delivery Date Filter" />

                  <DateInput
                    label="From"
                    value={deliveryStartDate}
                    onChange={handleDeliveryStartChange}
                    max={deliveryEndDate || undefined}
                    className="bg-transparent text-xs focus:outline-none"
                  />

                  <div className="flex items-center pb-2 text-slate-400">
                    <FiArrowRight size={12} />
                  </div>

                  <DateInput
                    label="To"
                    value={deliveryEndDate}
                    onChange={handleDeliveryEndChange}
                    min={deliveryStartDate || undefined}
                    className="bg-transparent text-xs focus:outline-none"
                  />

                  {(deliveryStartDate || deliveryEndDate) && (
                    <span className="px-2 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full uppercase tracking-wide whitespace-nowrap">
                      Active
                    </span>
                  )}
                </div>

                {/* Clear filters */}
                {!cannotRemoveClear && hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    aria-label="Clear all filters"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition"
                  >
                    <FiX size={12} />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inline refresh banner */}
          {loading && orders.length > 0 && <RefreshBanner />}

          {/* ── TABLE ── */}
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              aria-label="Deliveries table"
              style={{ minWidth: "1000px" }}
            >
              <TableHeader />
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.length === 0 ? (
                  <EmptyState />
                ) : (
                  orders.map((orderData) => (
                    <OrderRow
                      key={orderData.order?.order_number}
                      orderData={orderData}
                      canViewOrderPrice={canViewOrderPrice}
                      onView={() => navigate(`/orders/${orderData.order?.order_number}`)}
                      onEdit={() => navigate(`/orders/${orderData.order?.order_number}`, { state: { openEditMode: true } })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION ── */}
          <OrdersPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          />
        </div>
      </div>
    </div>
  );
};

export default Delivery;