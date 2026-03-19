import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchOrders } from "../api/orders";
import { getRoleBasedStatusOptions, ORDER_STATUS_LIST, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import { ROLE_LABELS, ROLES } from "../utils/roles";

/* ============================= Pagination Component ============================= */

const OrdersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-white">

      <div className="flex items-center gap-2">

        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="
            inline-flex items-center justify-center
            w-9 h-9
            rounded-lg
            border border-gray-200
            text-gray-500
            hover:bg-gray-50 hover:text-gray-700
            transition
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <FiChevronLeft size={18} />
        </button>


        {/* Page Numbers */}
        <div className="flex items-center gap-1">

          {visiblePages.map((page, index) => {

            const showDots =
              index > 0 &&
              page - visiblePages[index - 1] > 1;

            return (
              <div key={page} className="flex items-center">

                {showDots && (
                  <span className="px-2 text-gray-400 text-sm select-none">
                    ...
                  </span>
                )}

                <button
                  onClick={() => onPageChange(page)}
                  className={`
                    min-w-[36px] h-9 px-3
                    flex items-center justify-center
                    rounded-lg
                    text-sm font-medium
                    transition
                    ${page === currentPage
                      ? "bg-[#9333EA] text-white shadow-sm"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  {page}
                </button>

              </div>
            );
          })}

        </div>


        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="
            inline-flex items-center justify-center
            w-9 h-9
            rounded-lg
            border border-gray-200
            text-gray-500
            hover:bg-gray-50 hover:text-gray-700
            transition
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <FiChevronRight size={18} />
        </button>

      </div>

    </div>
  );
};

/* ============================= Orders Page ============================= */

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ================= ROLE FLAGS ================= */
  const role = user?.role;

  const isProduction = role === ROLES.PRODUCTION;
  const isPacking = role === ROLES.PACKING;
  const isSalesman = role === ROLES.SALESMAN;
  const isSupervisor = role === ROLES.SUPERVISOR;
  const isAccounts = role === ROLES.ACCOUNTS;
  const isDelivery = role === ROLES.DELIVERY;
  const isManager = role === ROLES.MANAGER;
  const isAdmin = role === ROLES.ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const canCreateOrder = useMemo(() => {
    return (
      isSuperAdmin ||
      isAdmin ||
      isManager ||
      isSalesman
    );
  }, [user?.role]);

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

  /* ================= ROLE BASED DEFAULT STATUS ================= */
  useEffect(() => {
    if (isProduction) {
      setSelectedStatus("PRODUCTION");
    } else if (isPacking) {
      setSelectedStatus("PACKED");
    } else if (isDelivery) {
      setSelectedStatus("SHIPPED");
    }
  }, [isProduction, isPacking, isDelivery]);

  /* ================= API PARAMS (MEMOIZED) ================= */
  const queryParams = useMemo(() => {
    return {
      page: pagination.page,
      limit: pagination.limit,
      status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
      search: searchQuery || undefined,
    };
  }, [
    pagination.page,
    pagination.limit,
    selectedStatus,
    selectedPriority,
    searchQuery,
  ]);

  /* ================= FETCH ORDERS ================= */
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
        // setLoading(false);
      }
    };

    loadOrders();
    return () => {
      isMounted = false;
    };
  }, [queryParams]);

  /* ============================= Utility Functions ============================= */

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "bg-red-50 text-red-700";
      case "MEDIUM":
        return "bg-yellow-50 text-yellow-700";
      case "LOW":
        return "bg-green-50 text-green-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700";
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700";
      case "PRODUCTION":
        return "bg-indigo-50 text-indigo-700";
      case "PACKED":
        return "bg-purple-50 text-purple-700";
      case "INVOICE":
        return "bg-cyan-50 text-cyan-700";
      case "SHIPPED":
        return "bg-orange-50 text-orange-700";
      case "DELIVERED":
        return "bg-green-50 text-green-700";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700";
      case "CANCELLED":
      case "REJECTED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "N/A";

  const getTotalItems = (details) =>
    details?.reduce((sum, item) => sum + (item.qty_ordered || 0), 0) || 0;

  /* ============================= UI States ============================= */

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  /* ============================= UI ============================= */
  return (
    <div>

      <div className="min-h-screen bg-gray-50 px-6 py-8">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Orders Overview
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track dealer orders
            </p>
          </div>

          {canCreateOrder && (
            <button
              onClick={() => navigate("/orders/create")}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              text-sm font-medium text-white
              rounded-xl
              bg-gradient-to-r from-[#9333EA] to-[#7e22ce]
              shadow-sm
              hover:shadow-md hover:opacity-95
              transition-all
            "
            >
              <FiPlus size={16} />
              Create Order
            </button>
          )}

        </div>

        {/* ================= MAIN CARD ================= */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible">

          {/* ================= FILTER SECTION ================= */}
          <div className="px-6 py-5 border-b border-gray-100">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              {/* SEARCH */}
              <div className="relative w-full lg:max-w-xl">

                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />

                <input
                  type="text"
                  placeholder="Search orders, dealers or shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    w-full
                    pl-11 pr-4 py-3
                    text-sm
                    rounded-xl
                    border border-gray-200
                    bg-white
                    placeholder:text-gray-400
                    focus:outline-none
                    focus:ring-2 focus:ring-purple-100
                    focus:border-purple-300
                    transition-all
                    shadow-sm
                  "
                />

              </div>

              {/* FILTERS */}
              <div className="flex flex-wrap items-center gap-3">

                <CustomSelect
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPagination((prev) => ({
                      ...prev,
                      page: 1,
                    }));
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

          {/* ================= TABLE ================= */}
          <div className="px-6 pb-6">

            <div className="overflow-x-auto rounded-xl border border-gray-100">

              <table className="min-w-full text-sm">

                {/* ================= TABLE HEADER ================= */}
                <thead className="
                  sticky top-0 z-10
                  bg-gray-50/90 backdrop-blur
                  border-b border-gray-200
                  text-xs uppercase tracking-wider
                  text-gray-500
                ">
                  <tr>

                    <th className="px-6 py-4 text-left font-semibold">Dealer</th>
                    <th className="px-6 py-4 text-left font-semibold">Shop</th>
                    <th className="px-6 py-4 text-left font-semibold">Created</th>
                    <th className="px-6 py-4 text-left font-semibold">Delivery</th>
                    <th className="px-6 py-4 text-left font-semibold">Items</th>
                    <th className="px-6 py-4 text-left font-semibold">Total</th>
                    <th className="px-6 py-4 text-left font-semibold">Priority</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>

                  </tr>
                </thead>

                {/* ================= TABLE BODY ================= */}
                <tbody className="divide-y divide-gray-100 bg-white">

                  {orders.map((orderData) => {

                    const { order } = orderData;
                    if (!order) return null;

                    /* ===== DELIVERY DATE CALCULATION ===== */

                    const detailDeliveryDates =
                      order.order_details
                        ?.map((d) =>
                          d.delivery_date ? new Date(d.delivery_date) : null
                        )
                        .filter(Boolean) || [];

                    const maxDetailDate =
                      detailDeliveryDates.length
                        ? new Date(Math.max(...detailDeliveryDates))
                        : null;

                    const finalDeliveryDate = order.promised_delivery_date
                      ? new Date(order.promised_delivery_date)
                      : maxDetailDate;

                    const isCompleted = order.status === "COMPLETED";

                    return (

                      <tr
                        key={order.order_number}
                        className="
                          hover:bg-gray-50
                          transition-colors duration-200
                        "
                      >

                        {/* DEALER + ORDER */}
                        <td className="px-6 py-4">

                          <div className="flex flex-col">

                            {/* Dealer Name */}
                            <span className="font-semibold text-gray-900">
                              {capitalizeFirstLetter(order.dealer?.employee_name)}
                            </span>

                            {/* Order Number */}
                            <span className="text-xs text-gray-500 font-mono mt-0.5">
                              {order.order_number}
                            </span>

                          </div>

                        </td>

                        {/* SHOP */}
                        <td className="px-6 py-4 text-gray-600">
                          {capitalizeFirstLetter(order.dealer?.shop_name)}
                        </td>

                        {/* CREATED */}
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(order.created_at)}
                        </td>

                        {/* DELIVERY */}
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {formatDate(finalDeliveryDate)}
                        </td>

                        {/* ITEMS */}
                        <td className="px-6 py-4">

                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                            {getTotalItems(order.order_details)}
                          </span>

                        </td>

                        {/* TOTAL */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            {/* Price */}
                            <span className="text-xs font-semibold text-gray-600">
                              ₹ {order.order_total_price?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </td>

                        {/* PRIORITY */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}
                          >
                            {order.priority}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">

                          <div className="flex items-center justify-end gap-2">

                            {/* VIEW */}
                            <button
                              onClick={() =>
                                navigate(`/orders/${order.order_number}`)
                              }
                              className="
                                p-2 rounded-lg
                                text-gray-500
                                hover:text-purple-600
                                hover:bg-purple-50
                                transition
                              "
                              title="View Order"
                            >
                              <FiEye size={18} />
                            </button>

                            {/* Edit Order (Hide if COMPLETED) */}
                            {/* {!isCompleted && ( */}
                            <button
                              onClick={() =>
                                navigate(`/orders/update/${order.order_number}`)
                              }
                              className="
                                  p-2 rounded-lg
                                  text-gray-500
                                  hover:text-blue-600
                                  hover:bg-blue-50
                                  transition
                                "
                              title="Edit Order"
                            >
                              <FiEdit2 size={18} />
                            </button>
                            {/* )} */}

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          </div>

          {/* ================= PAGINATION ================= */}
          <div className="border-t border-gray-100">

            <OrdersPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) =>
                setPagination((prev) => ({
                  ...prev,
                  page,
                }))
              }
            />

          </div>

        </div>

      </div>
    </div>
  );
};

export default Orders;
