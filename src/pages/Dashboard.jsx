// Dashboard.jsx — Kredi-themed
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiUsers, FiShoppingBag, FiTruck, FiTrendingUp,
  FiAlertCircle, FiArrowRight, FiPackage,
  FiCheckCircle, FiRefreshCw, FiActivity, FiHexagon,
  FiBox, FiBell,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchUsers, fetchEmployeeCount } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders } from "../api/orders";
import { fetchLowStockProducts, fetchProducts } from "../api/products";
import { getAllBrands } from "../api/brands";
import { capitalizeFirstLetter, ONGOING_STATUSES } from "../utils/constants";
import { useRouteAccess } from "../hooks/useRouteAccess";
import { useAuth } from "../hooks/useAuth";
import {
  canViewDashboardSection,
  DASHBOARD_SECTIONS,
} from "../utils/dashboardPermissions";
import { getDateRange } from "../utils/dateUtils";

const LOW_STOCK_THRESHOLD = 5;
const RECENT_ORDERS_LIMIT = 6;

const formatMonthLabel = () =>
  new Date().toLocaleString("default", { month: "long", year: "numeric" });

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-blue-100/40 rounded-lg ${className}`} />
);

// ── Hero KPI card (top row) ─────────────────────────────────────────────────────
const HeroKpi = ({ icon, tint, label, value, loading, onClick }) => (
  <button
    onClick={onClick}
    type="button"
    disabled={!onClick}
    className={`text-left w-full bg-white rounded-2xl border border-blue-100/60 p-5 transition-all ${onClick ? "hover:border-blue-200 hover:shadow-sm cursor-pointer" : "cursor-default"}`}
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tint}`}>
        {React.cloneElement(icon, { size: 16 })}
      </div>
    </div>
    {loading ? (
      <Skeleton className="h-9 w-24" />
    ) : (
      <p className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value ?? "—"}
      </p>
    )}
  </button>
);

// ── Module card (2x3 grid) ──────────────────────────────────────────────────────
const ModuleCard = ({ icon, iconTint, title, description, status = "Active", rows, loading }) => {
  const statusStyle =
    status === "Warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Alert"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const statusDot = status === "Warning"
    ? "text-amber-500"
    : status === "Alert"
      ? "text-rose-500"
      : "text-emerald-500";

  return (
    <div className="bg-white rounded-2xl border border-blue-100/60 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTint}`}>
            {React.cloneElement(icon, { size: 17 })}
          </div>
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyle}`}>
          <FiCheckCircle size={10} className={statusDot} />
          {status}
        </span>
      </div>

      {description && (
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{description}</p>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={r.onClick}
            className={`flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/50 ${r.onClick ? "cursor-pointer hover:bg-blue-100/60" : ""}`}
          >
            <span className="text-xs font-medium text-slate-600">{r.label}</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {loading ? <Skeleton className="h-4 w-10 inline-block" /> : (r.value?.toLocaleString?.("en-IN") ?? r.value ?? "—")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Pipeline health bar ─────────────────────────────────────────────────────────
const PIPELINE_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PRODUCTION: "In Production",
  PACKED: "Packed",
  INVOICE: "Invoiced",
  SHIPPED: "Shipped",
};

const PipelineHealth = ({ counts, loading, total }) => (
  <div className="bg-white rounded-2xl border border-blue-100/60 p-5">
    <div className="flex items-center gap-2 mb-4">
      <FiActivity size={14} className="text-blue-500" />
      <h3 className="text-[15px] font-bold text-slate-900">Pipeline Health</h3>
    </div>
    <div className="space-y-3.5">
      {ONGOING_STATUSES.map((s) => {
        const val = counts?.[s] ?? 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={s}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600">{PIPELINE_LABELS[s] ?? s}</span>
              <span className="text-xs font-bold text-slate-900 tabular-nums">
                {loading ? "—" : val.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-blue-50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                style={{ width: loading ? "0%" : `${Math.min(100, Math.max(2, pct))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Recent alerts card ──────────────────────────────────────────────────────────
const RecentAlerts = ({ items, loading }) => (
  <div className="bg-white rounded-2xl border border-blue-100/60 p-5">
    <div className="flex items-center gap-2 mb-4">
      <FiBell size={14} className="text-blue-500" />
      <h3 className="text-[15px] font-bold text-slate-900">Recent Alerts</h3>
    </div>
    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    ) : items.length === 0 ? (
      <div className="py-6 text-center">
        <FiCheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">All systems operational</p>
      </div>
    ) : (
      <ul className="space-y-3">
        {items.map((a, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.tone === "danger" ? "bg-rose-500" : a.tone === "warn" ? "bg-amber-500" : "bg-emerald-500"}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">{a.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{a.subtitle}</p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ── Order status pill (used in recent orders table) ─────────────────────────────
const STATUS_PILL = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PRODUCTION: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  PACKED: "bg-teal-50 text-teal-700 border-teal-200",
  INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

// ── Recent orders card ──────────────────────────────────────────────────────────
const RecentOrdersCard = ({ orders, loading, onViewAll, onRowClick, canNavigate }) => (
  <div className="bg-white rounded-2xl border border-blue-100/60 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100/60">
      <h3 className="text-[15px] font-bold text-slate-900">Recent Orders</h3>
      <button
        onClick={onViewAll}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors"
      >
        View All <FiArrowRight size={11} />
      </button>
    </div>

    {loading ? (
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    ) : orders.length === 0 ? (
      <div className="py-16 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-blue-50 mb-3">
          <FiPackage size={20} className="text-blue-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">No recent orders</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-50/40">
              <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Order</th>
              <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Dealer</th>
              <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Status</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Amount</th>
              <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {orders.map(({ order }) => {
              if (!order) return null;
              const dealerName = order.dealer?.employee_name
                ? capitalizeFirstLetter(order.dealer.employee_name)
                : "Unknown Dealer";
              const pill = STATUS_PILL[order.status] ?? "bg-slate-50 text-slate-600 border-slate-200";
              return (
                <tr
                  key={order.order_number}
                  onClick={canNavigate ? () => onRowClick(order.order_number) : undefined}
                  className={`${canNavigate ? "cursor-pointer hover:bg-blue-50/40" : ""} transition-colors`}
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-bold text-slate-800">{order.order_number}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-medium text-xs">{dealerName}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${pill}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      ₹{Number(order.order_total_price || 0).toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-[11px] text-slate-400 font-medium">
                    {formatRelativeTime(order.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ── Low stock list (right rail bottom) ──────────────────────────────────────────
const LowStockList = ({ products, loading, onClickProduct, canNavigate }) => (
  <div className="bg-white rounded-2xl border border-blue-100/60 p-5">
    <div className="flex items-center gap-2 mb-4">
      <FiAlertCircle size={14} className="text-rose-500" />
      <h3 className="text-[15px] font-bold text-slate-900">Low Stock</h3>
    </div>
    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    ) : products.length === 0 ? (
      <div className="py-6 text-center">
        <FiCheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-500">Stock looks healthy</p>
      </div>
    ) : (
      <ul className="space-y-2.5">
        {products.slice(0, 5).map((p) => (
          <li
            key={p.product_id}
            onClick={canNavigate ? () => onClickProduct(p.product_id) : undefined}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg bg-blue-50/50 ${canNavigate ? "cursor-pointer hover:bg-blue-100/60" : ""}`}
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{p.product_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{p.brand}</p>
            </div>
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200 tabular-nums flex-shrink-0">
              {p.available_stock ?? 0}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ── Main Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const { canAccess } = useRouteAccess();
  const canViewOrderDetails = canAccess("/orders/:id");
  const canViewProductList = canAccess("/products");
  const canViewProductDetail = canAccess("/products/:id");

  const showStatsRow = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS) || canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_ORDERS);
  const showBusinessMetrics = canViewDashboardSection(role, DASHBOARD_SECTIONS.BUSINESS_METRICS);
  const showRecentOrders = canViewDashboardSection(role, DASHBOARD_SECTIONS.RECENT_ORDERS);
  const showLowStockAlert = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_ALERT);
  const showLowStockProducts = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_PRODUCTS);
  const showUserStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS);
  const showDealerStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_DEALERS);
  const isAdminish = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.MANAGER;

  // ── State ─────────────────────────────────────────────────────────────────────
  const [state, setState] = useState({
    totalOrders: 0, recentOrders: [], ongoingOrders: 0, ongoingByStatus: {},
    monthlyOrders: 0, todayOrders: 0, todayDeliveryCount: 0,
    totalCompletedOrders: 0, todayCompletedOrders: 0, monthlyCompletedOrders: 0,
    superAdminCount: 0, adminCount: 0, salesmanCount: 0,
    dealerCount: 0, assignedDealerCount: 0, employeeCount: 0,
    lowStockCount: 0, lowStockProducts: [],
    brandCount: 0, productCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [failedSections, setFailedSections] = useState([]);
  const abortRef = useRef(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────────
  const fetchCount = useCallback(
    (params) =>
      fetchOrders({ page: 1, limit: 1, includeRejected: false, ...params })
        .then((res) => res?.pagination?.total ?? 0)
        .catch(() => 0),
    []
  );

  const loadOrderData = useCallback(async () => {
    const { today, firstDayOfMonth } = getDateRange();
    const [
      totalRes, ongoingCounts, monthly, todayOrd, todayDel,
      totalComp, todayComp, monthlyComp,
    ] = await Promise.all([
      fetchOrders({ page: 1, limit: RECENT_ORDERS_LIMIT, includeRejected: false }),
      Promise.all(ONGOING_STATUSES.map((s) => fetchCount({ status: s }))),
      fetchCount({ startDate: firstDayOfMonth, endDate: today }),
      fetchCount({ startDate: today, endDate: today }),
      fetchCount({ deliveryStartDate: today, deliveryEndDate: today }),
      fetchCount({ status: "COMPLETED" }),
      fetchCount({ status: "COMPLETED", startDate: today, endDate: today }),
      fetchCount({ status: "COMPLETED", startDate: firstDayOfMonth, endDate: today }),
    ]);

    const ongoingByStatus = Object.fromEntries(
      ONGOING_STATUSES.map((s, i) => [s, ongoingCounts[i]])
    );

    return {
      totalOrders: totalRes?.pagination?.total ?? 0,
      recentOrders: totalRes?.data ?? [],
      ongoingOrders: ongoingCounts.reduce((sum, n) => sum + n, 0),
      ongoingByStatus,
      monthlyOrders: monthly,
      todayOrders: todayOrd,
      todayDeliveryCount: todayDel,
      totalCompletedOrders: totalComp,
      todayCompletedOrders: todayComp,
      monthlyCompletedOrders: monthlyComp,
    };
  }, [fetchCount]);

  const loadUserCounts = useCallback(async () => {
    const [countsRes, assignedRes] = await Promise.all([
      fetchEmployeeCount(),
      fetchUsers({
        page: 1, limit: 1, role: ROLES.DEALER,
        status: "active", includeDealers: true, scope: "ASSIGNED_ONLY",
      }),
    ]);

    const roleCounts = countsRes?.data?.roleCounts ?? {};
    return {
      superAdminCount: roleCounts[ROLES.SUPER_ADMIN] ?? 0,
      adminCount: roleCounts[ROLES.ADMIN] ?? 0,
      salesmanCount: roleCounts[ROLES.SALESMAN] ?? 0,
      dealerCount: roleCounts[ROLES.DEALER] ?? 0,
      assignedDealerCount: assignedRes?.data?.total ?? 0,
      employeeCount: countsRes?.data?.totalUsers ?? 0,
    };
  }, []);

  const loadLowStockProducts = useCallback(async () => {
    const res = await fetchLowStockProducts({ page: 1, limit: 10, threshold: LOW_STOCK_THRESHOLD });
    if (!res?.success) throw new Error(res?.message ?? "Failed to load low stock products");
    return {
      lowStockProducts: res?.data ?? [],
      lowStockCount: res?.pagination?.total ?? 0,
    };
  }, []);

  const loadCatalogCounts = useCallback(async () => {
    const [brandsRes, productsRes] = await Promise.all([
      getAllBrands("active").catch(() => null),
      fetchProducts({ page: 1, limit: 1 }).catch(() => null),
    ]);
    const brands = brandsRes?.data;
    const brandCount = Array.isArray(brands) ? brands.length : (brandsRes?.pagination?.total ?? 0);
    const productCount = productsRes?.pagination?.total ?? 0;
    return { brandCount, productCount };
  }, []);

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setFailedSections([]);

    const results = await Promise.allSettled([
      loadOrderData(),
      loadUserCounts(),
      loadLowStockProducts(),
      loadCatalogCounts(),
    ]);

    if (signal?.aborted) return;

    const sectionNames = ["orders", "users", "lowStock", "catalog"];
    const failed = [];
    const merged = {};

    results.forEach((result, i) => {
      if (result.status === "fulfilled") Object.assign(merged, result.value);
      else failed.push(sectionNames[i]);
    });

    setState((prev) => ({ ...prev, ...merged }));
    setFailedSections(failed);
    setLoading(false);
  }, [loadOrderData, loadUserCounts, loadLowStockProducts, loadCatalogCounts]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  const handleRefresh = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadDashboard(controller.signal);
  }, [loadDashboard]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const { today, firstDayOfMonth } = useMemo(getDateRange, []);
  const nav = useMemo(() => ({
    allOrders: () => navigate("/orders"),
    completedOrders: () => navigate("/orders", { state: { status: "COMPLETED" } }),
    todayOrders: () => navigate("/orders", { state: { startDate: today, endDate: today } }),
    todayDeliveries: () => navigate("/delivery", { state: { deliveryStartDate: today, deliveryEndDate: today } }),
    monthOrders: () => navigate("/orders", { state: { startDate: firstDayOfMonth, endDate: today } }),
    todayCompleted: () => navigate("/orders", { state: { status: "COMPLETED", startDate: today, endDate: today } }),
    monthCompleted: () => navigate("/orders", { state: { status: "COMPLETED", startDate: firstDayOfMonth, endDate: today } }),
    users: () => navigate("/users", { state: { status: "active" } }),
    salesmen: () => navigate("/users", { state: { status: "active", role: ROLES.SALESMAN } }),
    dealers: () => navigate("/dealers", { state: { status: "active" } }),
    products: () => navigate("/products"),
    brands: () => navigate("/brands"),
    activeOrders: () => navigate("/orders?status=PENDING"),
    production: () => navigate("/production-summary"),
  }), [navigate, today, firstDayOfMonth]);

  const {
    totalOrders, recentOrders, ongoingOrders, ongoingByStatus,
    monthlyOrders, todayOrders, todayDeliveryCount,
    totalCompletedOrders, todayCompletedOrders, monthlyCompletedOrders,
    salesmanCount, dealerCount, assignedDealerCount, employeeCount,
    lowStockCount, lowStockProducts, brandCount, productCount,
  } = state;

  // ── Alerts derived from state ─────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const items = [];
    if (showLowStockAlert && lowStockCount > 0) {
      items.push({
        tone: "danger",
        title: `${lowStockCount} product${lowStockCount !== 1 ? "s" : ""} low on stock`,
        subtitle: `Below threshold (≤${LOW_STOCK_THRESHOLD})`,
      });
    }
    if (failedSections.length > 0) {
      items.push({
        tone: "warn",
        title: "Some sections failed to load",
        subtitle: failedSections.join(", "),
      });
    }
    if (todayDeliveryCount > 0) {
      items.push({
        tone: "warn",
        title: `${todayDeliveryCount} deliveries scheduled today`,
        subtitle: "Action required",
      });
    }
    return items;
  }, [showLowStockAlert, lowStockCount, failedSections, todayDeliveryCount]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome{user?.employee_name ? `, ${capitalizeFirstLetter(user.employee_name)}` : ""}. Monitor orders, production and delivery from here. <span className="text-slate-400">· {formatMonthLabel()}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ─── HERO KPIs ─── */}
      {showStatsRow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <HeroKpi
            icon={<FiShoppingBag className="text-blue-600" />}
            tint="bg-blue-100/70 text-blue-600"
            label="Total Orders"
            value={totalOrders}
            loading={loading}
            onClick={nav.allOrders}
          />
          <HeroKpi
            icon={<FiActivity className="text-blue-600" />}
            tint="bg-blue-100/70 text-blue-600"
            label="Active Orders"
            value={ongoingOrders}
            loading={loading}
            onClick={nav.activeOrders}
          />
          <HeroKpi
            icon={<FiTruck className="text-emerald-600" />}
            tint="bg-emerald-100/70 text-emerald-600"
            label="Today's Deliveries"
            value={todayDeliveryCount}
            loading={loading}
            onClick={nav.todayDeliveries}
          />
          <HeroKpi
            icon={<FiCheckCircle className="text-amber-600" />}
            tint="bg-amber-100/70 text-amber-600"
            label="Completed This Month"
            value={monthlyCompletedOrders}
            loading={loading}
            onClick={nav.monthCompleted}
          />
        </div>
      )}

      {/* ─── MODULES + RIGHT RAIL ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* Modules grid */}
        <div className="xl:col-span-3 space-y-4">
          {showBusinessMetrics && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Operations Modules</h2>
                <button
                  onClick={nav.allOrders}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:border-blue-200 hover:text-blue-600 transition-colors"
                >
                  Manage Orders
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                <ModuleCard
                  icon={<FiShoppingBag className="text-blue-600" />}
                  iconTint="bg-blue-100/70"
                  title="Sales"
                  description="Order intake and pipeline"
                  loading={loading}
                  rows={[
                    { label: "Today", value: todayOrders, onClick: nav.todayOrders },
                    { label: "This Month", value: monthlyOrders, onClick: nav.monthOrders },
                    { label: "Active", value: ongoingOrders, onClick: nav.activeOrders },
                  ]}
                />

                <ModuleCard
                  icon={<FiHexagon className="text-emerald-600" />}
                  iconTint="bg-emerald-100/70"
                  title="Production"
                  description="What's being built and packed"
                  loading={loading}
                  rows={[
                    { label: "In Production", value: ongoingByStatus?.PRODUCTION ?? 0, onClick: nav.production },
                    { label: "Packed", value: ongoingByStatus?.PACKED ?? 0, onClick: nav.production },
                    { label: "Invoiced", value: ongoingByStatus?.INVOICE ?? 0, onClick: nav.production },
                  ]}
                />

                <ModuleCard
                  icon={<FiTruck className="text-blue-600" />}
                  iconTint="bg-blue-100/70"
                  title="Delivery"
                  description="Shipping and last-mile"
                  loading={loading}
                  rows={[
                    { label: "Shipped", value: ongoingByStatus?.SHIPPED ?? 0, onClick: nav.allOrders },
                    { label: "Today's Deliveries", value: todayDeliveryCount, onClick: nav.todayDeliveries },
                    { label: "Completed Today", value: todayCompletedOrders, onClick: nav.todayCompleted },
                  ]}
                />

                {canViewProductList && (
                  <ModuleCard
                    icon={<FiBox className="text-amber-600" />}
                    iconTint="bg-amber-100/70"
                    title="Brands & Catalog"
                    description="Master data: brands, products and stock health"
                    status={lowStockCount > 0 ? "Warning" : "Active"}
                    loading={loading}
                    rows={[
                      { label: "Brands", value: brandCount, onClick: nav.brands },
                      { label: "Total Products", value: productCount, onClick: nav.products },
                      { label: "Low Stock", value: lowStockCount, onClick: nav.products },
                    ]}
                  />
                )}

                {(showUserStats || showDealerStats) && (
                  <ModuleCard
                    icon={<FiUsers className="text-cyan-600" />}
                    iconTint="bg-cyan-100/70"
                    title="People"
                    description="Team and dealer network"
                    loading={loading}
                    rows={[
                      ...(showUserStats ? [
                        { label: "Salesmen", value: salesmanCount, onClick: nav.salesmen },
                        { label: "Employees", value: employeeCount, onClick: nav.users },
                      ] : []),
                      ...(showDealerStats ? [
                        { label: "Dealers", value: dealerCount, onClick: nav.dealers },
                      ] : [
                        { label: "Assigned Dealers", value: assignedDealerCount, onClick: nav.dealers },
                      ]),
                    ]}
                  />
                )}

                {isAdminish && (
                  <ModuleCard
                    icon={<FiTrendingUp className="text-amber-600" />}
                    iconTint="bg-amber-100/70"
                    title="Completed Orders"
                    description="Fulfillment performance"
                    loading={loading}
                    rows={[
                      { label: "Today", value: todayCompletedOrders, onClick: nav.todayCompleted },
                      { label: "This Month", value: monthlyCompletedOrders, onClick: nav.monthCompleted },
                      { label: "All-Time", value: totalCompletedOrders, onClick: nav.completedOrders },
                    ]}
                  />
                )}

              </div>
            </>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {showBusinessMetrics && (
            <PipelineHealth counts={ongoingByStatus} loading={loading} total={ongoingOrders} />
          )}
          <RecentAlerts items={alerts} loading={loading} />
        </div>
      </div>

      {/* ─── BOTTOM ROW ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {showRecentOrders && (
          <div className="xl:col-span-2">
            <RecentOrdersCard
              orders={recentOrders}
              loading={loading}
              onViewAll={nav.allOrders}
              canNavigate={canViewOrderDetails}
              onRowClick={(num) => navigate(`/orders/${num}`)}
            />
          </div>
        )}
        {showLowStockProducts && (
          <div>
            <LowStockList
              products={lowStockProducts}
              loading={loading}
              canNavigate={canViewProductDetail}
              onClickProduct={(id) => navigate(`/products/${id}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
