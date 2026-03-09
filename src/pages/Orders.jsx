import React, { useState, useEffect } from "react";
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
import { ORDER_STATUS_LIST, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";

/* ============================= Pagination Component ============================= */

const OrdersPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="flex justify-end mt-6">

      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-sm">

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <span className="px-2 text-gray-400 select-none">
                    ...
                  </span>
                )}

                <button
                  onClick={() => onPageChange(page)}
                  className={`min-w-[36px] h-9 px-3 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 ${page === currentPage
                    ? "bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow-md scale-[1.05]"
                    : "text-gray-600 hover:bg-gray-100 hover:scale-[1.03]"
                    }`}
                >
                  {page}
                </button>

              </div>
            );
          })}

        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={18} />
        </button>

      </div>

    </div>
  );
};

/* ============================= Orders Page ============================= */

const Orders = () => {
  const navigate = useNavigate();

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

  /* ============================= Fetch Orders (Backend Pagination) ============================= */

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);

        const response = await fetchOrders({
          page: pagination.page,
          limit: pagination.limit,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
          search: searchQuery || undefined,
        });

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
      }
    };

    loadOrders();
  }, [
    pagination.limit,
    pagination.page,
    searchQuery,
    selectedPriority,
    selectedStatus,
  ]);

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
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">

      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Orders Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track dealer orders
          </p>
        </div>

        <button
          onClick={() => navigate("/orders/create")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white text-sm font-medium shadow hover:opacity-90 transition"
        >
          <FiPlus size={16} />
          Create Order
        </button>

      </div>


      {/* ================= CARD ================= */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* ================= FILTERS ================= */}
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

          <div className="flex gap-4 flex-1">

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* Status */}
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
              options={ORDER_STATUS_LIST}
            />

            {/* Priority */}
            <CustomSelect
              name="priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
            />

          </div>

        </div>


        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            {/* TABLE HEADER */}
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>

                <th className="px-6 py-4 text-left font-medium">Order</th>
                <th className="px-6 py-4 text-left font-medium">Dealer</th>
                <th className="px-6 py-4 text-left font-medium">Shop</th>
                <th className="px-6 py-4 text-left font-medium">Created</th>
                <th className="px-6 py-4 text-left font-medium">Delivery</th>
                <th className="px-6 py-4 text-left font-medium">Items</th>
                <th className="px-6 py-4 text-left font-medium">Total</th>
                <th className="px-6 py-4 text-left font-medium">Priority</th>
                <th className="px-6 py-4 text-left font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>

              </tr>
            </thead>


            {/* TABLE BODY */}
            <tbody className="divide-y divide-gray-100">

              {orders.map((orderData) => {

                const order = orderData.order;
                if (!order) return null;

                const detailDeliveryDates =
                  order.order_details
                    ?.map((d) =>
                      d.delivery_date ? new Date(d.delivery_date) : null
                    )
                    .filter(Boolean) || [];

                const maxDetailDate =
                  detailDeliveryDates.length > 0
                    ? new Date(Math.max(...detailDeliveryDates))
                    : null;

                const finalDeliveryDate = order.promised_delivery_date
                  ? new Date(order.promised_delivery_date)
                  : maxDetailDate;

                return (

                  <tr
                    key={order.order_number}
                    className="hover:bg-gray-50 transition"
                  >

                    {/* ORDER NUMBER */}
                    <td className="px-6 py-4 font-mono text-gray-800">
                      {order.order_number}
                    </td>

                    {/* DEALER */}
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {capitalizeFirstLetter(order.dealer?.employee_name)}
                    </td>

                    {/* SHOP */}
                    <td className="px-6 py-4 text-gray-600">
                      {capitalizeFirstLetter(order.dealer?.shop_name)}
                    </td>

                    {/* CREATED */}
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(order.created_at)}
                    </td>

                    {/* DELIVERY */}
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(finalDeliveryDate)}
                    </td>

                    {/* ITEMS */}
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {getTotalItems(order.order_details)}
                    </td>

                    {/* TOTAL */}
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ₹ {order.order_total_price?.toLocaleString("en-IN")}
                    </td>

                    {/* PRIORITY */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityStyle(
                          order.priority
                        )}`}
                      >
                        {order.priority}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">

                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() =>
                            navigate(`/orders/${order.order_number}`)
                          }
                          className="p-2 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition"
                        >
                          <FiEye size={18} />
                        </button>

                        <button
                          onClick={() =>
                            navigate(`/orders/update/${order.order_number}`)
                          }
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <FiEdit2 size={18} />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>


        {/* ================= Pagination ================= */}
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
  );
};

export default Orders;
