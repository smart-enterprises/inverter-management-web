import React, { useEffect, useState, useMemo } from 'react';
import { FiArrowLeft, FiCheckCircle, FiSave, FiShoppingCart, FiXCircle } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import CustomSelect from '../components/CustomSelect';
import {
  fetchOrderById,
  updateOrderStatus,
} from '../api/orders';
import {
  getStatusStyle,
  ORDER_STATUS_LIST,
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
} from '../utils/status';
import { useUpdateOrderPermissions } from '../hooks/useUpdateOrderPermissions';
import { formatDateForInput } from '../utils/dateUtils';
import { getAllowedNextStatuses } from '../utils/orderStatusHelper';

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
      {label}
    </label>
    {children}
  </div>
);

const FormFieldSecondary = ({ label, children }) => (
  <div className="space-y-2">
    <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
      {label}
    </label>
    {children}
  </div>
);

const CheckboxField = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="accent-purple-600"
    />
    <span>{label}</span>
  </label>
);

const Badge = ({ label, color, icon }) => {

  const styles = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 
        px-3 py-1.5 
        text-xs font-medium 
        rounded-full 
        border 
        shadow-sm
        transition-all duration-150
        ${styles[color] || styles.gray}
      `}
    >
      {icon && <span className="text-[12px]">{icon}</span>}
      {label}
    </span>
  );
};

// utils/orderHelpers.js

export const normalizeOrder = (order) => ({
  ...order,
  payment_method: order.payment_type || '',
  amount_paid: 0,
  delivered_date: order.delivered_date || "",
  delivery_note: order.delivery_note || "",
  order_details: order.order_details.map((detail) => ({
    ...detail,
    delivered_qty: '',
    cancel_qty: '',
    delivery_note: "",
    reason_for_cancellation: "",
    has_unPacked_completed: false,
    has_production_completed: false,
  })),
});

const UpdateOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // 🔐 Permission Hook
  const permissions = useUpdateOrderPermissions();

  const [originalOrder, setOriginalOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [amountPaid, setAmountPaid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [error, setError] = useState('');

  /* ================= EDIT PERMISSIONS ================= */
  const isCompleted = order?.status === "COMPLETED";
  const isDelivered = order?.status === "DELIVERED";
  const isCancelled = order?.status === "CANCELLED";

  const isOrderLocked = isCompleted || isDelivered || isCancelled;

  const isPaymentFullyDone = Number(order?.order_total_price || 0) === Number(amountPaid || 0);

  const isOrderDeliveryDateChanged =
    !!order?.promised_delivery_date &&
    !!originalOrder &&
    order.promised_delivery_date !== originalOrder.promised_delivery_date;

  /* ================= LOAD ORDER ================= */

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const res = await fetchOrderById(id);

        if (!res?.success) {
          setError('Failed to load order');
          return;
        }

        const fetched = res.data.order;

        setAmountPaid(fetched?.amount_paid ?? 0);
        setDeliveryDate(fetched?.promised_delivery_date);

        const normalized = normalizeOrder(fetched);

        setOrder(normalized);
        setOriginalOrder(normalized);
      } catch (error) {
        console.error("Order Load Error:", error.message);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  /* ================= FIELD HANDLERS ================= */

  const updateOrderField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const updateDetailField = (index, field, value) => {
    setOrder((prev) => {
      const updated = [...prev.order_details];
      const current = updated[index];

      const updatedDetail = {
        ...current,
        [field]: value,
        __isModified: true,
      };

      if (field === 'has_unPacked_completed' && value) {
        updatedDetail.has_production_completed = false;
      }

      if (field === 'has_production_completed' && value) {
        updatedDetail.has_unPacked_completed = false;
      }

      updated[index] = updatedDetail;

      return { ...prev, order_details: updated };
    });
  };

  /* ================= SMART PAYLOAD ================= */

  const buildPayload = useMemo(() => {
    if (!order || !originalOrder) return null;

    const payload = { order_number: order.order_number };

    const simpleFields = ['status', 'priority', 'payment_method'];

    simpleFields.forEach((field) => {
      if (order[field] !== originalOrder[field]) {
        payload[field] = order[field];
      }
    });

    if (Number(order.amount_paid) > 0) {
      payload.amount_paid = Number(order.amount_paid);
    }

    /* ================= ORDER LEVEL DELIVERY ================= */
    const isDateChanged =
      order.promised_delivery_date &&
      order.promised_delivery_date !== originalOrder.promised_delivery_date;

    if (isDateChanged) {
      payload.delivery_date = new Date(order.promised_delivery_date).toISOString();
    }

    /* DELIVERY NOTE (ONLY IF DATE CHANGED) */
    if (isDateChanged && order.delivery_note?.trim()) {
      payload.delivery_note = order.delivery_note.trim();
    }

    const updatedDetails = order.order_details
      .map((detail, index) => {
        const originalDetail = originalOrder.order_details[index];

        const item = {
          order_details_number: detail.order_details_number,
        };

        let hasChanges = false;

        const assignIfChanged = (key, current, previous) => {
          if (current !== previous) {
            item[key] = current;
            hasChanges = true;
          }
        };

        assignIfChanged('status', detail.status, originalDetail.status);

        /* ================= DELIVERED QTY & DATE ================= */

        const deliveredQty = Number(detail.delivered_qty);
        const originalDeliveredQty = Number(originalDetail.qty_delivered || 0);

        const hasQtyChanged =
          deliveredQty > 0 && deliveredQty !== originalDeliveredQty;

        const hasDateChanged =
          detail.delivery_date &&
          detail.delivery_date !== originalDetail.delivery_date;

        /* If quantity changed */
        if (hasQtyChanged) {
          item.delivered_qty = deliveredQty;
          hasChanges = true;
        }

        /* If either quantity OR date changed, send delivered_date */
        if (hasQtyChanged || hasDateChanged) {
          item.delivered_date = new Date(detail.delivery_date).toISOString();
          hasChanges = true;
        }

        /* ================= DELIVERY NOTE ================= */
        if (hasDateChanged && detail.delivery_note?.trim()) {
          item.delivery_note = detail.delivery_note.trim();
          hasChanges = true;
        }

        /* ================= CANCEL QTY ================= */
        const cancelQty = Number(detail.cancel_qty);
        const originalCancelQty = Number(originalDetail.total_cancelled_qty || 0);

        const hasCancelChanged =
          cancelQty > 0 && cancelQty !== originalCancelQty;

        /* ================= CANCEL QTY ================= */
        if (hasCancelChanged) {
          item.cancel_qty = cancelQty;
          hasChanges = true;
        }

        /* ================= CANCELLATION REASON ================= */
        if (hasCancelChanged && detail.reason_for_cancellation?.trim()) {
          item.reason_for_cancellation = detail.reason_for_cancellation.trim();
          hasChanges = true;
        }

        /* ================= UNPACKED COMPLETION ================= */
        assignIfChanged(
          'has_unPacked_completed',
          detail.has_unPacked_completed,
          originalDetail.has_unPacked_completed
        );

        /* ================= PRODUCTION COMPLETION ================= */
        assignIfChanged(
          'has_production_completed',
          detail.has_production_completed,
          originalDetail.has_production_completed
        );

        return hasChanges ? item : null;
      })
      .filter(Boolean);

    if (updatedDetails.length > 0) {
      payload.order_details = updatedDetails;
    }

    return payload;
  }, [order, originalOrder]);

  /* ================= SUBMIT ================= */

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
      return Swal.fire({
        icon: 'info',
        title: 'No Changes Detected',
      });
    }

    setSubmitting(true);

    try {
      const res = await updateOrderStatus(
        order.order_number,
        buildPayload
      );

      if (res?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Order Updated Successfully',
        });
        navigate('/orders');
      } else {
        setError(res?.message || 'Update failed');
      }
    } catch {
      setError('Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= UI STATES ================= */

  if (loading)
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA] mx-auto"></div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-600">
        {error}
      </div>
    );

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="text-gray-500" size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Update Order
            </h1>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
            title={(isOrderLocked && isPaymentFullyDone) ? "Completed or Delivered orders cannot be edited" : ""}
            className="px-6 py-2.5 bg-[#9333EA] text-white rounded-lg flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiSave />
            {submitting ? 'Updating...' : 'Save Changes'}
          </button>
        </div>

        {/* ================= ORDER SUMMARY ================= */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-10">

          {/* ===== Section Header ===== */}
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Order Number
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900 font-mono tracking-wide">
                {order.order_number}
              </p>
            </div>
          </header>

          {/* ===== Editable Fields Grid ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">

            {/* Order Status */}
            <FormFieldSecondary label="Order Status">
              <CustomSelect
                value={order.status}
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
                    : getAllowedNextStatuses(order.status)
                }
              />
            </FormFieldSecondary>

            {/* Priority */}
            <FormFieldSecondary label="Priority">
              <CustomSelect
                value={order.priority}
                disabled={
                  isOrderLocked ||
                  (!permissions.canEditAll && !permissions.editableFields?.includes("priority"))
                }
                onChange={(e) =>
                  updateOrderField("priority", e.target.value)
                }
                options={PRIORITY_OPTIONS}
              />
            </FormFieldSecondary>

            {/* Payment Method */}
            <FormFieldSecondary label="Payment Method">
              <CustomSelect
                value={order.payment_method}
                disabled={
                  isPaymentFullyDone ||
                  (!permissions.canEditAll && !permissions.editableFields?.includes("payment_method"))
                }
                onChange={(e) =>
                  updateOrderField("payment_method", e.target.value)
                }
                options={PAYMENT_METHOD_OPTIONS}
              />
            </FormFieldSecondary>

            {/* Amount Paid */}
            <FormFieldSecondary label="Amount Paid">
              <input
                type="number"
                disabled={
                  isPaymentFullyDone ||
                  (!permissions.canEditAll && !permissions.editableFields?.includes("amount_paid"))
                }
                min={0}
                max={Number(order?.order_total_price || 0) - amountPaid}
                value={order.amount_paid === 0 ? '' : order.amount_paid}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);

                  if (value <= Number(order?.order_total_price || 0) - amountPaid) {
                    updateOrderField('amount_paid', value);
                  }
                }}
                className="form-input"
                placeholder="Enter paid amount"
              />
            </FormFieldSecondary>

            {/* Delivered Date */}
            <FormFieldSecondary label="Delivered Date">
              <input
                type="datetime-local"
                value={formatDateForInput(order.promised_delivery_date)}
                disabled={
                  isOrderLocked ||
                  (!permissions.canEditAll &&
                    !permissions.editableFields?.includes("promised_delivery_date"))
                }
                onChange={(e) => {
                  setDeliveryDate(e.target.value);
                  updateOrderField("promised_delivery_date", e.target.value);
                }}
                className="form-input"
              />
            </FormFieldSecondary>

            {/* Delivery Note (ONLY WHEN DATE CHANGED) */}
            {isOrderDeliveryDateChanged && (
              <FormFieldSecondary label="Delivery Note">

                <input
                  type="text"
                  disabled={
                    isOrderLocked ||
                    (!permissions.canEditAll &&
                      !permissions.editableFields?.includes("delivery_note"))
                  }
                  onChange={(e) =>
                    updateOrderField("delivery_note", e.target.value)
                  }
                  className="form-input"
                  placeholder="Enter reason for delivery update"
                />

              </FormFieldSecondary>
            )}

          </div>
        </section>

        {/* second section */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-8">

          {/* HEADER */}
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Order Items
            </h2>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-medium text-gray-600">
              {order.order_details.length} items
            </span>
          </header>

          {order.order_details.map((detail, index) => {

            const {
              order_details_number,
              product_brand,
              product_model,
              product_name,
              is_free,
              total_price,
              status,
              delivery_date,
              qty_ordered,
              qty_delivered,
              total_cancelled_qty,
              has_unPacked_completed,
              has_production_completed,
              stock_flags = {},
            } = detail;

            const { hasUnpacked, hasProduction } = stock_flags;

            const totalQty = Number(qty_ordered ?? 0);
            const delivered = Number(qty_delivered ?? 0);
            const cancelled = Number(total_cancelled_qty ?? 0);

            const maxDeliverableQty = totalQty - cancelled;
            const maxCancelableQty = totalQty - delivered;

            const isLocked = status === "COMPLETED" || status === "DELIVERED" || status === "CANCELLED";

            const showCompletion = !isLocked && (hasUnpacked || hasProduction);

            const originalDetail = originalOrder?.order_details?.[index];

            const isDeliveryDateChanged = detail.delivery_date && originalDetail && detail.delivery_date !== originalDetail.delivery_date;

            const isCancelQtyChanged = Number(detail.cancel_qty || 0) >= 1;

            return (
              <article
                key={order_details_number}
                className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm"
              >

                {/* ================= PRODUCT HEADER ================= */}
                <div className="flex items-start justify-between gap-6">

                  {/* ================= LEFT SECTION ================= */}
                  <div className="flex flex-col gap-2">

                    {/* PRODUCT NAME + ID */}
                    <div className="flex items-center gap-2">

                      <h3 className="text-base font-semibold text-gray-900 tracking-tight">
                        {product_name}
                      </h3>

                      <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded-md text-gray-400">
                        {order_details_number}
                      </span>

                    </div>

                    {/* BRAND + MODEL */}
                    <p className="text-xs text-gray-500">
                      {product_brand} • {product_model}
                    </p>

                    {/* TAGS */}
                    <div className="flex flex-wrap gap-2 mt-1">

                      {is_free && (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                          Free Item
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full font-medium
        ${is_free
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {is_free ? "Scheme Product" : "Regular"}
                      </span>

                    </div>

                  </div>

                  {/* ================= RIGHT SECTION ================= */}
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">

                    {/* STATUS BADGE */}
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 ${getStatusStyle(status)}`}>
                      {status}
                    </span>

                    {/* PRICE CARD */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-right min-w-[110px]">

                      {is_free ? (
                        <span className="text-xs font-semibold text-blue-700 tracking-wide">
                          FREE
                        </span>
                      ) : (
                        <>
                          <p className="text-[10px] uppercase text-gray-400 tracking-wide">
                            Total
                          </p>

                          <p className="text-lg font-bold text-gray-900 leading-tight">
                            ₹ {total_price?.toLocaleString("en-IN")}
                          </p>
                        </>
                      )}

                    </div>

                  </div>

                </div>

                {/* ================= QUICK STATS ================= */}
                <div className="flex flex-wrap gap-3 mt-2">

                  <Badge
                    label={`Ordered ${totalQty}`}
                    color="blue"
                    icon={<FiShoppingCart />}
                  />

                  <Badge
                    label={`Delivered ${delivered}`}
                    color="emerald"
                    icon={<FiCheckCircle />}
                  />

                  <Badge
                    label={`Cancelled ${cancelled}`}
                    color="rose"
                    icon={<FiXCircle />}
                  />

                </div>

                {/* ================= FORM GRID ================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                  {/* STATUS */}
                  <FormField label="Status">
                    <CustomSelect
                      value={status}
                      disabled={isLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("status"))}
                      onChange={(e) =>
                        updateDetailField(index, "status", e.target.value)
                      }
                      options={getAllowedNextStatuses(status)}
                    />
                  </FormField>

                  {/* DATE */}
                  <FormField label="Delivery Date">
                    <input
                      type="datetime-local"
                      value={formatDateForInput(delivery_date)}
                      disabled={isLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("delivery_date"))}
                      onChange={(e) =>
                        updateDetailField(index, "delivery_date", e.target.value)
                      }
                      className="form-input"
                    />
                  </FormField>

                  {/* DELIVERY NOTE (ONLY WHEN DATE CHANGED) */}
                  {isDeliveryDateChanged && (
                    <FormField label="Delivery Note">

                      <input
                        type="text"
                        value={detail.delivery_note || ""}
                        disabled={
                          isLocked ||
                          (!permissions.canEditAll &&
                            !permissions.editableDetailFields?.includes("delivery_note"))
                        }
                        onChange={(e) =>
                          updateDetailField(index, "delivery_note", e.target.value)
                        }
                        className="form-input"
                        placeholder="Enter reason for delivery date change"
                      />

                    </FormField>
                  )}

                  {/* DELIVERED */}
                  {!isLocked && (
                    <FormField label="Delivered Quantity">
                      <input
                        type="number"
                        min={0}
                        max={maxDeliverableQty}
                        disabled={isLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("delivered_qty"))}
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

                  {/* CANCEL */}
                  {!isLocked && (
                    <FormField label="Cancelled Quantity">
                      <input
                        type="number"
                        min={0}
                        max={maxCancelableQty}
                        disabled={
                          isOrderLocked ||
                          (!permissions.canEditAll &&
                            !permissions.editableDetailFields?.includes(
                              "cancel_qty"
                            ))
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
                          (!permissions.canEditAll &&
                            !permissions.editableDetailFields?.includes(
                              "cancel_qty"
                            ))
                        }
                        onChange={(e) =>
                          updateDetailField(
                            index,
                            "reason_for_cancellation",
                            e.target.value
                          )
                        }
                        className="form-input"
                        rows={1}
                        placeholder="Enter reason for cancellation"
                      />
                    </FormField>
                  )}

                </div>

                {/* ================= COMPLETION ================= */}
                {showCompletion && (
                  <div className="border-t pt-4 space-y-3">

                    <p className="text-xs uppercase text-gray-500 font-medium">
                      Completion Status
                    </p>

                    <div className="flex gap-4 flex-wrap">

                      {hasUnpacked && (
                        <CheckboxField
                          label="Unpacked Completed"
                          checked={has_unPacked_completed}
                          disabled={
                            isOrderLocked ||
                            (!permissions.canEditAll &&
                              !permissions.editableDetailFields?.includes(
                                "has_unPacked_completed"
                              ))
                          }
                          onChange={(e) =>
                            updateDetailField(
                              index,
                              "has_unPacked_completed",
                              e.target.checked
                            )
                          }
                        />
                      )}

                      {hasProduction && (
                        <CheckboxField
                          label="Production Completed"
                          checked={has_production_completed}
                          disabled={
                            isOrderLocked ||
                            (!permissions.canEditAll &&
                              !permissions.editableDetailFields?.includes(
                                "has_production_completed"
                              ))
                          }
                          onChange={(e) =>
                            updateDetailField(
                              index,
                              "has_production_completed",
                              e.target.checked
                            )
                          }
                        />
                      )}

                    </div>

                  </div>
                )}

              </article>
            );
          })}
        </section>

        {/* ================= FINAL ORDER FINANCIAL SUMMARY ================= */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mt-10">

          <div className="flex justify-end">
            <div className="w-full sm:w-[440px] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

              {/* ================= HEADER ================= */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/60">

                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  Order Financial Summary
                </h3>

                {/* Payment Status */}
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${order.payment_status === "PAID"
                    ? "bg-emerald-100 text-emerald-700"
                    : order.payment_status === "PARTIAL"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                    }`}
                >
                  {order.payment_status}
                </span>

              </div>

              {/* ================= BODY ================= */}
              <div className="px-6 py-6 space-y-5">

                {/* Total Order Value */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">
                    Total Order Value
                  </span>

                  <span className="text-gray-900 font-semibold">
                    ₹ {order.order_total_price?.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Amount Paid */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">
                    Amount Paid
                  </span>

                  <span className="text-emerald-600 font-semibold">
                    ₹ {amountPaid?.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Balance Amount */}
                <div className="flex items-center justify-between pt-2">

                  <span className="text-base font-semibold text-gray-800">
                    Balance Amount
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-lg font-medium">₹</span>

                    <span className="text-2xl font-bold text-purple-700 tracking-tight">
                      {order.amount_due?.toLocaleString("en-IN")}
                    </span>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default UpdateOrder;