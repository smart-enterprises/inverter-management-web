import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiBox,
  FiCalendar,
  FiTruck,
  FiCreditCard,
  FiDollarSign,
} from "react-icons/fi";
import { fetchOrderById } from "../api/orders";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";

/* ================= FORMAT HELPERS ================= */

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "N/A";

const formatCurrency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatNotes = (notes) =>
  notes
    ? notes
      .split("|")
      .map((n) => n.trim())
      .filter((n) =>
        /^(production|required|unpacked|delivered)/i.test(n)
      )
    : [];

/* ================= REUSABLE INFO ================= */

const Info = ({ icon, label, children }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {children || "N/A"}
      </p>
    </div>
  </div>
);

/* ========================= FINANCIAL SUMMARY ========================= */

const FinancialSummary = ({ order }) => {
  const baseTotal = Number(order?.order_total_price ?? 0);
  const discount = Number(order?.order_total_discount ?? 0);

  // If discount was already deducted from total and you want original gross:
  const grossTotal = baseTotal + discount;

  const paid = Number(order?.amount_paid ?? 0);

  // Prefer backend value if provided, otherwise calculate
  const due = Number(order?.amount_due ?? grossTotal - paid);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
          Financial Summary
        </h2>

        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Billing Overview
        </span>
      </div>

      {/* Summary Card */}
      <div className="max-w-md ml-auto bg-gray-50 border border-gray-100 rounded-xl p-6 space-y-5">

        {/* Total Price */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Price</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(grossTotal)}
          </span>
        </div>

        {/* Discount */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Discount</span>
          <span className="font-medium text-red-600">
            - {formatCurrency(discount)}
          </span>
        </div>

        {/* Paid */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount Paid</span>
          <span className="font-medium text-emerald-600">
            {formatCurrency(paid)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-5 flex justify-between text-base font-semibold">
          <span className="text-gray-900">Amount Due</span>
          <span
            className={`${due > 0 ? "text-purple-700" : "text-emerald-600"
              }`}
          >
            {formatCurrency(due)}
          </span>
        </div>

      </div>
    </section>
  );
};

/* ========================= HELPER FUNCTIONS ========================= */

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

const getPaymentStatusStyle = (status) => {
  switch (status?.toUpperCase()) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700";
    case "UNPAID":
      return "bg-red-50 text-red-700";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700";
    case "REFUNDED":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
};

const getPaymentTypeStyle = (type) => {
  switch (type?.toUpperCase()) {
    case "CASH":
      return "bg-emerald-50 text-emerald-700";
    case "BANK":
      return "bg-red-50 text-red-700";
    case "CHEQUE":
      return "bg-amber-50 text-amber-700";
    case "ONLINE":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
};

/* ========================= MAIN COMPONENT ========================= */

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= FETCH USERS FOR created_by ================= */

  const fetchUsersForCreatedByMap = useCallback(async () => {
    try {
      const response = await fetchUsers({
        page: 1,
        limit: 500,
        status: "active",
        includePassword: false,
        includeDealers: false,
      });

      if (response?.success && Array.isArray(response?.data?.employees)) {
        const mappedUsers = response.data.employees.reduce((acc, user) => {
          if (user?.employee_id) {
            acc[user.employee_id] = capitalizeFirstLetter(user.employee_name);
          }
          return acc;
        }, {});

        setUserMap(mappedUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users for mapping:", err);
    }
  }, []);

  /* ================= FETCH ORDER ================= */

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchOrderById(id);

      if (response?.success && response?.data?.order) {
        setOrder(response.data.order);
      } else {
        setError(response?.message || "Failed to load order");
      }
    } catch (err) {
      console.error("Order fetch error:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ================= EFFECT ================= */

  useEffect(() => {
    loadOrder();
    fetchUsersForCreatedByMap();
  }, [loadOrder, fetchUsersForCreatedByMap]);

  /* ================= DERIVED VALUES ================= */

  const totalItems = useMemo(() => {
    if (!Array.isArray(order?.order_details)) return 0;

    return order.order_details.reduce(
      (sum, item) => sum + Number(item?.qty_ordered ?? 0),
      0
    );
  }, [order]);

  /* ================= STATES ================= */

  if (loading)
    return (
      <div className="p-10 text-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-purple-600 rounded-full mx-auto" />
      </div>
    );

  if (error)
    return (
      <div className="p-10 text-center text-red-600">
        {error}
      </div>
    );

  if (!order)
    return (
      <div className="p-10 text-center">
        Order not found
      </div>
    );

  /* ================= RENDER ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ================= HEADER ================= */}
      <div className="flex items-start sm:items-center gap-4 mb-8">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          aria-label="Back to Orders"
        >
          <FiArrowLeft size={18} className="text-gray-600" />
        </button>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Order <span className="text-[#9333EA]">{order?.order_number}</span>
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Created {order?.created_at ? formatDate(order.created_at) : "—"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getPriorityStyle(order?.priority)}`}
            >
              {order?.priority || "Normal"}
            </span>

            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusStyle(order?.status)}`}
            >
              {order?.status || "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= ORDER SUMMARY ================= */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Order Summary
          </h2>

          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Overview
          </span>
        </div>

        {/* Information Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">

          <Info icon={<FiCalendar className="text-gray-400" />} label="Created">
            {formatDate(order?.created_at)}
          </Info>

          <Info icon={<FiCalendar className="text-gray-400" />} label="Updated">
            {formatDate(order?.updated_at)}
          </Info>

          <Info icon={<FiTruck className="text-gray-400" />} label="Promised Delivery">
            {formatDate(order?.promised_delivery_date)}
          </Info>

          <Info
            icon={<FiCreditCard className="text-gray-400" />}
            label="Payment Status"
          >
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getPaymentStatusStyle(order?.payment_status)}`}
            >
              {order?.payment_status || "Unknown"}
            </span>
          </Info>

          <Info
            icon={<FiCreditCard className="text-gray-400" />}
            label="Payment Type"
          >
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPaymentTypeStyle(
                order?.payment_type
              )}`}
            >
              {order?.payment_type || "Unknown"}
            </span>
          </Info>

          <Info icon={<FiCalendar className="text-gray-400" />} label="Last Payment">
            {formatDate(order?.last_payment_date)}
          </Info>

          <Info icon={<FiUser className="text-gray-400" />} label="Salesman ID">
            {userMap[order?.salesman_id] || order?.salesman_id || "—"}
          </Info>

          <Info icon={<FiUser className="text-gray-400" />} label="Created By">
            {userMap[order?.created_by] || order?.created_by || "—"}
          </Info>
        </div>

        {/* Order Note */}
        {order?.order_note && (
          <div className="mt-10 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Order Note
            </p>

            <p className="text-sm text-gray-800 mt-2 leading-relaxed">
              {order.order_note}
            </p>
          </div>
        )}

      </section>

      {/* ================= DEALER ================= */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Dealer Information
          </h2>

          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Profile
          </span>
        </div>

        {/* Dealer Info Grid */}
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6">

          <Info
            icon={<FiUser className="text-gray-400" />}
            label="Dealer Name"
          >
            <span className="font-medium text-gray-900">
              {order?.dealer?.employee_name
                ? capitalizeFirstLetter(order.dealer.employee_name)
                : "—"}
            </span>
          </Info>

          <Info
            icon={<FiBox className="text-gray-400" />}
            label="Shop Name"
          >
            <span className="font-medium text-gray-900">
              {order?.dealer?.shop_name
                ? capitalizeFirstLetter(order.dealer.shop_name)
                : "—"}
            </span>
          </Info>

          <Info
            icon={<FiMail className="text-gray-400" />}
            label="Email"
          >
            <span className="text-gray-800">
              {order?.dealer?.employee_email || "—"}
            </span>
          </Info>

          <Info
            icon={<FiPhone className="text-gray-400" />}
            label="Phone"
          >
            <span className="text-gray-800">
              {order?.dealer?.employee_phone || "—"}
            </span>
          </Info>

          <Info
            icon={<FiMapPin className="text-gray-400" />}
            label="Address"
          >
            <span className="text-gray-800 leading-relaxed">
              {order?.dealer?.address
                ? capitalizeFirstLetter(order.dealer.address)
                : "—"}
            </span>
          </Info>

        </div>

      </section>

      {/* ================= ORDER ITEMS ================= */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Order Items
          </h2>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            {totalItems} {totalItems === 1 ? "Item" : "Items"}
          </span>
        </div>

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">

            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-center">Qty</th>
                <th className="px-6 py-3 text-right">Unit</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {order.order_details?.map((d) => (
                <tr
                  key={d.order_details_number}
                  className="hover:bg-gray-50 transition-colors"
                >

                  {/* Product Info */}
                  <td className="px-6 py-5 align-top">

                    <div className="font-semibold text-gray-900">
                      {capitalizeFirstLetter(d.product_name)}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {capitalizeFirstLetter(d.product_brand)} • {capitalizeFirstLetter(d.product_model)}
                    </div>

                    {/* Badges */}
                    <div className="mt-3 flex flex-wrap gap-2">

                      {d.is_free && (
                        <span className="px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                          Free Item
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 text-xs rounded-full font-medium ${d.is_free
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {d.is_free ? "Product Scheme" : "Regular Product"}
                      </span>

                    </div>

                    {/* Notes */}
                    {d.notes && formatNotes(d.notes).length > 0 && (
                      <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Notes
                        </p>

                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {formatNotes(d.notes).map((note, idx) => (
                            <li key={idx}>
                              {note.replace(
                                /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/,
                                (match) => formatDate(match)
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </td>

                  {/* Qty */}
                  <td className="px-6 py-5 text-center font-medium text-gray-800">
                    {d.qty_ordered}
                  </td>

                  {/* Unit Price */}
                  <td className="px-6 py-5 text-right whitespace-nowrap text-gray-700">
                    {formatCurrency(d.unit_product_price)}
                  </td>

                  {/* Total */}
                  <td className="px-6 py-5 text-right whitespace-nowrap font-semibold text-gray-900">
                    {formatCurrency(d.total_price)}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusStyle(d?.status)}`}
                    >
                      {d?.status || "Unknown"}
                    </span>
                  </td>

                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* ================= MOBILE CARDS ================= */}
        <div className="md:hidden space-y-5">

          {order.order_details?.map((d) => (
            <div
              key={d.order_details_number}
              className="border border-gray-100 rounded-xl p-5 shadow-sm bg-white"
            >

              {/* Top Row */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-gray-400">
                  {d.order_details_number}
                </span>

                <span
                  className={`px-2.5 py-1 text-xs rounded-full font-medium ${d.is_free
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {d.is_free ? "Product Scheme" : "Regular Product"}
                </span>
              </div>

              {/* Product Name */}
              <div className="font-semibold text-gray-900 mb-2">
                {capitalizeFirstLetter(d.product_name)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">

                <div>
                  <p className="text-gray-500">Qty</p>
                  <p className="font-medium text-gray-900">
                    {d.qty_ordered}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(d.total_price)}
                  </p>
                </div>

              </div>

            </div>
          ))}

        </div>

      </section>

      {/* ================= DELIVERY NOTES ================= */}
      {order?.delivery_notes && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Delivery Notes
            </h2>

            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Additional Info
            </span>
          </div>

          {/* Content */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {capitalizeFirstLetter(order.delivery_notes)}
            </p>
          </div>

        </section>
      )}

      {/* ================= FINANCIAL SUMMARY ================= */}
      <FinancialSummary order={order} />

      {/* ================= PAYMENT NOTES ================= */}
      {order?.payment_notes?.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Payment Notes
            </h2>

            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Transaction History
            </span>
          </div>

          {/* Notes List */}
          <ul className="space-y-3">
            {order.payment_notes.map((note, index) => (
              <li
                key={index}
                className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-800 leading-relaxed hover:bg-gray-100/60 transition-colors"
              >
                {capitalizeFirstLetter(note)}
              </li>
            ))}
          </ul>

        </section>
      )}
    </div>
  );
};

export default OrderDetails;