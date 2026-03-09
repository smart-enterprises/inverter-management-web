import React, { useEffect, useState, useMemo } from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiTruck,
  FiTrendingUp,
  FiAlertCircle,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { fetchUsers, } from "../api/user";
import { ROLES } from "../utils/roles";
import { fetchOrders, fetchOrdersByDate } from "../api/orders";
import { fetchLowStockProducts } from "../api/products";
import { capitalizeFirstLetter } from "../utils/constants";

/* ===================== REUSABLE CARDS ===================== */

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold mt-2 text-gray-900 tracking-tight">
          {value}
        </h3>
      </div>

      <div
        className={`bg-gradient-to-br ${color} text-white p-3 rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-gray-500">{title}</p>
      <div
        className={`bg-gradient-to-br ${color} text-white p-2.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform`}
      >
        {icon}
      </div>
    </div>

    <div>
      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
        {value}
      </h3>
      {subValue && (
        <p className="text-sm text-gray-500 mt-1">
          {subValue}
        </p>
      )}
    </div>
  </div>
);

const OrderCard = ({ number, dealer, priority, status }) => {

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "bg-red-50 text-red-600 border-red-200";
      case "MEDIUM":
        return "bg-yellow-50 text-yellow-600 border-yellow-200";
      case "LOW":
        return "bg-green-50 text-green-600 border-green-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PRODUCTION":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "PACKED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Left Section */}
        <div>
          <h4 className="text-base font-semibold text-gray-900 tracking-tight">
            {number}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {dealer || "Unknown Dealer"}
          </p>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full border ${getPriorityStyle(priority)}`}
          >
            {priority}
          </span>

          <span
            className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusStyle(status)}`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ===================== DASHBOARD ===================== */

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
  const [lowStockLoading, setLowStockLoading] = useState(true);

  const [loading, setLoading] = useState(true);

  /* ================= LOAD ORDER DATA ================= */
  const loadOrderData = async () => {
    /* -------- TOTAL + RECENT ORDERS -------- */
    const totalRes = await fetchOrders({
      page: 1,
      limit: 6,
      includeRejected: false,
    });

    setTotalOrders(totalRes?.pagination?.total || 0);
    setRecentOrders(totalRes?.data || []);

    /* -------- ONGOING ORDERS -------- */
    const ongoingStatuses = [
      "PENDING",
      "CONFIRMED",
      "PRODUCTION",
      "PACKED",
    ];

    const ongoingResponses = await Promise.all(
      ongoingStatuses.map((status) =>
        fetchOrders({
          page: 1,
          limit: 1,
          status,
          includeRejected: false,
        })
      )
    );

    const ongoingTotal = ongoingResponses.reduce(
      (sum, res) => sum + (res?.pagination?.total || 0),
      0
    );

    setOngoingOrders(ongoingTotal);

    /* -------- ORDERS THIS MONTH -------- */
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = now.toISOString().split("T")[0];

    const monthlyRes = await fetchOrdersByDate({
      year,
      month,
      start_date: startDate,
      end_date: endDate,
    });

    setMonthlyOrders(monthlyRes?.count || 0);
  };

  /* ================= LOAD USER COUNTS ================= */
  const loadUserCounts = async () => {
    const rolesToFetch = [
      { role: ROLES.ADMIN, setter: setAdminCount },
      { role: ROLES.SALESMAN, setter: setSalesmanCount },
      { role: ROLES.DEALER, setter: setDealerCount },
    ];

    const responses = await Promise.all(
      rolesToFetch.map(({ role }) =>
        fetchUsers({
          page: 1,
          limit: 1,
          role,
          status: "active",
        })
      )
    );

    responses.forEach((res, index) => {
      rolesToFetch[index].setter(res?.data?.total || 0);
    });
  };

  const loadLowStockProducts = async () => {
    try {
      setLowStockLoading(true);

      const response = await fetchLowStockProducts({
        page: 1,
        limit: 10,
        threshold: 5,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to fetch low stock products");
      }

      setLowStockProducts(response?.data || []);
      setLowStockCount(response?.pagination?.total || 0);

    } catch (error) {
      console.error("❌ Low Stock Products Load Error:", error);
      setLowStockProducts([]);
      setLowStockCount(0);
    } finally {
      setLowStockLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        await Promise.all([
          loadOrderData(),
          loadUserCounts(),
          loadLowStockProducts(),
        ]);

      } catch (error) {
        console.error("❌ Dashboard load error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };

  }, []);

  /* ===================== UI ===================== */

  return (
    // <div className="min-h-screen bg-gray-50 p-6">

    //   {/* ===================== STATS ===================== */}
    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    //     <StatCard icon={<FiUsers />} title="Total Admins" value={loading ? "..." : adminCount} />
    //     <StatCard icon={<FiUsers />} title="Total Salesmen" value={loading ? "..." : salesmanCount} />
    //     <StatCard icon={<FiUsers />} title="Total Dealers" value={loading ? "..." : dealerCount} />
    //     <StatCard icon={<FiShoppingBag />} title="Total Orders" value={loading ? "..." : totalOrders} />
    //   </div>

    //   {/* ===================== METRICS ===================== */}
    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    //     <MetricCard
    //       icon={<FiTrendingUp />}
    //       title="Monthly Sales Goal"
    //       value="₹ 75,000 / ₹ 100,000"
    //       subValue="75% achieved"
    //     />
    //     <MetricCard icon={<FiShoppingBag />} title="Orders This Month" value={loading ? "..." : monthlyOrders} />
    //     <MetricCard icon={<FiTruck />} title="Ongoing Orders" value={loading ? "..." : ongoingOrders} />
    //     <MetricCard icon={<FiAlertCircle />} title="Low Stock Products" value={loading ? "..." : lowStockCount} />
    //   </div>

    //   {/* ===================== PENDING ORDERS ===================== */}
    //   <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    //     <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
    //       <div className="flex items-center gap-3">
    //         <div className="bg-purple-50 text-[#9333EA] p-3 rounded-xl">
    //           <FiClock className="text-xl" />
    //         </div>
    //         <div>
    //           <h2 className="text-xl font-semibold text-gray-900">
    //             Recent Orders
    //           </h2>
    //           <p className="text-sm text-gray-500">
    //             Track your recent order status
    //           </p>
    //         </div>
    //       </div>

    //       <button
    //         onClick={() => navigate("/orders")}
    //         className="px-5 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#7e22ce] 
    //         text-white rounded-xl text-sm font-medium 
    //         hover:shadow-md transition-all duration-200 
    //         inline-flex items-center gap-2"
    //       >
    //         View All Orders
    //         <FiArrowRight />
    //       </button>
    //     </div>

    //     <div className="space-y-3">
    //       {recentOrders.map(({ order }) => (
    //         <OrderCard
    //           key={order.order_number}
    //           number={order.order_number}
    //           dealer={order.dealer_name}
    //           priority={order.priority}
    //           status={order.status}
    //         />
    //       ))}
    //     </div>
    //   </div>
    // </div>

    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-8">

      {/* ===================== OVERVIEW STATS ===================== */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
            Overview
          </h2>
          <span className="text-sm text-gray-400">
            System Summary
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            icon={<FiUsers />}
            title="Total Admins"
            value={loading ? "—" : adminCount}
            color="from-indigo-500 to-indigo-600"
          />

          <StatCard
            icon={<FiUsers />}
            title="Total Salesmen"
            value={loading ? "—" : salesmanCount}
            color="from-purple-500 to-purple-600"
          />

          <StatCard
            icon={<FiUsers />}
            title="Total Dealers"
            value={loading ? "—" : dealerCount}
            color="from-blue-500 to-blue-600"
          />

          <StatCard
            icon={<FiShoppingBag />}
            title="Total Orders"
            value={loading ? "—" : totalOrders}
            color="from-emerald-500 to-emerald-600"
          />
        </div>
      </div>

      {/* ===================== BUSINESS METRICS ===================== */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
            Business Metrics
          </h2>
          <span className="text-sm text-gray-400">
            Performance Insights
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            icon={<FiTrendingUp />}
            title="Monthly Sales Goal"
            value="₹ 75,000 / ₹ 100,000"
            subValue="75% achieved"
            color="from-green-500 to-emerald-600"
          />

          <MetricCard
            icon={<FiShoppingBag />}
            title="Orders This Month"
            value={loading ? "—" : monthlyOrders}
            color="from-blue-500 to-indigo-600"
          />

          <MetricCard
            icon={<FiTruck />}
            title="Ongoing Orders"
            value={loading ? "—" : ongoingOrders}
            color="from-orange-500 to-amber-600"
          />

          <MetricCard
            icon={<FiAlertCircle />}
            title="Low Stock Products"
            value={loading ? "—" : lowStockCount}
            color="from-red-500 to-rose-600"
          />
        </div>
      </div>

      {/* ===================== RECENT ORDERS ===================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100 text-[#9333EA]">
              <FiClock className="text-xl" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                Recent Orders
              </h2>
              <p className="text-sm text-gray-500">
                Overview of the latest placed orders
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/orders")}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
              bg-gradient-to-r from-[#9333EA] to-[#7e22ce]
              text-white rounded-xl shadow-sm
              hover:shadow-md hover:scale-[1.02]
              transition-all duration-200"
          >
            View All Orders
            <FiArrowRight size={16} />
          </button>
        </div>

        {/* ===================== Body ===================== */}
        <div className="p-6">

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="h-20 bg-gray-100 rounded-xl border border-gray-200"
                />
              ))}
            </div>
          ) : recentOrders?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                📦
              </div>
              <p className="text-sm font-medium text-gray-700">
                No recent orders found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Newly placed orders will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map(({ order }) => (
                <OrderCard
                  key={order?.order_number}
                  number={order?.order_number}
                  dealer={
                    capitalizeFirstLetter(
                      order?.dealer?.employee_name || "Unknown Dealer"
                    )
                  }
                  priority={order?.priority}
                  status={order?.status}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;