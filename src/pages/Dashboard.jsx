// Dashboard.jsx — Material Design 3
// Shared M3 primitives come from ../components/m3; only the pieces
// specific to this page (module cards, pipeline bars, alert list)
// are defined here.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MdShoppingBag,
  MdOutlineInsights,
  MdOutlineLocalShipping,
  MdCheckCircle,
  MdOutlineCheckCircle,
  MdOutlineGroup,
  MdOutlineInventory2,
  MdOutlinePrecisionManufacturing,
  MdTrendingUp,
  MdErrorOutline,
  MdArrowForward,
  MdInbox,
  MdRefresh,
  MdNotificationsNone,
  MdWarningAmber,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { fetchUsers, fetchEmployeeCount } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders } from "../api/orders";
import { fetchLowStockProducts, fetchProducts } from "../api/products";
import { getAllBrands } from "../api/brands";
import { formatName, ONGOING_STATUSES } from "../utils/constants";
import { useRouteAccess } from "../hooks/useRouteAccess";
import { useAuth } from "../hooks/useAuth";
import {
  canViewDashboardSection,
  DASHBOARD_SECTIONS,
} from "../utils/dashboardPermissions";
import { getDateRange } from "../utils/dateUtils";
import {
  Card, Surface, Chip, StatusChip, Button, KpiCard, Skeleton,
  EmptyState, SectionTitle, Table, Thead, Th, Tr, Td,
} from "../components/m3";
import { T } from "../components/m3/tokens";

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

const formatNumber = (v) =>
  typeof v === "number" ? v.toLocaleString("en-IN") : (v ?? "—");

/* ── Module card ─────────────────────────────────────────────────────────── */
const ModuleCard = ({ icon: Icon, tone, title, description, status = "Active", rows, loading }) => {
  const chip =
    status === "Warning"
      ? { tone: "warning", Icon: MdWarningAmber }
      : status === "Alert"
        ? { tone: "error", Icon: MdErrorOutline }
        : { tone: "success", Icon: MdCheckCircle };

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{
              borderRadius: T.cornerFull,
              backgroundColor: tone.bg,
              color: tone.fg,
            }}
          >
            <Icon size={20} />
          </div>
          <h3 className="m3-title-medium truncate" style={{ color: T.onSurface }}>{title}</h3>
        </div>
        <Chip tone={chip.tone} icon={chip.Icon} className="flex-shrink-0">{status}</Chip>
      </div>

      {description && (
        <p className="m3-body-small mb-4" style={{ color: T.onSurfaceVariant }}>{description}</p>
      )}

      <div className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={r.onClick}
            className={`flex items-center justify-between px-3 h-11 ${r.onClick ? "cursor-pointer m3-state-layer" : ""}`}
            style={{
              backgroundColor: T.surfaceContainerLow,
              borderRadius: T.cornerSmall,
              color: T.onSurface,
            }}
          >
            <span className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>{r.label}</span>
            <span className="m3-title-small m3-numeric" style={{ color: T.onSurface }}>
              {loading ? <Skeleton className="h-4 w-10 inline-block" /> : formatNumber(r.value)}
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
};

/* ── Pipeline health ─────────────────────────────────────────────────────── */
const PIPELINE_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PRODUCTION: "In Production",
  PACKED: "Packed",
  INVOICE: "Invoiced",
  SHIPPED: "Shipped",
};

const PipelineHealth = ({ counts, loading, total }) => (
  <Surface className="p-5">
    <SectionTitle icon={MdOutlineInsights}>Pipeline Health</SectionTitle>
    <div className="flex flex-col gap-4">
      {ONGOING_STATUSES.map((s) => {
        const val = counts?.[s] ?? 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={s}>
            <div className="flex items-center justify-between mb-2">
              <span className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>
                {PIPELINE_LABELS[s] ?? s}
              </span>
              <span className="m3-label-large m3-numeric" style={{ color: T.onSurface }}>
                {loading ? "—" : val.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="m3-progress-track">
              <div className="m3-progress-bar" style={{ width: loading ? "0%" : `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  </Surface>
);

/* ── Recent alerts ───────────────────────────────────────────────────────── */
const ALERT_TONE = {
  danger: { bg: T.errorContainer, fg: T.onErrorContainer, Icon: MdErrorOutline },
  warn: { bg: T.warningContainer, fg: T.onWarningContainer, Icon: MdWarningAmber },
  ok: { bg: T.successContainer, fg: T.onSuccessContainer, Icon: MdCheckCircle },
};

const RecentAlerts = ({ items, loading }) => (
  <Surface className="p-5">
    <SectionTitle icon={MdNotificationsNone}>Recent Alerts</SectionTitle>
    {loading ? (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    ) : items.length === 0 ? (
      <div className="py-6 text-center">
        <MdOutlineCheckCircle size={24} className="mx-auto mb-2" style={{ color: T.success }} />
        <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>All systems operational</p>
      </div>
    ) : (
      <ul className="flex flex-col gap-3">
        {items.map((a, i) => {
          const tone = ALERT_TONE[a.tone] ?? ALERT_TONE.ok;
          return (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: T.cornerFull, backgroundColor: tone.bg, color: tone.fg }}
              >
                <tone.Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="m3-body-medium" style={{ color: T.onSurface }}>{a.title}</p>
                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>{a.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Surface>
);

/* ── Recent orders ───────────────────────────────────────────────────────── */
const RecentOrdersCard = ({ orders, loading, onViewAll, onRowClick, canNavigate }) => (
  <Card
    title="Recent Orders"
    padded={false}
    action={
      <Button variant="text" onClick={onViewAll}>
        View all
        <MdArrowForward size={18} />
      </Button>
    }
  >
    {loading ? (
      <div className="p-5 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    ) : orders.length === 0 ? (
      <EmptyState icon={MdInbox} label="No recent orders" />
    ) : (
      <Table>
        <Thead>
          <Th>Order</Th>
          <Th>Dealer</Th>
          <Th>Status</Th>
          <Th align="right">Amount</Th>
          <Th align="right">When</Th>
        </Thead>
        <tbody>
          {orders.map(({ order }) => {
            if (!order) return null;
            const dealerName = order.dealer?.employee_name
              ? formatName(order.dealer.employee_name)
              : "Unknown Dealer";
            return (
              <Tr
                key={order.order_number}
                onClick={canNavigate ? () => onRowClick(order.order_number) : undefined}
              >
                <Td className="font-mono whitespace-nowrap">{order.order_number}</Td>
                <Td muted>{dealerName}</Td>
                <Td><StatusChip status={order.status} /></Td>
                <Td align="right" numeric>
                  ₹{Number(order.order_total_price || 0).toLocaleString("en-IN")}
                </Td>
                <Td align="right" muted className="m3-body-small">
                  {formatRelativeTime(order.created_at)}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    )}
  </Card>
);

/* ── Low stock list ──────────────────────────────────────────────────────── */
const LowStockList = ({ products, loading, onClickProduct, canNavigate }) => (
  <Surface className="p-5">
    <SectionTitle icon={MdErrorOutline}>Low Stock</SectionTitle>
    {loading ? (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    ) : products.length === 0 ? (
      <div className="py-6 text-center">
        <MdOutlineCheckCircle size={24} className="mx-auto mb-2" style={{ color: T.success }} />
        <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>Stock looks healthy</p>
      </div>
    ) : (
      <ul className="flex flex-col gap-1">
        {products.slice(0, 5).map((p) => (
          <li
            key={p.product_id}
            onClick={canNavigate ? () => onClickProduct(p.product_id) : undefined}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 ${canNavigate ? "cursor-pointer m3-state-layer" : ""}`}
            style={{
              backgroundColor: T.surfaceContainerLow,
              borderRadius: T.cornerSmall,
              color: T.onSurface,
            }}
          >
            <div className="min-w-0">
              <p className="m3-body-medium truncate" style={{ color: T.onSurface }}>{p.product_name}</p>
              <p className="m3-body-small truncate" style={{ color: T.onSurfaceVariant }}>{p.brand}</p>
            </div>
            <Chip tone="error" className="m3-numeric flex-shrink-0">{p.available_stock ?? 0}</Chip>
          </li>
        ))}
      </ul>
    )}
  </Surface>
);

/* ── Main Dashboard ──────────────────────────────────────────────────────── */
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

  // ── State ─────────────────────────────────────────────────────────────────
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

  // ── Fetchers ──────────────────────────────────────────────────────────────
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

  // ── Navigation ────────────────────────────────────────────────────────────
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

  // ── Alerts derived from state ─────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6"
      style={{ backgroundColor: T.surface }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Dashboard</h1>
          <p className="m3-body-medium mt-1" style={{ color: T.onSurfaceVariant }}>
            Welcome{user?.employee_name ? `, ${formatName(user.employee_name)}` : ""}. Monitor orders, production and delivery from here. · {formatMonthLabel()}
          </p>
        </div>
        <Button
          variant="outlined"
          icon={MdRefresh}
          onClick={handleRefresh}
          disabled={loading}
          className={loading ? "[&>svg]:animate-spin" : ""}
        >
          Refresh
        </Button>
      </div>

      {/* ─── HERO KPIs ─── */}
      {showStatsRow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={MdShoppingBag} tone="primary" label="Total Orders"
            value={formatNumber(totalOrders)} loading={loading} onClick={nav.allOrders}
          />
          <KpiCard
            icon={MdOutlineInsights} tone="secondary" label="Active Orders"
            value={formatNumber(ongoingOrders)} loading={loading} onClick={nav.activeOrders}
          />
          <KpiCard
            icon={MdOutlineLocalShipping} tone="tertiary" label="Today's Deliveries"
            value={formatNumber(todayDeliveryCount)} loading={loading} onClick={nav.todayDeliveries}
          />
          <KpiCard
            icon={MdCheckCircle} tone="success" label="Completed This Month"
            value={formatNumber(monthlyCompletedOrders)} loading={loading} onClick={nav.monthCompleted}
          />
        </div>
      )}

      {/* ─── MODULES + RIGHT RAIL ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        <div className="xl:col-span-3 flex flex-col gap-4">
          {showBusinessMetrics && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="m3-title-large" style={{ color: T.onSurface }}>Operations</h2>
                <Button variant="tonal" onClick={nav.allOrders}>Manage orders</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                <ModuleCard
                  icon={MdShoppingBag}
                  tone={{ bg: T.primaryContainer, fg: T.onPrimaryContainer }}
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
                  icon={MdOutlinePrecisionManufacturing}
                  tone={{ bg: T.tertiaryContainer, fg: T.onTertiaryContainer }}
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
                  icon={MdOutlineLocalShipping}
                  tone={{ bg: T.secondaryContainer, fg: T.onSecondaryContainer }}
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
                    icon={MdOutlineInventory2}
                    tone={{ bg: T.warningContainer, fg: T.onWarningContainer }}
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
                    icon={MdOutlineGroup}
                    tone={{ bg: T.primaryContainer, fg: T.onPrimaryContainer }}
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
                    icon={MdTrendingUp}
                    tone={{ bg: T.successContainer, fg: T.onSuccessContainer }}
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
        <div className="flex flex-col gap-4">
          {showBusinessMetrics && (
            <PipelineHealth counts={ongoingByStatus} loading={loading} total={ongoingOrders} />
          )}
          <RecentAlerts items={alerts} loading={loading} />
        </div>
      </div>

      {/* ─── BOTTOM ROW ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
