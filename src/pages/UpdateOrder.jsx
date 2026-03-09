import React, { useEffect, useState, useMemo } from 'react';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
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

// utils/orderHelpers.js

export const normalizeOrder = (order) => ({
  ...order,
  payment_method: order.payment_type || '',
  amount_paid: 0,
  order_details: order.order_details.map((detail) => ({
    ...detail,
    delivered_qty: '',
    cancel_qty: '',
    has_unPacked_completed: false,
    has_production_completed: false,
  })),
});

export const formatDateForInput = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export const formatDateForAPI = (value) =>
  value ? new Date(value).toISOString() : undefined;


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
  const [error, setError] = useState('');

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

        /* ================= CANCEL QTY ================= */
        const cancelQty = Number(detail.cancel_qty);
        if (
          cancelQty > 0 &&
          cancelQty !== Number(originalDetail.total_cancelled_qty || 0)
        ) {
          item.cancel_qty = cancelQty;
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
            disabled={submitting}
            className="px-6 py-2.5 bg-[#9333EA] text-white rounded-lg flex items-center gap-2"
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
                  !permissions.canEditAll &&
                  !permissions.editableFields?.includes("status")
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
                    : ORDER_STATUS_LIST.filter((s) => s !== "ALL")
                }
              />
            </FormFieldSecondary>

            {/* Priority */}
            <FormFieldSecondary label="Priority">
              <CustomSelect
                value={order.priority}
                disabled={
                  !permissions.canEditAll &&
                  !permissions.editableFields?.includes("priority")
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
                  !permissions.canEditAll &&
                  !permissions.editableFields?.includes("payment_method")
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
                  !permissions.canEditAll &&
                  !permissions.editableFields?.includes("amount_paid")
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

          </div>
        </section>

        {/* ================= ORDER DETAILS ================= */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-8">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">
              Order Details
            </h2>
          </header>

          {order.order_details.map((detail, index) => {
            const {
              order_details_number,
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

            /* ================= Quantity Calculations ================= */

            const totalQty = Number(qty_ordered ?? 0);
            const alreadyDelivered = Number(qty_delivered ?? 0);
            const alreadyCancelled = Number(total_cancelled_qty ?? 0);

            // Editable state values (if you're tracking temporary updates)
            const deliveredQty = Number(detail.delivered_qty ?? alreadyDelivered);
            const cancelQty = Number(detail.cancel_qty ?? alreadyCancelled);

            const maxDeliverableQty = totalQty - alreadyCancelled;
            const maxCancelableQty = totalQty - alreadyDelivered;

            return (
              <article
                key={order_details_number}
                className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-6 transition-all"
              >
                {/* ===== Header Row ===== */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Order Detail No
                    </p>
                    <p className="font-mono text-sm font-medium text-gray-800 mt-1">
                      {order_details_number}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${is_free
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {is_free ? 'Product Scheme' : 'Regular Product'}
                  </span>
                </div>

                {/* ===== Form Grid ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                  {/* --- Status Section --- */}
                  <div className="space-y-5">
                    <FormField label="Order Status">
                      <CustomSelect
                        value={status}
                        onChange={(e) =>
                          updateDetailField(index, 'status', e.target.value)
                        }
                        options={ORDER_STATUS_LIST.filter((s) => s !== 'ALL')}
                      />
                    </FormField>

                    <FormField label="Delivered Date & Time">
                      <input
                        type="datetime-local"
                        value={formatDateForInput(detail.delivery_date)}
                        onChange={(e) =>
                          updateDetailField(index, 'delivery_date', e.target.value)
                        }
                        className="form-input"
                      />
                    </FormField>
                  </div>

                  {/* --- Quantity Section --- */}
                  <div className="space-y-5">
                    <FormField label="Delivered Quantity">
                      <input
                        type="number"
                        disabled={
                          !permissions.canEditAll &&
                          !permissions.editableDetailFields?.includes("delivered_qty")
                        }
                        min={0}
                        max={maxDeliverableQty}
                        onChange={(e) => {
                          const value = Number(e.target.value || 0);
                          if (value <= maxDeliverableQty) {
                            updateDetailField(index, 'delivered_qty', value);
                          }
                        }}
                        className="form-input"
                        placeholder={`Enter delivered quantity (Max: ${maxDeliverableQty})`}
                      />
                    </FormField>

                    <FormField label="Cancelled Quantity">
                      <input
                        type="number"
                        disabled={
                          !permissions.canEditAll &&
                          !permissions.editableDetailFields?.includes("cancel_qty")
                        }
                        min={0}
                        max={maxCancelableQty}
                        onChange={(e) => {
                          const value = Number(e.target.value || 0);
                          if (value <= maxCancelableQty) {
                            updateDetailField(index, 'cancel_qty', value);
                          }
                        }}
                        className="form-input"
                        placeholder={`Enter cancelled quantity (Max: ${maxCancelableQty})`} />
                    </FormField>
                  </div>

                  {/* --- Completion & Financial Section --- */}
                  <div className="space-y-6">

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
                        Completion Status
                      </p>

                      <div className="flex flex-col gap-3">
                        {hasUnpacked && (
                          <CheckboxField
                            label="Unpacked Completed"
                            checked={has_unPacked_completed}
                            onChange={(e) =>
                              updateDetailField(
                                index,
                                'has_unPacked_completed',
                                e.target.checked
                              )
                            }
                            disabled={
                              !permissions.canEditAll &&
                              !permissions.editableDetailFields?.includes(
                                "has_unPacked_completed"
                              )
                            }
                          />
                        )}

                        {hasProduction && (
                          <CheckboxField
                            label="Production Completed"
                            checked={has_production_completed}
                            onChange={(e) =>
                              updateDetailField(
                                index,
                                'has_production_completed',
                                e.target.checked
                              )
                            }
                            disabled={
                              !permissions.canEditAll &&
                              !permissions.editableDetailFields?.includes(
                                "has_production_completed"
                              )
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Financial Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Item Total
                      </p>
                      <p className="text-2xl font-semibold text-gray-900 mt-2">
                        ₹  {total_price?.toLocaleString('en-IN')}
                      </p>
                    </div>

                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* ================= FINAL ORDER FINANCIAL SUMMARY ================= */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mt-10">

          <div className="flex justify-end">
            <div className="w-full sm:w-[420px] bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

              {/* Header */}
              <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">

                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                  Order Financial Summary
                </h3>

                {/* Payment Status */}
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${order.payment_status === "PAID"
                    ? "bg-green-100 text-green-700"
                    : order.payment_status === "PARTIAL"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                    }`}
                >
                  {order.payment_status}
                </span>

              </div>

              {/* Financial Rows */}
              <div className="space-y-4">

                {/* Total Order Value */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Order Value</span>
                  <span className="font-medium text-gray-900">
                    ₹  {order.order_total_price?.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Amount Paid */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-medium text-green-600">
                    ₹  {amountPaid?.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Balance */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-800">
                    Balance Amount
                  </span>
                  <span className="text-xl font-bold text-purple-700">
                    ₹  {order.amount_due?.toLocaleString('en-IN')}
                  </span>
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