// dashboard.jsx — Role-aware version with dashboardPermissions
import React, { useEffect, useState } from "react";
import {
  FiUsers, FiShoppingBag, FiTruck, FiTrendingUp,
  FiAlertCircle, FiClock, FiArrowRight, FiPackage,
  FiChevronRight, FiBox,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders } from "../api/orders";
import { fetchLowStockProducts } from "../api/products";
import { capitalizeFirstLetter } from "../utils/constants";
import { useRouteAccess } from "../hooks/useRouteAccess";
import { useAuth } from "../hooks/useAuth";
import {
  canViewDashboardSection,
  DASHBOARD_SECTIONS,
} from "../utils/dashboardPermissions";

// STAT CARD
const StatCard = ({ icon, title, value, color, loading, onClick }) => {
  const c = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-100", icon: "text-indigo-600", val: "text-indigo-700", ring: "hover:ring-indigo-200" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600", val: "text-violet-700", ring: "hover:ring-violet-200" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", val: "text-blue-700", ring: "hover:ring-blue-200" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", val: "text-emerald-700", ring: "hover:ring-emerald-200" },
  }[color] || { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-600", val: "text-slate-700", ring: "hover:ring-slate-200" };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:ring-2 ${c.ring} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">{title}</p>
          <p className={`text-3xl font-black tabular-nums ${c.val}`}>
            {loading ? <span className="text-slate-200 animate-pulse">—</span> : value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} flex-shrink-0`}>
          {React.cloneElement(icon, { size: 16, className: c.icon })}
        </div>
      </div>
      {onClick && !loading && (
        <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${c.icon}`}>
          View all <FiChevronRight size={10} />
        </div>
      )}
    </div>
  );
};

//  METRIC CARD
const MetricCard = ({ title, value, subValue, icon, color, loading, onClick }) => {
  const c = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", val: "text-emerald-700", ring: "hover:ring-emerald-200" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", val: "text-blue-700", ring: "hover:ring-blue-200" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", val: "text-amber-700", ring: "hover:ring-amber-200" },
    rose: { bg: "bg-rose-50", border: "border-rose-100", icon: "text-rose-600", val: "text-rose-700", ring: "hover:ring-rose-200" },
  }[color] || { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-600", val: "text-slate-700", ring: "" };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:ring-2 ${c.ring} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
        <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
          {React.cloneElement(icon, { size: 13, className: c.icon })}
        </div>
      </div>
      <p className={`text-2xl font-black tabular-nums ${c.val}`}>
        {loading ? <span className="text-slate-200 animate-pulse">—</span> : value}
      </p>
      {subValue && <p className="text-xs text-slate-400 font-medium mt-1">{subValue}</p>}
      {onClick && !loading && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide ${c.icon}`}>
          View <FiChevronRight size={10} />
        </div>
      )}
    </div>
  );
};

// ORDER ROW — conditionally clickable based on role
const OrderRow = ({ order, canNavigate, onClick }) => {
  const priorityStyle = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[order?.priority?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";

  const statusStyle = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
    PACKED: "bg-violet-50 text-violet-700 border-violet-200",
    DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  }[order?.status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";

  // Render as a plain div when the role cannot navigate to order details
  const Wrapper = canNavigate ? "button" : "div";
  const wrapperProps = canNavigate
    ? {
      onClick,
      className:
        "w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm hover:bg-indigo-50/20 active:scale-[0.99] transition-all duration-150 text-left group cursor-pointer",
    }
    : {
      className:
        "w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-white border border-slate-100 rounded-xl transition-all duration-150 text-left",
    };

  return (
    <Wrapper {...wrapperProps}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
          <FiPackage size={13} className="text-indigo-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 font-mono truncate">{order?.order_number}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
            {order?.dealer?.employee_name ? capitalizeFirstLetter(order.dealer.employee_name) : "Unknown Dealer"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${priorityStyle}`}>
          {order?.priority}
        </span>
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${statusStyle}`}>
          {order?.status}
        </span>
        {/* Chevron only shown for roles that can navigate */}
        {canNavigate && (
          <FiChevronRight size={13} className="text-slate-300 group-hover:text-indigo-400 transition-colors ml-auto flex-shrink-0 hidden sm:block" />
        )}
      </div>
    </Wrapper>
  );
};

// SECTION HEADER
const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// DASHBOARD
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;

  const { canAccess } = useRouteAccess();
  const canViewOrderDetails = canAccess("/orders/:id");
  const canViewProductList = canAccess("/products");
  const canViewProductDetail = canAccess("/products/:id");

  // Dashboard section visibility helpers
  const showStatsRow = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS)
    || canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_ORDERS);
  const showBusinessMetrics = canViewDashboardSection(role, DASHBOARD_SECTIONS.BUSINESS_METRICS);
  const showRecentOrders = canViewDashboardSection(role, DASHBOARD_SECTIONS.RECENT_ORDERS);
  const showLowStockAlert = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_ALERT);
  const showLowStockProducts = canViewDashboardSection(role, DASHBOARD_SECTIONS.LOW_STOCK_PRODUCTS);
  const showUserStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_USERS);
  const showDealerStats = canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_DEALERS);

  // ── State ─────────────────────────────────────────────────────────
  const [totalOrders, setTotalOrders] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ongoingOrders, setOngoingOrders] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [salesmanCount, setSalesmanCount] = useState(0);
  const [dealerCount, setDealerCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Data loaders ───────────────────────────────────────────────── */
  const loadOrderData = async () => {
    const totalRes = await fetchOrders({ page: 1, limit: 6, includeRejected: false });
    setTotalOrders(totalRes?.pagination?.total || 0);
    setRecentOrders(totalRes?.data || []);

    const ongoingStatuses = ["PENDING", "CONFIRMED", "PRODUCTION", "PACKED"];
    const ongoingResponses = await Promise.all(
      ongoingStatuses.map((s) => fetchOrders({ page: 1, limit: 1, status: s, includeRejected: false }))
    );
    setOngoingOrders(ongoingResponses.reduce((sum, res) => sum + (res?.pagination?.total || 0), 0));

    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = now.toISOString().split("T")[0];
    const monthlyRes = await fetchOrders({
      page: 1, limit: 6, includeRejected: false, startDate, endDate,
    });
    setMonthlyOrders(monthlyRes?.pagination?.total || 0);
  };

  const loadUserCounts = async () => {
    const rolesToFetch = [
      { role: ROLES.ADMIN, setter: setAdminCount },
      { role: ROLES.SUPER_ADMIN, setter: setAdminCount },
      { role: ROLES.SALESMAN, setter: setSalesmanCount },
      { role: ROLES.DEALER, setter: setDealerCount },
    ];
    const responses = await Promise.all(
      rolesToFetch.map(({ role }) => fetchUsers({ page: 1, limit: 1, role, status: "active" }))
    );
    responses.forEach((res, i) => rolesToFetch[i].setter(res?.data?.total || 0));
  };

  const loadLowStockProducts = async () => {
    try {
      const response = await fetchLowStockProducts({ page: 1, limit: 10, threshold: 5 });
      if (!response?.success) throw new Error(response?.message || "Failed");
      setLowStockProducts(response?.data || []);
      setLowStockCount(response?.pagination?.total || 0);
    } catch {
      setLowStockProducts([]);
      setLowStockCount(0);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        await Promise.all([loadOrderData(), loadUserCounts(), loadLowStockProducts()]);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  // UI
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── OVERVIEW STATS — only for roles that can see user/dealer stats */}
      {showStatsRow && (
        <div>
          <SectionHeader title="Overview" subtitle="System summary at a glance" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {showUserStats && (
              <>
                <StatCard icon={<FiUsers />} title="Total Admins" value={adminCount} color="indigo" loading={loading} onClick={() => navigate("/users")} />
                <StatCard icon={<FiUsers />} title="Total Salesmen" value={salesmanCount} color="violet" loading={loading} onClick={() => navigate("/users")} />
              </>
            )}
            {showDealerStats && <StatCard icon={<FiUsers />} title="Total Dealers" value={dealerCount} color="blue" loading={loading} onClick={() => navigate("/dealers")} />}
            {canViewDashboardSection(role, DASHBOARD_SECTIONS.STATS_ORDERS) && (
              <StatCard icon={<FiShoppingBag />} title="Total Orders" value={totalOrders} color="emerald" loading={loading} onClick={() => navigate("/orders")} />
            )}
          </div>
        </div>
      )}

      {/* ── BUSINESS METRICS */}
      {showBusinessMetrics && (
        <div>
          <SectionHeader title="Business Metrics" subtitle="Performance insights" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* not remove this (Monthly Sales Goal) any reason, because its want to future requirements */}
            {/* <MetricCard icon={<FiTrendingUp />} title="Monthly Sales Goal" value="₹ 75,000" subValue="75% of ₹ 1,00,000 achieved" color="emerald" loading={loading} /> */}

            <MetricCard icon={<FiTrendingUp />} title="Purchase Analytics" subValue="View Insights" color="blue" loading={loading} onClick={() => navigate("/purchase-analytics")} />

            <MetricCard icon={<FiShoppingBag />} title="Orders This Month" value={monthlyOrders} color="blue" loading={loading} onClick={() => navigate("/orders")} />
            <MetricCard icon={<FiTruck />} title="Ongoing Orders" value={ongoingOrders} color="amber" loading={loading} onClick={() => navigate("/orders?status=PENDING")} />

            {/* Low stock metric — only shown to roles that can see stock info */}
            {showLowStockAlert && (
              <MetricCard
                icon={<FiAlertCircle />}
                title="Low Stock Products"
                value={lowStockCount}
                color="rose"
                loading={loading}
                onClick={canViewProductList ? () => navigate("/products") : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* ── RECENT ORDERS */}
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
            <button onClick={() => navigate("/orders")} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 cursor-pointer">
              View All <FiArrowRight size={13} />
            </button>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            ) : recentOrders?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl"><FiPackage size={22} className="text-slate-400" /></div>
                <p className="text-sm font-semibold text-slate-500">No recent orders</p>
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

      {/* ── LOW STOCK ALERT — Production/Packing can see, Salesman CANNOT */}
      {showLowStockAlert && !loading && lowStockProducts.length > 0 && showLowStockProducts && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-rose-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <FiAlertCircle size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Low Stock Alert</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  {lowStockCount} product{lowStockCount !== 1 ? "s" : ""} below threshold
                </p>
              </div>
            </div>
            {canViewProductList && (
              <button onClick={() => navigate("/products")} className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer">
                View Products <FiArrowRight size={11} />
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Product", "Brand", "Available", "Packed", "Unpacked"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-left whitespace-nowrap">{h}</th>
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
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black border bg-rose-50 text-rose-700 border-rose-200 tabular-nums">{p.available_stock ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-xs font-semibold text-violet-600 tabular-nums">{p.stocks?.[0]?.packed_stock ?? 0}</span></td>
                    <td className="px-5 py-3.5"><span className="text-xs font-semibold text-blue-600 tabular-nums">{p.stocks?.[0]?.unpacked_stock ?? 0}</span></td>
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