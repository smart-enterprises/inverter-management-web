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

const UpdateOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [originalOrder, setOriginalOrder] = useState(null);
  const [order, setOrder] = useState(null);
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

        const normalized = {
          ...fetched,
          payment_method: fetched.payment_type || '',
          amount_paid: 0,
          order_details: fetched.order_details.map((d) => ({
            ...d,
            delivered_qty: '',
            cancel_qty: '',
            has_unPacked_completed: false,
            has_production_completed: false,
          })),
        };

        setOrder(normalized);
        setOriginalOrder(normalized);
      } catch {
        setError('Failed to load order');
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

    if (order.status !== originalOrder.status)
      payload.status = order.status;

    if (order.priority !== originalOrder.priority)
      payload.priority = order.priority;

    const paidAmount = Number(order.amount_paid);
    if (paidAmount > 0) {
      payload.amount_paid = paidAmount;
    }

    if (order.payment_method !== originalOrder.payment_method)
      payload.payment_method = order.payment_method;

    const updatedDetails = order.order_details
      .map((detail, index) => {
        const originalDetail = originalOrder.order_details[index];

        const item = {
          order_details_number: detail.order_details_number,
        };

        let hasChanges = false;

        /* ================= STATUS ================= */
        if (detail.status !== originalDetail.status) {
          item.status = detail.status;
          hasChanges = true;
        }

        /* ================= DELIVERED QTY ================= */
        const deliveredQty = Number(detail.delivered_qty);
        const originalDeliveredQty = Number(originalDetail.qty_delivered || 0);

        if (deliveredQty > 0 && deliveredQty !== originalDeliveredQty) {
          item.delivered_qty = deliveredQty;
          item.delivered_date = detail.delivery_date;
          hasChanges = true;
        }

        /* ================= CANCEL QTY ================= */
        const cancelQty = Number(detail.cancel_qty);
        const originalCancelQty = Number(originalDetail.total_cancelled_qty || 0);

        if (cancelQty > 0 && cancelQty !== originalCancelQty) {
          item.cancel_qty = cancelQty;
          hasChanges = true;
        }

        /* ================= UNPACKED COMPLETION ================= */
        if (
          detail.has_unPacked_completed !==
          originalDetail.has_unPacked_completed
        ) {
          item.has_unPacked_completed = detail.has_unPacked_completed;
          hasChanges = true;
        }

        /* ================= PRODUCTION COMPLETION ================= */
        if (
          detail.has_production_completed !==
          originalDetail.has_production_completed
        ) {
          item.has_production_completed = detail.has_production_completed;
          hasChanges = true;
        }

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
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft />
            </button>
            <h1 className="text-2xl font-semibold">
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="grid md:grid-cols-5 gap-6 items-start">

            {/* Order Info */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Order Number
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1 font-mono">
                {order.order_number}
              </p>
            </div>

            <CustomSelect
              value={order.status}
              onChange={(e) =>
                updateOrderField('status', e.target.value)
              }
              options={ORDER_STATUS_LIST.filter((s) => s !== 'ALL')}
            />

            <CustomSelect
              value={order.priority}
              onChange={(e) =>
                updateOrderField('priority', e.target.value)
              }
              options={PRIORITY_OPTIONS}
            />

            <CustomSelect
              value={order.payment_method}
              onChange={(e) =>
                updateOrderField('payment_method', e.target.value)
              }
              options={PAYMENT_METHOD_OPTIONS}
            />

            <input
              type="number"
              value={order.amount_paid === 0 ? '' : order.amount_paid}
              onChange={(e) =>
                updateOrderField(
                  'amount_paid',
                  e.target.value === '' ? 0 : Number(e.target.value)
                )
              }
              className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Amount Paid"
            />
          </div>

          {/* Financial Card */}
          <div className="mt-6 max-w-xs">
            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Total Order Value
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  ₹ {order.order_total_price?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ORDER DETAILS ================= */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Order Details
          </h2>

          {order.order_details.map((detail, index) => {
            const showUnpacked = detail.stock_flags?.hasUnpacked === true;
            const showProduction = detail.stock_flags?.hasProduction === true;

            return (
              <div
                key={detail.order_details_number}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5"
              >
                {/* Top Row */}
                <div className="flex justify-between items-center mb-4">
                  <p className="font-mono text-sm text-gray-700">
                    {detail.order_details_number}
                  </p>

                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${detail.is_product_scheme
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {detail.is_product_scheme
                      ? 'Product Scheme'
                      : 'Regular Product'}
                  </span>
                </div>

                {/* Middle Row */}
                <div className="grid md:grid-cols-5 gap-4 items-center">

                  <CustomSelect
                    value={detail.status}
                    onChange={(e) =>
                      updateDetailField(index, 'status', e.target.value)
                    }
                    options={ORDER_STATUS_LIST.filter(
                      (s) => s !== 'ALL'
                    )}
                  />

                  <input
                    type="number"
                    value={detail.delivered_qty}
                    onChange={(e) =>
                      updateDetailField(index, 'delivered_qty', e.target.value)
                    }
                    className="border border-gray-300 rounded-xl px-3 py-2"
                    placeholder="Delivered Quantity"
                  />

                  <input
                    type="number"
                    value={detail.cancel_qty}
                    onChange={(e) =>
                      updateDetailField(index, 'cancel_qty', e.target.value)
                    }
                    className="border border-gray-300 rounded-xl px-3 py-2"
                    placeholder="Cancelled Quantity"
                  />

                  {/* Completion Flags */}
                  <div className="flex gap-4 text-sm">
                    {showUnpacked && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={detail.has_unPacked_completed}
                          onChange={(e) =>
                            updateDetailField(
                              index,
                              'has_unPacked_completed',
                              e.target.checked
                            )
                          }
                        />
                        Unpacked Completed
                      </label>
                    )}

                    {showProduction && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={detail.has_production_completed}
                          onChange={(e) =>
                            updateDetailField(
                              index,
                              'has_production_completed',
                              e.target.checked
                            )
                          }
                        />
                        Production Completed
                      </label>
                    )}
                  </div>

                  {/* Item Financial */}
                  <div className="text-right bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase text-gray-500">
                      Item Total
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      ₹ {detail.total_price?.toLocaleString('en-IN')}
                    </p>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UpdateOrder;