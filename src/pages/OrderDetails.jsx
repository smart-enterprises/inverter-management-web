import React, { useState, useEffect, useMemo } from "react";
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

const formatNotes = (notes) => {
  if (!notes) return [];

  return notes
    .split("|")
    .map((n) => n.trim())
    .filter((n) =>
      /^(production|required|unpacked|delivered)/i.test(n)
    );
};

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

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ================= FETCH ================= */

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchOrderById(id);
        if (res?.success) {
          setOrder(res.data.order);
        } else {
          setError(res?.message || "Failed to load order");
        }
      } catch {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const totalItems = useMemo(
    () =>
      order?.order_details?.reduce(
        (sum, i) => sum + (i.qty_ordered || 0),
        0
      ) || 0,
    [order]
  );

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* ================= HEADER ================= */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/orders")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            Order #{order.order_number}
          </h1>
          <p className="text-sm text-gray-500">
            Created {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      {/* ================= ORDER SUMMARY ================= */}
      <section className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold">Order Summary</h2>

        <div className="grid md:grid-cols-3 gap-6">

          <Info icon={<FiCalendar />} label="Created">
            {formatDate(order.created_at)}
          </Info>

          <Info icon={<FiCalendar />} label="Updated">
            {formatDate(order.updated_at)}
          </Info>

          <Info icon={<FiTruck />} label="Promised Delivery">
            {formatDate(order.promised_delivery_date)}
          </Info>

          <Info icon={<FiDollarSign />} label="Total Price">
            {formatCurrency(order.order_total_price)}
          </Info>

          <Info icon={<FiDollarSign />} label="Discount">
            {formatCurrency(order.order_total_discount)}
          </Info>

          <Info icon={<FiCreditCard />} label="Payment Status">
            {order.payment_status}
          </Info>

          <Info icon={<FiDollarSign />} label="Amount Paid">
            {formatCurrency(order.amount_paid)}
          </Info>

          <Info icon={<FiDollarSign />} label="Amount Due">
            {formatCurrency(order.amount_due)}
          </Info>

          <Info icon={<FiCreditCard />} label="Payment Type">
            {order.payment_type}
          </Info>

          <Info icon={<FiCalendar />} label="Last Payment">
            {formatDate(order.last_payment_date)}
          </Info>

          <Info icon={<FiUser />} label="Salesman ID">
            {order.salesman_id}
          </Info>

          <Info icon={<FiUser />} label="Created By">
            {order.created_by}
          </Info>

        </div>

        {order.order_note && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-600">
              Order Note
            </p>
            <p className="text-sm text-gray-800 mt-1">
              {order.order_note}
            </p>
          </div>
        )}
      </section>

      {/* ================= DEALER ================= */}
      <section className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">
          Dealer Information
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Info icon={<FiUser />} label="Dealer Name">
            {order.dealer?.employee_name}
          </Info>

          <Info icon={<FiBox />} label="Shop Name">
            {order.dealer?.shop_name}
          </Info>

          <Info icon={<FiMail />} label="Email">
            {order.dealer?.employee_email}
          </Info>

          <Info icon={<FiPhone />} label="Phone">
            {order.dealer?.employee_phone}
          </Info>

          <Info icon={<FiMapPin />} label="Address">
            {order.dealer?.address}
          </Info>
        </div>
      </section>

      {/* ================= ORDER ITEMS ================= */}
      <section className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">
          Order Items ({totalItems})
        </h2>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody>
              {order.order_details?.map((d) => (
                <tr key={d.order_details_number} className="border-b">
                  <td className="px-4 py-4">
                    <div className="font-semibold">
                      {d.product_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.product_brand} • {d.product_model}
                    </div>

                    <div className="mt-2 flex gap-2 flex-wrap">
                      {d.is_free && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          Free Item
                        </span>
                      )}

                      <span
                        className={`px-2 py-1 text-xs rounded-full ${d.is_free
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {d.is_free
                          ? "Product Scheme"
                          : "Regular Product"}
                      </span>
                    </div>

                    {/* Notes */}
                    {d.notes && formatNotes(d.notes).length > 0 && (
                      <div className="mt-3 bg-gray-50 border rounded-md p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
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

                  <td className="text-center">
                    {d.qty_ordered}
                  </td>

                  <td className="text-right whitespace-nowrap">
                    {formatCurrency(d.unit_product_price)}
                  </td>

                  <td className="text-right whitespace-nowrap font-semibold">
                    {formatCurrency(d.total_price)}
                  </td>

                  <td className="text-center">
                    {d.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {order.order_details?.map((d) => (
            <div
              key={d.order_details_number}
              className="border rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between mb-3">
                <span className="font-mono text-xs">
                  {d.order_details_number}
                </span>

                <span
                  className={`px-2 py-1 text-xs rounded-full ${d.is_free
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {d.is_free
                    ? "Product Scheme"
                    : "Regular Product"}
                </span>
              </div>

              <div className="font-semibold mb-2">
                {d.product_name}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Qty</p>
                  <p>{d.qty_ordered}</p>
                </div>

                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-semibold">
                    {formatCurrency(d.total_price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= DELIVERY NOTES ================= */}
      {order.delivery_notes && (
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Delivery Notes
          </h2>
          <p className="text-sm">{order.delivery_notes}</p>
        </section>
      )}

      {/* ================= PAYMENT NOTES ================= */}
      {order.payment_notes?.length > 0 && (
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Payment Notes
          </h2>

          <ul className="space-y-2 text-sm">
            {order.payment_notes.map((note, i) => (
              <li
                key={i}
                className="border rounded-lg p-3 bg-gray-50"
              >
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default OrderDetails;