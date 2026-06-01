// orders.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiPlus, FiSearch, FiEye, FiChevronLeft, FiChevronRight, FiEdit2,
  FiPackage, FiFilter, FiAlertCircle, FiX, FiCalendar,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchOrders } from "../api/orders";
import { fetchUserByRole } from "../api/user";
import { fetchDealers } from "../api/dealer";
import { getFilteredStatusOptions, ORDER_STATUSES, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { canSelectSalesman, ROLES } from "../utils/roles";
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
    <div className="flex items-center justify-between px-6 py-4 border-t border-blue-100/60">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page <span className="font-bold text-slate-600">{currentPage}</span> of{" "}
        <span className="font-bold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page === currentPage
                    ? "bg-blue-500 text-white border border-blue-500 shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
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
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    PRODUCTION: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    PACKED: "bg-teal-50 text-teal-700 border-teal-200",
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
   PROGRESS BAR — compact "X of Y delivered · NN%" with thin bar
   ================================================================ */
const SKIP_PROGRESS_STATUSES = new Set(["CANCELLED", "REJECTED"]);

const ProgressBar = ({ progress, status }) => {
  if (!progress) return null;
  if (SKIP_PROGRESS_STATUSES.has(String(status).toUpperCase())) return null;

  const ordered = Number(progress.qty_ordered_total) || 0;
  const delivered = Number(progress.qty_delivered_total) || 0;
  if (ordered <= 0) return null;

  const pct = Number(progress.delivered_percent) || 0;
  const isComplete = delivered >= ordered;

  return (
    <div className="mt-1.5 w-36">
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
        <span>
          {delivered}/{ordered} delivered
        </span>
        <span className={isComplete ? "text-emerald-600" : "text-slate-400"}>{pct}%</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-blue-50 overflow-hidden">
        <div
          className={`h-full rounded-full ${isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-blue-400 to-blue-600"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
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
        className="pl-8 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all cursor-pointer"
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: "" } })}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
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
const Orders = () => {
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
    if (isProduction || isPacking) return "ALL";
    if (isDelivery) return "SHIPPED";
    return "ALL";
  };

  /* ── State ── */
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // True until the first fetch completes (success OR error). Used to gate
  // the full-screen spinner so it never replaces the layout during a
  // user-driven refetch — that was unmounting the search input mid-typing
  // and stealing focus when the previous query returned 0 results.
  const [initialLoad, setInitialLoad] = useState(true);

  const [searchInput, setSearchInput] = useState(routeState?.search || "");
  const [searchQuery, setSearchQuery] = useState(routeState?.search || "");

  const [selectedStatus, setSelectedStatus] = useState(deriveStatus);
  const [selectedPriority, setSelectedPriority] = useState(routeState?.priority || "ALL");

  const [startDate, setStartDate] = useState(routeState?.startDate || "");
  const [endDate, setEndDate] = useState(routeState?.endDate || "");

  const canSelectSalesmanPermission = useMemo(() => canSelectSalesman(role), [role]);
  const canFilterByDealer = canSelectSalesmanPermission || role === ROLES.SALESMAN;

  const [salespersons, setSalespersons] = useState([]);
  const [dealersList, setDealersList] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState("ALL");
  const [selectedDealer, setSelectedDealer] = useState("ALL");

  /* Debounce: push searchInput → searchQuery after 400 ms */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* Load salespersons — admin/superadmin/manager only */
  useEffect(() => {
    if (!canSelectSalesmanPermission) return;
    (async () => {
      try {
        const res = await fetchUserByRole(ROLES.SALESMAN);
        if (res?.success && Array.isArray(res.data)) setSalespersons(res.data);
      } catch {
        /* silent — non-blocking filter */
      }
    })();
  }, [canSelectSalesmanPermission]);

  /* Load dealers for the dealer filter.
     - admin/manager: all dealers when no salesman selected, else that salesman's assigned dealers
     - salesman: only their own assigned dealers */
  useEffect(() => {
    if (!canFilterByDealer) return;

    (async () => {
      try {
        const salesmanIds =
          canSelectSalesmanPermission && selectedSalesman !== "ALL"
            ? [selectedSalesman]
            : [];

        const res = await fetchDealers({
          page: 1,
          limit: 5000,
          role: ROLES.DEALER,
          status: "active",
          includeDealers: true,
          scope: "ASSIGNED_ONLY",
          salesmanIds,
        });

        if (res?.success && res?.data?.employees) {
          setDealersList(res.data.employees.filter((e) => e.role === ROLES.DEALER));
        } else {
          setDealersList([]);
        }
      } catch {
        setDealersList([]);
      }
    })();
  }, [canFilterByDealer, canSelectSalesmanPermission, selectedSalesman, user?.employee_id]);

  /* When salesman changes, reset dealer selection */
  useEffect(() => {
    setSelectedDealer("ALL");
  }, [selectedSalesman]);

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
      search: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      salesman: canSelectSalesmanPermission && selectedSalesman !== "ALL" ? selectedSalesman : undefined,
      dealer: canFilterByDealer && selectedDealer !== "ALL" ? selectedDealer : undefined,
    }),
    [
      pagination.page, pagination.limit, selectedStatus, selectedPriority,
      searchQuery, startDate, endDate,
      canSelectSalesmanPermission, selectedSalesman,
      canFilterByDealer, selectedDealer,
    ]
  );

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
      setInitialLoad(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const hasActiveFilters =
    searchQuery ||
    selectedStatus !== "ALL" ||
    selectedPriority !== "ALL" ||
    startDate ||
    endDate ||
    selectedSalesman !== "ALL" ||
    selectedDealer !== "ALL";

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedStatus("ALL");
    setSelectedPriority("ALL");
    setStartDate("");
    setEndDate("");
    setSelectedSalesman("ALL");
    setSelectedDealer("ALL");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const statusOptions = useMemo(() => getFilteredStatusOptions(role), [role]);

  const salesmanOptions = useMemo(
    () => [
      { value: "ALL", label: "All Salesmen" },
      ...salespersons.map((s) => ({
        value: s.employee_id,
        label: formatName(s.employee_name),
      })),
    ],
    [salespersons]
  );

  const dealerOptions = useMemo(
    () => [
      { value: "ALL", label: "All Dealers" },
      ...dealersList.map((d) => ({
        value: d.employee_id,
        label: d.shop_name && d.town
          ? `${capitalizeFirstLetter(d.shop_name)} — ${capitalizeFirstLetter(d.town)}`
          : capitalizeFirstLetter(d.shop_name) || formatName(d.employee_name),
        subLabel: d.employee_phone ? String(d.employee_phone) : null,
      })),
    ],
    [dealersList]
  );

  /* ── Loading / error states ──
     Only show the full-screen spinner on the very first load. Subsequent
     refetches (triggered by search, filters, pagination) show an inline
     "Updating results…" banner instead — see below. Otherwise the layout
     unmounts and steals focus from the search input mid-typing. */
  if (initialLoad && loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading orders…</p>
        </div>
      </div>
    );
  }

  if (initialLoad && error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <FiAlertCircle size={24} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 py-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {loading ? "Loading…" : `${pagination.total.toLocaleString()} total order${pagination.total !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadOrders}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            {canCreateOrder && (
              <button
                onClick={() => navigate("/orders/create")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/30 cursor-pointer"
              >
                <FiPlus size={14} /> Create Order
              </button>
            )}
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="bg-white border border-blue-100/60 rounded-2xl overflow-hidden">

          {/* ── FILTER BAR ── */}
          <div className="px-5 py-3 border-b border-blue-100/60 bg-white">
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm sm:max-w-xs">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders, dealers, shops..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-blue-50/40 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
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

                {canSelectSalesmanPermission && (
                  <div className="w-44">
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Salesman</span>
                    <CustomSelect
                      name="salesman"
                      value={selectedSalesman}
                      onChange={(e) => {
                        setSelectedSalesman(e.target.value);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={salesmanOptions}
                      searchable
                    />
                  </div>
                )}

                {canFilterByDealer && (
                  <div className="w-48">
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Dealer</span>
                    <CustomSelect
                      name="dealer"
                      value={selectedDealer}
                      onChange={(e) => {
                        setSelectedDealer(e.target.value);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      options={dealerOptions}
                      searchable
                    />
                  </div>
                )}

                {/* Date Range */}
                <div className="flex items-center gap-1 bg-blue-50/40 border border-blue-100/80 rounded-lg px-2 py-1">
                  <FiCalendar size={12} className="text-blue-500" />
                  <DateInput
                    placeholder="From"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate("");
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  <div className="flex items-center pb-2 text-slate-400">
                    <FiArrowRight size={12} />
                  </div>
                  <DateInput
                    placeholder="To"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  {(startDate || endDate) && (
                    <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full">
                      Active
                    </span>
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

          {/* Inline loading indicator — shows during refetches regardless of
              whether the current result set is empty, so the layout (and
              search input focus) stays put. */}
          {loading && !initialLoad && (
            <div className="px-5 py-2 bg-blue-50/60 border-b border-blue-100/60 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-blue-600 font-semibold">Updating results…</span>
            </div>
          )}

          {/* ── TABLE ── */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-blue-50/40">
                  {["Dealer & Order", "Shop", "Created", "Delivery", "Items", "Total", "Priority", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap ${i === 8 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-5 bg-blue-50 rounded-2xl">
                          <FiPackage size={24} className="text-blue-400" />
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

                    const unpackedCount = orderDetails?.filter(
                      (d) => d.stock_flags?.hasUnpacked === true
                    ).length ?? 0;
                    const hasUnpacked = unpackedCount > 0;

                    const isTerminalOrder = status === ORDER_STATUSES.COMPLETED;

                    const countByStatus = (s) =>
                      orderDetails?.filter((d) => d.status?.toUpperCase() === s).length ?? 0;

                    const awaitingInvoiceCount = isTerminalOrder ? 0 : countByStatus(ORDER_STATUSES.PACKED);
                    const awaitingShippingCount = isTerminalOrder ? 0 : countByStatus(ORDER_STATUSES.INVOICE);
                    const awaitingDeliveryCount = isTerminalOrder ? 0 : countByStatus(ORDER_STATUSES.SHIPPED);
                    const deliveredCount = isTerminalOrder ? 0 : countByStatus(ORDER_STATUSES.DELIVERED);
                    const completedCount = isTerminalOrder ? 0 : countByStatus(ORDER_STATUSES.COMPLETED);

                    const pluralize = (n, word) => `${n} ${n === 1 ? word : word + "s"}`;

                    const subLines = [];
                    if (isProductionStatus && hasUnpacked) {
                      subLines.push({
                        text: `${pluralize(unpackedCount, "item")} ready for packing`,
                        icon: "package",
                        tone: "amber",
                      });
                    }
                    if (awaitingInvoiceCount > 0) {
                      subLines.push({
                        text: `${pluralize(awaitingInvoiceCount, "item")} awaiting invoice`,
                        icon: "invoice",
                        tone: "amber",
                      });
                    }
                    if (awaitingShippingCount > 0) {
                      subLines.push({
                        text: `${pluralize(awaitingShippingCount, "item")} awaiting shipping`,
                        icon: "truck",
                        tone: "amber",
                      });
                    }
                    if (awaitingDeliveryCount > 0) {
                      subLines.push({
                        text: `${pluralize(awaitingDeliveryCount, "item")} awaiting delivery`,
                        icon: "delivery",
                        tone: "amber",
                      });
                    }
                    if (deliveredCount > 0) {
                      subLines.push({
                        text: `${pluralize(deliveredCount, "item")} delivered`,
                        icon: "delivery",
                        tone: "green",
                      });
                    }
                    if (completedCount > 0) {
                      subLines.push({
                        text: `${pluralize(completedCount, "item")} completed`,
                        icon: "delivery",
                        tone: "green",
                      });
                    }
                    const hasSubLines = subLines.length > 0;

                    return (
                      <tr
                        key={order.order_number}
                        className="hover:bg-blue-50/30 transition-colors duration-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{formatName(order.dealer?.employee_name)}</p>
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
                          <span className="inline-flex px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
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
                          {hasSubLines ? (
                            <ProductionStatusBadge
                              status={order.status}
                              subLines={subLines}
                              variant="table"
                            />
                          ) : (
                            <StatusBadge status={order.status} />
                          )}
                          <ProgressBar progress={order.progress} status={order.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/orders/${order.order_number}`)}
                              title="View Order"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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

export default Orders;