// Dashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiUsers, FiShoppingBag, FiTruck, FiTrendingUp,
  FiAlertCircle, FiClock, FiArrowRight, FiPackage,
  FiChevronRight, FiCheckCircle, FiRefreshCw,
  FiWifi, FiWifiOff,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchUsers, fetchEmployeeCount } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders } from "../api/orders";
import { fetchLowStockProducts } from "../api/products";
import { capitalizeFirstLetter, ONGOING_STATUSES } from "../utils/constants";
import { useRouteAccess } from "../hooks/useRouteAccess";
import { useAuth } from "../hooks/useAuth";
import {
  canViewDashboardSection,
  DASHBOARD_SECTIONS,
} from "../utils/dashboardPermissions";
import { getDateRange } from "../utils/dateUtils";
import { COLOR_MAP } from "../utils/colorUtils";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PURCHASE_ANALYTICS_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
];

const LOW_STOCK_THRESHOLD = 5;
const RECENT_ORDERS_LIMIT = 6;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

const getColor = (color) => COLOR_MAP[color] ?? COLOR_MAP._default;

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({ icon, title, value, color, loading, onClick, error }) => {
  const c = getColor(color);
  const isInteractive = onClick && !loading && !error;

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`
        bg-white rounded-2xl border border-slate-200 shadow-sm p-5
        transition-all duration-200 hover:shadow-md
        ${isInteractive ? `hover:ring-2 ${c.ring} cursor-pointer` : ""}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2 truncate">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : error ? (
            <p className="text-sm font-semibold text-rose-400">Error</p>
          ) : (
            <p className={`text-3xl font-black tabular-nums ${c.val}`}>{value}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} flex-shrink-0`}>
          {React.cloneElement(icon, { size: 16, className: c.icon })}
        </div>
      </div>
      {isInteractive && (
        <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${c.icon}`}>
          View all <FiChevronRight size={10} />
        </div>
      )}
    </div>
  );
};

// ─── Metric Card ───────────────────────────────────────────────────────────────

const MetricCard = ({ title, value, subValue, icon, color, loading, onClick, error, badge }) => {
  const c = getColor(color);
  const isInteractive = onClick && !loading && !error;

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => e.key === "Enter" && onClick() : undefined}
      className={`
        bg-white rounded-2xl border border-slate-200 shadow-sm p-5
        transition-all duration-200 hover:shadow-md
        ${isInteractive ? `hover:ring-2 ${c.ring} cursor-pointer` : ""}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 truncate pr-2">{title}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badge && (
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-full bg-rose-100 text-rose-600 border border-rose-200">
              {badge}
            </span>
          )}
          <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
            {React.cloneElement(icon, { size: 13, className: c.icon })}
          </div>
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </>
      ) : error ? (
        <p className="text-sm font-semibold text-rose-400">Failed to load</p>
      ) : (
        <>
          <p className={`text-2xl font-black tabular-nums ${c.val}`}>{value ?? "—"}</p>
          {subValue && <p className="text-xs text-slate-400 font-medium mt-1">{subValue}</p>}
        </>
      )}
      {isInteractive && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${c.icon}`}>
          View <FiChevronRight size={10} />
        </div>
      )}
    </div>
  );
};

// ─── Badge style maps ──────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  HIGH: "bg-rose-50    text-rose-700    border-rose-200",
  MEDIUM: "bg-amber-50   text-amber-700   border-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-50   text-amber-700   border-amber-200",
  CONFIRMED: "bg-blue-50    text-blue-700    border-blue-200",
  PRODUCTION: "bg-indigo-50  text-indigo-700  border-indigo-200",
  PACKED: "bg-violet-50  text-violet-700  border-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SHIPPED: "bg-orange-50  text-orange-700  border-orange-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-50    text-rose-700    border-rose-200",
};

const getBadgeStyle = (map, key) =>
  map[key?.toUpperCase()] ?? "bg-slate-50 text-slate-600 border-slate-200";

// ─── Order Row ─────────────────────────────────────────────────────────────────

const OrderRow = ({ order, canNavigate, onClick }) => {
  if (!order) return null;

  const dealerName = order.dealer?.employee_name
    ? capitalizeFirstLetter(order.dealer.employee_name)
    : "Unknown Dealer";

  const Wrapper = canNavigate ? "button" : "div";
  const wrapperClass = [
    "w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4",
    "bg-white border border-slate-100 rounded-xl transition-all duration-150 text-left",
    canNavigate
      ? "hover:border-indigo-200 hover:shadow-sm hover:bg-indigo-50/20 active:scale-[0.99] group cursor-pointer"
      : "",
  ].join(" ");

  return (
    <Wrapper onClick={onClick} className={wrapperClass}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
          <FiPackage size={13} className="text-indigo-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 font-mono truncate">{order.order_number}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{dealerName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {order.priority && (
          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getBadgeStyle(PRIORITY_STYLES, order.priority)}`}>
            {order.priority}
          </span>
        )}
        {order.status && (
          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getBadgeStyle(STATUS_STYLES, order.status)}`}>
            {order.status}
          </span>
        )}
        {order.created_at && (
          <span className="text-[10px] text-slate-400 font-medium hidden md:block">
            {formatRelativeTime(order.created_at)}
          </span>
        )}
        {canNavigate && (
          <FiChevronRight
            size={13}
            className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-auto flex-shrink-0 hidden sm:block"
          />
        )}
      </div>
    </Wrapper>
  );
};

// ─── Section Header ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Error Banner ──────────────────────────────────────────────────────────────

const ErrorBanner = ({ sections, onRetry }) => {
  if (!sections.length) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-rose-700">
        <FiWifiOff size={14} />
        <span className="font-semibold">Failed to load: {sections.join(", ")}</span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors"
      >
        <FiRefreshCw size={11} /> Retry
      </button>
    </div>
  );
};

// ─── Last Updated ──────────────────────────────────────────────────────────────

const LastUpdated = ({ timestamp, loading, onRefresh }) => (
  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
    {loading ? (
      <>
        <FiRefreshCw size={11} className="animate-spin" />
        <span>Refreshing…</span>
      </>
    ) : (
      <>
        <FiWifi size={11} className="text-emerald-400" />
        <span>Updated {formatRelativeTime(timestamp)}</span>
        <button
          onClick={onRefresh}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          title="Refresh dashboard"
        >
          <FiRefreshCw size={11} />
        </button>
      </>
    )}
  </div>
);

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const { canAccess } = useRouteAccess();
  const canViewOrderDetails = canAccess("/orders/:id");
  const canViewProductList = canAccess("/products");
  const canViewProductDetail = canAccess("/products/:id");

  const canViewPurchaseAnalytics = PURCHASE_ANALYTICS_ROLES.includes(role);

  const showStatsRow = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS) || canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_ORDERS);
  const showBusinessMetrics = canViewDashboardSection(role, DASHBOARD_SECTIONS.BUSINESS_METRICS);
  const showRecentOrders = canViewDashboardSection(role, DASHBOARD_SECTIONS.RECENT_ORDERS);
  const showLowStockAlert = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_ALERT);
  const showLowStockProducts = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_PRODUCTS);
  const showUserStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS);
  const showAdminStats = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const showDealerStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_DEALERS);
  const showAssignedDealerStats = role === ROLES.SALESMAN;

  // ── State ─────────────────────────────────────────────────────────────────────

  const [state, setState] = useState({
    totalOrders: 0, recentOrders: [], ongoingOrders: 0,
    monthlyOrders: 0, todayOrders: 0, todayDeliveryCount: 0,
    totalCompletedOrders: 0, todayCompletedOrders: 0, monthlyCompletedOrders: 0,
    superAdminCount: 0, adminCount: 0, salesmanCount: 0, dealerCount: 0, assignedDealerCount: 0,
    lowStockCount: 0, lowStockProducts: [],
  });

  const [loading, setLoading] = useState(true);
  const [failedSections, setFailedSections] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
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
      Promise.all(ONGOING_STATUSES.map((s) => fetchCount({ status: s }))).then(
        (counts) => counts.reduce((sum, n) => sum + n, 0)
      ),
      fetchCount({ startDate: firstDayOfMonth, endDate: today }),
      fetchCount({ startDate: today, endDate: today }),
      fetchCount({ deliveryStartDate: today, deliveryEndDate: today }),
      fetchCount({ status: "COMPLETED" }),
      fetchCount({ status: "COMPLETED", startDate: today, endDate: today }),
      fetchCount({ status: "COMPLETED", startDate: firstDayOfMonth, endDate: today }),
    ]);

    return {
      totalOrders: totalRes?.pagination?.total ?? 0,
      recentOrders: totalRes?.data ?? [],
      ongoingOrders: ongoingCounts,
      monthlyOrders: monthly,
      todayOrders: todayOrd,
      todayDeliveryCount: todayDel,
      totalCompletedOrders: totalComp,
      todayCompletedOrders: todayComp,
      monthlyCompletedOrders: monthlyComp,
    };
  }, [fetchCount]);

  const loadUserCounts = useCallback(async () => {
    /* Parallel: one tiny call for all role counts, one limit=1 call for assigned dealers total. */
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

  // ── Load ──────────────────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setFailedSections([]);

    const results = await Promise.allSettled([
      loadOrderData(),
      loadUserCounts(),
      loadLowStockProducts(),
    ]);

    if (signal?.aborted) return;

    const sectionNames = ["orders", "users", "lowStock"];
    const failed = [];
    const merged = {};

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        Object.assign(merged, result.value);
      } else {
        failed.push(sectionNames[i]);
        console.error(`Dashboard "${sectionNames[i]}" failed:`, result.reason);
      }
    });

    setState((prev) => ({ ...prev, ...merged }));
    setFailedSections(failed);
    setLastUpdated(new Date());
    setLoading(false);
  }, [loadOrderData, loadUserCounts, loadLowStockProducts]);

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
    superAdmins: () => navigate("/users", { state: { status: "active", role: ROLES.SUPER_ADMIN } }),
    admins: () => navigate("/users", { state: { status: "active", role: ROLES.ADMIN } }),
    salesmen: () => navigate("/users", { state: { status: "active", role: ROLES.SALESMAN } }),
    dealers: () => navigate("/dealers", { state: { status: "active" } }),
    products: () => navigate("/products"),
    activeOrders: () => navigate("/orders?status=PENDING"),
    purchaseAnalytics: () => navigate("/purchase-analytics"),
  }), [navigate, today, firstDayOfMonth]);

  // ── Destructure state ─────────────────────────────────────────────────────────

  const {
    totalOrders, recentOrders, ongoingOrders, monthlyOrders,
    todayOrders, todayDeliveryCount, totalCompletedOrders,
    todayCompletedOrders, monthlyCompletedOrders,
    superAdminCount, adminCount, salesmanCount, dealerCount, assignedDealerCount, employeeCount,
    lowStockCount, lowStockProducts,
  } = state;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{formatMonthLabel()}</p>
        </div>
        <LastUpdated timestamp={lastUpdated} loading={loading} onRefresh={handleRefresh} />
      </div>

      {/* ── ERROR BANNER ── */}
      {!loading && failedSections.length > 0 && (
        <ErrorBanner sections={failedSections} onRetry={handleRefresh} />
      )}

      {/* ── OVERVIEW STATS ── */}
      {showStatsRow && (
        <div>
          <SectionHeader
            title="Overview"
            subtitle="System summary at a glance"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {showAdminStats && (
              <>
                <StatCard
                  icon={<FiUsers />}
                  title="Super Admins"
                  value={superAdminCount}
                  color="slate"
                  loading={loading}
                  onClick={nav.superAdmins}
                />
                <StatCard
                  icon={<FiUsers />}
                  title="Admins"
                  value={adminCount}
                  color="indigo"
                  loading={loading}
                  onClick={nav.admins}
                />
              </>
            )}

            {showUserStats && (
              <StatCard
                icon={<FiUsers />}
                title="Salesmen"
                value={salesmanCount}
                color="violet"
                loading={loading}
                onClick={nav.salesmen}
              />
            )}

            {showDealerStats && (
              <StatCard
                icon={<FiUsers />}
                title="Dealers"
                value={dealerCount}
                color="blue"
                loading={loading}
                onClick={nav.dealers}
              />
            )}

            {showAssignedDealerStats && (
              <StatCard
                icon={<FiUsers />}
                title="Assigned Dealers"
                value={assignedDealerCount}
                color="cyan"
                loading={loading}
                onClick={nav.dealers}
              />
            )}

            {showUserStats && (
              <StatCard
                icon={<FiUsers />}
                title="Employees"
                value={employeeCount}
                color="emerald"
                loading={loading}
                onClick={nav.users}
              />
            )}

            {showStatsRow && (
              <StatCard
                icon={<FiShoppingBag />}
                title="Orders"
                value={totalOrders}
                color="amber"
                loading={loading}
                onClick={nav.allOrders}
              />
            )}

          </div>
        </div>
      )}

      {/* ── BUSINESS METRICS ── */}
      {showBusinessMetrics && (
        <div>
          <SectionHeader
            title="Business Metrics"
            subtitle="Performance insights"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

            {canViewPurchaseAnalytics && (
              <MetricCard
                icon={<FiTrendingUp />}
                title="Purchase Analytics"
                subValue="View detailed insights"
                color="indigo"
                loading={loading}
                onClick={nav.purchaseAnalytics}
              />
            )}

            <MetricCard
              icon={<FiShoppingBag />}
              title="Today's Orders"
              value={todayOrders}
              subValue="New orders placed today"
              color="blue"
              loading={loading}
              onClick={nav.todayOrders}
            />

            <MetricCard
              icon={<FiTruck />}
              title="Today's Deliveries"
              value={todayDeliveryCount}
              subValue="Scheduled for delivery today"
              color="cyan"
              loading={loading}
              onClick={nav.todayDeliveries}
            />

            <MetricCard
              icon={<FiShoppingBag />}
              title="Monthly Orders"
              value={monthlyOrders}
              subValue={`Orders in ${formatMonthLabel()}`}
              color="sky"
              loading={loading}
              onClick={nav.monthOrders}
            />

            <MetricCard
              icon={<FiTruck />}
              title="Active Orders"
              value={ongoingOrders}
              subValue="Pending · Confirmed · In progress"
              color="amber"
              loading={loading}
              onClick={nav.activeOrders}
              badge={ongoingOrders > 0 ? "Live" : undefined}
            />

            <MetricCard
              icon={<FiCheckCircle />}
              title="Completed Today"
              value={todayCompletedOrders}
              subValue="Orders fulfilled today"
              color="emerald"
              loading={loading}
              onClick={nav.todayCompleted}
            />

            <MetricCard
              icon={<FiCheckCircle />}
              title="Completed This Month"
              value={monthlyCompletedOrders}
              subValue="Fulfilled orders this month"
              color="violet"
              loading={loading}
              onClick={nav.monthCompleted}
            />

            <MetricCard
              icon={<FiCheckCircle />}
              title="Total Completed"
              value={totalCompletedOrders}
              subValue="All-time completed orders"
              color="green"
              loading={loading}
              onClick={nav.completedOrders}
            />

            {showLowStockAlert && (
              <MetricCard
                icon={<FiAlertCircle />}
                title="Low Stock Products"
                value={lowStockCount}
                subValue="Below minimum threshold"
                color="rose"
                loading={loading}
                onClick={canViewProductList ? nav.products : undefined}
                badge={lowStockCount > 0 ? "Alert" : undefined}
              />
            )}

          </div>
        </div>
      )}

      {/* ── RECENT ORDERS ── */}
      {showRecentOrders && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FiClock size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  {canViewOrderDetails ? "Click any order to view details" : "Latest orders overview"}
                </p>
              </div>
            </div>
            <button
              onClick={nav.allOrders}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 cursor-pointer"
            >
              View All <FiArrowRight size={13} />
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <FiPackage size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No recent orders</p>
                <p className="text-xs text-slate-400">New orders will appear here once placed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(({ order }) =>
                  order ? (
                    <OrderRow
                      key={order.order_number}
                      order={order}
                      canNavigate={canViewOrderDetails}
                      onClick={canViewOrderDetails ? () => navigate(`/orders/${order.order_number}`) : undefined}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOW STOCK ALERT ── */}
      {showLowStockAlert && showLowStockProducts && !loading && lowStockProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-rose-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <FiAlertCircle size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Low Stock Alert</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  {lowStockCount} product{lowStockCount !== 1 ? "s" : ""} below threshold (≤{LOW_STOCK_THRESHOLD})
                </p>
              </div>
            </div>
            {canViewProductList && (
              <button
                onClick={nav.products}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                View Products <FiArrowRight size={11} />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Product", "Brand", "Available", "Packed", "Unpacked"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lowStockProducts.map((p) => (
                  <tr
                    key={p.product_id}
                    onClick={canViewProductDetail ? () => navigate(`/products/${p.product_id}`) : undefined}
                    className={`hover:bg-slate-50/60 transition-colors ${canViewProductDetail ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{p.product_name}</p>
                      <span className="text-[9px] font-mono text-slate-400">{p.product_id}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{p.brand}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black border bg-rose-50 text-rose-700 border-rose-200 tabular-nums">
                        {p.available_stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-violet-600 tabular-nums">
                        {p.stocks?.[0]?.packed_stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-blue-600 tabular-nums">
                        {p.stocks?.[0]?.unpacked_stock ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;