import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  FiSearch,
  FiEdit3,
} from "react-icons/fi";
import Swal from "sweetalert2";

import {
  fetchDealerById,
  fetchDealerDiscounts,
  createDealerDiscounts,
  updateDealerDiscount,
} from "../api/dealer";
import { getBrandsByDealer } from "../api/brands";
import { fetchOrders } from "../api/orders";
import { fetchProducts, fetchProductsByBrands } from "../api/products";
import CustomSelect from "../components/CustomSelect";
import { getPriorityStyle, getStatusStyle, ORDER_STATUS_LIST, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";

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

const InfoItem = ({ icon, label, value }) => {
  return (
    <div className="flex items-start gap-4 group">

      {/* Icon */}
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
        {icon}
      </div>

      {/* Text Content */}
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>

        <span className="text-sm font-semibold text-gray-900 mt-1 break-words">
          {value || "—"}
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className={`p-6 rounded-2xl border shadow-sm bg-${color}-50/40`}>
    <p className={`text-sm font-medium text-${color}-600`}>{title}</p>
    <p className={`text-3xl font-bold text-${color}-700 mt-2`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const style = getStatusStyle(status);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${style}`}
    >
      {status}
    </span>
  );
};

// 🔹 NEW: Professional Priority Badge
const PriorityBadge = ({ priority }) => {
  const style = getPriorityStyle(priority);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${style}`}
    >
      {priority || "N/A"}
    </span>
  );
};


/* -------------------------------------------------------------------------- */
/*                               HELPER METHODS                               */
/* -------------------------------------------------------------------------- */

const createEmptyRow = () => ({
  id: crypto.randomUUID(),
  brand_name: "",
  model_name: "",
  product_ids: [],
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

  const [allBrands, setAllBrands] = useState([]);
  const [productsByBrand, setProductsByBrand] = useState({});

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inProduction: 0,
    inPacking: 0,
    delivered: 0,
    cancelled: 0,
  });

  // 🔹 NEW: Order filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  const [editDiscountModalOpen, setEditDiscountModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [originalDiscount, setOriginalDiscount] = useState(null);

  // 🔹 NEW: Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
  });

  const buildBrandModelMap = (brands = []) =>
    brands.reduce((map, brand) => {
      if (!brand?.brand_name) return map;

      const models = Array.isArray(brand.brand_models)
        ? brand.brand_models
        : [];

      map[brand.brand_name] = models;

      if (brand.brand_id) {
        map[brand.brand_id] = models;
      }

      return map;
    }, {});

  const brandToModels = useMemo(() => {
    return buildBrandModelMap(allBrands);
  }, [allBrands]);

  /* ----------------------------- DATA LOADERS ---------------------------- */

  const loadDealerData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const dealerRes = await fetchDealerById(id);

      if (!dealerRes?.success) {
        throw new Error(
          dealerRes?.message || "Failed to load dealer details"
        );
      }

      setDealer(dealerRes.data);

      // 🔹 Orders fetch (with filters + pagination)
      const ordersRes = await fetchOrders({
        page: pagination.page,
        limit: pagination.limit,
        dealer: id,
        status:
          selectedStatus && selectedStatus !== "ALL"
            ? selectedStatus.toUpperCase()
            : undefined,
        priority:
          selectedPriority && selectedPriority !== "ALL"
            ? selectedPriority.toUpperCase()
            : undefined,
        search: searchQuery || undefined,
      });

      if (ordersRes?.success) {
        setDealerOrders(ordersRes.data || []);
        setPagination((prev) => ({
          ...prev,
          total: ordersRes.pagination?.total || 0,
        }));
      } else {
        setDealerOrders([]);
      }

    } catch (err) {
      setError(err.message || "Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [
    id,
    pagination.page,
    pagination.limit,
    selectedStatus,
    selectedPriority,
    searchQuery,
  ]);

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

    if (loadOrderSummary.loading) return;
    loadOrderSummary.loading = true;

    try {
      const statuses = [
        { key: "total", value: null },
        { key: "pending", value: "PENDING" },
        { key: "inProduction", value: "PRODUCTION" },
        { key: "inPacking", value: "PACKED" },
        { key: "delivered", value: "DELIVERED" },
        { key: "cancelled", value: "CANCELLED" },
      ];

      const stats = {
        total: 0,
        pending: 0,
        inProduction: 0,
        inPacking: 0,
        delivered: 0,
        cancelled: 0,
      };

      // 🔹 IMPROVED: Sequential calls (prevents rate limit burst)
      for (const statusObj of statuses) {
        try {
          const res = await fetchOrders({
            page: 1,
            limit: 1,
            dealer: id,
            status: statusObj.value,
          });

          if (res?.success) {
            stats[statusObj.key] = res.pagination?.total || 0;
          }

          // 🔹 NEW: Small delay to avoid server burst
          await new Promise((resolve) => setTimeout(resolve, 120));

        } catch (err) {
          console.error(`Failed for status ${statusObj.value}`, err);
        }
      }

      setOrderStats(stats);
    } catch (err) {
      console.error("Order summary load failed:", err);
    } finally {
      loadOrderSummary.loading = false;
    }
  }, [id]);

  const loadBrands = useCallback(async () => {
    try {
      const brandsRes = await getBrandsByDealer(id, "active");

      if (!brandsRes?.success) {
        throw new Error(brandsRes?.message || "Failed to load brands");
      }

      const brands = brandsRes.data || [];

      setAllBrands(brands);
    } catch (err) {
      console.error("Brand load failed:", err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadDealerData();
    loadDiscounts(1);
    loadOrderSummary();
    loadBrands();
  }, [id, pagination.page, pagination.limit, selectedStatus, selectedPriority, searchQuery]);

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
          product_ids: r.product_ids,
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

  const handleUpdateDiscount = async () => {
    try {
      const payload = buildUpdatePayload(selectedDiscount, originalDiscount);

      // If nothing changed
      if (Object.keys(payload).length === 1) {
        Swal.fire({
          icon: "info",
          title: "No Changes",
          text: "No changes detected.",
        });
        return;
      }

      const res = await updateDealerDiscount(payload);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update discount");
      }

      Swal.fire({
        icon: "success",
        title: "Updated",
        text: res.message || "Discount updated successfully",
      });

      setEditDiscountModalOpen(false);

      // refresh table
      await loadDiscounts(discountState.page);

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message,
      });
    }
  };

  const openEditDiscountModal = async (discount) => {

    const cleanDiscount = {
      ...discount,
      description: discount.description || "",
      product_ids: discount.product_ids || [],
    };

    setSelectedDiscount(cleanDiscount);
    setOriginalDiscount(cleanDiscount);

    // fetch products for brand
    if (!productsByBrand[discount.brand_name]) {
      try {
        const res = await fetchProductsByBrands([discount.brand_name]);

        if (res?.success) {
          setProductsByBrand((prev) => ({
            ...prev,
            [discount.brand_name]: res.data,
          }));
        }
      } catch (err) {
        console.error("Product fetch failed:", err);
      }
    }

    setEditDiscountModalOpen(true);
  };

  const buildUpdatePayload = (current, original) => {
    const payload = {
      dealer_discount_id: current.dealer_discount_id,
    };

    if (Number(current.discount_value) !== Number(original.discount_value)) {
      payload.discount_value = Number(current.discount_value);
    }

    if (Boolean(current.is_percentage) !== Boolean(original.is_percentage)) {
      payload.is_percentage = Boolean(current.is_percentage);
    }

    if ((current.description || "") !== (original.description || "")) {
      payload.description = current.description || "";
    }

    if (
      JSON.stringify(current.product_ids || []) !==
      JSON.stringify(original.product_ids || [])
    ) {
      payload.product_ids = current.product_ids || [];
    }

    return payload;
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
          {capitalizeFirstLetter(dealer.status)}
        </div>
      </div>

      {/* 🔹 Dealer Information Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              Dealer Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete profile and registration details
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">

            <InfoItem
              icon={<FiUser />}
              label="Full Name"
              value={capitalizeFirstLetter(dealer.employee_name)}
            />

            <InfoItem
              icon={<FiBox />}
              label="Shop Name"
              value={capitalizeFirstLetter(dealer.shop_name)}
            />

            <InfoItem
              icon={<FiPhone />}
              label="Phone Number"
              value={dealer.employee_phone}
            />

            <InfoItem
              icon={<FiMail />}
              label="Email Address"
              value={dealer.employee_email}
            />

            <InfoItem
              icon={<FiMapPin />}
              label="Town"
              value={capitalizeFirstLetter(dealer.town)}
            />

            <InfoItem
              icon={<FiMapPin />}
              label="District"
              value={capitalizeFirstLetter(dealer.district)}
            />

            <InfoItem
              icon={<FiMapPin />}
              label="Address"
              value={dealer.address}
            />

            <InfoItem
              icon={<FiCalendar />}
              label="Created On"
              value={formatDate(dealer.created_at)}
            />
          </div>
        </div>
      </div>

      {/* 🔹 Dealer Brands Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ===================== Header ===================== */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#9333EA]">
              🏷️
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Dealer Brands & Models
              </h2>
              <p className="text-sm text-gray-500">
                Assigned brands and available models
              </p>
            </div>
          </div>

          {dealer?.brand?.length > 0 && (
            <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {dealer.brand.length} Brands
            </span>
          )}
        </div>

        {/* ===================== Body ===================== */}
        <div className="px-8 py-8">

          {!dealer?.brand || dealer.brand.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-medium text-gray-700">
                No brands assigned
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Assign brands and models to enable product access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">

              {dealer.brand.map((brand, index) => {
                const models = brandToModels[brand] || [];

                return (
                  <div
                    key={index}
                    className="relative pl-4"
                  >
                    {/* Left Accent Line */}
                    <div className="absolute left-0 top-1 h-5 w-1 bg-[#9333EA] rounded-full" />

                    {/* Brand Name */}
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      {brand}
                    </h3>

                    {/* Models */}
                    {models.length > 0 ? (
                      <ul className="space-y-1">
                        {models.map((model, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 italic"
                          >
                            {model}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No models assigned
                      </p>
                    )}
                  </div>
                );
              })}

            </div>
          )}
        </div>
      </div>

      {/* 🔹 Dealer Discounts Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/40 to-white">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-[#9333EA] shadow-sm">
              <FiPercent size={18} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                Dealer Discounts
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage pricing rules & discount configurations
              </p>
            </div>
          </div>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            <FiPlus size={16} />
            Add Discounts
          </button>
        </div>

        {/* Body */}
        <div className="p-8">

          {/* Loading */}
          {discountState.loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin h-10 w-10 border-2 border-[#9333EA] border-t-transparent rounded-full mb-4" />
              <p className="text-sm text-gray-500">Loading discount data...</p>
            </div>
          )}

          {/* Empty State */}
          {!discountState.loading && discounts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <FiPercent size={22} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                No discounts configured
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Start by adding pricing rules for this dealer.
              </p>
            </div>
          )}

          {/* Table */}
          {!discountState.loading && discounts.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4 text-left">Brand</th>
                      <th className="px-6 py-4 text-left">Model</th>
                      <th className="px-6 py-4 text-left">Discount</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-left">Created</th>
                      <th className="px-6 py-4 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {discounts.map((d) => (
                      <tr
                        key={d.dealer_discount_id}
                        className="hover:bg-gray-50 transition"
                      >
                        {/* Brand */}
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {d.brand_name}
                        </td>

                        {/* Model */}
                        <td className="px-6 py-4 text-gray-600">
                          {d.model_name}
                        </td>

                        {/* Discount */}
                        <td className="px-6 py-4 font-semibold text-[#9333EA]">
                          {d.discount_value}
                          {d.is_percentage ? "%" : " ₹"}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs rounded-full font-medium
              ${d.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                            }`}>
                            {d.status}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(d.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openEditDiscountModal(d)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-[#9333EA] hover:bg-purple-50 transition"
                          >
                            <FiEdit3 size={18} />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-10">
                <p className="text-sm text-gray-500">
                  Showing page {discountState.page} of{" "}
                  {Math.ceil(discountState.total / discountState.limit) || 1}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => loadDiscounts(discountState.page - 1)}
                    disabled={discountState.page <= 1}
                    className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => loadDiscounts(discountState.page + 1)}
                    disabled={
                      discountState.page * discountState.limit >= discountState.total
                    }
                    className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="relative w-full max-w-6xl mx-4 bg-white rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-10 py-7 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-2xl font-semibold text-gray-900">
                Add Dealer Discounts
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure pricing rules for this dealer across brands, models and products.
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 bg-gray-50">

              {bulkError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {bulkError}
                </div>
              )}

              {bulkRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-8 space-y-6"
                >

                  {/* Row Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Discount Rule {idx + 1}
                    </h4>

                    {bulkRows.length > 1 && (
                      <button
                        onClick={() =>
                          setBulkRows(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Main Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Brand */}
                    <FormField label="Brand">
                      <CustomSelect
                        value={row.brand_name}
                        onChange={async (e) => {
                          const selectedBrand = e.target.value;

                          setBulkRows(prev =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                  ...r,
                                  brand_name: selectedBrand,
                                  model_name: "",
                                  product_ids: [],
                                }
                                : r
                            )
                          );

                          if (!productsByBrand[selectedBrand]) {
                            try {
                              const res = await fetchProductsByBrands([selectedBrand]);

                              if (res?.success && res?.data) {
                                setProductsByBrand(prev => ({
                                  ...prev,
                                  [selectedBrand]: res.data,
                                }));
                              }
                            } catch (err) {
                              console.error("Product fetch failed:", err);
                            }
                          }
                        }}
                        options={allBrands.map(b => b.brand_name)}
                        placeholder="Select Brand"
                      />
                    </FormField>

                    {/* Model */}
                    <FormField label="Model">
                      <CustomSelect
                        value={row.model_name}
                        onChange={(e) =>
                          setBulkRows(prev =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, model_name: e.target.value }
                                : r
                            )
                          )
                        }
                        options={
                          row.brand_name
                            ? brandToModels[row.brand_name] || []
                            : []
                        }
                        placeholder="Select Model"
                        disabled={!row.brand_name}
                      />
                    </FormField>

                    {/* ---------------- Discount (Type + Value Same Row) ---------------- */}
                    <FormField label="Discount">
                      <div className="flex items-center gap-3">

                        {/* Discount Value */}
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

                            setBulkRows(prev =>
                              prev.map((r, i) =>
                                i === idx
                                  ? { ...r, discount_value: value }
                                  : r
                              )
                            );
                          }}
                          placeholder="Enter Discount"
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#9333EA]/20 focus:outline-none"
                        />

                        {/* Toggle */}
                        <div className="flex bg-gray-100 rounded-full p-1 shrink-0">

                          <button
                            type="button"
                            onClick={() =>
                              setBulkRows(prev =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, is_percentage: false }
                                    : r
                                )
                              )
                            }
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${!row.is_percentage
                              ? "bg-white shadow text-[#9333EA]"
                              : "text-gray-600"
                              }`}
                          >
                            ₹
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setBulkRows(prev =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, is_percentage: true }
                                    : r
                                )
                              )
                            }
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${row.is_percentage
                              ? "bg-white shadow text-[#9333EA]"
                              : "text-gray-600"
                              }`}
                          >
                            %
                          </button>

                        </div>

                      </div>
                    </FormField>

                    {/* ---------------- Product Selector (Multiple like CustomSelect) ---------------- */}
                    <FormField label="Products">
                      <select
                        multiple
                        value={row.product_ids || []}
                        onChange={(e) => {
                          const selectedProducts = Array.from(
                            e.target.selectedOptions
                          ).map((o) => o.value);

                          setBulkRows(prev =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, product_ids: selectedProducts }
                                : r
                            )
                          );
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#9333EA]/20 focus:outline-none min-h-[120px]"
                      >
                        {(productsByBrand[row.brand_name] || [])
                          .filter((p) =>
                            row.model_name
                              ? p.model === row.model_name ||
                              p.model_name === row.model_name
                              : true
                          )
                          .map((product) => (
                            <option
                              key={product.product_id}
                              value={product.product_id}
                            >
                              {product.product_name} ({product.model || product.model_name})
                            </option>
                          ))}
                      </select>

                      <p className="text-xs text-gray-400 mt-1">
                        Hold <b>Ctrl</b> / <b>Cmd</b> to select multiple products
                      </p>

                    </FormField>
                  </div>

                  {/* Description */}
                  <FormField label="Description (Optional)">
                    <textarea
                      rows={3}
                      maxLength={200}
                      value={row.description || ""}
                      onChange={(e) =>
                        setBulkRows(prev =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, description: e.target.value }
                              : r
                          )
                        )
                      }
                      placeholder="Example: Diwali promotional discount"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#9333EA]/20 focus:outline-none resize-none"
                    />

                    <div className="text-xs text-gray-400 text-right">
                      {(row.description?.length || 0)}/200
                    </div>
                  </FormField>

                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-10 py-6 border-t border-gray-100 flex justify-between items-center bg-white">

              <button
                onClick={() =>
                  setBulkRows(prev => [...prev, createEmptyRow()])
                }
                className="px-5 py-2.5 border border-[#9333EA] text-[#9333EA] rounded-xl hover:bg-[#9333EA]/5 transition"
              >
                + Add Rule
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

      {/* ===================== EDIT DISCOUNTS MODAL ===================== */}
      {editDiscountModalOpen && selectedDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Discount Rule
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Update pricing configuration for this dealer
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">

              {/* Brand + Model */}
              <div className="grid grid-cols-2 gap-4">

                <FormField label="Brand">
                  <input
                    value={selectedDiscount.brand_name}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
                  />
                </FormField>

                <FormField label="Model">
                  <input
                    value={selectedDiscount.model_name}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
                  />
                </FormField>

              </div>

              {/* Discount */}
              <FormField label="Discount">
                <div className="flex items-center gap-3">

                  <input
                    type="number"
                    value={selectedDiscount.discount_value}
                    onChange={(e) =>
                      setSelectedDiscount(prev => ({
                        ...prev,
                        discount_value: e.target.value
                      }))
                    }
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#9333EA]/20"
                  />

                  <div className="flex bg-gray-100 rounded-full p-1">

                    <button
                      onClick={() =>
                        setSelectedDiscount(prev => ({
                          ...prev,
                          is_percentage: false
                        }))
                      }
                      className={`px-4 py-1.5 text-sm rounded-full ${!selectedDiscount.is_percentage
                        ? "bg-white shadow text-[#9333EA]"
                        : "text-gray-600"
                        }`}
                    >
                      ₹
                    </button>

                    <button
                      onClick={() =>
                        setSelectedDiscount(prev => ({
                          ...prev,
                          is_percentage: true
                        }))
                      }
                      className={`px-4 py-1.5 text-sm rounded-full ${selectedDiscount.is_percentage
                        ? "bg-white shadow text-[#9333EA]"
                        : "text-gray-600"
                        }`}
                    >
                      %
                    </button>

                  </div>

                </div>
              </FormField>

              {/* Products */}
              <FormField label="Products">

                <select
                  multiple
                  value={selectedDiscount.product_ids || []}
                  onChange={(e) => {

                    const selected = Array.from(
                      e.target.selectedOptions
                    ).map(o => o.value);

                    setSelectedDiscount(prev => ({
                      ...prev,
                      product_ids: selected
                    }));

                  }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 min-h-[100px]"
                >

                  {(productsByBrand[selectedDiscount.brand_name] || [])
                    .filter(p =>
                      selectedDiscount.model_name
                        ? p.model === selectedDiscount.model_name
                        : true
                    )
                    .map(product => (
                      <option
                        key={product.product_id}
                        value={product.product_id}
                      >
                        {product.product_name} ({product.model})
                      </option>
                    ))}

                </select>

              </FormField>

              {/* Description */}
              <FormField label="Description">

                <textarea
                  rows={3}
                  value={selectedDiscount.description || ""}
                  onChange={(e) =>
                    setSelectedDiscount(prev => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200"
                />

              </FormField>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">

              <button
                onClick={() => setEditDiscountModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdateDiscount}
                className="px-5 py-2 bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white rounded-lg shadow hover:opacity-90"
              >
                Update Discount
              </button>

            </div>

          </div>

        </div>
      )}

      {/* 🔹Orders Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              Orders Summary
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Overview of dealer order activity
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="Total Orders" value={orderStats.total} color="blue" />
            <StatCard title="Pending" value={orderStats.pending} color="yellow" />
            <StatCard title="In Production" value={orderStats.inProduction} color="purple" />
            <StatCard title="In Packing" value={orderStats.inPacking} color="orange" />
            <StatCard title="Delivered" value={orderStats.delivered} color="emerald" />
          </div>
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

        {/* ===================== Header ===================== */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
            Order History
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Complete list of dealer orders and their current status
          </p>
        </div>

        {/* ===================== Filters ===================== */}
        <div className="px-8 py-6 flex flex-col lg:flex-row gap-4 border-b border-gray-100 bg-white">

          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#9333EA]/20 focus:outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-[160px]">
            <CustomSelect
              name="status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={ORDER_STATUS_LIST}
            />
          </div>

          {/* Priority Filter */}
          <div className="min-w-[160px]">
            <CustomSelect
              name="priority"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={PRIORITY_OPTIONS}
            />
          </div>
        </div>

        {/* ===================== Table Section ===================== */}
        <div className="px-8 py-8">

          {dealerOrders.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                📦
              </div>
              <p className="text-sm font-medium text-gray-700">
                No orders found
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Orders placed by this dealer will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-4 text-left">Order ID</th>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Items</th>
                      <th className="px-6 py-4 text-left">Priority</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {dealerOrders.map(({ order }) => (
                      <tr
                        key={order.order_number}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-gray-800">
                          {order.order_number}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(order.created_at)}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-700">
                          {getTotalItems(order.order_details)} Items
                        </td>

                        <td className="px-6 py-4">
                          <PriorityBadge priority={order.priority} />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              navigate(`/orders/${order.order_number}`)
                            }
                            className="inline-flex items-center gap-1 text-[#9333EA] font-medium hover:text-[#7e22ce] transition"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ===================== Pagination ===================== */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                <p className="text-sm text-gray-500">
                  Showing page {pagination.page} of{" "}
                  {Math.ceil(pagination.total / pagination.limit) || 1}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.max(prev.page - 1, 1),
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={
                      pagination.page * pagination.limit >= pagination.total
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </div >
  );
};

export default DealerDetails;