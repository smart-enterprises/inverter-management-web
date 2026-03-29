// dashboard.jsx — Redesigned

import React, { useEffect, useState, useMemo } from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiTruck,
  FiTrendingUp,
  FiAlertCircle,
  FiClock,
  FiArrowRight,
  FiPackage,
  FiActivity,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders, fetchOrdersByDate } from "../api/orders";
import { fetchLowStockProducts } from "../api/products";
import { capitalizeFirstLetter } from "../utils/constants";

/* ================================================================
   STAT CARD
   ================================================================ */
const StatCard = ({ icon, title, value, color, loading }) => {
  const colorMap = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-100", icon: "text-indigo-600", value: "text-indigo-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600", value: "text-violet-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", value: "text-blue-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", value: "text-emerald-700" },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">{title}</p>
          <p className={`text-3xl font-black tabular-nums ${c.value}`}>
            {loading ? <span className="text-slate-300">—</span> : value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
          {React.cloneElement(icon, { size: 16, className: c.icon })}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   METRIC CARD
   ================================================================ */
const MetricCard = ({ title, value, subValue, icon, color, loading }) => {
  const colorMap = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", value: "text-emerald-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", value: "text-blue-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", value: "text-amber-700" },
    rose: { bg: "bg-rose-50", border: "border-rose-100", icon: "text-rose-600", value: "text-rose-700" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
        <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
          {React.cloneElement(icon, { size: 13, className: c.icon })}
        </div>
      </div>
      <p className={`text-2xl font-black tabular-nums ${c.value}`}>
        {loading ? <span className="text-slate-300">—</span> : value}
      </p>
      {subValue && <p className="text-xs text-slate-400 font-medium mt-1">{subValue}</p>}
    </div>
  );
};

/* ================================================================
   ORDER CARD
   ================================================================ */
const OrderCard = ({ number, dealer, priority, status }) => {
  const priorityStyle = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[priority?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";

  const statusStyle = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
    PACKED: "bg-violet-50 text-violet-700 border-violet-200",
    DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  }[status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all duration-150">
      <div>
        <p className="text-sm font-bold text-slate-900 font-mono">{number}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{dealer || "Unknown Dealer"}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${priorityStyle}`}>
          {priority}
        </span>
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${statusStyle}`}>
          {status}
        </span>
      </div>
    </div>
  );
};

/* ================================================================
   SECTION HEADER
   ================================================================ */
const SectionHeader = ({ title, subtitle }) => (
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-sm font-bold text-slate-700 tracking-tight">{title}</h2>
    {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
  </div>
);

/* ================================================================
   DASHBOARD
   ================================================================ */
const Dashboard = () => {
  const navigate = useNavigate();

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

  const loadOrderData = async () => {
    const totalRes = await fetchOrders({ page: 1, limit: 6, includeRejected: false });
    setTotalOrders(totalRes?.pagination?.total || 0);
    setRecentOrders(totalRes?.data || []);

    const ongoingStatuses = ["PENDING", "CONFIRMED", "PRODUCTION", "PACKED"];
    const ongoingResponses = await Promise.all(
      ongoingStatuses.map((status) => fetchOrders({ page: 1, limit: 1, status, includeRejected: false }))
    );
    setOngoingOrders(ongoingResponses.reduce((sum, res) => sum + (res?.pagination?.total || 0), 0));

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = now.toISOString().split("T")[0];
    const monthlyRes = await fetchOrdersByDate({ year, month, start_date: startDate, end_date: endDate });
    setMonthlyOrders(monthlyRes?.count || 0);
  };

  const loadUserCounts = async () => {
    const rolesToFetch = [
      { role: ROLES.ADMIN, setter: setAdminCount },
      { role: ROLES.SUPER_ADMIN, setter: setAdminCount },
      { role: ROLES.SALESMAN, setter: setSalesmanCount },
      { role: ROLES.DEALER, setter: setDealerCount },
    ];
    const responses = await Promise.all(rolesToFetch.map(({ role }) => fetchUsers({ page: 1, limit: 1, role, status: "active" })));
    responses.forEach((res, index) => rolesToFetch[index].setter(res?.data?.total || 0));
  };

  const loadLowStockProducts = async () => {
    try {
      const response = await fetchLowStockProducts({ page: 1, limit: 10, threshold: 5 });
      if (!response?.success) throw new Error(response?.message || "Failed");
      setLowStockProducts(response?.data || []);
      setLowStockCount(response?.pagination?.total || 0);
    } catch (error) {
      console.error("Low Stock error:", error);
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

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ── OVERVIEW STATS ── */}
      <div>
        <SectionHeader title="Overview" subtitle="System Summary" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<FiUsers />} title="Total Admins" value={adminCount} color="indigo" loading={loading} />
          <StatCard icon={<FiUsers />} title="Total Salesmen" value={salesmanCount} color="violet" loading={loading} />
          <StatCard icon={<FiUsers />} title="Total Dealers" value={dealerCount} color="blue" loading={loading} />
          <StatCard icon={<FiShoppingBag />} title="Total Orders" value={totalOrders} color="emerald" loading={loading} />
        </div>
      </div>

      {/* ── BUSINESS METRICS ── */}
      <div>
        <SectionHeader title="Business Metrics" subtitle="Performance Insights" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard icon={<FiTrendingUp />} title="Monthly Sales Goal" value="₹ 75,000" subValue="75% of ₹ 1,00,000 achieved" color="emerald" loading={loading} />
          <MetricCard icon={<FiShoppingBag />} title="Orders This Month" value={monthlyOrders} color="blue" loading={loading} />
          <MetricCard icon={<FiTruck />} title="Ongoing Orders" value={ongoingOrders} color="amber" loading={loading} />
          <MetricCard icon={<FiAlertCircle />} title="Low Stock Products" value={lowStockCount} color="rose" loading={loading} />
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FiClock size={14} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                Latest order activity
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
          >
            View All Orders
            <FiArrowRight size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="p-4 bg-slate-100 rounded-2xl">
                <FiPackage size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No recent orders</p>
              <p className="text-xs text-slate-400">Newly placed orders will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map(({ order }) => (
                <button onClick={() => navigate(`/orders/${order.order_number}`)}>
                  <OrderCard
                    key={order?.order_number}
                    number={order?.order_number}
                    dealer={capitalizeFirstLetter(order?.dealer?.employee_name || "Unknown Dealer")}
                    priority={order?.priority}
                    status={order?.status}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LOW STOCK ALERT ── */}
      {!loading && lowStockProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-rose-50/40">
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Product", "Brand", "Available", "Packed", "Unpacked"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lowStockProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 text-sm">{p.product_name}</p>
                      <span className="text-[9px] font-mono text-slate-400">{p.product_id}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{p.brand}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black border bg-rose-50 text-rose-700 border-rose-200">
                        {p.available_stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-violet-600">{p.stocks?.[0]?.packed_stock ?? 0}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-blue-600">{p.stocks?.[0]?.unpacked_stock ?? 0}</span>
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