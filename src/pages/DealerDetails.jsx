// dealer-details.jsx — Role-aware version
//
// Changes vs previous version:
//  • "Add Discounts" button — visible only to DISCOUNT_CREATE_ROLES
//  • "Edit discount" pencil  — same guard
//  • "View →" in order table  — visible only to roles allowed on /orders/:id
//  All permission logic is derived from routePermissions + discountPermissions;
//  no raw role strings live in this file.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox, FiCalendar,
  FiPackage, FiTruck, FiPercent, FiPlus, FiTrash2, FiSearch, FiEdit3,
  FiChevronLeft, FiChevronRight, FiAlertCircle, FiTag,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";

import { fetchDealerById, fetchDealerDiscounts, createDealerDiscounts, updateDealerDiscount } from "../api/dealer";
import { getBrandsByDealer } from "../api/brands";
import { fetchOrders } from "../api/orders";
import { fetchProductsByBrands } from "../api/products";
import CustomSelect from "../components/CustomSelect";
import { getPriorityStyle, getStatusStyle, ORDER_STATUS_LIST, PRIORITY_OPTIONS } from "../utils/status";
import { capitalizeFirstLetter } from "../utils/constants";

// ── Permission helpers ────────────────────────────────────────────────
import { canManageDiscounts } from "../utils/discountPermissions";
import { useRouteAccess } from "../hooks/useRouteAccess";

/* ================================================================
   HELPERS
   ================================================================ */
const createEmptyRow = () => ({
  id: crypto.randomUUID(),
  brand_name: "", model_name: "", product_ids: [],
  discount_value: "", is_percentage: true, description: "",
});
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
const getTotalItems = (details = []) =>
  details.reduce((acc, item) => acc + (item.qty_ordered || 0), 0);

/* ================================================================
   SMALL UI ATOMS
   ================================================================ */
const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3.5 px-5 py-4 rounded-xl hover:bg-slate-50/60 transition-colors group">
    <div className="mt-0.5 p-2 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100 group-hover:border-indigo-200 transition-colors flex-shrink-0">
      {React.cloneElement(icon, { size: 13 })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">
        {value || <span className="text-slate-300 font-normal">—</span>}
      </p>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</label>
    {children}
  </div>
);

const SectionCard = ({ title, subtitle, action, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const StatPill = ({ title, value, color }) => {
  const c = {
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    yellow: "text-amber-700 bg-amber-50 border-amber-200",
    purple: "text-violet-700 bg-violet-50 border-violet-200",
    orange: "text-orange-700 bg-orange-50 border-orange-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rose: "text-rose-700 bg-rose-50 border-rose-200",
  }[color] || "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <div className={`rounded-xl border px-5 py-4 ${c.split(" ").slice(1).join(" ")}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70 mb-1">{title}</p>
      <p className={`text-3xl font-black tabular-nums ${c.split(" ")[0]}`}>{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getStatusStyle(status)}`}>
    {status}
  </span>
);

const PriorityBadge = ({ priority }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getPriorityStyle(priority)}`}>
    {priority || "N/A"}
  </span>
);

/* ================================================================
   PRODUCT MULTI-SELECT
   ================================================================ */
function ProductMultiSelect({ products, selected, onChange }) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const filtered = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );
  const toggleProduct = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="min-h-[44px] flex flex-wrap gap-1.5 px-3.5 py-2.5 border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors"
      >
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm font-medium">Select products…</span>
        )}
        {selected.map((id) => {
          const product = products.find((p) => p.product_id === id);
          if (!product) return null;
          return (
            <span
              key={id}
              className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black"
            >
              {product.product_name}
              <button
                onClick={(e) => { e.stopPropagation(); toggleProduct(id); }}
                className="text-indigo-400 hover:text-indigo-700"
              >
                <FiX size={9} />
              </button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((product) => {
              const active = selected.includes(product.product_id);
              return (
                <div
                  key={product.product_id}
                  onClick={() => toggleProduct(product.product_id)}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex justify-between hover:bg-slate-50 transition-colors ${active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"
                    }`}
                >
                  <span>{product.product_name} ({product.model})</span>
                  {active && <span className="text-indigo-600 font-black">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   PAGINATION
   ================================================================ */
const MiniPagination = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center gap-1.5 mt-4 justify-end">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronLeft size={13} />
      </button>
      {visible.map((p, i) => (
        <div key={p} className="flex items-center">
          {i > 0 && p - visible[i - 1] > 1 && (
            <span className="px-1.5 text-slate-300 text-xs">…</span>
          )}
          <button
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === page
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
          >
            {p}
          </button>
        </div>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronRight size={13} />
      </button>
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
const DealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── Permission gates ──────────────────────────────────────────────
  const { canAccess, role } = useRouteAccess();
  const showDiscountActions = canManageDiscounts(role);   // Add / Edit discounts
  const canViewOrderDetails = canAccess("/orders/:id");   // "View →" button

  // ── State ─────────────────────────────────────────────────────────
  const [dealer, setDealer] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [discountState, setDiscountState] = useState({
    loading: false, error: "", page: 1, limit: 5, total: 0,
  });
  const [allBrands, setAllBrands] = useState([]);
  const [productsByBrand, setProductsByBrand] = useState({});
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([createEmptyRow()]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [orderStats, setOrderStats] = useState({
    total: 0, pending: 0, inProduction: 0, inPacking: 0, delivered: 0, cancelled: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [editDiscountModalOpen, setEditDiscountModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [originalDiscount, setOriginalDiscount] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0 });

  const buildBrandModelMap = (brands = []) =>
    brands.reduce((map, brand) => {
      if (!brand?.brand_name) return map;
      const models = Array.isArray(brand.brand_models) ? brand.brand_models : [];
      map[brand.brand_name] = models;
      if (brand.brand_id) map[brand.brand_id] = models;
      return map;
    }, {});

  const brandToModels = useMemo(() => buildBrandModelMap(allBrands), [allBrands]);

  /* ── Data loaders ───────────────────────────────────────────────── */
  const loadDealerData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true); setError(null);
      const dealerRes = await fetchDealerById(id);
      if (!dealerRes?.success) throw new Error(dealerRes?.message || "Failed to load dealer");
      setDealer(dealerRes.data);

      const ordersRes = await fetchOrders({
        page: pagination.page,
        limit: pagination.limit,
        dealer: id,
        status: selectedStatus && selectedStatus !== "ALL" ? selectedStatus.toUpperCase() : undefined,
        priority: selectedPriority && selectedPriority !== "ALL" ? selectedPriority.toUpperCase() : undefined,
        search: searchQuery || undefined,
      });
      if (ordersRes?.success) {
        setDealerOrders(ordersRes.data || []);
        setPagination((prev) => ({ ...prev, total: ordersRes.pagination?.total || 0 }));
      } else {
        setDealerOrders([]);
      }
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [id, pagination.page, pagination.limit, selectedStatus, selectedPriority, searchQuery]);

  const loadDiscounts = useCallback(async (page = 1) => {
    try {
      setDiscountState((s) => ({ ...s, loading: true, error: "" }));
      const res = await fetchDealerDiscounts({ page, limit: discountState.limit, dealer_id: id });
      if (!res?.success) throw new Error(res?.message || "Failed to fetch discounts");
      setDiscounts(res.data || []);
      setDiscountState((s) => ({
        ...s,
        page: res.pagination?.page || page,
        total: res.pagination?.total || 0,
      }));
    } catch (err) {
      setDiscounts([]);
      setDiscountState((s) => ({ ...s, total: 0, error: err.message }));
    } finally {
      setDiscountState((s) => ({ ...s, loading: false }));
    }
  }, [id, discountState.limit]);

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
      const stats = { total: 0, pending: 0, inProduction: 0, inPacking: 0, delivered: 0, cancelled: 0 };
      for (const statusObj of statuses) {
        try {
          const res = await fetchOrders({ page: 1, limit: 1, dealer: id, status: statusObj.value });
          if (res?.success) stats[statusObj.key] = res.pagination?.total || 0;
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
      if (!brandsRes?.success) throw new Error(brandsRes?.message || "Failed to load brands");
      setAllBrands(brandsRes.data || []);
    } catch (err) {
      console.error("Brand load failed:", err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadDealerData(); loadDiscounts(1); loadOrderSummary(); loadBrands();
  }, [id, pagination.page, pagination.limit, selectedStatus, selectedPriority, searchQuery]);

  /* ── Discount CRUD ──────────────────────────────────────────────── */
  const handleSubmitDiscounts = async () => {
    try {
      setBulkSubmitting(true); setBulkError("");
      const payload = bulkRows
        .filter((r) => r.brand_name && r.model_name && r.discount_value)
        .map((r) => ({
          dealer_id: id,
          brand_name: r.brand_name,
          model_name: r.model_name,
          product_ids: r.product_ids,
          discount_value: Number(r.discount_value),
          is_percentage: Boolean(r.is_percentage),
          description: r.description?.trim() || "",
        }));
      if (!payload.length) throw new Error("Please configure at least one valid discount.");
      const res = await createDealerDiscounts(payload);
      if (!res?.success) throw new Error(res?.message);
      await loadDiscounts(discountState.page);
      setBulkModalOpen(false);
      setBulkRows([createEmptyRow()]);
      Swal.fire({ icon: "success", title: "Success", text: res.message || "Discounts added successfully" });
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const buildUpdatePayload = (current, original) => {
    const payload = { dealer_discount_id: current.dealer_discount_id };
    if (Number(current.discount_value) !== Number(original.discount_value))
      payload.discount_value = Number(current.discount_value);
    if (Boolean(current.is_percentage) !== Boolean(original.is_percentage))
      payload.is_percentage = Boolean(current.is_percentage);
    if ((current.description || "") !== (original.description || ""))
      payload.description = current.description || "";
    if (JSON.stringify(current.product_ids || []) !== JSON.stringify(original.product_ids || []))
      payload.product_ids = current.product_ids || [];
    return payload;
  };

  const handleUpdateDiscount = async () => {
    try {
      const payload = buildUpdatePayload(selectedDiscount, originalDiscount);
      if (Object.keys(payload).length === 1) {
        Swal.fire({ icon: "info", title: "No Changes", text: "No changes detected." });
        return;
      }
      const res = await updateDealerDiscount(payload);
      if (!res?.success) throw new Error(res?.message || "Failed to update discount");
      Swal.fire({ icon: "success", title: "Updated", text: res.message || "Discount updated successfully" });
      setEditDiscountModalOpen(false);
      await loadDiscounts(discountState.page);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update Failed", text: err.message });
    }
  };

  const openEditDiscountModal = async (discount) => {
    const cleanDiscount = { ...discount, description: discount.description || "", product_ids: discount.product_ids || [] };
    setSelectedDiscount(cleanDiscount);
    setOriginalDiscount(cleanDiscount);
    if (!productsByBrand[discount.brand_name]) {
      try {
        const res = await fetchProductsByBrands([discount.brand_name]);
        if (res?.success) setProductsByBrand((prev) => ({ ...prev, [discount.brand_name]: res.data }));
      } catch (err) {
        console.error("Product fetch failed:", err);
      }
    }
    setEditDiscountModalOpen(true);
  };

  /* ── Loading / Error states ─────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Loading dealer details…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
          <FiAlertCircle size={24} className="text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button
          onClick={() => navigate("/dealers")}
          className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-all"
        >
          Back to Dealers
        </button>
      </div>
    </div>
  );

  if (!dealer) return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
      <p className="text-sm text-slate-400">Dealer not found</p>
    </div>
  );

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all disabled:bg-slate-50 disabled:text-slate-400";

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate("/dealers")}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <FiArrowLeft size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dealer Profile</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Detailed overview and performance insights</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${dealer.status?.toLowerCase() === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${dealer.status?.toLowerCase() === "active" ? "bg-emerald-500" : "bg-rose-500"
                }`}
            />
            {capitalizeFirstLetter(dealer.status)}
          </span>
        </div>

        {/* ── DEALER INFO ── */}
        <SectionCard title="Dealer Information" subtitle="Profile & Registration">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-1">
            <InfoItem icon={<FiUser />} label="Full Name" value={capitalizeFirstLetter(dealer.employee_name)} />
            <InfoItem icon={<FiBox />} label="Shop Name" value={capitalizeFirstLetter(dealer.shop_name)} />
            <InfoItem icon={<FiPhone />} label="Phone" value={dealer.employee_phone} />
            <InfoItem icon={<FiMail />} label="Email" value={dealer.employee_email} />
            <InfoItem icon={<FiMapPin />} label="Town" value={capitalizeFirstLetter(dealer.town)} />
            <InfoItem icon={<FiMapPin />} label="District" value={capitalizeFirstLetter(dealer.district)} />
            <InfoItem icon={<FiMapPin />} label="Address" value={dealer.address} />
            <InfoItem icon={<FiCalendar />} label="Created On" value={formatDate(dealer.created_at)} />
          </div>
        </SectionCard>

        {/* ── BRANDS & MODELS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FiTag size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Brands & Models</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  Assigned product lines
                </p>
              </div>
            </div>
            {dealer?.brand?.length > 0 && (
              <span className="inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black bg-slate-100 text-slate-600 border-slate-200 uppercase tracking-wide">
                {dealer.brand.length} brands
              </span>
            )}
          </div>
          <div className="p-6">
            {!dealer?.brand || dealer.brand.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm font-semibold text-slate-500">No brands assigned</p>
                <p className="text-xs text-slate-400 mt-1">Assign brands to enable product access.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {dealer.brand.map((brand, index) => {
                  const models = brandToModels[brand] || [];
                  return (
                    <div key={index} className="relative pl-4">
                      <div className="absolute left-0 top-1 h-5 w-1 bg-indigo-500 rounded-full" />
                      <h3 className="text-sm font-bold text-slate-900 mb-2">{brand}</h3>
                      {models.length > 0 ? (
                        <ul className="space-y-1">
                          {models.map((model, i) => (
                            <li key={i} className="text-xs text-slate-500 font-medium italic">{model}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No models assigned</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── DISCOUNTS ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FiPercent size={14} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Dealer Discounts</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  Pricing rules & configurations
                </p>
              </div>
            </div>

            {/* ── ADD DISCOUNTS — role-gated ── */}
            {showDiscountActions && (
              <button
                onClick={() => setBulkModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
              >
                <FiPlus size={13} />Add Discounts
              </button>
            )}
          </div>
          <div className="p-6">
            {discountState.loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            ) : discounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <FiPercent size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No discounts configured</p>
                <p className="text-xs text-slate-400">
                  {showDiscountActions
                    ? "Start by adding pricing rules for this dealer."
                    : "No pricing rules have been set up yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {/* Conditionally include the action column header */}
                        {["Brand", "Model", "Products", "Discount", "Status", "Created", ...(showDiscountActions ? [""] : [])].map(
                          (h, i) => (
                            <th
                              key={i}
                              className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ${showDiscountActions && i === 6 ? "text-right" : "text-left"
                                } whitespace-nowrap`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {discounts.map((d) => (
                        <tr key={d.dealer_discount_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">{d.brand_name}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{d.model_name}</td>
                          <td className="px-5 py-4">
                            {d.products && d.products.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-[280px] max-h-[60px] overflow-y-auto">
                                {d.products.map((p) => {
                                  const originalPrice = p.price || 0;
                                  const discountAmount = d.is_percentage
                                    ? (originalPrice * d.discount_value) / 100
                                    : d.discount_value;
                                  const finalPrice = Math.max(originalPrice - discountAmount, 0);
                                  return (
                                    <div
                                      key={p.product_id}
                                      className="flex flex-col px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100"
                                    >
                                      <span className="text-xs font-semibold text-slate-800">{p.product_name}</span>
                                      <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                        <span className="text-slate-400 line-through">₹{originalPrice}</span>
                                        <span className="font-bold text-indigo-600">₹{finalPrice}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">All products</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black">
                              {d.is_percentage ? `− ${d.discount_value}%` : `− ₹ ${d.discount_value}`}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${d.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${d.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                                  }`}
                              />
                              {d.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                            {formatDate(d.created_at)}
                          </td>

                          {/* ── EDIT button — role-gated ── */}
                          {showDiscountActions && (
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => openEditDiscountModal(d)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                              >
                                <FiEdit3 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {discountState.total > 0 && (
                  <MiniPagination
                    page={discountState.page}
                    total={discountState.total}
                    limit={discountState.limit}
                    onPageChange={(p) => loadDiscounts(p)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* ── ORDER STATS ── */}
        <SectionCard title="Orders Summary" subtitle="Dealer order activity">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatPill title="Total Orders" value={orderStats.total} color="blue" />
            <StatPill title="Pending" value={orderStats.pending} color="yellow" />
            <StatPill title="In Production" value={orderStats.inProduction} color="purple" />
            <StatPill title="In Packing" value={orderStats.inPacking} color="orange" />
            <StatPill title="Delivered" value={orderStats.delivered} color="emerald" />
          </div>
        </SectionCard>

        {/* ── ORDER HISTORY ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800">Order History</h2>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
              Complete list of orders
            </p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              />
            </div>
            <div className="flex gap-2.5">
              <div className="w-44">
                <CustomSelect
                  name="status" value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }}
                  options={ORDER_STATUS_LIST}
                />
              </div>
              <div className="w-44">
                <CustomSelect
                  name="priority" value={selectedPriority}
                  onChange={(e) => { setSelectedPriority(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }}
                  options={PRIORITY_OPTIONS}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            {dealerOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <FiPackage size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No orders found</p>
                <p className="text-xs text-slate-400">Orders placed by this dealer will appear here.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {/* Conditionally add the action column header */}
                        {["Order ID", "Date", "Items", "Priority", "Status", ...(canViewOrderDetails ? [""] : [])].map(
                          (h, i) => (
                            <th
                              key={i}
                              className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${canViewOrderDetails && i === 5 ? "text-right" : "text-left"
                                }`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dealerOrders.map(({ order }) => (
                        <tr key={order.order_number} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-slate-900">{order.order_number}</td>
                          <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {getTotalItems(order.order_details)} Items
                          </td>
                          <td className="px-5 py-4"><PriorityBadge priority={order.priority} /></td>
                          <td className="px-5 py-4"><StatusBadge status={order.status} /></td>

                          {/* ── VIEW button — role-gated ── */}
                          {canViewOrderDetails && (
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => navigate(`/orders/${order.order_number}`)}
                                className="text-indigo-600 font-bold hover:text-indigo-800 text-sm transition-colors"
                              >
                                View →
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.total > 0 && (
                  <MiniPagination
                    page={pagination.page}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          ADD DISCOUNTS MODAL — only mounted when role allows
          ================================================================ */}
      {showDiscountActions && bulkModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <div
              className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
              style={{ maxHeight: "92vh" }}
            >
              <div className="px-7 py-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-900">Add Dealer Discounts</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Configure pricing rules across brands, models and products.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
                {bulkError && (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                    <FiAlertCircle size={14} />{bulkError}
                  </div>
                )}
                {bulkRows.map((row, idx) => (
                  <div key={row.id} className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Discount Rule {idx + 1}
                      </p>
                      {bulkRows.length > 1 && (
                        <button
                          onClick={() => setBulkRows((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField label="Brand">
                        <CustomSelect
                          value={row.brand_name}
                          onChange={async (e) => {
                            const selectedBrand = e.target.value;
                            setBulkRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, brand_name: selectedBrand, model_name: "", product_ids: [] } : r
                              )
                            );
                            if (!productsByBrand[selectedBrand]) {
                              try {
                                const res = await fetchProductsByBrands([selectedBrand]);
                                if (res?.success && res?.data)
                                  setProductsByBrand((prev) => ({ ...prev, [selectedBrand]: res.data }));
                              } catch (err) {
                                console.error("Product fetch failed:", err);
                              }
                            }
                          }}
                          options={allBrands.map((b) => b.brand_name)}
                          placeholder="Select Brand"
                        />
                      </FormField>
                      <FormField label="Model">
                        <CustomSelect
                          value={row.model_name}
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r, i) => i === idx ? { ...r, model_name: e.target.value } : r)
                            )
                          }
                          options={row.brand_name ? brandToModels[row.brand_name] || [] : []}
                          placeholder="Select Model"
                          disabled={!row.brand_name}
                        />
                      </FormField>
                      <FormField label="Discount">
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0"
                            max={row.is_percentage ? 100 : undefined}
                            value={row.discount_value}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (row.is_percentage && Number(value) > 100) value = 100;
                              setBulkRows((prev) =>
                                prev.map((r, i) => i === idx ? { ...r, discount_value: value } : r)
                              );
                            }}
                            placeholder="Enter discount"
                            className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                          />
                          <div className="flex bg-slate-100 rounded-full p-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setBulkRows((prev) =>
                                  prev.map((r, i) => i === idx ? { ...r, is_percentage: false } : r)
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${!row.is_percentage ? "bg-white shadow text-indigo-600" : "text-slate-500"
                                }`}
                            >
                              ₹
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setBulkRows((prev) =>
                                  prev.map((r, i) => i === idx ? { ...r, is_percentage: true } : r)
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${row.is_percentage ? "bg-white shadow text-indigo-600" : "text-slate-500"
                                }`}
                            >
                              %
                            </button>
                          </div>
                        </div>
                      </FormField>
                      <FormField label="Products">
                        <ProductMultiSelect
                          products={(productsByBrand[row.brand_name] || []).filter((p) =>
                            row.model_name ? p.model === row.model_name || p.model_name === row.model_name : true
                          )}
                          selected={row.product_ids || []}
                          onChange={(ids) =>
                            setBulkRows((prev) =>
                              prev.map((r, i) => i === idx ? { ...r, product_ids: ids } : r)
                            )
                          }
                        />
                      </FormField>
                    </div>
                    <FormField label="Description (Optional)">
                      <textarea
                        rows={2} maxLength={200} value={row.description}
                        onChange={(e) =>
                          setBulkRows((prev) =>
                            prev.map((r, i) => i === idx ? { ...r, description: e.target.value } : r)
                          )
                        }
                        placeholder="Enter description…"
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
                      />
                      <p className="text-[10px] text-slate-400 text-right mt-1">
                        {(row.description?.length || 0)}/200
                      </p>
                    </FormField>
                  </div>
                ))}
              </div>
              <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center flex-shrink-0">
                <button
                  onClick={() => setBulkRows((prev) => [...prev, createEmptyRow()])}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-indigo-300 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all"
                >
                  <FiPlus size={13} />Add Rule
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={bulkSubmitting}
                    onClick={handleSubmitDiscounts}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-indigo-200"
                  >
                    {bulkSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Discounts"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          EDIT DISCOUNT MODAL — only mounted when role allows
          ================================================================ */}
      {showDiscountActions && editDiscountModalOpen && selectedDiscount && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
              style={{ maxHeight: "90vh" }}
            >
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-sm font-bold text-slate-900">Edit Discount Rule</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Update pricing configuration for this dealer
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Brand">
                    <input value={selectedDiscount.brand_name} disabled className={inputCls} />
                  </FormField>
                  <FormField label="Model">
                    <input value={selectedDiscount.model_name} disabled className={inputCls} />
                  </FormField>
                </div>
                <FormField label="Discount">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" value={selectedDiscount.discount_value}
                      onChange={(e) => setSelectedDiscount((prev) => ({ ...prev, discount_value: e.target.value }))}
                      className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    />
                    <div className="flex bg-slate-100 rounded-full p-1">
                      <button
                        onClick={() => setSelectedDiscount((prev) => ({ ...prev, is_percentage: false }))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${!selectedDiscount.is_percentage ? "bg-white shadow text-indigo-600" : "text-slate-500"
                          }`}
                      >
                        ₹
                      </button>
                      <button
                        onClick={() => setSelectedDiscount((prev) => ({ ...prev, is_percentage: true }))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${selectedDiscount.is_percentage ? "bg-white shadow text-indigo-600" : "text-slate-500"
                          }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </FormField>
                <FormField label="Products">
                  <ProductMultiSelect
                    products={(productsByBrand[selectedDiscount.brand_name] || []).filter((p) =>
                      selectedDiscount.model_name ? p.model === selectedDiscount.model_name : true
                    )}
                    selected={selectedDiscount.product_ids || []}
                    onChange={(ids) => setSelectedDiscount((prev) => ({ ...prev, product_ids: ids }))}
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    rows={3}
                    value={
                      selectedDiscount.description && selectedDiscount.description.toLowerCase() !== "null"
                        ? selectedDiscount.description
                        : ""
                    }
                    onChange={(e) => setSelectedDiscount((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description…"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
                  />
                </FormField>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setEditDiscountModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDiscount}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
                >
                  Update Discount
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DealerDetails;