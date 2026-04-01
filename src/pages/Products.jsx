// products.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiPlus, FiSearch, FiBox, FiX, FiChevronLeft, FiChevronRight,
  FiEdit3, FiPackage, FiEye, FiAlertCircle, FiFilter, FiRefreshCw,
  FiTrendingUp, FiLayers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchProducts, createProduct } from "../api/products";
import { getAllBrands } from "../api/brands";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import EditProductModal from "../components/EditProductModal";
import StockUpdateModal from "../components/StockUpdateModal";
import { canCreateProduct, canEditProduct, canUpdateProductStock, canViewProductPrice } from "../utils/productPermissions";

//  CONSTANTS
const PRODUCT_TYPE_OPTIONS = [
  "All", "INV 12V", "INV 24V", "INV 48V", "INV 96V",
  "SOLAR 12V", "SOLAR 24V", "SOLAR 48V", "SOLAR 96V",
];

//  CREATE PRODUCT MODAL
const CreateProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const initialFormState = {
    brand: "", product_name: "", model: "", product_type: "",
    product_price: "", unpackedStock: 0, packedStock: 0,
    unpackedNotes: "", packedNotes: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [brands, setBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [productTypeOptions, setProductTypeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialFormState);
    setAvailableModels([]);
    setError("");
    getAllBrands("active")
      .then((r) => { if (r?.success && r?.data) setBrands(r.data); })
      .catch(console.error);
  }, [isOpen]);

  const updateField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateField(name, value);
    if (name === "brand") {
      const b = brands.find((b) => b.brand_name === value);
      setAvailableModels(b?.brand_models || []);
      updateField("model", "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!formData.brand || !formData.product_name || !formData.model || !formData.product_price) {
        setError("Please fill in all required fields.");
        return;
      }
      const stocks = [];
      if (Number(formData.unpackedStock) > 0)
        stocks.push({ stock: parseInt(formData.unpackedStock), stock_type: "UNPACKED", type: "ADD", stock_notes: formData.unpackedNotes || `added stock ${formData.unpackedStock} - unpacked` });
      if (Number(formData.packedStock) > 0)
        stocks.push({ stock: parseInt(formData.packedStock), stock_type: "PACKED", type: "ADD", stock_notes: formData.packedNotes || `added stock ${formData.packedStock} - packed` });
      const payload = { brand: formData.brand, product_name: formData.product_name, model: formData.model, product_type: formData.product_type, product_price: parseFloat(formData.product_price), stocks };
      const res = await createProduct(payload);
      if (res?.success) {
        onClose();
        onProductCreated?.();
        setTimeout(() => Swal.fire({ icon: "success", title: "Product Created", text: res.message || "Product created successfully" }), 100);
      } else { setError(res?.message || "Failed to create product"); }
    } catch (err) { setError(err.message || "Network error. Please try again."); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const Field = ({ label, required, children }) => (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = ({ className = "", ...props }) => (
    <input {...props} className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all disabled:bg-slate-50 ${className}`} />
  );

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><FiBox size={14} /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Create New Product</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">Add to inventory</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><FiX size={16} /></button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                <FiAlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}

            {/* Product Info Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">Product Information</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Brand" required>
                  <CustomSelect name="brand" value={formData.brand} onChange={handleChange} options={["", ...brands.map((b) => b.brand_name)]} placeholder="Select brand" />
                </Field>
                <Field label="Product Name" required>
                  <Input type="text" name="product_name" value={formData.product_name} onChange={handleChange} placeholder="e.g. Super Save Pro" required />
                </Field>
                <Field label="Model" required>
                  <CustomSelect name="model" value={formData.model} onChange={handleChange} options={["", ...availableModels]} placeholder={formData.brand ? "Select model" : "Select brand first"} disabled={!formData.brand || availableModels.length === 0} />
                  {formData.brand && availableModels.length === 0 && <p className="mt-1 text-[10px] text-slate-400 font-medium">No models for this brand</p>}
                </Field>
                <Field label="Product Type" required>
                  <input
                    list="product-type-opts"
                    value={formData.product_type}
                    onChange={(e) => updateField("product_type", e.target.value)}
                    onBlur={() => { const v = formData.product_type?.trim(); if (v) setProductTypeOptions((p) => p.includes(v) ? p : [...p, v]); }}
                    placeholder="Select or type type"
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                  <datalist id="product-type-opts">
                    {PRODUCT_TYPE_OPTIONS.slice(1).map((t, i) => <option key={i} value={t} />)}
                    {productTypeOptions.map((t, i) => <option key={`c${i}`} value={t} />)}
                  </datalist>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Unit Price (₹)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                      <Input type="number" name="product_price" value={formData.product_price} onChange={handleChange} placeholder="0.00" min="0" step="0.01" className="pl-7" required />
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* Stock Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">Initial Stock</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Unpacked Qty"><Input type="number" name="unpackedStock" value={formData.unpackedStock} onChange={handleChange} min="0" /></Field>
                <Field label="Packed Qty"><Input type="number" name="packedStock" value={formData.packedStock} onChange={handleChange} min="0" /></Field>
                {Number(formData.unpackedStock) > 0 && <Field label="Unpacked Notes"><Input type="text" name="unpackedNotes" value={formData.unpackedNotes} onChange={handleChange} placeholder="Optional note" /></Field>}
                {Number(formData.packedStock) > 0 && <Field label="Packed Notes"><Input type="text" name="packedNotes" value={formData.packedNotes} onChange={handleChange} placeholder="Optional note" /></Field>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
                {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</> : <><FiPlus size={13} />Create Product</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

//  STAT CARD
const StatCard = ({ label, value, icon, color }) => {
  const c = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    rose: "bg-rose-50 border-rose-100 text-rose-600",
  }[color] || "bg-slate-50 border-slate-200 text-slate-600";

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <div className={`p-2.5 rounded-xl border ${c} flex-shrink-0`}>
        {React.cloneElement(icon, { size: 14, className: c.split(" ").find((s) => s.startsWith("text-")) })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className={`text-xl font-black tabular-nums ${c.split(" ").find((s) => s.startsWith("text-"))}`}>{value ?? "—"}</p>
      </div>
    </div>
  );
};

//  PAGINATION  (server-driven)
const Pagination = ({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/30">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Showing <span className="font-bold text-slate-600">{from}–{to}</span> of{" "}
        <span className="font-bold text-slate-600">{total}</span> products
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronLeft size={13} />
        </button>
        {visible.map((p, i) => (
          <div key={p} className="flex items-center">
            {i > 0 && p - visible[i - 1] > 1 && <span className="px-1.5 text-slate-300 text-xs">…</span>}
            <button onClick={() => onPageChange(p)}
              className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${p === page ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"}`}>
              {p}
            </button>
          </div>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

//  MAIN — Products
const Products = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const role = user?.role;

  const userCanCreate = canCreateProduct(role);
  const userCanEdit = canEditProduct(role);
  const userCanUpdateStock = canUpdateProductStock(role);
  const userCanViewPrice = canViewProductPrice(role);

  /* ── Modal states ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState("");

  //  Filter / search states
  const [searchInput, setSearchInput] = useState("");   // controlled text input
  const [searchQuery, setSearchQuery] = useState("");   // debounced, sent to API
  const [selectedType, setSelectedType] = useState(""); // "" = all
  const [selectedStatus, setSelectedStatus] = useState(""); // "" = all

  /* ── Pagination ── */
  const [page, setPage] = useState(1);
  const limit = 10;

  /* ── Data ── */
  const [products, setProducts] = useState([]);
  const [paginationMeta, setPaginationMeta] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ── Debounce search: wait 400ms after user stops typing ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  //  Fetch with all server-side params
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProducts({
        page,
        limit,
        search: searchQuery,      // passed as "search" param
        type: selectedType,       // passed as "type" param
        status: selectedStatus,   // passed as "status" param
      });
      if (res?.success) {
        setProducts(res.data || []);
        setPaginationMeta({
          totalPages: res.pagination?.totalPages || 1,
          total: res.pagination?.total ?? res.data?.length ?? 0,
        });
      } else {
        setError(res?.message || "Failed to fetch products");
      }
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, selectedType, selectedStatus]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── Auto-dismiss success ── */
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  /* ── Stats from current page ── */
  const stats = useMemo(() => ({
    active: products.filter((p) => p.status === "active").length,
    zeroStock: products.filter((p) => (p.available_stock ?? 0) === 0).length,
  }), [products]);

  /* ── Helpers ── */
  const handleFilterChange = (field, value) => {
    if (field === "type") setSelectedType(value === "All Types" ? "" : value);
    if (field === "status") setSelectedStatus(value === "All Status" ? "" : value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput(""); setSearchQuery(""); setSelectedType(""); setSelectedStatus(""); setPage(1);
  };

  const openEditModal = (id, name) => { if (!userCanEdit) return; setSelectedProductId(id); setSelectedProductName(name); setIsEditModalOpen(true); };
  const openStockModal = (id, name) => { if (!userCanUpdateStock) return; setSelectedProductId(id); setSelectedProductName(name); setIsStockModalOpen(true); };
  const activeFilters = searchQuery || selectedType || selectedStatus;

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Success banner */}
        {success && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
            <div className="flex items-center gap-2.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />{success}</div>
            <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-600 transition-colors ml-4"><FiX size={14} /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Products</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {loading ? "Loading…" : `${paginationMeta.total} product${paginationMeta.total !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={loadProducts} disabled={loading} title="Refresh"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50">
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            {userCanCreate && (
              <button onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 cursor-pointer">
                <FiPlus size={14} />Create Product
              </button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Products" value={paginationMeta.total} icon={<FiBox />} color="indigo" />
          <StatCard label="Active (page)" value={stats.active} icon={<FiTrendingUp />} color="emerald" />
          <StatCard label="Zero Stock" value={stats.zeroStock} icon={<FiAlertCircle />} color="rose" />
          <StatCard label="Per Page" value={products.length} icon={<FiLayers />} color="amber" />
        </div>

        {/* Main Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Filter Bar */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Search input — value tied to searchInput; debounced to searchQuery */}
              <div className="relative flex-1 lg:max-w-xs">
                <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, brand, model, ID…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                    <FiX size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>
                {/* Type filter — sends "type" param to API */}
                <div className="w-44">
                  <CustomSelect
                    name="type"
                    value={selectedType || "All Types"}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    options={PRODUCT_TYPE_OPTIONS}
                  />
                </div>
                {/* Status filter — sends "status" param to API */}
                <div className="w-36">
                  <CustomSelect
                    name="status"
                    value={selectedStatus || "All Status"}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                    options={["All Status", "active", "inactive"]}
                  />
                </div>
                {activeFilters && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wide hover:bg-rose-100 transition-all">
                    <FiX size={10} />Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Loading products…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100"><FiAlertCircle size={22} className="text-rose-500" /></div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button onClick={loadProducts} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-bold transition-colors">
                <FiRefreshCw size={12} />Try Again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Product", "Brand", "Model", "Type", "Price",
                      "Available", "Stock", "Status",
                      ...(userCanEdit || userCanUpdateStock ? [""] : [])
                    ].map((h, i, arr) => (
                      <th key={i} className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap ${!userCanEdit && i === arr.length - 1 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={userCanEdit || userCanUpdateStock ? 8 : 9} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-5 bg-slate-100 rounded-2xl"><FiBox size={24} className="text-slate-400" /></div>
                          <p className="text-sm font-semibold text-slate-500">No products found</p>
                          <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : products.map((product) => {
                    const { product_id, product_name, brand, model, product_type, price, available_stock, status, stocks = [] } = product;

                    // stocks[0] has packed_stock and unpacked_stock per API response
                    const unpackedStock = stocks.find((s) => s.stock_type === "UNPACKED")?.stock ?? stocks[0]?.unpacked_stock ?? 0;
                    const packedStock = stocks.find((s) => s.stock_type === "PACKED")?.stock ?? stocks[0]?.packed_stock ?? 0;

                    const isActive = status === "active";
                    const qty = available_stock ?? 0;
                    const stockBadge = qty === 0 ? "text-rose-600 bg-rose-50 border-rose-200" : qty < 5 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200";

                    return (
                      <tr key={product_id} className="hover:bg-slate-50/60 transition-colors duration-100">

                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <FiBox size={13} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-[180px]">{product_name}</p>
                              <span className="inline-flex mt-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded-md bg-slate-100 text-slate-500 border border-slate-200">{product_id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-700">{brand}</span></td>
                        <td className="px-5 py-4"><span className="text-sm font-medium text-slate-500">{model}</span></td>

                        <td className="px-5 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wide whitespace-nowrap">{product_type}</span>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {userCanViewPrice
                            ? <span className="text-sm font-bold text-slate-900">{price ? `₹ ${price.toLocaleString("en-IN")}` : "—"}</span>
                            : <span className="text-sm text-slate-300">—</span>
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-black tabular-nums ${stockBadge}`}>{qty}</span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-1.5">
                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black whitespace-nowrap">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />U: {unpackedStock}
                            </span>
                            <span className="flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg text-[10px] font-black whitespace-nowrap">
                              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full flex-shrink-0" />P: {packedStock}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">

                            <button
                              onClick={() => navigate(`/products/${product_id}`)}
                              title="View"
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <FiEye size={14} />
                            </button>
                            {userCanEdit && (
                              <button
                                onClick={() => openEditModal(product_id, product_name)}
                                title="Edit"
                                className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all">
                                <FiEdit3 size={14} />
                              </button>
                            )}

                            {userCanUpdateStock && isActive && (
                              <button
                                onClick={() => openStockModal(product_id, product_name)}
                                title="Update Stock"
                                className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                                <FiPackage size={14} />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-driven pagination — shows real total and page range */}
          {!loading && !error && paginationMeta.total > 0 && (
            <Pagination
              page={page}
              totalPages={paginationMeta.totalPages}
              total={paginationMeta.total}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <>
        {userCanCreate &&
          <CreateProductModal
            isOpen={isModalOpen}
            onClose={() =>
              setIsModalOpen(false)}
            onProductCreated={loadProducts}
          />
        }

        {userCanEdit &&
          <EditProductModal
            isOpen={isEditModalOpen}
            onClose={() =>
              setIsEditModalOpen(false)}
            onProductUpdated={() => { loadProducts(); setSuccess("Product updated successfully! 🎉"); }}
            productId={selectedProductId}
          />
        }

        {userCanUpdateStock &&
          <StockUpdateModal
            isOpen={isStockModalOpen}
            onClose={() =>
              setIsStockModalOpen(false)}
            onStockUpdated={() => { loadProducts(); setSuccess("Stock updated! 📦"); }}
            productId={selectedProductId} productName={selectedProductName}
          />
        }
      </>
    </div>

  );
};

export default Products;
