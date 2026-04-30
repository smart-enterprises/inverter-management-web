// orders.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FiPlus, FiSearch, FiEye, FiChevronLeft, FiChevronRight, FiEdit2,
  FiPackage, FiFilter, FiAlertCircle, FiX, FiCalendar,
  FiRefreshCw,
  FiArrowRight,
  FiTruck,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchOrders } from "../api/orders";
import { getFilteredStatusOptions, getRoleBasedStatusOptions, ORDER_STATUSES, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import ProductionStatusBadge from "../components/ProductionStatusBadge";

/* ================================================================
   HELPERS
   ================================================================ */

/**
 * Fixed getTotalItems: uses total_qty_ordered (not qty_ordered) to be
 * consistent with what the API actually returns post-delivery/cancel.
 */
const getTotalItems = (details) =>
  details?.reduce((sum, d) => {
    const total = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
    return sum + total;
  }, 0) || 0;

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN") : "N/A";

/* ================================================================
   PAGINATION
   ================================================================ */
const OrdersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page <span className="font-bold text-slate-600">{currentPage}</span> of{" "}
        <span className="font-bold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={13} />
        </button>
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            const showDots = index > 0 && page - visiblePages[index - 1] > 1;
            return (
              <div key={page} className="flex items-center">
                {showDots && <span className="px-1.5 text-slate-300 text-xs select-none">…</span>}
                <button
                  onClick={() => onPageChange(page)}
                  className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === currentPage
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

/* ================================================================
   BADGES
   ================================================================ */
const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const dotMap = { HIGH: "bg-rose-500", MEDIUM: "bg-amber-500", LOW: "bg-emerald-500" };
  const key = priority?.toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${map[key] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotMap[key] || "bg-slate-400"}`} />
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
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
  const key = status?.toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${map[key] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
};

/* ================================================================
   DATE INPUT
   ================================================================ */
const DateInput = ({ value, onChange, placeholder, max }) => (
  <div className="flex flex-col gap-1">
    {placeholder && (
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 px-0.5">
        {placeholder}
      </span>
    )}
    <div className="relative">
      <FiCalendar
        size={12}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="date"
        value={value}
        onChange={onChange}
        max={max}
        className="pl-8 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all cursor-pointer"
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <FiX size={10} />
        </button>
      )}
    </div>
  </div>
);

/* ================================================================
   MAIN — Orders
   ================================================================ */
const Delivery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();

  const role = user?.role;

  const isProduction = role === ROLES.PRODUCTION;
  const isPacking = role === ROLES.PACKING;
  const isDelivery = role === ROLES.DELIVERY;

  const canCreateOrder = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN].includes(user?.role),
    [user?.role]
  );

  const canViewOrderPrice = useMemo(
    () => [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN].includes(user?.role),
    [user?.role]
  );

  const cannotRemoveClear = useMemo(
    () => [ROLES.PRODUCTION, ROLES.PACKING].includes(user?.role),
    [user?.role]
  );

  const deriveStatus = () => {
    if (routeState?.status) return routeState.status;
    if (isProduction || isPacking) return "PRODUCTION";
    if (isDelivery) return "SHIPPED";
    return "ALL";
  };

  /* ── State ── */
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState(routeState?.search || "");
  const [searchQuery, setSearchQuery] = useState(routeState?.search || "");

  const [selectedStatus, setSelectedStatus] = useState(deriveStatus);
  const [selectedPriority, setSelectedPriority] = useState(routeState?.priority || "ALL");

  const [deliveryStartDate, setDeliveryStartDate] = useState(routeState?.deliveryStartDate || "");
  const [deliveryEndDate, setDeliveryEndDate] = useState(routeState?.deliveryEndDate || "");

  /*
   * Role-based default status:
   * - PRODUCTION → show PRODUCTION orders
   * - PACKING    → show PRODUCTION orders (items in packing stage still show as PRODUCTION)
   * - DELIVERY   → show SHIPPED orders
   */
  useEffect(() => {
    if (routeState?.status) return; // respect explicit route state
    if (isProduction) setSelectedStatus("PRODUCTION");
    else if (isPacking) setSelectedStatus("PRODUCTION");
    else if (isDelivery) setSelectedStatus("SHIPPED");
  }, [isProduction, isPacking, isDelivery, routeState?.status]);

  /* Debounce: push searchInput → searchQuery after 400 ms */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
      search: searchQuery || undefined,
      deliveryStartDate: deliveryStartDate || undefined,
      deliveryEndDate: deliveryEndDate || undefined,
    }), [pagination.page, pagination.limit, selectedStatus, selectedPriority, searchQuery, deliveryStartDate, deliveryEndDate]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchOrders(queryParams);
      if (response.success) {
        setOrders(response.data || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.pagination?.totalPages || 1,
          total: response.pagination?.total || 0,
        }));
      } else {
        setError(response?.message || "Failed to load orders");
      }
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const hasActiveFilters =
    searchQuery ||
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

  const statusOptions = useMemo(() => getFilteredStatusOptions(role), [role]);

  /* ── Loading / error states ── */
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-semibold tracking-wide">Loading deliveries…</p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100"><FiAlertCircle size={24} className="text-rose-400" /></div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-rose-600">Something went wrong</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 sm:px-6 py-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deliveries</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {loading ? "Loading…" : `${pagination.total.toLocaleString()} total order${pagination.total !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadOrders}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* ── FILTER BAR ── */}
          <div className="px-5 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm sm:max-w-xs">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders, dealers, shops..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX size={13} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>

                <div className="w-36">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Status</span>
                  <CustomSelect
                    name="status"
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    options={statusOptions}
                  />
                </div>

                <div className="w-36">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Priority</span>
                  <CustomSelect
                    name="priority"
                    value={selectedPriority}
                    onChange={(e) => {
                      setSelectedPriority(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    options={PRIORITY_OPTIONS}
                  />
                </div>

                {/* Delivery Date Range */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <FiTruck size={12} className="text-slate-400" title="Delivery Date Filter" />
                  <DateInput label="From" value={deliveryStartDate} onChange={handleDeliveryStartChange} max={deliveryEndDate || undefined} />
                  <div className="flex items-center pb-2 text-slate-400"><FiArrowRight size={12} /></div>
                  <DateInput label="To" value={deliveryEndDate} onChange={handleDeliveryEndChange} min={deliveryStartDate || undefined} />
                  {(deliveryStartDate || deliveryEndDate) && (
                    <span className="px-2 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full uppercase tracking-wide whitespace-nowrap ml-1">Active</span>
                  )}
                </div>

                {!cannotRemoveClear && hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition"
                  >
                    <FiX size={12} />Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inline loading indicator */}
          {loading && orders.length > 0 && (
            <div className="px-5 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-xs text-indigo-600 font-semibold">Updating results…</span>
            </div>
          )}

          {/* ── TABLE ── */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Dealer & Order", "Shop", "Created", "Delivery", "Items", "Total", "Priority", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${i === 8 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-5 bg-slate-100 rounded-2xl">
                          <FiPackage size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No orders found</p>
                        <p className="text-xs text-slate-400">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((orderData) => {
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

                    const status = order.status.toUpperCase();
                    const isProductionStatus = status === ORDER_STATUSES.PRODUCTION;

                    const hasProduction = orderDetails?.some(
                      (d) => d.stock_flags?.hasProduction === true
                    );
                    const hasUnpacked = orderDetails?.some(
                      (d) => d.stock_flags?.hasUnpacked === true
                    );

                    const showProduction = isProductionStatus && (hasProduction || hasUnpacked);

                    return (
                      <tr
                        key={order.order_number}
                        className="hover:bg-slate-50/60 transition-colors duration-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{capitalizeFirstLetter(order.dealer?.employee_name)}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{order.order_number}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {capitalizeFirstLetter(order.dealer?.shop_name)}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">
                          {formatDate(finalDeliveryDate)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {getTotalItems(order.order_details)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {canViewOrderPrice
                            ? <span className="text-sm font-bold text-slate-900">{order.order_total_price ? `₹ ${order.order_total_price.toLocaleString("en-IN")}` : "—"}</span>
                            : <span className="text-sm text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-4">
                          <PriorityBadge priority={order.priority} />
                        </td>
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/orders/${order.order_number}`)}
                              title="View Order"
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <FiEye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION ── */}
          <OrdersPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
        </div>
      </div>
    </div>
  );
};

export default Delivery;