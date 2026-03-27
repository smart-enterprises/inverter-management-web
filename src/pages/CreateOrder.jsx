import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FiPlus,
  FiArrowLeft,
  FiTrash2,
  FiSend,
  FiPackage,
  FiAlertCircle,
  FiShoppingCart,
  FiTag,
  FiDollarSign,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiBox,
  FiLayers,
  FiTrendingDown,
  FiZap,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchDealerDiscounts, fetchDealers } from "../api/dealer";
import { fetchProductsByBrands } from "../api/products";
import { createOrder } from "../api/orders";
import { fetchUserByRole } from "../api/user";
import { getBrandsByDealer } from "../api/brands";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { PAYMENT_METHOD_OPTIONS, PRIORITY_OPTIONS } from "../utils/status";
import { canSelectSalesman, ROLES } from "../utils/roles";
import {
  capitalizeFirstLetter,
  INITIAL_FORM_STATE,
  INITIAL_ORDER_ITEM,
} from "../utils/constants";

/* ================================================================
   STOCK HELPERS
   ================================================================ */
const getStockStatus = (stockInfo, qty) => {
  if (!stockInfo) return null;
  const { total, packed, unpacked } = stockInfo;
  const ordered = Number(qty) || 0;
  if (ordered === 0) return null;
  if (ordered <= packed)
    return { level: "packed", label: "Packed Stock", color: "emerald", icon: "📦" };
  if (ordered <= total) {
    const fromUnpacked = ordered - packed;
    return {
      level: "unpacked",
      label: packed > 0 ? `${packed} packed + ${fromUnpacked} unpacked` : `${fromUnpacked} unpacked`,
      color: "amber",
      icon: "🔓",
    };
  }
  const fromProduction = ordered - total;
  return {
    level: "production",
    label: `${total} in stock + ${fromProduction} via production`,
    color: "rose",
    icon: "🏭",
  };
};

/* ================================================================
   STOCK INDICATOR BAR
   ================================================================ */
const StockIndicator = ({ stockInfo, qty }) => {
  if (!stockInfo) return null;
  const { total, packed, unpacked } = stockInfo;
  const ordered = Number(qty) || 0;
  const status = getStockStatus(stockInfo, ordered);
  const packedPct = total > 0 ? Math.min((packed / total) * 100, 100) : 0;
  const unpackedPct = total > 0 ? Math.min((unpacked / total) * 100, 100) : 0;
  const isOver = ordered > total;

  return (
    <div className="mt-2.5 space-y-1.5">
      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${unpackedPct}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${packedPct}%`, background: "linear-gradient(90deg,#10b981,#059669)" }}
        />
        {ordered > 0 && !isOver && (
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-700/60"
            style={{ left: `${Math.min((ordered / total) * 100, 99)}%` }}
          />
        )}
      </div>
      {/* Stock labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {packed} Packed
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            {unpacked} Unpacked
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-400">{total} Total</span>
      </div>
      {/* Status badge */}
      {status && (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${status.level === "packed"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status.level === "unpacked"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
        >
          <span>{status.icon}</span>
          {status.label}
          {isOver && (
            <span className="opacity-70 ml-0.5">Production order raised</span>
          )}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   FIELD WRAPPER
   ================================================================ */
const Field = ({ label, required, children, hint }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {hint && <span className="text-[10px] text-slate-300 font-semibold">{hint}</span>}
    </div>
    {children}
  </div>
);

/* ================================================================
   SECTION CARD
   ================================================================ */
const SectionCard = ({ icon, title, subtitle, action, children, accent = "violet" }) => {
  const accents = {
    violet: "from-violet-500 to-purple-600",
    indigo: "from-indigo-500 to-blue-600",
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_24px_0_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-4">
          <div className={`w-1 h-9 rounded-full bg-gradient-to-b ${accents[accent]} flex-shrink-0`} />
          <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${accents[accent]} text-white shadow-sm`}>
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none">{title}</h2>
            {subtitle && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
};

/* ================================================================
   STYLED INPUT
   ================================================================ */
const StyledInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
  />
);

/* ================================================================
   PRODUCT DROPDOWN
   ================================================================ */
const ProductDropdown = ({ value, options, onChange, placeholder, isLoading, productsMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        (o.product_name || "").toLowerCase().includes(q) ||
        (o.product_model || "").toLowerCase().includes(q) ||
        (o.product_type || "").toLowerCase().includes(q)
    );
  }, [search, options]);

  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 440),
      zIndex: 9999,
      ...(spaceBelow >= 320 ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setIsOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) { setIsOpen(false); setSearch(""); }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchRef.current) setTimeout(() => searchRef.current?.focus(), 60);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef} type="button" disabled={isLoading}
        onClick={() => isOpen ? (setIsOpen(false), setSearch("")) : openPanel()}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-left flex items-center justify-between gap-2 transition-all duration-200 ${isOpen ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"
          } ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`truncate font-semibold ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {isLoading ? "Loading products…" : selected
            ? capitalizeFirstLetter(selected.product_name || selected.label || "")
            : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isLoading && (
        <div
          ref={panelRef} style={panelStyle}
          className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-10px_rgba(15,23,42,0.18)] overflow-hidden"
        >
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
              </svg>
              <input
                ref={searchRef} type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, model or type…"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-400 bg-white placeholder-slate-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_80px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            {["Product", "Model", "Type", "Stock"].map((h) => (
              <span key={h} className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{h}</span>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400 font-semibold">No products found</div>
            ) : (
              filtered.map((opt) => {
                const product = productsMap?.[opt.value];
                const s = product?.stocks?.[0];
                const total = product?.available_stock ?? 0;
                const lvl = total === 0 ? "none" : total < 5 ? "low" : "ok";
                const stockColors = {
                  ok: "text-emerald-600 bg-emerald-50 border-emerald-100",
                  low: "text-amber-600 bg-amber-50 border-amber-100",
                  none: "text-rose-600 bg-rose-50 border-rose-100",
                };
                return (
                  <button
                    key={opt.value} type="button"
                    onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); setSearch(""); }}
                    className={`w-full grid grid-cols-[2fr_1fr_1fr_80px] gap-2 items-center px-4 py-3 text-sm text-left transition-colors border-b border-slate-50 last:border-0 ${value === opt.value ? "bg-violet-50" : "hover:bg-slate-50"
                      }`}
                  >
                    <span className={`font-bold truncate ${value === opt.value ? "text-violet-700" : "text-slate-900"}`}>
                      {opt.product_name ? capitalizeFirstLetter(opt.product_name) : opt.label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate">
                      {opt.product_model ? capitalizeFirstLetter(opt.product_model) : <span className="text-slate-300">—</span>}
                    </span>
                    <span>
                      {opt.product_type ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide whitespace-nowrap">
                          {opt.product_type}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </span>
                    <span>
                      {product ? (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-black border ${stockColors[lvl]}`}>
                          <FiBox size={8} />
                          {total}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================
   DISCOUNT DROPDOWN
   ================================================================ */
const DiscountDropdown = ({ value, options, onChange, placeholder = "Select discount" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));
  }, [search, options]);

  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPanelStyle({
      position: "fixed", left: rect.left, width: rect.width, zIndex: 9999,
      ...(spaceBelow >= 260 ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setIsOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) { setIsOpen(false); setSearch(""); }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50);
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef} type="button"
        onClick={() => isOpen ? (setIsOpen(false), setSearch("")) : openPanel()}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-left flex items-center justify-between transition-all duration-200 ${isOpen ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"
          }`}
      >
        <span className={`truncate font-semibold ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={panelRef} style={panelStyle}
          className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-10px_rgba(15,23,42,0.15)] overflow-hidden"
        >
          <div className="p-3 border-b border-slate-100">
            <input
              ref={searchRef} type="text" value={search}
              onChange={(e) => setSearch(e.target.value)} placeholder="Search discount…"
              className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-400 text-center font-semibold">No discounts found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value} type="button"
                  onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); setSearch(""); }}
                  className={`w-full px-4 py-3 text-left text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors ${value === opt.value ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================
   ORDER SUMMARY CARD
   ================================================================ */
const OrderSummaryCard = ({ financialSummary, itemCount }) => {
  const { subtotal, totalDiscount, netAmount, amountPaid, balance } = financialSummary;
  const isPaid = balance <= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_32px_0_rgba(15,23,42,0.08)]">
      {/* Gradient top stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
            <FiDollarSign size={14} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Order Summary</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
              {itemCount} {itemCount === 1 ? "Item" : "Items"}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1.5 text-[10px] font-black rounded-xl border uppercase tracking-[0.08em] ${isPaid
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-rose-50 text-rose-600 border-rose-200"
            }`}
        >
          {isPaid ? "✓ Settled" : "Pending"}
        </span>
      </div>

      {/* Breakdown rows */}
      <div className="px-6 py-5 space-y-3.5">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
              <FiLayers size={9} className="text-slate-400" />
            </span>
            Subtotal
          </span>
          <span className="text-sm font-bold text-slate-700">
            ₹ {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Discount */}
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-rose-50 flex items-center justify-center">
                <FiTrendingDown size={9} className="text-rose-400" />
              </span>
              Discount Applied
            </span>
            <span className="text-sm font-bold text-rose-500">
              − ₹ {totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Net Amount */}
        <div className="pt-2 border-t border-dashed border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 uppercase tracking-[0.08em]">Net Amount</span>
            <span className="text-xl font-black text-slate-900">
              ₹ {netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Amount Paid */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center">
              <FiCheckSquare size={9} className="text-blue-400" />
            </span>
            Amount Paid
          </span>
          <span className="text-sm font-bold text-blue-600">
            ₹ {amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Balance box */}
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border-2 ${isPaid ? "bg-emerald-50/60 border-emerald-200" : "bg-rose-50/60 border-rose-200"
            }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Balance Due</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${isPaid ? "text-emerald-600" : "text-rose-500"}`}>
              {isPaid ? "No outstanding dues" : "Awaiting payment"}
            </p>
          </div>
          <span className={`text-2xl font-black ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>
            ₹ {Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Savings footer */}
      {totalDiscount > 0 && (
        <div className="mx-6 mb-5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center gap-2">
          <span className="text-base">🎉</span>
          <span className="text-xs font-bold text-emerald-700">
            You saved ₹ {totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on this order
          </span>
        </div>
      )}
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT — CreateOrder
   ================================================================ */
const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [dealers, setDealers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [discountOptions, setDiscountOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  const canSelectSalesmanPermission = useMemo(
    () => canSelectSalesman(user?.role),
    [user?.role]
  );

  // Fast lookup map by product_id
  const productsMap = useMemo(() => {
    const map = {};
    products.forEach((p) => { map[p.product_id] = p; });
    return map;
  }, [products]);

  const getMinDeliveryDate = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  }, []);

  /* ---- LOAD INITIAL DATA ---- */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const requests = [
          fetchDealers(),
          ...(canSelectSalesmanPermission ? [fetchUserByRole(ROLES.SALESMAN)] : []),
        ];
        const [dealerRes, salesRes] = await Promise.all(requests);
        if (dealerRes?.success && dealerRes?.data?.employees) {
          setDealers(dealerRes.data.employees.filter((emp) => emp.role === ROLES.DEALER));
        }
        if (canSelectSalesmanPermission && salesRes?.success && salesRes?.data) {
          setSalespersons(salesRes.data);
        }
      } catch { setError("Failed to load initial data"); }
    };
    loadInitialData();
  }, [canSelectSalesmanPermission]);

  /* ---- LOAD PRODUCTS WHEN DEALER CHANGES ---- */
  useEffect(() => {
    const loadProducts = async () => {
      if (!formData.dealer_id) { setProducts([]); return; }
      setLoadingProducts(true);
      try {
        const brandRes = await getBrandsByDealer(formData.dealer_id, "active");
        if (!brandRes?.success || !brandRes?.data?.length) { setProducts([]); return; }
        const brandNames = brandRes.data.map((b) => b.brand_name);
        const productRes = await fetchProductsByBrands(brandNames);
        if (productRes?.success && Array.isArray(productRes.data)) setProducts(productRes.data);
      } catch { setError("Failed to load products"); }
      finally { setLoadingProducts(false); }
    };
    loadProducts();
  }, [formData.dealer_id]);

  /* ---- HANDLE BASIC CHANGE ---- */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  /* ---- HANDLE ITEM CHANGE ---- */
  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index][field] = value;

    if (field === "product_id") {
      const selectedProduct = products.find((p) => p.product_id === value);
      if (selectedProduct) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: selectedProduct.product_id,
          product_brand: selectedProduct.brand,
          product_name: selectedProduct.product_name,
          product_model: selectedProduct.model,
          product_type: selectedProduct.product_type,
          product_price: selectedProduct.price,
          // Stock fields for indication
          available_stock: selectedProduct.available_stock ?? 0,
          packed_stock: selectedProduct.stocks?.[0]?.packed_stock ?? 0,
          unpacked_stock: selectedProduct.stocks?.[0]?.unpacked_stock ?? 0,
          discount_price: 0,
          dealer_discount_id: null,
          delivery_date: getMinDeliveryDate(),
        };
        const discountRes = await fetchDealerDiscounts({
          dealer_id: formData.dealer_id,
          product_id: value,
        });
        setDiscountOptions((prev) => ({
          ...prev,
          [index]:
            discountRes?.success && discountRes?.data?.length
              ? discountRes.data
              : [],
        }));
      }
    }

    if (field === "dealer_discount_id") {
      updatedItems[index].dealer_discount_id = value || null;
      if (value) updatedItems[index].discount_price = 0;
    }

    if (field === "discount_price") {
      updatedItems[index].discount_price = Number(value) || 0;
      updatedItems[index].dealer_discount_id = null;
    }

    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      order_details: [...prev.order_details, { ...INITIAL_ORDER_ITEM }],
    }));
  };

  const removeItem = (index) => {
    if (formData.order_details.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      order_details: prev.order_details.filter((_, i) => i !== index),
    }));
  };

  /* ---- SUBMIT ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const validItems = formData.order_details
        .filter((i) => i.product_id && Number(i.qty_ordered) > 0 && i.delivery_date)
        .map((item) => {
          const payloadItem = {
            product_id: item.product_id,
            product_brand: item.product_brand,
            product_name: item.product_name,
            product_model: item.product_model,
            product_type: item.product_type,
            product_price: item.product_price,
            qty_ordered: Number(item.qty_ordered),
            delivery_date: item.delivery_date,
            is_product_scheme: item.is_product_scheme,
          };
          if (item.dealer_discount_id) payloadItem.dealer_discount_id = item.dealer_discount_id;
          else if (item.discount_price > 0) payloadItem.discount_price = Number(item.discount_price);
          return payloadItem;
        });

      if (!validItems.length) {
        setError("Add at least one valid product");
        setLoading(false);
        return;
      }

      const payload = {
        dealer_id: formData.dealer_id,
        priority: formData.priority,
        order_note: formData.order_note,
        salesman_id: canSelectSalesmanPermission ? formData.salesman_id : user.employee_id,
        amount_paid: Number(formData.amount_paid) || 0,
        payment_method: formData.payment_method,
        order_details: validItems,
      };

      const response = await createOrder(payload);
      if (response?.success) {
        await Swal.fire({ icon: "success", title: "Order Created Successfully 🎉" });
        navigate("/orders");
      } else {
        setError(response?.message || "Failed to create order");
      }
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  };

  /* ---- Build product options ---- */
  const productOptions = useMemo(
    () => products.map((p) => ({
      value: p.product_id,
      label: p.product_name,
      product_name: p.product_name,
      product_model: p.model,
      product_type: p.product_type,
    })),
    [products]
  );

  /* ---- Financial Summary ---- */
  const financialSummary = useMemo(() => {
    let subtotal = 0, totalDiscount = 0;
    formData.order_details.forEach((item, index) => {
      const qty = Number(item.qty_ordered) || 0;
      const price = Number(item.product_price) || 0;
      const itemTotal = qty * price;
      if (item.is_product_scheme) return;
      subtotal += itemTotal;
      const dealerDiscount = discountOptions[index]?.find(
        (d) => d.dealer_discount_id === item.dealer_discount_id
      );
      if (dealerDiscount) {
        totalDiscount += dealerDiscount.is_percentage
          ? (itemTotal * dealerDiscount.discount_value) / 100
          : dealerDiscount.discount_value;
      } else if (item.discount_price > 0) {
        totalDiscount += item.discount_price;
      }
    });
    const netAmount = subtotal - totalDiscount;
    const amountPaid = Number(formData.amount_paid) || 0;
    return { subtotal, totalDiscount, netAmount, amountPaid, balance: netAmount - amountPaid };
  }, [formData, discountOptions]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── HEADER ── */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button" onClick={() => navigate("/orders")}
                className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
              >
                <FiArrowLeft size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Place New Order</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mt-0.5">
                  Order Management
                </p>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-black rounded-2xl hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_16px_0_rgba(124,58,237,0.3)]"
            >
              <FiSend size={14} />
              {loading ? "Creating…" : "Submit Order"}
            </button>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-bold shadow-sm">
              <div className="p-2 bg-rose-100 rounded-xl flex-shrink-0">
                <FiAlertCircle size={14} className="text-rose-600" />
              </div>
              {error}
            </div>
          )}

          {/* ── ORDER DETAILS SECTION ── */}
          <SectionCard icon={<FiFileText size={14} />} title="Order Details" subtitle="Basic Information" accent="violet">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                <Field label="Dealer" required>
                  <CustomSelect
                    name="dealer_id" value={formData.dealer_id} onChange={handleChange}
                    options={dealers.map((d) => ({
                      value: d.employee_id,
                      label: `${capitalizeFirstLetter(d.employee_name)} — ${capitalizeFirstLetter(d.shop_name)}`,
                    }))}
                    placeholder="Select Dealer" searchable
                  />
                </Field>
                <Field label="Priority" required>
                  <CustomSelect name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} />
                </Field>
                {canSelectSalesmanPermission && (
                  <Field label="Salesman" required>
                    <CustomSelect
                      name="salesman_id" value={formData.salesman_id} onChange={handleChange}
                      options={salespersons.map((s) => ({ value: s.employee_id, label: capitalizeFirstLetter(s.employee_name) }))}
                      placeholder="Select Salesman" searchable
                    />
                  </Field>
                )}
                <Field label="Amount Paid" hint="Optional">
                  <StyledInput type="number" name="amount_paid" value={formData.amount_paid} onChange={handleChange} placeholder="0" min={0} />
                </Field>
                <Field label="Payment Method" required>
                  <CustomSelect name="payment_method" value={formData.payment_method} onChange={handleChange} options={PAYMENT_METHOD_OPTIONS} />
                </Field>
              </div>
              <Field label="Order Notes" hint="Optional">
                <textarea
                  name="order_note" value={formData.order_note} onChange={handleChange} rows={3}
                  placeholder="Add any special instructions or notes for this order…"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all duration-200 resize-none"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── ORDER ITEMS SECTION ── */}
          <SectionCard
            icon={<FiShoppingCart size={14} />} title="Ordered Items" subtitle="Products" accent="indigo"
            action={
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                <FiPackage size={9} />
                {formData.order_details.length} {formData.order_details.length === 1 ? "Item" : "Items"}
              </span>
            }
          >
            <div className="space-y-4">
              {/* Desktop column headers */}
              <div className="hidden xl:grid xl:grid-cols-[minmax(200px,2fr)_76px_108px_154px_148px_140px_68px_38px] gap-3 px-5 pb-3 border-b border-slate-100">
                {[
                  { label: "Product", icon: <FiPackage size={9} /> },
                  { label: "Qty" },
                  { label: "Unit Price", icon: <FiDollarSign size={9} /> },
                  { label: "Dealer Discount", icon: <FiTag size={9} /> },
                  { label: "Manual Discount", icon: <FiDollarSign size={9} /> },
                  { label: "Delivery Date", icon: <FiCalendar size={9} /> },
                  { label: "Scheme", icon: <FiZap size={9} /> },
                  { label: "" },
                ].map((col, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {col.icon && <span className="text-slate-300">{col.icon}</span>}
                    <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{col.label}</span>
                  </div>
                ))}
              </div>

              {/* Item rows */}
              {formData.order_details.map((item, index) => {
                const stockInfo = item.product_id
                  ? { total: item.available_stock ?? 0, packed: item.packed_stock ?? 0, unpacked: item.unpacked_stock ?? 0 }
                  : null;

                return (
                  <div
                    key={index}
                    className="group relative bg-white border border-slate-200 rounded-3xl overflow-visible hover:border-violet-200 hover:shadow-[0_4px_20px_0_rgba(124,58,237,0.08)] transition-all duration-300"
                  >
                    {/* Mobile header */}
                    <div className="xl:hidden flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-500">
                        Item #{index + 1}
                      </span>
                      {formData.order_details.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)}
                          className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Desktop row */}
                    <div className="hidden xl:grid xl:grid-cols-[minmax(200px,2fr)_76px_108px_154px_148px_140px_68px_38px] gap-3 items-start px-5 py-4">
                      {/* Product + stock bar */}
                      <div>
                        <ProductDropdown
                          value={item.product_id} options={productOptions}
                          onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                          placeholder="Search product…" isLoading={loadingProducts} productsMap={productsMap}
                        />
                        {stockInfo && item.product_id && (
                          <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />
                        )}
                      </div>

                      {/* Qty */}
                      <StyledInput type="number" min="1" value={item.qty_ordered}
                        onChange={(e) => handleItemChange(index, "qty_ordered", e.target.value)}
                        className="text-center" />

                      {/* Unit Price */}
                      <StyledInput type="number" value={item.product_price} readOnly className="text-right bg-slate-50 cursor-default" />

                      {/* Dealer Discount */}
                      <DiscountDropdown
                        value={item.dealer_discount_id || ""}
                        onChange={(e) => handleItemChange(index, "dealer_discount_id", e.target.value)}
                        options={discountOptions[index]?.map((d) => ({
                          value: d.dealer_discount_id,
                          label: d.is_percentage ? `${d.discount_value}%` : `₹ ${d.discount_value}`,
                        })) || []}
                      />

                      {/* Manual Discount */}
                      <div className="relative">
                        <StyledInput
                          type="number" value={item.discount_price ?? ""}
                          disabled={!!item.dealer_discount_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleItemChange(index, "discount_price", val === "" ? "" : Number(val));
                          }}
                          className={`text-right pr-8 ${item.dealer_discount_id ? "bg-slate-50 cursor-not-allowed text-slate-300" : ""}`}
                          placeholder={item.dealer_discount_id ? "—" : "₹ 0"}
                        />
                        {!item.dealer_discount_id && item.discount_price > 0 && (
                          <button type="button" onClick={() => handleItemChange(index, "discount_price", 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-sm font-black transition"
                          >✕</button>
                        )}
                        {item.dealer_discount_id && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl bg-slate-50/90">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dealer set</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Date */}
                      <StyledInput type="date" min={getMinDeliveryDate()} value={item.delivery_date}
                        onChange={(e) => handleItemChange(index, "delivery_date", e.target.value)} />

                      {/* Scheme toggle */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, "is_product_scheme", !item.is_product_scheme)}
                          title={item.is_product_scheme ? "Remove scheme" : "Mark as Scheme"}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${item.is_product_scheme
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 border-violet-500 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-300 hover:border-violet-300 hover:text-violet-400"
                            }`}
                        >
                          <FiZap size={14} />
                        </button>
                        <input type="checkbox" checked={item.is_product_scheme || false}
                          onChange={(e) => handleItemChange(index, "is_product_scheme", e.target.checked)}
                          className="sr-only" />
                      </div>

                      {/* Remove */}
                      <div className="flex justify-center">
                        {formData.order_details.length > 1 ? (
                          <button type="button" onClick={() => removeItem(index)}
                            className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200">
                            <FiTrash2 size={14} />
                          </button>
                        ) : <div className="w-9" />}
                      </div>
                    </div>

                    {/* Mobile stacked layout */}
                    <div className="xl:hidden px-5 py-4 space-y-4">
                      <Field label="Product" required>
                        <ProductDropdown
                          value={item.product_id} options={productOptions}
                          onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                          placeholder="Search product…" isLoading={loadingProducts} productsMap={productsMap}
                        />
                        {stockInfo && item.product_id && (
                          <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />
                        )}
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Quantity" required>
                          <StyledInput type="number" min="1" value={item.qty_ordered}
                            onChange={(e) => handleItemChange(index, "qty_ordered", e.target.value)} className="text-center" />
                        </Field>
                        <Field label="Unit Price">
                          <StyledInput type="number" value={item.product_price} readOnly className="text-right bg-slate-50 cursor-default" />
                        </Field>
                      </div>
                      <Field label="Dealer Discount">
                        <DiscountDropdown
                          value={item.dealer_discount_id || ""}
                          onChange={(e) => handleItemChange(index, "dealer_discount_id", e.target.value)}
                          options={discountOptions[index]?.map((d) => ({
                            value: d.dealer_discount_id,
                            label: d.is_percentage ? `${d.discount_value}%` : `₹ ${d.discount_value}`,
                          })) || []}
                        />
                      </Field>
                      <Field label="Manual Discount" hint={item.dealer_discount_id ? "Disabled — dealer discount active" : undefined}>
                        <div className="relative">
                          <StyledInput
                            type="number" value={item.discount_price ?? ""}
                            disabled={!!item.dealer_discount_id}
                            onChange={(e) => { const val = e.target.value; handleItemChange(index, "discount_price", val === "" ? "" : Number(val)); }}
                            className={`text-right pr-8 ${item.dealer_discount_id ? "bg-slate-50 cursor-not-allowed text-slate-300" : ""}`}
                            placeholder={item.dealer_discount_id ? "—" : "₹ 0"}
                          />
                          {!item.dealer_discount_id && item.discount_price > 0 && (
                            <button type="button" onClick={() => handleItemChange(index, "discount_price", 0)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-sm font-black">✕</button>
                          )}
                        </div>
                      </Field>
                      <Field label="Delivery Date" required>
                        <StyledInput type="date" min={getMinDeliveryDate()} value={item.delivery_date}
                          onChange={(e) => handleItemChange(index, "delivery_date", e.target.value)} />
                      </Field>
                      <button type="button"
                        onClick={() => handleItemChange(index, "is_product_scheme", !item.is_product_scheme)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200 w-full ${item.is_product_scheme
                          ? "bg-violet-50 border-violet-300 text-violet-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-violet-200"
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.is_product_scheme ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300 text-transparent"
                          }`}>
                          <FiZap size={10} />
                        </div>
                        Mark as Product Scheme
                        <input type="checkbox" checked={item.is_product_scheme || false}
                          onChange={(e) => handleItemChange(index, "is_product_scheme", e.target.checked)}
                          className="sr-only" />
                      </button>
                    </div>

                    {/* Product preview card */}
                    {item.product_name && (
                      <div className="px-5 pb-5">
                        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-100">
                              <FiPackage size={14} className="text-violet-600" />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-black text-slate-900">
                                {capitalizeFirstLetter(item.product_name)}
                              </div>
                              <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                                {item.product_brand && <span>{capitalizeFirstLetter(item.product_brand)}</span>}
                                {item.product_model && <><span>·</span><span>{capitalizeFirstLetter(item.product_model)}</span></>}
                              </div>
                              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                {item.product_type && (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wide">
                                    {item.product_type}
                                  </span>
                                )}
                                {item.is_product_scheme && (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                                    ⚡ Scheme
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pricing panel */}
                          <div className="flex flex-col items-end gap-0.5 min-w-[130px]">
                            {(() => {
                              const qty = Number(item.qty_ordered) || 0;
                              const price = Number(item.product_price) || 0;
                              const itemTotal = qty * price;
                              const dealerDiscount = discountOptions[index]?.find(
                                (d) => d.dealer_discount_id === item.dealer_discount_id
                              );

                              if (item.is_product_scheme) {
                                return (
                                  <>
                                    <span className="text-xs text-slate-300 line-through">₹ {itemTotal.toLocaleString("en-IN")}</span>
                                    <span className="text-[10px] font-bold text-emerald-600">Scheme Applied</span>
                                    <span className="text-xl font-black text-emerald-600">FREE</span>
                                  </>
                                );
                              }

                              let finalAmount = itemTotal;
                              let discountLabel = null;
                              if (dealerDiscount) {
                                if (dealerDiscount.is_percentage) {
                                  finalAmount -= (itemTotal * dealerDiscount.discount_value) / 100;
                                  discountLabel = `${dealerDiscount.discount_value}% off`;
                                } else {
                                  finalAmount -= dealerDiscount.discount_value;
                                  discountLabel = `₹ ${dealerDiscount.discount_value} off`;
                                }
                              } else if (item.discount_price > 0) {
                                finalAmount -= item.discount_price;
                                discountLabel = `₹ ${item.discount_price} off`;
                              }

                              return (
                                <>
                                  <span className="text-xs text-slate-400 font-semibold">₹ {itemTotal.toLocaleString("en-IN")}</span>
                                  {discountLabel && (
                                    <span className="text-[10px] font-black text-rose-500">{discountLabel}</span>
                                  )}
                                  <span className="text-xl font-black text-slate-900">
                                    ₹ {Math.max(0, finalAmount).toLocaleString("en-IN")}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add item */}
              <button
                type="button" onClick={addItem}
                className="w-full flex items-center justify-center gap-2.5 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all duration-200 group"
              >
                <div className="p-1.5 rounded-xl bg-slate-100 group-hover:bg-violet-100 transition-colors">
                  <FiPlus size={12} className="group-hover:text-violet-600 transition-colors" />
                </div>
                Add Another Item
              </button>
            </div>

            {/* Order Summary */}
            <div className="mt-8">
              <OrderSummaryCard
                financialSummary={financialSummary}
                itemCount={formData.order_details.length}
              />
            </div>
          </SectionCard>

          {/* ── STICKY FOOTER ── */}
          <div className="sticky bottom-6 z-20 flex justify-end pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_8px_32px_0_rgba(15,23,42,0.12)] px-6 py-3.5 ring-1 ring-slate-100">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-sm text-slate-500 font-bold hidden sm:block">
                {formData.order_details.length}{" "}
                {formData.order_details.length === 1 ? "item" : "items"} in cart
              </span>
              <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
              <button
                type="button" onClick={() => navigate("/orders")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-black rounded-xl hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_0_rgba(124,58,237,0.3)]"
              >
                <FiSend size={13} />
                {loading ? "Creating…" : "Place Order"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateOrder;