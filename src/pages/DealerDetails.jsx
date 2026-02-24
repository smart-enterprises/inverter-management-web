import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiBox,
  FiCalendar,
  FiPackage,
  FiTruck,
  FiPercent,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import Swal from "sweetalert2";

import {
  fetchDealerById,
  fetchDealerDiscounts,
  createDealerDiscounts,
} from "../api/dealer";
import { getBrandsByDealer } from "../api/brands";
import { fetchOrders } from "../api/orders";
import { fetchProducts } from "../api/products";
import CustomSelect from "../components/CustomSelect";

/* -------------------------------------------------------------------------- */
/*                                UI COMPONENTS                               */
/* -------------------------------------------------------------------------- */

const FormField = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#9333EA]/10 text-[#9333EA]">
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 mt-1">
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const StatCard = ({ title, value, color }) => (
  <div className={`p-6 rounded-2xl border shadow-sm bg-${color}-50/40`}>
    <p className={`text-sm font-medium text-${color}-600`}>{title}</p>
    <p className={`text-3xl font-bold text-${color}-700 mt-2`}>{value}</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const createEmptyRow = () => ({
  id: crypto.randomUUID(),
  brand_name: "",
  model_name: "",
  discount_value: "",
  is_percentage: true,
  description: "",
});

const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "N/A";

const capitalize = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : "N/A";

const getTotalItems = (details = []) =>
  details.reduce((acc, item) => acc + (item.qty_ordered || 0), 0);

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const DealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  /* ------------------------------- STATE -------------------------------- */

  const [dealer, setDealer] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [discounts, setDiscounts] = useState([]);
  const [discountState, setDiscountState] = useState({
    loading: false,
    error: "",
    page: 1,
    limit: 5,
    total: 0,
  });

  const [brandToModels, setBrandToModels] = useState({});
  const [allBrands, setAllBrands] = useState([]);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inProduction: 0,
    packed: 0,
    delivered: 0,
    cancelled: 0,
  });

  /* ----------------------------- DATA LOADERS ---------------------------- */

  const loadDealerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dealerRes, ordersRes] = await Promise.all([
        fetchDealerById(id),
        fetchOrders(),
      ]);

      if (!dealerRes?.success)
        throw new Error(
          dealerRes?.message || "Failed to load dealer details"
        );

      setDealer(dealerRes.data);

      if (ordersRes?.success) {
        const filtered = ordersRes.data.filter(
          ({ order }) => order?.dealer_id === id
        );
        setDealerOrders(filtered);
      } else {
        setDealerOrders([]);
      }
    } catch (err) {
      setError(err.message || "Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDiscounts = useCallback(
    async (page = 1) => {
      try {
        setDiscountState((s) => ({ ...s, loading: true, error: "" }));

        const res = await fetchDealerDiscounts({
          page,
          limit: discountState.limit,
          dealer_id: id,
        });

        if (!res?.success)
          throw new Error(res?.message || "Failed to fetch discounts");

        setDiscounts(res.data || []);
        setDiscountState((s) => ({
          ...s,
          page: res.pagination?.page || page,
          total: res.pagination?.total || 0,
        }));
      } catch (err) {
        setDiscounts([]);
        setDiscountState((s) => ({
          ...s,
          total: 0,
          error: err.message,
        }));
      } finally {
        setDiscountState((s) => ({ ...s, loading: false }));
      }
    },
    [id, discountState.limit]
  );

  const loadOrderSummary = useCallback(async () => {
    if (!id) return;

    const statuses = [
      null,
      "PENDING",
      "PRODUCTION",
      "PACKED",
      "DELIVERED",
      "CANCELLED",
    ];

    try {
      const responses = await Promise.allSettled(
        statuses.map((status) =>
          fetchOrders({
            page: 1,
            limit: 1,
            dealer: id,
            status,
          })
        )
      );

      const stats = {
        total: 0,
        pending: 0,
        inProduction: 0,
        packed: 0,
        delivered: 0,
        cancelled: 0,
      };

      responses.forEach((res, index) => {
        if (res.status === "fulfilled" && res.value?.success) {
          const total = res.value.pagination?.total || 0;
          switch (statuses[index]) {
            case null:
              stats.total = total;
              break;
            case "PENDING":
              stats.pending = total;
              break;
            case "PRODUCTION":
              stats.inProduction = total;
              break;
            case "PACKED":
              stats.packed = total;
              break;
            case "DELIVERED":
              stats.delivered = total;
              break;
            case "CANCELLED":
              stats.cancelled = total;
              break;
            default:
              break;
          }
        }
      });

      setOrderStats(stats);
    } catch (err) {
      console.error("Order summary load failed:", err);
    }
  }, [id]);

  const loadBrandsAndProducts = useCallback(async () => {
    try {
      const [brandsRes, productsRes] = await Promise.all([
        getBrandsByDealer(id, "active"),
        fetchProducts(),
      ]);

      if (brandsRes?.success) setAllBrands(brandsRes.data || []);

      if (productsRes?.success) {
        const map = {};
        productsRes.data.forEach((p) => {
          const brand =
            p.brand_name || p.brand?.name || p.brand;
          const model =
            p.model_name || p.model || p.modelNo;
          if (!brand || !model) return;

          const key = String(brand).toLowerCase();
          if (!map[key]) map[key] = new Set();
          map[key].add(String(model));
        });

        const normalized = Object.fromEntries(
          Object.entries(map).map(([k, v]) => [
            k,
            Array.from(v).sort(),
          ])
        );

        setBrandToModels(normalized);
      }
    } catch (err) {
      console.error("Brand/Product load failed", err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadDealerData();
    loadDiscounts(1);
    loadOrderSummary();
    loadBrandsAndProducts();
  }, [id]);

  /* ----------------------------- DISCOUNT SAVE ---------------------------- */

  const handleSubmitDiscounts = async () => {
    try {
      setBulkSubmitting(true);
      setBulkError("");

      const payload = bulkRows
        .filter(
          (r) => r.brand_name && r.model_name && r.discount_value
        )
        .map((r) => ({
          dealer_id: id,
          brand_name: r.brand_name,
          model_name: r.model_name,
          discount_value: Number(r.discount_value),
          is_percentage: Boolean(r.is_percentage),
          description: r.description?.trim() || "",
        }));

      if (!payload.length)
        throw new Error(
          "Please configure at least one valid discount."
        );

      const res = await createDealerDiscounts(payload);

      if (!res?.success)
        throw new Error(res?.message);

      await loadDiscounts(discountState.page);

      setBulkModalOpen(false);
      setBulkRows([createEmptyRow()]);

      Swal.fire({
        icon: "success",
        title: "Success",
        text:
          res.message ||
          "Discounts added successfully",
      });
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  /* ------------------------------- RENDER -------------------------------- */

  if (loading)
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-[#9333EA] mx-auto" />
        <p className="mt-4 text-gray-600">
          Loading dealer details...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate("/dealers")}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Back to Dealers
        </button>
      </div>
    );

  if (!dealer)
    return (
      <div className="p-8 text-center">
        <p className="text-yellow-600 mb-4">
          Dealer not found
        </p>
        <button
          onClick={() => navigate("/dealers")}
          className="px-4 py-2 bg-yellow-600 text-white rounded"
        >
          Back to Dealers
        </button>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ============================== HEADER ============================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dealers")}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dealer Profile
            </h1>
            <p className="text-sm text-gray-500">
              Detailed overview and performance insights
            </p>
          </div>
        </div>

        <div className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {capitalize(dealer.status)}
        </div>
      </div>

      {/* Dealer Information Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Dealer Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <InfoItem icon={<FiUser />} label="Full Name" value={capitalize(dealer.employee_name)} />
          <InfoItem icon={<FiBox />} label="Shop Name" value={capitalize(dealer.shop_name)} />
          <InfoItem icon={<FiPhone />} label="Phone Number" value={dealer.employee_phone} />
          <InfoItem icon={<FiMail />} label="Email Address" value={dealer.employee_email} />
          <InfoItem icon={<FiMapPin />} label="Town" value={capitalize(dealer.town)} />
          <InfoItem icon={<FiMapPin />} label="District" value={capitalize(dealer.district)} />
          <InfoItem icon={<FiMapPin />} label="Address" value={dealer.address} />
          <InfoItem icon={<FiCalendar />} label="Created On" value={formatDate(dealer.created_at)} />
        </div>
      </div>

      {/* Dealer Discounts Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center px-8 py-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#9333EA]">
              <FiPercent size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Dealer Discounts
              </h2>
              <p className="text-sm text-gray-500">
                Manage pricing rules & discount configurations
              </p>
            </div>
          </div>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow hover:opacity-90 transition"
          >
            <FiPlus size={16} />
            Add Discounts
          </button>
        </div>

        <div className="p-8">
          {discountState.loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-[#9333EA] border-t-transparent rounded-full" />
            </div>
          )}

          {!discountState.loading && discounts.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No discounts configured.
            </div>
          )}

          {!discountState.loading && discounts.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left">Brand</th>
                      <th className="px-6 py-3 text-left">Model</th>
                      <th className="px-6 py-3 text-left">Value</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {discounts.map((d) => (
                      <tr key={d.dealer_discount_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{d.brand_name}</td>
                        <td className="px-6 py-4">{d.model_name}</td>
                        <td className="px-6 py-4 font-semibold">
                          {d.discount_value}
                          {d.is_percentage ? "%" : " ₹"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700">
                            {d.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(d.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Professional Pagination */}
              <div className="flex justify-between items-center mt-8">
                <p className="text-sm text-gray-500">
                  Showing page {discountState.page} of{" "}
                  {Math.ceil(discountState.total / discountState.limit) || 1}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => loadDiscounts(discountState.page - 1)}
                    disabled={discountState.page <= 1}
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadDiscounts(discountState.page + 1)}
                    disabled={
                      discountState.page * discountState.limit >= discountState.total
                    }
                    className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===================== ADD DISCOUNTS MODAL ===================== */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

            {/* ---------------- Header ---------------- */}
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-2xl font-semibold text-gray-900">
                Add Dealer Discounts
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure multiple pricing rules for this dealer
              </p>
            </div>

            {/* ---------------- Body ---------------- */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

              {bulkError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {bulkError}
                </div>
              )}

              {bulkRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-6 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-6"
                >
                  {/* Row Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Discount {idx + 1}
                    </h4>

                    {bulkRows.length > 1 && (
                      <button
                        onClick={() =>
                          setBulkRows((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* ---------------- Main Fields ---------------- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* Brand */}
                    <CustomSelect
                      value={row.brand_name}
                      onChange={(e) =>
                        setBulkRows((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, brand_name: e.target.value, model_name: "" }
                              : r
                          )
                        )
                      }
                      options={allBrands.map((b) => b.brand_name)}
                      placeholder="Select Brand"
                    />

                    {/* Model */}
                    <CustomSelect
                      value={row.model_name}
                      onChange={(e) =>
                        setBulkRows((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, model_name: e.target.value }
                              : r
                          )
                        )
                      }
                      options={
                        brandToModels[row.brand_name?.toLowerCase()] || []
                      }
                      placeholder="Select Model"
                      disabled={!row.brand_name}
                    />

                    {/* Discount Input */}
                    <div className="space-y-1">
                      <input
                        type="number"
                        min="0"
                        max={row.is_percentage ? 100 : undefined}
                        value={row.discount_value}
                        onChange={(e) => {
                          let value = e.target.value;

                          if (row.is_percentage && Number(value) > 100) {
                            value = 100;
                          }

                          setBulkRows((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, discount_value: value }
                                : r
                            )
                          );
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 transition"
                        placeholder="Enter Discount"
                      />

                      {row.is_percentage && Number(row.discount_value) > 100 && (
                        <p className="text-xs text-red-500">
                          Percentage cannot exceed 100%
                        </p>
                      )}
                    </div>

                    {/* Segmented Toggle */}
                    <div className="flex items-center justify-center">
                      <div className="flex bg-gray-200 rounded-full p-1 shadow-inner">

                        <button
                          type="button"
                          onClick={() =>
                            setBulkRows((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? { ...r, is_percentage: false }
                                  : r
                              )
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded-full transition
                      ${!row.is_percentage
                              ? "bg-white shadow text-[#9333EA]"
                              : "text-gray-600"
                            }`}
                        >
                          ₹
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setBulkRows((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? { ...r, is_percentage: true }
                                  : r
                              )
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded-full transition
                      ${row.is_percentage
                              ? "bg-white shadow text-[#9333EA]"
                              : "text-gray-600"
                            }`}
                        >
                          %
                        </button>

                      </div>
                    </div>
                  </div>

                  {/* ---------------- Description ---------------- */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Description (Optional)
                    </label>

                    <textarea
                      rows={3}
                      maxLength={200}
                      value={row.description || ""}
                      onChange={(e) =>
                        setBulkRows((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, description: e.target.value }
                              : r
                          )
                        )
                      }
                      placeholder="Enter discount description (e.g., Festive Offer for Diwali 2026...)"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 resize-none transition"
                    />

                    <div className="text-xs text-gray-400 text-right">
                      {(row.description?.length || 0)}/200
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ---------------- Footer ---------------- */}
            <div className="px-8 py-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">

              <button
                onClick={() =>
                  setBulkRows((prev) => [...prev, createEmptyRow()])
                }
                className="px-5 py-2.5 border border-[#9333EA] text-[#9333EA] rounded-xl hover:bg-[#9333EA]/5 transition"
              >
                + Add Another
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>

                <button
                  disabled={bulkSubmitting}
                  onClick={handleSubmitDiscounts}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white rounded-xl shadow hover:opacity-90 transition disabled:opacity-50"
                >
                  {bulkSubmitting ? "Saving..." : "Save Discounts"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Orders Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h2 className="text-lg font-semibold mb-6">
          Orders Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Orders" value={orderStats.total} color="blue" />
          <StatCard title="Pending" value={orderStats.pending} color="yellow" />
          <StatCard title="In Production" value={orderStats.inProduction} color="purple" />
          <StatCard title="Delivered" value={orderStats.delivered} color="emerald" />
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h2 className="text-lg font-semibold mb-6">
          Order History
        </h2>

        {dealerOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No orders found for this dealer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">Order ID</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Items</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dealerOrders.map(({ order }) => (
                  <tr key={order.order_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {getTotalItems(order.order_details)} Items
                    </td>
                    <td className="px-6 py-4">
                      {order.status}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          navigate(`/orders/${order.order_number}`)
                        }
                        className="text-[#9333EA] font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerDetails;