// orders.jsx — Redesigned

import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPackage,
  FiFilter,
  FiTrendingUp,
  FiAlertCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchOrders } from "../api/orders";
import {
  getRoleBasedStatusOptions,
  ORDER_STATUS_LIST,
  PRIORITY_OPTIONS,
} from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { ROLE_LABELS, ROLES } from "../utils/roles";

/* ================================================================
   PAGINATION
   ================================================================ */
const OrdersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (page) =>
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            const showDots = index > 0 && page - visiblePages[index - 1] > 1;
            return (
              <div key={page} className="flex items-center">
                {showDots && (
                  <span className="px-1.5 text-slate-400 text-xs select-none">…</span>
                )}
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
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

/* ================================================================
   STATUS / PRIORITY BADGES
   ================================================================ */
const PriorityBadge = ({ priority }) => {
  const styles = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const dots = {
    HIGH: "bg-rose-500",
    MEDIUM: "bg-amber-500",
    LOW: "bg-emerald-500",
  };
  const key = priority?.toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${styles[key] || "bg-slate-50 text-slate-600 border-slate-200"
        }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[key] || "bg-slate-400"}`} />
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
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
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${styles[key] || "bg-slate-50 text-slate-600 border-slate-200"
        }`}
    >
      {status}
    </span>
  );
};

/* ================================================================
   MAIN COMPONENT — Orders
   ================================================================ */
const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const isProduction = role === ROLES.PRODUCTION;
  const isPacking = role === ROLES.PACKING;
  const isDelivery = role === ROLES.DELIVERY;
  const isSalesman = role === ROLES.SALESMAN;
  const isManager = role === ROLES.MANAGER;
  const isAdmin = role === ROLES.ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const canCreateOrder = useMemo(
    () => isSuperAdmin || isAdmin || isManager || isSalesman,
    [user?.role]
  );

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  useEffect(() => {
    if (isProduction) setSelectedStatus("PRODUCTION");
    else if (isPacking) setSelectedStatus("PACKED");
    else if (isDelivery) setSelectedStatus("SHIPPED");
  }, [isProduction, isPacking, isDelivery]);

  const queryParams = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
      search: searchQuery || undefined,
    }),
    [pagination.page, pagination.limit, selectedStatus, selectedPriority, searchQuery]
  );

  useEffect(() => {
    let isMounted = true;
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchOrders(queryParams);
        if (!isMounted) return;
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
        if (isMounted) setLoading(false);
      }
    };
    loadOrders();
    return () => { isMounted = false; };
  }, [queryParams]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "N/A";

  const getTotalItems = (details) =>
    details?.reduce((sum, item) => sum + (item.qty_ordered || 0), 0) || 0;

  /* ---- LOADING ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <FiAlertCircle size={24} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 sm:px-6 py-8">
      <div className="max-w-screen-xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {pagination.total} total orders
            </p>
          </div>
          {canCreateOrder && (
            <button
              onClick={() => navigate("/orders/create")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
            >
              <FiPlus size={14} />
              Create Order
            </button>
          )}
        </div>

        {/* ── MAIN CARD ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* ── FILTERS ── */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Search */}
              <div className="relative w-full lg:max-w-sm">
                <FiSearch
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search orders, dealers or shops…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
              </div>
              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                  <FiFilter size={11} />
                  Filter
                </div>
                <CustomSelect
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  options={getRoleBasedStatusOptions(role)}
                />
                <CustomSelect
                  name="priority"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  options={PRIORITY_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {[
                    "Dealer & Order",
                    "Shop",
                    "Created",
                    "Delivery",
                    "Items",
                    "Total",
                    "Priority",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ${i === 8 ? "text-right" : "text-left"
                        }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-2xl">
                          <FiPackage size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-400 font-semibold">No orders found</p>
                        <p className="text-xs text-slate-300">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((orderData) => {
                    const { order } = orderData;
                    if (!order) return null;

                    const detailDeliveryDates =
                      order.order_details
                        ?.map((d) => (d.delivery_date ? new Date(d.delivery_date) : null))
                        .filter(Boolean) || [];
                    const maxDetailDate = detailDeliveryDates.length
                      ? new Date(Math.max(...detailDeliveryDates))
                      : null;
                    const finalDeliveryDate = order.promised_delivery_date
                      ? new Date(order.promised_delivery_date)
                      : maxDetailDate;

                    return (
                      <tr
                        key={order.order_number}
                        className="hover:bg-slate-50/60 transition-colors duration-150 group"
                      >
                        {/* Dealer + Order */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {capitalizeFirstLetter(order.dealer?.employee_name)}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {order.order_number}
                            </p>
                          </div>
                        </td>

                        {/* Shop */}
                        <td className="px-5 py-4 text-slate-600 font-medium text-sm">
                          {capitalizeFirstLetter(order.dealer?.shop_name)}
                        </td>

                        {/* Created */}
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs font-medium">
                          {formatDate(order.created_at)}
                        </td>

                        {/* Delivery */}
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs font-medium">
                          {formatDate(finalDeliveryDate)}
                        </td>

                        {/* Items */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {getTotalItems(order.order_details)}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-800">
                            ₹{order.order_total_price?.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-4">
                          <PriorityBadge priority={order.priority} />
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={order.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/orders/${order.order_number}`)}
                              title="View Order"
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <FiEye size={15} />
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/orders/${order.order_number}`, {
                                  state: { openEditMode: true },
                                })
                              }
                              title="Edit Order"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              <FiEdit2 size={15} />
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
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Orders;
