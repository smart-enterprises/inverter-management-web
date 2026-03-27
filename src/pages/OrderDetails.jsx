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
  FiEdit2,
  FiSave,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiShoppingCart,
  FiPackage,
  FiAlertCircle,
  FiTrendingUp,
  FiActivity,
  FiChevronRight,
  FiZap,
} from "react-icons/fi";
import Swal from "sweetalert2";
import CustomSelect from "../components/CustomSelect";
import { fetchOrderById, updateOrderStatus } from "../api/orders";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";
import { formatDealerDiscountNotes, formatStockNotes } from "../utils/notesUtils";
import {
  getStatusStyle,
  ORDER_STATUS_LIST,
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
} from "../utils/status";
import { useUpdateOrderPermissions } from "../hooks/useUpdateOrderPermissions";
import { formatDateForInput } from "../utils/dateUtils";
import { getAllowedNextStatuses } from "../utils/orderStatusHelper";

/* ================================================================
   FORMAT HELPERS
   ================================================================ */

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

/* ================================================================
   NORMALIZE ORDER
   ================================================================ */

const normalizeOrder = (order) => ({
  ...order,
  payment_method: order.payment_type || "",
  amount_paid: 0,
  delivered_date: order.delivered_date || "",
  delivery_note: order.delivery_note || "",
  order_details: order.order_details.map((detail) => ({
    ...detail,
    delivered_qty: "",
    cancel_qty: "",
    delivery_note: "",
    reason_for_cancellation: "",
    has_unPacked_completed: false,
    has_production_completed: false,
  })),
});

/* ================================================================
   REUSABLE — INFO DISPLAY BLOCK
   ================================================================ */

const Info = ({ icon, label, children }) => (
  <div className="group flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
    <div className="mt-0.5 p-2.5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl text-violet-500 shadow-sm group-hover:shadow-md group-hover:border-violet-200 transition-all duration-200">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
        {label}
      </p>
      <div className="text-sm font-semibold text-gray-800 leading-relaxed">
        {children || <span className="text-gray-300 font-normal">—</span>}
      </div>
    </div>
  </div>
);

/* ================================================================
   REUSABLE — NOTES CARD
   ================================================================ */

const NotesCard = ({ title, notes, color }) => {
  const colorStyles =
    color === "purple"
      ? "bg-violet-50/60 border-violet-100 text-violet-600"
      : "bg-slate-50 border-slate-100 text-slate-500";

  return (
    <div className={`mt-4 border rounded-xl p-4 ${colorStyles}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">
        {title}
      </p>
      <ul className="space-y-1.5 text-sm text-gray-700">
        {notes.map((note, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
            {note.replace(
              /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/,
              (match) => formatDate(match)
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ================================================================
   REUSABLE — FORM FIELD WRAPPERS
   ================================================================ */

const FormField = ({ label, children }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </label>
    {children}
  </div>
);

const FormFieldSecondary = ({ label, children }) => (
  <div className="space-y-2">
    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </label>
    {children}
  </div>
);

const CheckboxField = ({ label, checked, onChange, disabled }) => (
  <label
    className={`group flex items-center gap-3 text-sm cursor-pointer px-4 py-2.5 rounded-xl border transition-all duration-200 ${checked
      ? "bg-violet-50 border-violet-200 text-violet-700"
      : "bg-white border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="accent-violet-600 w-4 h-4"
    />
    <span className="font-medium">{label}</span>
    {checked && <FiCheckCircle size={14} className="ml-auto text-violet-500" />}
  </label>
);

/* ================================================================
   HELPER — STATUS / PRIORITY STYLES
   ================================================================ */

const getPriorityStyle = (priority) => {
  switch (priority?.toUpperCase()) {
    case "HIGH":
      return "bg-red-50 text-red-700 border border-red-100 ring-1 ring-red-200/50";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 border border-amber-100 ring-1 ring-amber-200/50";
    case "LOW":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100 ring-1 ring-emerald-200/50";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};

const getOrderStatusStyle = (status) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700 border border-blue-100";
    case "PRODUCTION":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "PACKED":
      return "bg-violet-50 text-violet-700 border border-violet-100";
    case "INVOICE":
      return "bg-cyan-50 text-cyan-700 border border-cyan-100";
    case "SHIPPED":
      return "bg-orange-50 text-orange-700 border border-orange-100";
    case "DELIVERED":
      return "bg-green-50 text-green-700 border border-green-100";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};

const getPaymentStatusStyle = (status) => {
  switch (status?.toUpperCase()) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "UNPAID":
      return "bg-red-50 text-red-700 border border-red-100";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "REFUNDED":
      return "bg-blue-50 text-blue-700 border border-blue-100";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};

const getPaymentTypeStyle = (type) => {
  switch (type?.toUpperCase()) {
    case "CASH":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "BANK":
      return "bg-blue-50 text-blue-700 border border-blue-100";
    case "CHEQUE":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "ONLINE":
      return "bg-violet-50 text-violet-700 border border-violet-100";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
};

/* ================================================================
   STAT PILL — compact stat display used in quick stats rows
   ================================================================ */

const StatPill = ({ label, value, color = "gray" }) => {
  const colorMap = {
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <div className={`flex-1 px-4 py-3 border-r last:border-0 border-gray-100`}>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums ${colorMap[color].split(" ").slice(1).join(" ")}`}>
        {value}
      </p>
    </div>
  );
};

/* ================================================================
   FINANCIAL SUMMARY SECTION (Read-only billing overview)
   ================================================================ */

const FinancialSummary = ({ order }) => {
  const totalAmount = Number(order?.order_total_price ?? 0);
  const discountAmount = Number(order?.order_total_discount ?? 0);
  const grossAmount = totalAmount + discountAmount;
  const netPayable = totalAmount;
  const amountReceived = Number(order?.amount_paid ?? 0);
  const outstandingBalance = Number(
    order?.amount_due ?? netPayable - amountReceived
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Financial Summary
          </h2>
          <p className="mt-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Billing Overview
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full shadow-sm ${order.payment_status === "PAID"
            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            : order.payment_status === "PARTIAL"
              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
              : "bg-red-100 text-red-700 ring-1 ring-red-200"
            }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${order.payment_status === "PAID"
              ? "bg-emerald-500"
              : order.payment_status === "PARTIAL"
                ? "bg-amber-500"
                : "bg-red-500"
              }`}
          />
          {order.payment_status}
        </span>
      </div>

      <div className="p-8">
        <div className="max-w-md ml-auto">
          <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-7 py-6 space-y-4">
              {/* Gross Amount */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Gross Amount</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(grossAmount)}
                </span>
              </div>

              {/* Discount */}
              {discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Discount Applied</span>
                  <span className="text-sm font-bold text-rose-600">
                    − {formatCurrency(discountAmount)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 border-dashed" />

              {/* Net Payable */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">
                  Net Payable
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(netPayable)}
                </span>
              </div>

              {/* Amount Received */}
              {amountReceived > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount Received</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(amountReceived)}
                  </span>
                </div>
              )}

              {/* Outstanding Balance */}
              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">
                  Outstanding Balance
                </span>
                <span
                  className={`text-2xl font-black tracking-tight ${outstandingBalance > 0
                    ? "text-violet-700"
                    : "text-emerald-600"
                    }`}
                >
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ================================================================
   UPDATE FINANCIAL SUMMARY PANEL (edit mode)
   ================================================================ */

const UpdateFinancialSummary = ({ order, amountPaid }) => (
  <section className="bg-white border border-violet-100 rounded-2xl shadow-sm overflow-hidden">
    <div className="flex justify-end p-8">
      <div className="w-full sm:w-[440px] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-violet-50/60 to-white">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
            Order Financial Summary
          </h3>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${order.payment_status === "PAID"
              ? "bg-emerald-100 text-emerald-700"
              : order.payment_status === "PARTIAL"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
              }`}
          >
            {order.payment_status}
          </span>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Total Order Value</span>
            <span className="text-gray-900 font-bold">
              ₹ {order.order_total_price?.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Amount Paid</span>
            <span className="text-emerald-600 font-bold">
              ₹ {amountPaid?.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="border-t border-gray-200 border-dashed" />

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-gray-800">Balance Amount</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-base font-semibold">₹</span>
              <span className="text-2xl font-black text-violet-700 tracking-tight">
                {order.amount_due?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ================================================================
   SECTION WRAPPER — consistent card layout
   ================================================================ */

const SectionCard = ({ title, subtitle, action, children, className = "", editHighlight = false }) => (
  <section
    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${editHighlight
      ? "border-violet-200 ring-1 ring-violet-100"
      : "border-gray-100"
      } ${className}`}
  >
    {(title || action) && (
      <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    )}
    <div className="p-8">{children}</div>
  </section>
);

/* ================================================================
   MAIN COMPONENT — OrderDetails
   ================================================================ */

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const permissions = useUpdateOrderPermissions();

  /* ---- DERIVED LOCK FLAGS ---- */
  const isCompleted = editOrder?.status === "COMPLETED";
  const isDelivered = editOrder?.status === "DELIVERED";
  const isCancelled = editOrder?.status === "CANCELLED";
  const isOrderLocked = isCompleted || isDelivered || isCancelled;

  const isPaymentFullyDone =
    Number(editOrder?.order_total_price || 0) === Number(amountPaid || 0);

  const isOrderDeliveryDateChanged =
    !!editOrder?.promised_delivery_date &&
    !!originalOrder &&
    editOrder.promised_delivery_date !== originalOrder.promised_delivery_date;

  /* ---- FETCH USERS ---- */
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

  /* ---- FETCH ORDER ---- */
  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchOrderById(id);
      if (response?.success && response?.data?.order) {
        const fetched = response.data.order;
        setOrder(fetched);
        setAmountPaid(fetched?.amount_paid ?? 0);
        const normalized = normalizeOrder(fetched);
        setEditOrder(normalized);
        setOriginalOrder(normalized);
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

  useEffect(() => {
    loadOrder();
    fetchUsersForCreatedByMap();
  }, [loadOrder, fetchUsersForCreatedByMap]);

  const totalItems = useMemo(() => {
    if (!Array.isArray(order?.order_details)) return 0;
    return order.order_details.reduce(
      (sum, item) => sum + Number(item?.total_qty_ordered ?? 0),
      0
    );
  }, [order]);

  /* ---- FIELD HANDLERS ---- */
  const updateOrderField = (field, value) => {
    setEditOrder((prev) => ({ ...prev, [field]: value }));
  };

  const updateDetailField = (index, field, value) => {
    setEditOrder((prev) => {
      const updated = [...prev.order_details];
      const current = updated[index];
      const updatedDetail = { ...current, [field]: value, __isModified: true };
      if (field === "has_unPacked_completed" && value) {
        updatedDetail.has_production_completed = false;
      }
      if (field === "has_production_completed" && value) {
        updatedDetail.has_unPacked_completed = false;
      }
      updated[index] = updatedDetail;
      return { ...prev, order_details: updated };
    });
  };

  const handleDiscardEdit = () => {
    if (order) setEditOrder(normalizeOrder(order));
    setIsEditMode(false);
  };

  /* ---- SMART PAYLOAD BUILDER ---- */
  const buildPayload = useMemo(() => {
    if (!editOrder || !originalOrder) return null;
    const payload = { order_number: editOrder.order_number };
    const simpleFields = ["status", "priority", "payment_method"];
    simpleFields.forEach((field) => {
      if (editOrder[field] !== originalOrder[field]) {
        payload[field] = editOrder[field];
      }
    });
    if (Number(editOrder.amount_paid) > 0) {
      payload.amount_paid = Number(editOrder.amount_paid);
    }
    const isDateChanged =
      editOrder.promised_delivery_date &&
      editOrder.promised_delivery_date !== originalOrder.promised_delivery_date;
    if (isDateChanged) {
      payload.delivery_date = new Date(editOrder.promised_delivery_date).toISOString();
    }
    if (isDateChanged && editOrder.delivery_note?.trim()) {
      payload.delivery_note = editOrder.delivery_note.trim();
    }
    const updatedDetails = editOrder.order_details
      .map((detail, index) => {
        const originalDetail = originalOrder.order_details[index];
        const item = { order_details_number: detail.order_details_number };
        let hasChanges = false;
        const assignIfChanged = (key, current, previous) => {
          if (current !== previous) {
            item[key] = current;
            hasChanges = true;
          }
        };
        assignIfChanged("status", detail.status, originalDetail.status);
        const deliveredQty = Number(detail.delivered_qty);
        const originalDeliveredQty = Number(originalDetail.qty_delivered || 0);
        const hasQtyChanged = deliveredQty > 0 && deliveredQty !== originalDeliveredQty;
        const hasDateChanged =
          detail.delivery_date &&
          detail.delivery_date !== originalDetail.delivery_date;
        if (hasQtyChanged) { item.delivered_qty = deliveredQty; hasChanges = true; }
        if (hasQtyChanged || hasDateChanged) {
          item.delivered_date = new Date(detail.delivery_date).toISOString();
          hasChanges = true;
        }
        if (hasDateChanged && detail.delivery_note?.trim()) {
          item.delivery_note = detail.delivery_note.trim();
          hasChanges = true;
        }
        const cancelQty = Number(detail.cancel_qty);
        const originalCancelQty = Number(originalDetail.total_cancelled_qty || 0);
        const hasCancelChanged = cancelQty > 0 && cancelQty !== originalCancelQty;
        if (hasCancelChanged) { item.cancel_qty = cancelQty; hasChanges = true; }
        if (hasCancelChanged && detail.reason_for_cancellation?.trim()) {
          item.reason_for_cancellation = detail.reason_for_cancellation.trim();
          hasChanges = true;
        }
        assignIfChanged("has_unPacked_completed", detail.has_unPacked_completed, originalDetail.has_unPacked_completed);
        assignIfChanged("has_production_completed", detail.has_production_completed, originalDetail.has_production_completed);
        return hasChanges ? item : null;
      })
      .filter(Boolean);
    if (updatedDetails.length > 0) payload.order_details = updatedDetails;
    return payload;
  }, [editOrder, originalOrder]);

  /* ---- SUBMIT ---- */
  const handleSubmit = async () => {
    if (!buildPayload) return;
    if (
      !buildPayload.status &&
      !buildPayload.priority &&
      !buildPayload.delivery_date &&
      !buildPayload.amount_paid &&
      !buildPayload.payment_method &&
      !buildPayload.order_details
    ) {
      return Swal.fire({ icon: "info", title: "No Changes Detected" });
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(editOrder.order_number, buildPayload);
      if (res?.success) {
        await Swal.fire({ icon: "success", title: "Order Updated Successfully" });
        await loadOrder();
        setIsEditMode(false);
      } else {
        setError(res?.message || "Update failed");
      }
    } catch {
      setError("Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- UI STATES ---- */
  if (loading)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-100 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading order details…</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <FiAlertCircle size={28} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-red-600">{error}</p>
      </div>
    );

  if (!order)
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-gray-400">Order not found</p>
      </div>
    );

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-screen-xl mx-auto">

      {/* ================================================================
          HEADER
          ================================================================ */}
      <div className="flex items-start sm:items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm group"
          aria-label="Back to Orders"
        >
          <FiArrowLeft size={17} className="text-gray-500 group-hover:text-gray-700 transition-colors" />
        </button>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Order{" "}
                <span className="text-violet-600">{order?.order_number}</span>
              </h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${getPriorityStyle(order?.priority)}`}>
                {order?.priority || "Normal"}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${getOrderStatusStyle(order?.status)}`}>
                {order?.status || "Unknown"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Created {order?.created_at ? formatDate(order.created_at) : "—"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isEditMode ? (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                disabled={isOrderLocked && isPaymentFullyDone}
                title={
                  isOrderLocked && isPaymentFullyDone
                    ? "Completed or Delivered orders cannot be edited"
                    : "Edit this order"
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
              >
                <FiEdit2 size={14} />
                Edit Order
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
                >
                  <FiSave size={14} />
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardEdit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all duration-200 shadow-sm"
                >
                  <FiX size={14} />
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-violet-50 border border-violet-200 rounded-2xl text-violet-700 text-sm font-semibold shadow-sm">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <FiZap size={13} className="text-violet-600" />
          </div>
          You're in{" "}
          <strong className="font-black">Edit Mode</strong>. Make your changes
          and click <strong className="font-black">Save Changes</strong> to apply.
        </div>
      )}

      {/* ================================================================
          ORDER SUMMARY
          ================================================================ */}
      <SectionCard title="Order Summary" subtitle="Overview">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
          <Info icon={<FiCalendar size={15} />} label="Created">
            {formatDate(order?.created_at)}
          </Info>
          <Info icon={<FiCalendar size={15} />} label="Updated">
            {formatDate(order?.updated_at)}
          </Info>
          <Info icon={<FiTruck size={15} />} label="Promised Delivery">
            {formatDate(order?.promised_delivery_date)}
          </Info>
          <Info icon={<FiCreditCard size={15} />} label="Payment Status">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getPaymentStatusStyle(order?.payment_status)}`}>
              {order?.payment_status || "Unknown"}
            </span>
          </Info>
          <Info icon={<FiCreditCard size={15} />} label="Payment Type">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getPaymentTypeStyle(order?.payment_type)}`}>
              {order?.payment_type || "Unknown"}
            </span>
          </Info>
          <Info icon={<FiCalendar size={15} />} label="Last Payment">
            {formatDate(order?.last_payment_date)}
          </Info>
          <Info icon={<FiUser size={15} />} label="Salesman">
            <div className="flex flex-col">
              <span>{userMap[order?.salesman_id] || "Unknown"}</span>
              {order?.salesman_id && (
                <span className="text-[10px] text-gray-400 font-mono font-normal">
                  {order?.salesman_id}
                </span>
              )}
            </div>
          </Info>
          <Info icon={<FiUser size={15} />} label="Created By">
            <div className="flex flex-col">
              <span>{userMap[order?.created_by] || "Unknown"}</span>
              {order?.created_by && (
                <span className="text-[10px] text-gray-400 font-mono font-normal">
                  {order?.created_by}
                </span>
              )}
            </div>
          </Info>
        </div>

        {order?.order_note && (
          <div className="mt-6 mx-4 pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Order Note
            </p>
            <p className="text-sm text-gray-700 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
              {order.order_note}
            </p>
          </div>
        )}
      </SectionCard>

      {/* ================================================================
          EDIT MODE — ORDER-LEVEL FIELDS PANEL
          ================================================================ */}
      {isEditMode && editOrder && (
        <section className="bg-white border border-violet-200 rounded-2xl shadow-sm ring-1 ring-violet-100 overflow-hidden">
          <div className="px-8 py-5 border-b border-violet-100 bg-gradient-to-r from-violet-50/60 to-white flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">
                Editing Order
              </p>
              <p className="text-base font-black text-gray-900 font-mono tracking-wide">
                {editOrder.order_number}
              </p>
            </div>
            <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg font-bold">
              ✏ Edit Mode Active
            </span>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              <FormFieldSecondary label="Order Status">
                <CustomSelect
                  value={editOrder.status}
                  disabled={
                    isOrderLocked ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes("status"))
                  }
                  onChange={(e) => {
                    if (permissions.restrictStatusToDelivered) {
                      if (e.target.value !== "DELIVERED") return;
                    }
                    updateOrderField("status", e.target.value);
                  }}
                  options={
                    permissions.restrictStatusToDelivered
                      ? ["DELIVERED"]
                      : getAllowedNextStatuses(editOrder.status)
                  }
                />
              </FormFieldSecondary>

              <FormFieldSecondary label="Priority">
                <CustomSelect
                  value={editOrder.priority}
                  disabled={
                    isOrderLocked ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes("priority"))
                  }
                  onChange={(e) => updateOrderField("priority", e.target.value)}
                  options={PRIORITY_OPTIONS}
                />
              </FormFieldSecondary>

              <FormFieldSecondary label="Payment Method">
                <CustomSelect
                  value={editOrder.payment_method}
                  disabled={
                    isPaymentFullyDone ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes("payment_method"))
                  }
                  onChange={(e) => updateOrderField("payment_method", e.target.value)}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </FormFieldSecondary>

              <FormFieldSecondary label="Amount Paid">
                <input
                  type="number"
                  disabled={
                    isPaymentFullyDone ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes("amount_paid"))
                  }
                  min={0}
                  max={Number(editOrder?.order_total_price || 0) - amountPaid}
                  value={editOrder.amount_paid === 0 ? "" : editOrder.amount_paid}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : Number(e.target.value);
                    if (value <= Number(editOrder?.order_total_price || 0) - amountPaid) {
                      updateOrderField("amount_paid", value);
                    }
                  }}
                  className="form-input"
                  placeholder="Enter paid amount"
                />
              </FormFieldSecondary>

              <FormFieldSecondary label="Delivered Date">
                <input
                  type="datetime-local"
                  value={formatDateForInput(editOrder.promised_delivery_date)}
                  disabled={
                    isOrderLocked ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes("promised_delivery_date"))
                  }
                  onChange={(e) => updateOrderField("promised_delivery_date", e.target.value)}
                  className="form-input"
                />
              </FormFieldSecondary>

              {isOrderDeliveryDateChanged && (
                <FormFieldSecondary label="Delivery Note">
                  <input
                    type="text"
                    disabled={
                      isOrderLocked ||
                      (!permissions.canEditAll && !permissions.editableFields?.includes("delivery_note"))
                    }
                    onChange={(e) => updateOrderField("delivery_note", e.target.value)}
                    className="form-input"
                    placeholder="Enter reason for delivery update"
                  />
                </FormFieldSecondary>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          DEALER INFORMATION
          ================================================================ */}
      <SectionCard title="Dealer Information" subtitle="Profile">
        <div className="grid sm:grid-cols-2 gap-1">
          <Info icon={<FiUser size={15} />} label="Dealer Name">
            {order?.dealer?.employee_name
              ? capitalizeFirstLetter(order.dealer.employee_name)
              : null}
          </Info>
          <Info icon={<FiBox size={15} />} label="Shop Name">
            {order?.dealer?.shop_name
              ? capitalizeFirstLetter(order.dealer.shop_name)
              : null}
          </Info>
          <Info icon={<FiMail size={15} />} label="Email">
            {order?.dealer?.employee_email}
          </Info>
          <Info icon={<FiPhone size={15} />} label="Phone">
            {order?.dealer?.employee_phone}
          </Info>
          <Info icon={<FiMapPin size={15} />} label="Address">
            {order?.dealer?.address
              ? capitalizeFirstLetter(order.dealer.address)
              : null}
          </Info>
        </div>
      </SectionCard>

      {/* ================================================================
          ORDER ITEMS
          ================================================================ */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Order Items
            </h2>
            <p className="mt-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Products
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FiPackage size={11} />
            {totalItems} {totalItems === 1 ? "Unit" : "Units"}
          </span>
        </div>

        {/* ---- DESKTOP TABLE ---- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-8 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Product
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Quantity
                </th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Unit Price
                </th>
                <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Total
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Status
                </th>
                {isEditMode && (
                  <th className="px-6 py-3.5 text-center text-[10px] font-bold uppercase tracking-widest text-violet-400 w-8">
                    Edit
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {order.order_details?.map((d, index) => {
                const stockNotes = formatStockNotes(d.notes);
                const discountNotes = formatDealerDiscountNotes(d.notes);
                const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
                const delivered = Number(d.qty_delivered ?? 0);
                const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
                const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
                const hasDiscount =
                  !d.is_free && d.total_dealer_discount && d.total_dealer_discount > 0;
                const editDetail = editOrder?.order_details?.[index];
                const isLocked =
                  d.status === "COMPLETED" ||
                  d.status === "DELIVERED" ||
                  d.status === "CANCELLED";
                const maxDeliverableQty = balanceQty;
                const maxCancelableQty = balanceQty;
                const isDeliveryDateChanged =
                  editDetail?.delivery_date &&
                  originalOrder?.order_details?.[index] &&
                  editDetail.delivery_date !== originalOrder.order_details[index].delivery_date;
                const isCancelQtyChanged = Number(editDetail?.cancel_qty || 0) >= 1;
                const { hasUnpacked, hasProduction } = d.stock_flags || {};
                const showCompletion = isEditMode && !isLocked && (hasUnpacked || hasProduction);
                const progressPct =
                  totalOrdered > 0
                    ? Math.min(((delivered + cancelled) / totalOrdered) * 100, 100)
                    : 0;

                return (
                  <React.Fragment key={d.order_details_number}>
                    <tr className="hover:bg-gray-50/60 transition-colors duration-150">
                      {/* Product */}
                      <td className="px-8 py-6 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">
                              {capitalizeFirstLetter(d.product_name)}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                              {d.product_id}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 font-medium">
                            {capitalizeFirstLetter(d.product_brand)} •{" "}
                            {capitalizeFirstLetter(d.product_model)}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {d.is_free && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                Free Item
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${d.is_free ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                              {d.is_free ? "Product Scheme" : "Regular Product"}
                            </span>
                          </div>
                          {stockNotes?.length > 0 && (
                            <NotesCard title="Stock Notes" color="gray" notes={stockNotes} />
                          )}
                          {discountNotes?.length > 0 && (
                            <NotesCard title="Dealer Discount Notes" color="purple" notes={discountNotes} />
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-6 align-middle">
                        <div className="min-w-[200px] bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Ordered</p>
                              <p className="text-lg font-black text-gray-900 mt-0.5 tabular-nums">{totalOrdered}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Balance</p>
                              <p className={`text-lg font-black mt-0.5 tabular-nums ${balanceQty === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                {balanceQty}
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${balanceQty === 0 ? "bg-emerald-500" : "bg-violet-500"}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Delivered</p>
                              <p className="text-sm font-bold text-emerald-600 tabular-nums">{delivered}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Cancelled</p>
                              <p className="text-sm font-bold text-rose-600 tabular-nums">{cancelled}</p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-6 text-right whitespace-nowrap align-middle">
                        <span className="text-sm font-bold text-gray-700">
                          {formatCurrency(d.unit_product_price)}
                        </span>
                      </td>

                      {/* Total Price */}
                      <td className="px-6 py-6 text-right whitespace-nowrap align-middle">
                        {d.is_free ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            FREE
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {hasDiscount && Number(d.total_product_price) > 0 && (
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                {formatCurrency(d.total_product_price)}
                              </span>
                            )}
                            {Number(d.total_price) > 0 && (
                              <span className="text-sm font-black text-gray-900 tabular-nums">
                                {formatCurrency(d.total_price)}
                              </span>
                            )}
                            {hasDiscount && Number(d.total_dealer_discount) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                − {formatCurrency(d.total_dealer_discount)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-6 text-center align-middle">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold capitalize ${getOrderStatusStyle(d?.status)}`}>
                          {d?.status || "Unknown"}
                        </span>
                      </td>

                      {isEditMode && <td />}
                    </tr>

                    {/* ---- INLINE EDIT ROW ---- */}
                    {isEditMode && editDetail && (
                      <tr className="bg-violet-50/30">
                        <td colSpan={6} className="px-8 py-6 border-t border-violet-100">
                          <div className="space-y-5">
                            {/* Quick Stats */}
                            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="flex divide-x divide-gray-100">
                                <StatPill label="Total Ordered" value={totalOrdered} color="gray" />
                                <StatPill label="Delivered" value={delivered} color="emerald" />
                                <StatPill label="Cancelled" value={cancelled} color="rose" />
                                <StatPill label="Balance" value={balanceQty} color="amber" />
                              </div>
                              <div className="px-5 pb-4 pt-1">
                                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Editable Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                              <FormField label="Status">
                                <CustomSelect
                                  value={editDetail.status}
                                  disabled={
                                    isLocked ||
                                    (!permissions.canEditAll && !permissions.editableFields?.includes("status"))
                                  }
                                  onChange={(e) => updateDetailField(index, "status", e.target.value)}
                                  options={getAllowedNextStatuses(editDetail.status)}
                                />
                              </FormField>

                              <FormField label="Delivery Date">
                                <input
                                  type="datetime-local"
                                  value={formatDateForInput(editDetail.delivery_date)}
                                  disabled={
                                    isLocked ||
                                    (!permissions.canEditAll && !permissions.editableFields?.includes("delivery_date"))
                                  }
                                  onChange={(e) => updateDetailField(index, "delivery_date", e.target.value)}
                                  className="form-input"
                                />
                              </FormField>

                              {isDeliveryDateChanged && (
                                <FormField label="Delivery Note">
                                  <input
                                    type="text"
                                    value={editDetail.delivery_note || ""}
                                    disabled={
                                      isLocked ||
                                      (!permissions.canEditAll && !permissions.editableDetailFields?.includes("delivery_note"))
                                    }
                                    onChange={(e) => updateDetailField(index, "delivery_note", e.target.value)}
                                    className="form-input"
                                    placeholder="Enter reason for delivery date change"
                                  />
                                </FormField>
                              )}

                              {!isLocked && (
                                <FormField label="Delivered Quantity">
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxDeliverableQty}
                                    disabled={
                                      isLocked ||
                                      (!permissions.canEditAll && !permissions.editableDetailFields?.includes("delivered_qty"))
                                    }
                                    onChange={(e) => {
                                      const value = Number(e.target.value || 0);
                                      if (value <= maxDeliverableQty) {
                                        updateDetailField(index, "delivered_qty", value);
                                      }
                                    }}
                                    className="form-input"
                                    placeholder={`Max ${maxDeliverableQty}`}
                                  />
                                </FormField>
                              )}

                              {!isLocked && (
                                <FormField label="Cancelled Quantity">
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxCancelableQty}
                                    disabled={
                                      isOrderLocked ||
                                      (!permissions.canEditAll && !permissions.editableDetailFields?.includes("cancel_qty"))
                                    }
                                    onChange={(e) => {
                                      const value = Number(e.target.value || 0);
                                      if (value <= maxCancelableQty) {
                                        updateDetailField(index, "cancel_qty", value);
                                      }
                                    }}
                                    className="form-input"
                                    placeholder={`Max ${maxCancelableQty}`}
                                  />
                                </FormField>
                              )}

                              {isCancelQtyChanged && (
                                <FormField label="Reason for Cancellation">
                                  <textarea
                                    disabled={
                                      isOrderLocked ||
                                      (!permissions.canEditAll && !permissions.editableDetailFields?.includes("cancel_qty"))
                                    }
                                    onChange={(e) => updateDetailField(index, "reason_for_cancellation", e.target.value)}
                                    className="form-input"
                                    rows={1}
                                    placeholder="Enter reason for cancellation"
                                  />
                                </FormField>
                              )}
                            </div>

                            {/* Completion Flags */}
                            {showCompletion && (
                              <div className="border-t border-violet-100 pt-5 space-y-3">
                                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                  Completion Status
                                </p>
                                <div className="flex gap-3 flex-wrap">
                                  {hasUnpacked && (
                                    <CheckboxField
                                      label="Unpacked Completed"
                                      checked={editDetail.has_unPacked_completed}
                                      disabled={
                                        isOrderLocked ||
                                        (!permissions.canEditAll && !permissions.editableDetailFields?.includes("has_unPacked_completed"))
                                      }
                                      onChange={(e) => updateDetailField(index, "has_unPacked_completed", e.target.checked)}
                                    />
                                  )}
                                  {hasProduction && (
                                    <CheckboxField
                                      label="Production Completed"
                                      checked={editDetail.has_production_completed}
                                      disabled={
                                        isOrderLocked ||
                                        (!permissions.canEditAll && !permissions.editableDetailFields?.includes("has_production_completed"))
                                      }
                                      onChange={(e) => updateDetailField(index, "has_production_completed", e.target.checked)}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ---- MOBILE CARDS ---- */}
        <div className="md:hidden p-4 space-y-4">
          {order.order_details?.map((d, index) => {
            const editDetail = editOrder?.order_details?.[index];
            const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
            const delivered = Number(d.qty_delivered ?? 0);
            const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
            const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
            const isLocked =
              d.status === "COMPLETED" || d.status === "DELIVERED" || d.status === "CANCELLED";
            const maxDeliverableQty = balanceQty;
            const maxCancelableQty = balanceQty;
            const isCancelQtyChanged = Number(editDetail?.cancel_qty || 0) >= 1;

            return (
              <div key={d.order_details_number} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-gray-400">{d.order_details_number}</span>
                  <div className="flex items-center gap-2">
                    {d.is_free && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        Free
                      </span>
                    )}
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${getOrderStatusStyle(d?.status)}`}>
                      {d?.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="font-bold text-gray-900">{capitalizeFirstLetter(d.product_name)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {capitalizeFirstLetter(d.product_brand)} • {capitalizeFirstLetter(d.product_model)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                      <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Qty Ordered</p>
                      <p className="text-base font-black text-gray-900 mt-0.5">{totalOrdered}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                      <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Total</p>
                      <p className="text-base font-black text-gray-900 mt-0.5">
                        {d.is_free ? "FREE" : formatCurrency(d.total_price)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                      <p className="text-[9px] uppercase tracking-widest text-emerald-500 font-semibold">Delivered</p>
                      <p className="text-base font-black text-emerald-700 mt-0.5">{delivered}</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl px-3 py-2.5 border border-rose-100">
                      <p className="text-[9px] uppercase tracking-widest text-rose-500 font-semibold">Cancelled</p>
                      <p className="text-base font-black text-rose-700 mt-0.5">{cancelled}</p>
                    </div>
                  </div>

                  {/* Mobile edit fields */}
                  {isEditMode && editDetail && (
                    <div className="pt-4 border-t border-violet-100 space-y-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-violet-500">
                        Edit Item
                      </p>
                      <FormField label="Status">
                        <CustomSelect
                          value={editDetail.status}
                          disabled={isLocked}
                          onChange={(e) => updateDetailField(index, "status", e.target.value)}
                          options={getAllowedNextStatuses(editDetail.status)}
                        />
                      </FormField>
                      {!isLocked && (
                        <FormField label="Delivered Quantity">
                          <input
                            type="number"
                            min={0}
                            max={maxDeliverableQty}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              if (value <= maxDeliverableQty) updateDetailField(index, "delivered_qty", value);
                            }}
                            className="form-input"
                            placeholder={`Max ${maxDeliverableQty}`}
                          />
                        </FormField>
                      )}
                      {!isLocked && (
                        <FormField label="Cancelled Quantity">
                          <input
                            type="number"
                            min={0}
                            max={maxCancelableQty}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              if (value <= maxCancelableQty) updateDetailField(index, "cancel_qty", value);
                            }}
                            className="form-input"
                            placeholder={`Max ${maxCancelableQty}`}
                          />
                        </FormField>
                      )}
                      {isCancelQtyChanged && (
                        <FormField label="Reason for Cancellation">
                          <textarea
                            onChange={(e) => updateDetailField(index, "reason_for_cancellation", e.target.value)}
                            className="form-input"
                            rows={2}
                            placeholder="Enter reason for cancellation"
                          />
                        </FormField>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================
          DELIVERY NOTES
          ================================================================ */}
      {order?.delivery_notes && (
        <SectionCard title="Delivery Notes" subtitle="Additional Info">
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {capitalizeFirstLetter(order.delivery_notes)}
            </p>
          </div>
        </SectionCard>
      )}

      {/* ================================================================
          FINANCIAL SUMMARY
          ================================================================ */}
      <FinancialSummary order={order} />

      {/* ================================================================
          PAYMENT NOTES
          ================================================================ */}
      {order?.payment_notes?.length > 0 && (
        <SectionCard title="Payment Notes" subtitle="Transaction History">
          <ul className="space-y-2.5">
            {order.payment_notes.map((note, index) => (
              <li
                key={index}
                className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-100/60 hover:border-gray-200 transition-all duration-200"
              >
                <FiChevronRight size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                {capitalizeFirstLetter(note)}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ================================================================
          FLOATING SAVE BAR
          ================================================================ */}
      {isEditMode && (
        <div className="sticky bottom-6 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/80 px-6 py-3.5 ring-1 ring-gray-100">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-gray-500 font-semibold hidden sm:block">
              Unsaved changes
            </span>
            <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleDiscardEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all duration-200"
            >
              <FiX size={13} />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
            >
              <FiSave size={13} />
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;