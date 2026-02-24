import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

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

const DealerDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [dealer, setDealer] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [discountsError, setDiscountsError] = useState('');
  const [discountsPage, setDiscountsPage] = useState(1);
  const [discountsLimit] = useState(5);
  const [discountsTotal, setDiscountsTotal] = useState(0);

  const [brandToModels, setBrandToModels] = useState({});
  const [allBrands, setAllBrands] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const createEmptyRow = () => ({
    id: crypto.randomUUID(),
    brand_name: '',
    model_name: '',
    discount_value: '',
    is_percentage: true,
    description: ''
  });

  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inProduction: 0,
    packed: 0,
    delivered: 0,
    cancelled: 0,
  });

  const resetBulkModal = () => {
    setBulkRows([createEmptyRow()]);
    setBulkError('');
    setBulkSubmitting(false);
  };

  const handleOpenBulkModal = () => {
    resetBulkModal();
    setBulkModalOpen(true);
  };

  const handleCloseBulkModal = () => {
    setBulkModalOpen(false);
    resetBulkModal();
  };


  const loadDiscounts = useCallback(
    async (page = 1) => {
      if (!id) return;

      setDiscountsLoading(true);
      setDiscountsError("");

      try {
        const res = await fetchDealerDiscounts({
          page,
          limit: discountsLimit,
          dealer_id: id,
        });

        if (!res?.success) {
          throw new Error(res?.message || "Failed to fetch discounts.");
        }

        const {
          data = [],
          pagination = { page, total: 0 },
        } = res;

        setDiscounts(data);
        setDiscountsTotal(pagination.total || 0);
        setDiscountsPage(pagination.page || page);

      } catch (error) {
        setDiscounts([]);
        setDiscountsTotal(0);
        setDiscountsError(error.message);
      } finally {
        setDiscountsLoading(false);
      }
    },
    [id, discountsLimit]
  );

  useEffect(() => {
    const loadDealerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dealer details and orders concurrently
        const [dealerResponse, ordersResponse] = await Promise.all([
          fetchDealerById(id),
          fetchOrders()
        ]);

        if (dealerResponse.success) {
          setDealer(dealerResponse.data);
        } else {
          setError(dealerResponse.message || 'Failed to load dealer details');
          return;
        }

        if (ordersResponse.success) {
          // Filter orders for this specific dealer
          const filteredOrders = ordersResponse.data.filter(orderData => {
            const order = orderData.order;
            return order && order.dealer_id === id;
          });
          setDealerOrders(filteredOrders);
        } else {
          console.warn('Failed to load orders:', ordersResponse.message);
          setDealerOrders([]);
        }
      } catch (err) {
        console.error('Error loading dealer data:', err);
        setError('Failed to load dealer data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadDealerData();
      loadDiscounts(1);
      loadOrderSummary();
    }
  }, [id, loadDiscounts, loadOrderSummary]);

  useEffect(() => {
    const loadBrands = async () => {
      if (!id) return;

      try {
        const res = await getBrandsByDealer(id, 'active');
        if (res?.success && Array.isArray(res.data)) {
          setAllBrands(res.data);
        } else {
          setAllBrands([]);
        }
      } catch (err) {
        console.error('Failed to load brands for dealer', err);
        setAllBrands([]);
      }
    };
    loadBrands();
  }, [id]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchProducts();
        const map = {};
        if (res?.success && Array.isArray(res.data)) {
          res.data.forEach((p) => {
            const brandNameRaw = p.brand_name || p.brand || (typeof p.brand === 'object' ? p.brand?.name : undefined);
            const modelName = p.model_name || p.model || p.modelNo || p.model;
            const brandName = typeof brandNameRaw === 'string' ? brandNameRaw.trim() : brandNameRaw;
            if (!brandName || !modelName) return;
            const key = String(brandName).toLowerCase();
            if (!map[key]) map[key] = new Set();
            map[key].add(String(modelName));
          });
        }
        // convert sets to arrays
        const normalized = Object.keys(map).reduce((acc, k) => {
          acc[k] = Array.from(map[k]).sort();
          return acc;
        }, {});
        setBrandToModels(normalized);
      } catch (err) {
        console.error('Failed to load products for models', err);
      }
    };
    loadProducts();
  }, []);

  const loadOrderSummary = useCallback(async () => {
    if (!id) return;

    try {
      const statuses = {
        total: null,
        pending: "PENDING",
        inProduction: "PRODUCTION",
        packed: "PACKED",
        delivered: "DELIVERED",
      };

      const results = {};

      for (const key in statuses) {
        const statusValue = statuses[key];

        const res = await fetchOrders({
          page: 1,
          limit: 1,
          dealer: id,
          status: statusValue,
        });

        if (res?.success) {
          results[key] = res.pagination?.total || 0;
        } else {
          results[key] = 0;
        }
      }

      setOrderStats(results);

    } catch (error) {
      console.error("Failed to load order summary", error);
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700';
      case 'low':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'in production':
        return 'bg-blue-50 text-blue-700';
      case 'packed':
        return 'bg-purple-50 text-purple-700';
      case 'delivered':
        return 'bg-green-50 text-green-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  // ================= Reusable Form Field =================
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
      <p className={`text-sm font-medium text-${color}-600`}>
        {title}
      </p>
      <p className={`text-3xl font-bold text-${color}-700 mt-2`}>
        {value}
      </p>
    </div>
  );

  const capitalize = (text) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1) : "N/A";

  const statusBadge = (status) =>
    status === "active"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-red-50 text-red-700 border border-red-200";

  const getTotalItems = (orderDetails) => {
    if (!orderDetails || !Array.isArray(orderDetails)) return 0;
    return orderDetails.reduce((total, item) => total + (item.qty_ordered || 0), 0);
  };

  const handleDescriptionChange = (value, rowId) => {
    setBulkRows(prev =>
      prev.map(r =>
        r.id === rowId
          ? { ...r, description: value }
          : r
      )
    );
  };

  const handleSubmitDiscounts = async () => {
    try {
      setBulkSubmitting(true);
      setBulkError("");

      const payload = bulkRows
        .filter(r => r.brand_name && r.model_name && r.discount_value)
        .map(r => ({
          dealer_id: id,
          brand_name: r.brand_name,
          model_name: r.model_name,
          discount_value: Number(r.discount_value),
          is_percentage: Boolean(r.is_percentage),
          description: r.description?.trim() || "",
        }));

      if (!payload.length) {
        setBulkError("Please configure at least one valid discount.");
        return;
      }

      const res = await createDealerDiscounts(payload);

      if (!res?.success) {
        setBulkError(res?.message || "Failed to create discounts.");
        return;
      }

      await loadDiscounts(discountsPage);
      handleCloseBulkModal();

      Swal.fire({
        icon: "success",
        title: "Success",
        text: res.message || "Discounts added successfully",
      });

    } catch (err) {
      setBulkError(err?.message || "Network error occurred.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9333EA] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dealer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dealers')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-600 mb-4">Dealer not found</p>
          <button
            onClick={() => navigate('/dealers')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dealers')}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dealer Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Detailed overview and performance insights
            </p>
          </div>
        </div>

        <div className={`px-3 py-1 text-xs font-semibold rounded-full ${statusBadge(dealer.status)}`}>
          {capitalize(dealer.status)}
        </div>
      </div>

      {/* Dealer Information Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6">
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
      </div>

      {/* Dealer Discounts Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-50 text-[#9333EA]">
              <FiPercent size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Dealer Discounts
              </h2>
              <p className="text-sm text-gray-500">
                Manage pricing rules and discount configurations
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenBulkModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9333EA] text-white hover:bg-[#7e22ce] transition shadow-sm"
          >
            <FiPlus size={16} />
            Add Discounts
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">

          {discountsLoading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-2 border-[#9333EA] border-t-transparent rounded-full"></div>
            </div>
          )}

          {!discountsLoading && discountsError && (
            <div className="text-center text-red-600 text-sm py-6">
              {discountsError}
            </div>
          )}

          {!discountsLoading && !discountsError && discounts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No discounts configured.</p>
            </div>
          )}

          {!discountsLoading && discounts.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Brand</th>
                      <th className="px-4 py-3 text-left">Model</th>
                      <th className="px-4 py-3 text-left">Value</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {discounts.map((d) => (
                      <tr key={d.dealer_discount_id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            {d.brand_name}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                            {d.model_name}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {d.discount_value}
                          {d.is_percentage ? "%" : " ₹"}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.status?.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-700"
                            }`}>
                            {d.status || "N/A"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-500">
                          {d.created_at
                            ? new Date(d.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-gray-500">
                  Showing page <span className="font-medium">{discountsPage}</span> of{" "}
                  <span className="font-medium">
                    {Math.ceil(discountsTotal / discountsLimit) || 1}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => loadDiscounts(discountsPage - 1)}
                    disabled={discountsPage <= 1}
                    className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Prev
                  </button>

                  <button
                    onClick={() => loadDiscounts(discountsPage + 1)}
                    disabled={discountsPage * discountsLimit >= discountsTotal}
                    className="px-3 py-1.5 rounded-lg border text-sm text-gray-600 border-gray-200 hover:bg-gray-100 disabled:opacity-40"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCloseBulkModal}
        >
          <div
            className="bg-white w-full max-w-6xl mx-4 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Add Dealer Discounts
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure multiple discount rules
                </p>
              </div>

              <button
                onClick={handleCloseBulkModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">

              {bulkError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {bulkError}
                </div>
              )}

              <div className="space-y-6">
                {bulkRows.map((row, idx) => {
                  const modelOptions = row.brand_name
                    ? (
                      allBrands.find(
                        b => (b.brand_name || b.name) === row.brand_name
                      )?.brand_models ||
                      brandToModels[String(row.brand_name).toLowerCase()] ||
                      []
                    )
                    : [];

                  return (
                    <div
                      key={row.id}
                      className="p-6 rounded-xl border border-gray-200 bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-5">
                        <span className="text-sm font-semibold text-gray-700">
                          Discount {idx + 1}
                        </span>

                        {bulkRows.length > 1 && (
                          <button
                            onClick={() =>
                              setBulkRows(prev => prev.filter((_, i) => i !== idx))
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                        <FormField label="Brand">
                          <CustomSelect
                            value={row.brand_name}
                            onChange={(e) =>
                              setBulkRows(prev =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, brand_name: e.target.value, model_name: "" }
                                    : r
                                )
                              )
                            }
                            options={allBrands
                              .map(b => b.brand_name || b.name)
                              .filter(Boolean)
                              .sort()}
                            placeholder="Select brand"
                            searchable
                          />
                        </FormField>

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
                            options={modelOptions}
                            disabled={!row.brand_name}
                            placeholder="Select model"
                            searchable
                          />
                        </FormField>

                        <FormField label="Discount Value">
                          <div className="relative">
                            <input
                              type="number"
                              value={row.discount_value}
                              onChange={(e) =>
                                setBulkRows(prev =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? { ...r, discount_value: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA]"
                              min="0"
                              step="0.01"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-400 text-sm">
                              {row.is_percentage ? "%" : "₹"}
                            </span>
                          </div>
                        </FormField>

                        <FormField label="Type">
                          <div className="flex items-center gap-3">

                            {/* ₹ Label */}
                            <span
                              className={`text-xs font-semibold transition ${!row.is_percentage ? "text-[#9333EA]" : "text-gray-400"
                                }`}
                            >
                              ₹
                            </span>

                            {/* Toggle Switch */}
                            <button
                              type="button"
                              onClick={() =>
                                setBulkRows(prev =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? { ...r, is_percentage: !r.is_percentage }
                                      : r
                                  )
                                )
                              }
                              className={`relative w-14 h-7 rounded-full transition duration-300 ${row.is_percentage
                                ? "bg-[#9333EA]"
                                : "bg-gray-300"
                                }`}
                            >
                              <span
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition duration-300 ${row.is_percentage ? "translate-x-7" : ""
                                  }`}
                              />
                            </button>

                            {/* % Label */}
                            <span
                              className={`text-xs font-semibold transition ${row.is_percentage ? "text-[#9333EA]" : "text-gray-400"
                                }`}
                            >
                              %
                            </span>

                          </div>
                        </FormField>

                      </div>

                      <div className="mt-6">
                        <FormField label="Description (Optional)">
                          <div className="relative">
                            <textarea
                              rows={4}
                              maxLength={200}
                              value={row.description || ""}
                              onChange={(e) =>
                                handleDescriptionChange(e.target.value, row.id)
                              }
                              placeholder="Enter full discount description (e.g. Festive Offer for Diwali 2026 on Samsung premium models...)"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#9333EA]/20 focus:border-[#9333EA]
                   transition duration-200 resize-none"
                            />

                            <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                              {(row.description?.length || 0)}/200
                            </div>
                          </div>
                        </FormField>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <button
                  onClick={() =>
                    setBulkRows(prev => [...prev, createEmptyRow()])
                  }
                  className="px-4 py-2 border border-[#9333EA] text-[#9333EA] rounded-lg hover:bg-[#9333EA]/5 transition"
                >
                  + Add Another Discount
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-8 py-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleCloseBulkModal}
                className="px-5 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                disabled={bulkSubmitting}
                onClick={handleSubmitDiscounts}
                className="px-6 py-2 bg-[#9333EA] text-white rounded-lg hover:bg-[#7e22ce] transition disabled:opacity-50"
              >
                {bulkSubmitting ? "Saving..." : "Save Discounts"}
              </button>
            </div>

          </div>
        </div>
      )
      }

      {/* Orders Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPackage className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Orders Summary</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Overview of dealer's orders</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Orders" value={orderStats.total} color="blue" />
            <StatCard title="Pending" value={orderStats.pending} color="yellow" />
            <StatCard title="In Production" value={orderStats.inProduction} color="purple" />
            <StatCard title="Delivered" value={orderStats.delivered} color="emerald" />
          </div>
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiTruck className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">All orders placed by this dealer</p>

          {dealerOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No orders found for this dealer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerOrders.map((orderData) => {
                    const order = orderData.order;
                    if (!order) return null;

                    return (
                      <tr key={order.order_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900 font-mono">{order.order_number}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {getTotalItems(order.order_details)} Items
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                            {order.priority || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                            {order.status || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {order.order_details?.[0]?.delivery_date
                              ? formatDate(order.order_details[0].delivery_date)
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => navigate(`/orders/${order.order_number}`)}
                            className="text-sm font-medium text-[#9333EA] hover:text-[#7928CC] hover:bg-[#9333EA]/5 px-2 py-1 rounded transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default DealerDetails; 