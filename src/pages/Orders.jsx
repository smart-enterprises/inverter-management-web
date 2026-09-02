// Orders.jsx — Material Design 3

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdAdd, MdSearch, MdVisibility, MdChevronLeft, MdChevronRight,
  MdInbox, MdFilterList, MdErrorOutline, MdClose, MdCalendarMonth,
  MdRefresh, MdArrowForward,
} from "react-icons/md";
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
import {
  Surface, Button, IconButton, Chip, StatusChip, EmptyState,
  Table, Thead, Th, Tr, Td,
} from "../components/m3";
import { T } from "../components/m3/tokens";

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
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ borderTop: `1px solid ${T.outlineVariant}` }}
    >
      <p className="m3-body-small hidden sm:block" style={{ color: T.onSurfaceVariant }}>
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <IconButton
          icon={MdChevronLeft}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            const showDots = index > 0 && page - visiblePages[index - 1] > 1;
            const current = page === currentPage;
            return (
              <div key={page} className="flex items-center">
                {showDots && (
                  <span className="px-1.5 m3-body-small select-none" style={{ color: T.onSurfaceVariant }}>…</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-current={current ? "page" : undefined}
                  className="m3-label-large m3-state-layer m3-focus min-w-[32px] h-8 px-2.5 flex items-center justify-center"
                  style={{
                    borderRadius: T.cornerFull,
                    backgroundColor: current ? T.secondaryContainer : "transparent",
                    color: current ? T.onSecondaryContainer : T.onSurfaceVariant,
                  }}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>
        <IconButton
          icon={MdChevronRight}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
      </div>
    </div>
  );
};

/* ================================================================
   BADGES
   ================================================================ */
/* Priority keeps its dot alongside the label: colour is never the only
   carrier of the level. */
const PRIORITY_TONE = { HIGH: "error", MEDIUM: "warning", LOW: "success" };
const PRIORITY_DOT = { HIGH: T.error, MEDIUM: T.warning, LOW: T.success };

const PriorityBadge = ({ priority }) => {
  const key = priority?.toUpperCase();
  return (
    <Chip tone={PRIORITY_TONE[key] ?? "neutral"}>
      <span
        className="w-1.5 h-1.5 flex-shrink-0"
        style={{ borderRadius: T.cornerFull, backgroundColor: PRIORITY_DOT[key] ?? T.outline }}
      />
      {priority}
    </Chip>
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
      <div className="flex items-center justify-between m3-body-small" style={{ color: T.onSurfaceVariant }}>
        <span>{delivered}/{ordered} delivered</span>
        <span style={{ color: isComplete ? T.success : T.onSurfaceVariant }}>{pct}%</span>
      </div>
      <div className="m3-progress-track mt-1">
        <div
          className="m3-progress-bar"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            backgroundColor: isComplete ? T.success : T.primary,
          }}
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
      <span className="m3-label-medium px-0.5" style={{ color: T.onSurfaceVariant }}>
        {placeholder}
      </span>
    )}
    <div className="relative">
      <MdCalendarMonth
        size={16}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: T.onSurfaceVariant }}
      />
      <input
        type="date"
        value={value}
        onChange={onChange}
        max={max}
        className="m3-body-small pl-8 pr-6 h-9 focus:outline-none cursor-pointer"
        style={{
          border: `1px solid ${T.outline}`,
          borderRadius: T.cornerSmall,
          backgroundColor: T.surface,
          color: T.onSurface,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: "" } })}
          aria-label="Clear date"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          style={{ color: T.onSurfaceVariant }}
        >
          <MdClose size={14} />
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: T.surface }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div
              className="absolute inset-0 border-4 rounded-full"
              style={{ borderColor: T.surfaceContainerHighest }}
            />
            <div
              className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderLeftColor: T.primary, borderRightColor: T.primary, borderBottomColor: T.primary }}
            />
          </div>
          <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>Loading orders…</p>
        </div>
      </div>
    );
  }

  if (initialLoad && error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: T.surface }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="p-4"
            style={{ backgroundColor: T.errorContainer, borderRadius: T.cornerFull }}
          >
            <MdErrorOutline size={24} style={{ color: T.onErrorContainer }} />
          </div>
          <p className="m3-body-medium" style={{ color: T.error }}>{error}</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen px-4 sm:px-6 py-8" style={{ backgroundColor: T.surface }}>
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Orders</h1>
            <p className="m3-body-medium mt-0.5" style={{ color: T.onSurfaceVariant }}>
              {loading ? "Loading…" : `${pagination.total.toLocaleString()} total order${pagination.total !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <IconButton
              icon={MdRefresh}
              onClick={loadOrders}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
              className={`disabled:opacity-50 ${loading ? "[&>svg]:animate-spin" : ""}`}
            />

            {canCreateOrder && (
              <Button variant="filled" icon={MdAdd} onClick={() => navigate("/orders/create")}>
                Create Order
              </Button>
            )}
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <Surface className="overflow-hidden">

          {/* ── FILTER BAR ── */}
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">

              {/* Search */}
              <div className="relative flex-1 min-w-[220px] max-w-sm sm:max-w-xs">
                <MdSearch
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.onSurfaceVariant }}
                />
                <input
                  type="text"
                  placeholder="Search orders, dealers, shops..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="m3-body-medium w-full pl-11 pr-9 h-10 outline-none"
                  style={{
                    backgroundColor: T.surfaceContainerHigh,
                    borderRadius: T.cornerFull,
                    color: T.onSurface,
                  }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPagination((p) => ({ ...p, page: 1 })); }}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: T.onSurfaceVariant }}
                  >
                    <MdClose size={18} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 m3-label-medium" style={{ color: T.onSurfaceVariant }}>
                  <MdFilterList size={16} />Filter
                </span>

                <div className="w-36">
                  <span className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>Status</span>
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
                  <span className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>Priority</span>
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
                    <span className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>Salesman</span>
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
                    <span className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>Dealer</span>
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
                <div
                  className="flex items-center gap-1 px-2 py-1"
                  style={{ backgroundColor: T.surfaceContainerLow, borderRadius: T.cornerSmall }}
                >
                  <DateInput
                    placeholder="From"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate("");
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  <div className="flex items-center pb-1" style={{ color: T.onSurfaceVariant }}>
                    <MdArrowForward size={16} />
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
                    <Chip tone="primary" className="ml-1">Active</Chip>
                  )}
                </div>

                {!cannotRemoveClear && hasActiveFilters && (
                  <Button
                    variant="text"
                    icon={MdClose}
                    iconSize={16}
                    onClick={clearFilters}
                    style={{ height: 32, color: T.error }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Inline loading indicator — shows during refetches regardless of
              whether the current result set is empty, so the layout (and
              search input focus) stays put. */}
          {loading && !initialLoad && (
            <div
              className="px-5 py-2 flex items-center gap-2"
              style={{
                backgroundColor: T.secondaryContainer,
                borderBottom: `1px solid ${T.outlineVariant}`,
              }}
            >
              <div
                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: T.onSecondaryContainer, borderTopColor: "transparent" }}
              />
              <span className="m3-label-medium" style={{ color: T.onSecondaryContainer }}>
                Updating results…
              </span>
            </div>
          )}

          {/* ── TABLE ── */}
          <Table>
              <Thead>
                {["Dealer & Order", "Shop", "Created", "Delivery", "Items", "Total", "Priority", "Status", ""].map((h, i) => (
                  <Th key={i} align={i === 8 ? "right" : "left"}>{h}</Th>
                ))}
              </Thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState icon={MdInbox} label="No orders found" />
                      <p className="m3-body-small text-center -mt-8 pb-8" style={{ color: T.onSurfaceVariant }}>
                        Try adjusting your filters
                      </p>
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
                      <Tr key={order.order_number}>
                        <Td>
                          <p className="m3-body-medium" style={{ color: T.onSurface }}>
                            {formatName(order.dealer?.employee_name)}
                          </p>
                          <p className="m3-body-small font-mono mt-0.5" style={{ color: T.onSurfaceVariant }}>
                            {order.order_number}
                          </p>
                        </Td>
                        <Td muted>{capitalizeFirstLetter(order.dealer?.shop_name)}</Td>
                        <Td muted className="whitespace-nowrap">{formatDate(order.created_at)}</Td>
                        <Td muted className="whitespace-nowrap">{formatDate(finalDeliveryDate)}</Td>
                        <Td>
                          <Chip tone="neutral" className="m3-numeric">
                            {getTotalItems(order.order_details)}
                          </Chip>
                        </Td>
                        <Td numeric className="whitespace-nowrap">
                          {canViewOrderPrice
                            ? (order.order_total_price ? `₹ ${order.order_total_price.toLocaleString("en-IN")}` : "—")
                            : <span style={{ color: T.onSurfaceVariant }}>—</span>
                          }
                        </Td>
                        <Td><PriorityBadge priority={order.priority} /></Td>
                        <Td>
                          {hasSubLines ? (
                            <ProductionStatusBadge
                              status={order.status}
                              subLines={subLines}
                              variant="table"
                            />
                          ) : (
                            <StatusChip status={String(order.status).toUpperCase()} />
                          )}
                          <ProgressBar progress={order.progress} status={order.status} />
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              icon={MdVisibility}
                              onClick={() => navigate(`/orders/${order.order_number}`)}
                              title="View Order"
                              aria-label="View order"
                            />
                          </div>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
          </Table>

          {/* ── PAGINATION ── */}
          <OrdersPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
        </Surface>
      </div>
    </div>
  );
};

export default Orders;