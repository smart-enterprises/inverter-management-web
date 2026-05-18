import React, { useEffect, useState, useMemo } from 'react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiSave,
  FiShoppingCart,
  FiXCircle,
  FiPackage,
  FiAlertCircle,
  FiZap,
  FiActivity,
  FiChevronRight,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toastSuccess, toastInfo } from '../utils/toast';
import CustomSelect from '../components/CustomSelect';
import {
  fetchOrderById,
  updateOrderStatus,
} from '../api/orders';
import {
  ORDER_STATUS_LIST,
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
} from '../utils/status';
import { useUpdateOrderPermissions } from '../hooks/useUpdateOrderPermissions';
import { formatDateForInput } from '../utils/dateUtils';
import { getAllowedNextStatuses } from '../utils/orderStatusHelper';

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
    className={`group flex items-center gap-3 text-sm cursor-pointer px-4 py-2.5 rounded-xl border transition-all duration-200 select-none ${checked
        ? 'bg-violet-50 border-violet-200 text-violet-700'
        : 'bg-white border-gray-200 text-gray-600 hover:border-violet-200 hover:bg-violet-50/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="accent-violet-600 w-4 h-4 flex-shrink-0"
    />
    <span className="font-medium">{label}</span>
    {checked && (
      <FiCheckCircle size={14} className="ml-auto text-violet-500 flex-shrink-0" />
    )}
  </label>
);

/* ================================================================
   NORMALIZE ORDER
   ================================================================ */

const normalizeOrder = (order) => ({
  ...order,
  payment_method: order.payment_type || '',
  amount_paid: 0,
  delivered_date: order.delivered_date || '',
  delivery_note: order.delivery_note || '',
  order_details: order.order_details.map((detail) => ({
    ...detail,
    delivered_qty: '',
    cancel_qty: '',
    delivery_note: '',
    reason_for_cancellation: '',
    has_unPacked_completed: false,
    has_production_completed: false,
  })),
});

/* ================================================================
   STAT PILL — compact quantity display
   ================================================================ */

const StatPill = ({ label, value, color = 'gray' }) => {
  const colorMap = {
    gray: 'text-gray-700',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="flex-1 px-4 py-3 border-r border-gray-100 last:border-0">
      <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
        {label}
      </p>
      <p className={`text-lg font-black tabular-nums ${colorMap[color]}`}>
        {value}
      </p>
    </div>
  );
};

/* ================================================================
   STATUS STYLE HELPER
   ================================================================ */

const getItemStatusStyle = (status) => {
  switch (status?.toUpperCase()) {
    case 'PENDING': return 'bg-amber-50 text-amber-700 border border-amber-100';
    case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border border-blue-100';
    case 'PRODUCTION': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
    case 'PACKED': return 'bg-violet-50 text-violet-700 border border-violet-100';
    case 'INVOICE': return 'bg-cyan-50 text-cyan-700 border border-cyan-100';
    case 'SHIPPED': return 'bg-orange-50 text-orange-700 border border-orange-100';
    case 'DELIVERED': return 'bg-green-50 text-green-700 border border-green-100';
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    case 'CANCELLED':
    case 'REJECTED': return 'bg-red-50 text-red-700 border border-red-100';
    default: return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

/* ================================================================
   MAIN COMPONENT — UpdateOrder
   ================================================================ */

const UpdateOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const permissions = useUpdateOrderPermissions();

  const [originalOrder, setOriginalOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [amountPaid, setAmountPaid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ---- PERMISSION DERIVED FLAGS ---- */
  const isCompleted = order?.status === 'COMPLETED';
  const isDelivered = order?.status === 'DELIVERED';
  const isCancelled = order?.status === 'CANCELLED';
  const isOrderLocked = isCompleted || isDelivered || isCancelled;
  const isPaymentFullyDone =
    Number(order?.order_total_price || 0) === Number(amountPaid || 0);
  const isOrderDeliveryDateChanged =
    !!order?.promised_delivery_date &&
    !!originalOrder &&
    order.promised_delivery_date !== originalOrder.promised_delivery_date;

  /* ---- LOAD ORDER ---- */
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
        const normalized = normalizeOrder(fetched);
        setOrder(normalized);
        setOriginalOrder(normalized);
      } catch (err) {
        console.error('Order Load Error:', err.message);
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

  /* ---- FIELD HANDLERS ---- */
  const updateOrderField = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }));
  };

  const updateDetailField = (index, field, value) => {
    setOrder((prev) => {
      const updated = [...prev.order_details];
      const current = updated[index];
      const updatedDetail = { ...current, [field]: value, __isModified: true };
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

  /* ---- SMART PAYLOAD ---- */
  const buildPayload = useMemo(() => {
    if (!order || !originalOrder) return null;

    const payload = { order_number: order.order_number };
    const simpleFields = ['status', 'priority', 'payment_method'];

    simpleFields.forEach((field) => {
      if (order[field] !== originalOrder[field]) payload[field] = order[field];
    });

    if (Number(order.amount_paid) > 0) {
      payload.amount_paid = Number(order.amount_paid);
    }

    const isDateChanged =
      order.promised_delivery_date &&
      order.promised_delivery_date !== originalOrder.promised_delivery_date;

    if (isDateChanged) {
      payload.delivery_date = new Date(order.promised_delivery_date).toISOString();
    }
    if (isDateChanged && order.delivery_note?.trim()) {
      payload.delivery_note = order.delivery_note.trim();
    }

    const updatedDetails = order.order_details
      .map((detail, index) => {
        const originalDetail = originalOrder.order_details[index];
        const item = { order_details_number: detail.order_details_number };
        let hasChanges = false;

        const assignIfChanged = (key, current, previous) => {
          if (current !== previous) { item[key] = current; hasChanges = true; }
        };

        assignIfChanged('status', detail.status, originalDetail.status);

        const deliveredQty = Number(detail.delivered_qty);
        const originalDeliveredQty = Number(originalDetail.qty_delivered || 0);
        const hasQtyChanged = deliveredQty > 0 && deliveredQty !== originalDeliveredQty;
        const hasDateChanged =
          detail.delivery_date && detail.delivery_date !== originalDetail.delivery_date;

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

        assignIfChanged('has_unPacked_completed', detail.has_unPacked_completed, originalDetail.has_unPacked_completed);
        assignIfChanged('has_production_completed', detail.has_production_completed, originalDetail.has_production_completed);

        return hasChanges ? item : null;
      })
      .filter(Boolean);

    if (updatedDetails.length > 0) payload.order_details = updatedDetails;
    return payload;
  }, [order, originalOrder]);

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
      return toastInfo('No Changes Detected');
    }

    setSubmitting(true);
    try {
      const res = await updateOrderStatus(order.order_number, buildPayload);
      if (res?.success) {
        toastSuccess('Order Updated Successfully');
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

  /* ---- UI STATES ---- */
  if (loading)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-violet-100 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading order…</p>
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

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ================================================================
            HEADER
            ================================================================ */}
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
            >
              <FiArrowLeft
                className="text-gray-400 group-hover:text-gray-700 transition-colors"
                size={18}
              />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Update Order
              </h1>
              {order?.order_number && (
                <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                  {order.order_number}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
            title={
              isOrderLocked && isPaymentFullyDone
                ? 'Completed or Delivered orders cannot be edited'
                : ''
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
          >
            <FiSave size={15} />
            {submitting ? 'Updating…' : 'Save Changes'}
          </button>
        </div>

        {/* ================================================================
            ORDER-LEVEL FIELDS
            ================================================================ */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Order Number
              </p>
              <p className="mt-1 text-base font-black text-gray-900 font-mono tracking-wide">
                {order.order_number}
              </p>
            </div>

            {/* Status + Payment badges */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full ${getItemStatusStyle(order.status)}`}>
                {order.status}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full ${order.payment_status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : order.payment_status === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
              >
                {order.payment_status}
              </span>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Order Status */}
              <FormFieldSecondary label="Order Status">
                <CustomSelect
                  value={order.status}
                  disabled={
                    isOrderLocked ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes('status'))
                  }
                  onChange={(e) => {
                    if (permissions.restrictStatusToDelivered) {
                      if (e.target.value !== 'DELIVERED') return;
                    }
                    updateOrderField('status', e.target.value);
                  }}
                  options={
                    permissions.restrictStatusToDelivered
                      ? ['DELIVERED']
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
                    (!permissions.canEditAll && !permissions.editableFields?.includes('priority'))
                  }
                  onChange={(e) => updateOrderField('priority', e.target.value)}
                  options={PRIORITY_OPTIONS}
                />
              </FormFieldSecondary>

              {/* Payment Method */}
              <FormFieldSecondary label="Payment Method">
                <CustomSelect
                  value={order.payment_method}
                  disabled={
                    isPaymentFullyDone ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes('payment_method'))
                  }
                  onChange={(e) => updateOrderField('payment_method', e.target.value)}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </FormFieldSecondary>

              {/* Amount Paid */}
              <FormFieldSecondary label="Amount Paid">
                <input
                  type="number"
                  disabled={
                    isPaymentFullyDone ||
                    (!permissions.canEditAll && !permissions.editableFields?.includes('amount_paid'))
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
                    (!permissions.canEditAll && !permissions.editableFields?.includes('promised_delivery_date'))
                  }
                  onChange={(e) => {
                    updateOrderField('promised_delivery_date', e.target.value);
                  }}
                  className="form-input"
                />
              </FormFieldSecondary>

              {/* Delivery Note — only when date changed */}
              {isOrderDeliveryDateChanged && (
                <FormFieldSecondary label="Delivery Note">
                  <input
                    type="text"
                    disabled={
                      isOrderLocked ||
                      (!permissions.canEditAll && !permissions.editableFields?.includes('delivery_note'))
                    }
                    onChange={(e) => updateOrderField('delivery_note', e.target.value)}
                    className="form-input"
                    placeholder="Enter reason for delivery update"
                  />
                </FormFieldSecondary>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            ORDER ITEMS
            ================================================================ */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Section Header */}
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
              {order.order_details.length}{' '}
              {order.order_details.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <div className="p-6 space-y-5">
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
                total_qty_ordered,
                qty_delivered,
                total_cancelled_qty,
                has_unPacked_completed,
                has_production_completed,
                stock_flags = {},
              } = detail;

              const { hasUnpacked, hasProduction } = stock_flags;
              const totalOrdered = Number(total_qty_ordered ?? 0);
              const delivered = Number(qty_delivered ?? 0);
              const cancelled = Number(total_cancelled_qty ?? 0);
              const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
              const maxDeliverableQty = balanceQty;
              const maxCancelableQty = balanceQty;
              const isLocked =
                status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED';
              const showCompletion = !isLocked && (hasUnpacked || hasProduction);
              const originalDetail = originalOrder?.order_details?.[index];
              const isDeliveryDateChanged =
                detail.delivery_date && originalDetail && detail.delivery_date !== originalDetail.delivery_date;
              const isCancelQtyChanged = Number(detail.cancel_qty || 0) >= 1;
              const progressPct =
                totalOrdered > 0
                  ? Math.min(((delivered + cancelled) / totalOrdered) * 100, 100)
                  : 0;

              return (
                <article
                  key={order_details_number}
                  className="bg-gradient-to-br from-gray-50/60 to-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* ---- Product Header ---- */}
                  <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                          {product_name}
                        </h3>
                        <span className="text-[9px] font-mono bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md text-gray-400">
                          {order_details_number}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">
                        {product_brand} • {product_model}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {is_free && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            Free Item
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${is_free
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                        >
                          {is_free ? 'Scheme Product' : 'Regular'}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${getItemStatusStyle(status)}`}
                      >
                        {status}
                      </span>
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-right min-w-[110px] shadow-sm">
                        {is_free ? (
                          <span className="text-xs font-black text-blue-700 tracking-wide">FREE</span>
                        ) : (
                          <>
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">Total</p>
                            <p className="text-lg font-black text-gray-900 leading-tight tabular-nums">
                              ₹ {total_price?.toLocaleString('en-IN')}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* ---- Quick Stats ---- */}
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

                    {/* ---- Form Grid ---- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {/* Status */}
                      <FormField label="Status">
                        <CustomSelect
                          value={status}
                          disabled={
                            isLocked ||
                            (!permissions.canEditAll && !permissions.editableFields?.includes('status'))
                          }
                          onChange={(e) => updateDetailField(index, 'status', e.target.value)}
                          options={getAllowedNextStatuses(status)}
                        />
                      </FormField>

                      {/* Delivery Date */}
                      <FormField label="Delivery Date">
                        <input
                          type="datetime-local"
                          value={formatDateForInput(delivery_date)}
                          disabled={
                            isLocked ||
                            (!permissions.canEditAll && !permissions.editableFields?.includes('delivery_date'))
                          }
                          onChange={(e) =>
                            updateDetailField(index, 'delivery_date', e.target.value)
                          }
                          className="form-input"
                        />
                      </FormField>

                      {/* Delivery Note — only when date changed */}
                      {isDeliveryDateChanged && (
                        <FormField label="Delivery Note">
                          <input
                            type="text"
                            value={detail.delivery_note || ''}
                            disabled={
                              isLocked ||
                              (!permissions.canEditAll &&
                                !permissions.editableDetailFields?.includes('delivery_note'))
                            }
                            onChange={(e) => updateDetailField(index, 'delivery_note', e.target.value)}
                            className="form-input"
                            placeholder="Enter reason for delivery date change"
                          />
                        </FormField>
                      )}

                      {/* Delivered Quantity */}
                      {!isLocked && (
                        <FormField label="Delivered Quantity">
                          <input
                            type="number"
                            min={0}
                            max={maxDeliverableQty}
                            disabled={
                              isLocked ||
                              (!permissions.canEditAll &&
                                !permissions.editableDetailFields?.includes('delivered_qty'))
                            }
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              if (value <= maxDeliverableQty) {
                                updateDetailField(index, 'delivered_qty', value);
                              }
                            }}
                            className="form-input"
                            placeholder={`Max ${maxDeliverableQty}`}
                          />
                        </FormField>
                      )}

                      {/* Cancelled Quantity */}
                      {!isLocked && (
                        <FormField label="Cancelled Quantity">
                          <input
                            type="number"
                            min={0}
                            max={maxCancelableQty}
                            disabled={
                              isOrderLocked ||
                              (!permissions.canEditAll &&
                                !permissions.editableDetailFields?.includes('cancel_qty'))
                            }
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              if (value <= maxCancelableQty) {
                                updateDetailField(index, 'cancel_qty', value);
                              }
                            }}
                            className="form-input"
                            placeholder={`Max ${maxCancelableQty}`}
                          />
                        </FormField>
                      )}

                      {/* Cancellation Reason */}
                      {isCancelQtyChanged && (
                        <FormField label="Reason for Cancellation">
                          <textarea
                            disabled={
                              isOrderLocked ||
                              (!permissions.canEditAll &&
                                !permissions.editableDetailFields?.includes('cancel_qty'))
                            }
                            onChange={(e) =>
                              updateDetailField(index, 'reason_for_cancellation', e.target.value)
                            }
                            className="form-input"
                            rows={1}
                            placeholder="Enter reason for cancellation"
                          />
                        </FormField>
                      )}
                    </div>

                    {/* ---- Completion Flags ---- */}
                    {showCompletion && (
                      <div className="border-t border-gray-100 pt-5 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                          Completion Status
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {hasUnpacked && (
                            <CheckboxField
                              label="Unpacked Completed"
                              checked={has_unPacked_completed}
                              disabled={
                                isOrderLocked ||
                                (!permissions.canEditAll &&
                                  !permissions.editableDetailFields?.includes('has_unPacked_completed'))
                              }
                              onChange={(e) =>
                                updateDetailField(index, 'has_unPacked_completed', e.target.checked)
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
                                  !permissions.editableDetailFields?.includes('has_production_completed'))
                              }
                              onChange={(e) =>
                                updateDetailField(index, 'has_production_completed', e.target.checked)
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ================================================================
            FINANCIAL SUMMARY
            ================================================================ */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Financial Summary
            </h2>
            <p className="mt-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Billing Overview
            </p>
          </div>

          <div className="p-8">
            <div className="flex justify-end">
              <div className="w-full sm:w-[440px] bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Card Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200/60 bg-white/80">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">
                    Order Financial Summary
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${order.payment_status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.payment_status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${order.payment_status === 'PAID'
                          ? 'bg-emerald-500'
                          : order.payment_status === 'PARTIAL'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                    />
                    {order.payment_status}
                  </span>
                </div>

                {/* Card Body */}
                <div className="px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Total Order Value</span>
                    <span className="text-sm text-gray-900 font-bold tabular-nums">
                      ₹ {order.order_total_price?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Amount Paid</span>
                    <span className="text-sm text-emerald-600 font-bold tabular-nums">
                      ₹ {amountPaid?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 border-dashed" />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-gray-800">Balance Amount</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 font-semibold">₹</span>
                      <span className="text-2xl font-black text-violet-700 tracking-tight tabular-nums">
                        {order.amount_due?.toLocaleString('en-IN')}
                      </span>
                    </div>
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
