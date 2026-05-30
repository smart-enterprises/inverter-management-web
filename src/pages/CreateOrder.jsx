// createOrder.jsx — Premium UI with Brand→Model→Product cascading layout

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FiPlus, FiArrowLeft, FiTrash2, FiSend, FiPackage, FiAlertCircle,
  FiShoppingCart, FiTag, FiFileText, FiBox, FiLayers, FiTrendingDown,
  FiZap, FiChevronDown, FiPercent, FiCreditCard, FiBarChart2,
  FiCheck, FiFilter, FiDollarSign, FiGift, FiTrendingUp,
  FiSearch, FiUser,
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
import { toastSuccess } from "../utils/toast";
import { PAYMENT_METHOD_OPTIONS, PRIORITY_OPTIONS } from "../utils/status";
import { canSelectSalesman, ROLES } from "../utils/roles";
import {
  capitalizeFirstLetter, formatName, INITIAL_FORM_STATE, INITIAL_ORDER_ITEM,
} from "../utils/constants";

/* ================================================================
   GLOBAL SCROLLBAR STYLES — injected once
   ================================================================ */
const scrollbarStyles = `
  .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scroll::-webkit-scrollbar-track { background: #fef3e7; border-radius: 10px; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 10px; transition: background 0.2s; }
  .custom-scroll::-webkit-scrollbar-thumb:hover { background: #fb923c; }
  .custom-scroll { scrollbar-width: thin; scrollbar-color: #fed7aa #fef3e7; }

  .dropdown-scroll::-webkit-scrollbar { width: 4px; }
  .dropdown-scroll::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
  .dropdown-scroll::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 8px; }
  .dropdown-scroll::-webkit-scrollbar-thumb:hover { background: #fb923c; }
  .dropdown-scroll { scrollbar-width: thin; scrollbar-color: #fed7aa transparent; }
`;

if (typeof document !== "undefined" && !document.getElementById("co-scroll-styles")) {
  const s = document.createElement("style");
  s.id = "co-scroll-styles";
  s.textContent = scrollbarStyles;
  document.head.appendChild(s);
}

/* ================================================================
   STOCK HELPERS
   ================================================================ */
const getStockStatus = (stockInfo, qty) => {
  if (!stockInfo) return null;
  const { total, packed } = stockInfo;
  const ordered = Number(qty) || 0;
  if (ordered === 0) return null;
  if (ordered <= packed) return { level: "packed", label: "Packed Stock", icon: "📦" };
  if (ordered <= total) {
    const fromUnpacked = ordered - packed;
    return {
      level: "unpacked",
      label: packed > 0 ? `${packed} packed + ${fromUnpacked} unpacked` : `${fromUnpacked} unpacked`,
      icon: "🔓",
    };
  }
  const fromProduction = ordered - total;
  return { level: "production", label: `${total} in stock + ${fromProduction} via production`, icon: "🏭" };
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
    <div className="mt-2 space-y-1.5">
      <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${unpackedPct}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${packedPct}%`, background: "linear-gradient(90deg,#10b981,#059669)" }} />
        {ordered > 0 && !isOver && (
          <div className="absolute top-0 h-full w-0.5 bg-slate-600/60"
            style={{ left: `${Math.min((ordered / total) * 100, 99)}%` }} />
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{packed} Packed
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />{unpacked} Unpacked
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-400">{total} Total</span>
      </div>
      {status && (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold border ${status.level === "packed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : status.level === "unpacked" ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
          {status.icon} {status.label}
          {isOver && <span className="opacity-60 ml-0.5">· Production raised</span>}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   FIELD WRAPPER
   ================================================================ */
const Field = ({ label, required, children, hint }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[9px] text-slate-300 font-semibold">{hint}</span>}
    </div>
    {children}
  </div>
);

/* ================================================================
   SECTION CARD
   ================================================================ */
const SectionCard = ({ icon, title, subtitle, action, children, accent = "indigo" }) => {
  const a = accent === "indigo"
    ? { icon: "bg-blue-50 text-blue-600 border border-blue-100", bar: "from-blue-400 to-blue-600" }
    : { icon: "bg-slate-50 text-slate-500 border border-slate-200", bar: "from-slate-400 to-slate-300" };

  return (
    <div className="bg-white rounded-2xl border border-blue-100/60 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100/60 bg-blue-50/30">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${a.bar} flex-shrink-0`} />
          <div className={`p-2 rounded-xl ${a.icon} flex-shrink-0`}>{icon}</div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">{title}</h2>
            {subtitle && <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

/* ================================================================
   STYLED INPUT
   ================================================================ */
const StyledInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
  />
);

/* ================================================================
   SALESMAN REQUIRED HINT — shown when dealer cannot be selected yet
   ================================================================ */
const SalesmanRequiredHint = () => (
  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
    <FiUser size={12} className="text-blue-500 flex-shrink-0" />
    <p className="text-[10px] font-semibold text-blue-600">
      Select a salesman first to load their assigned dealers
    </p>
  </div>
);

/* ================================================================
   CASCADE SELECT — Brand / Model
   ================================================================ */
const CascadeSelect = ({ value, options, onChange, placeholder, disabled, color = "indigo" }) => {
  const colors = {
    indigo: "focus:ring-blue-200 focus:border-blue-400",
    violet: "focus:ring-amber-200 focus:border-amber-400",
  };
  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border border-slate-200 rounded-lg pl-3 pr-7 py-2 text-sm font-medium bg-white appearance-none focus:outline-none focus:ring-2 ${colors[color] || colors.indigo} transition-all duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${value ? "text-slate-800 border-slate-300" : "text-slate-400"}`}
      >
        <option value="">{disabled ? "—" : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <FiChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
};

/* ================================================================
   PRODUCT DROPDOWN — with custom scrollbar
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
        (o.product_brand || "").toLowerCase().includes(q) ||
        (o.product_model || "").toLowerCase().includes(q) ||
        (o.product_type || "").toLowerCase().includes(q)
    );
  }, [search, options]);

  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPanelStyle({
      position: "fixed", left: rect.left, width: Math.max(rect.width, 480), zIndex: 9999,
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

  const isEmpty = options.length === 0 && !isLoading;

  return (
    <>
      <button
        ref={triggerRef} type="button"
        disabled={isLoading || isEmpty}
        onClick={() => isOpen ? (setIsOpen(false), setSearch("")) : openPanel()}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-all duration-150 ${isOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
          } ${isLoading || isEmpty ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`truncate font-medium ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {isLoading ? "Loading products…"
            : isEmpty ? "Select brand & model first"
              : selected ? capitalizeFirstLetter(selected.product_name || selected.label || "")
                : placeholder}
        </span>
        <FiChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !isLoading && options.length > 0 && (
        <div ref={panelRef} style={panelStyle}
          className="bg-white border border-blue-100/80 rounded-xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.18)] overflow-hidden">

          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-blue-100/60 bg-blue-50/40">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z" />
              </svg>
              <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, model or type…"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-400 bg-white placeholder-slate-300"
                onClick={(e) => e.stopPropagation()} />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2 bg-blue-50/40 border-b border-blue-100/60">
            {["Product", "Brand", "Model", "Type", "Stock"].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</span>
            ))}
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto dropdown-scroll overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400 font-semibold">No products found</div>
            ) : filtered.map((opt) => {
              const product = productsMap?.[opt.value];
              const total = product?.available_stock ?? 0;
              const lvl = total === 0 ? "none" : total < 5 ? "low" : "ok";
              const stockColors = {
                ok: "text-emerald-600 bg-emerald-50 border-emerald-100",
                low: "text-amber-600 bg-amber-50 border-amber-100",
                none: "text-rose-600 bg-rose-50 border-rose-100",
              };
              const isSelected = value === opt.value;

              return (
                <button key={opt.value} type="button"
                  onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); setSearch(""); }}
                  className={`w-full grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-3 items-center px-4 py-3 text-sm text-left transition-all duration-150 border-b border-blue-50 last:border-0 ${isSelected ? "bg-blue-50/70" : "hover:bg-blue-50/30"}`}>
                  <span className={`font-semibold ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                    {opt.product_name ? capitalizeFirstLetter(opt.product_name) : opt.label}
                  </span>
                  <span className="text-sm text-slate-500">{opt.product_brand ? capitalizeFirstLetter(opt.product_brand) : <span className="text-slate-300">—</span>}</span>
                  <span className="text-sm text-slate-500">{opt.product_model ? capitalizeFirstLetter(opt.product_model) : <span className="text-slate-300">—</span>}</span>
                  <span className="text-sm text-slate-500">{opt.product_type ? capitalizeFirstLetter(opt.product_type) : <span className="text-slate-300">—</span>}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${stockColors[lvl]}`}>
                    <FiBox size={10} />{total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================
   DISCOUNT FIELD — with custom scrollbar
   ================================================================ */
const DiscountField = ({ item, index, discountOptions, onDealerChange, onManualChange, onClear }) => {
  const [mode, setMode] = useState(() => item.dealer_discount_id ? "dealer" : item.discount_price > 0 ? "manual" : "none");
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  const options = useMemo(
    () => discountOptions[index] || [],
    [discountOptions, index]
  );
  const selectedDealer = options.find((o) => o.dealer_discount_id === item.dealer_discount_id);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) => {
      const label = o.is_percentage ? `${o.discount_value}%` : `₹ ${o.discount_value}`;
      return label.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, options]);

  const openDrop = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPanelStyle({
      position: "fixed", left: rect.left, width: Math.max(rect.width, 220), zIndex: 9999,
      ...(spaceBelow >= 200 ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setDropOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) { setDropOpen(false); setSearch(""); }
    };
    if (dropOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  const handleModeSwitch = (m) => { setMode(m); onClear(index); };
  const hasDiscount = item.dealer_discount_id || item.discount_price > 0;

  if (item.is_product_scheme) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50">
        <FiZap size={10} className="text-emerald-500" />
        <span className="text-[10px] font-bold text-emerald-600">Scheme</span>
      </div>
    );
  }

  if (options.length === 0 && mode !== "manual") {
    return (
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
        <StyledInput type="number" value={item.discount_price ?? ""}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"); onManualChange(index, v === "" ? "" : Number(v)); }}
          onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
          className="pl-6 text-right text-xs" placeholder="0" min={0} />
        {item.discount_price > 0 && (
          <button type="button" onClick={() => onManualChange(index, 0)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors text-[10px] font-black">✕</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {options.length > 0 && (
          <button type="button" onClick={() => handleModeSwitch("dealer")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[9px] font-black uppercase tracking-wide border transition-all ${mode === "dealer" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              }`}>
            <FiTag size={8} />Dealer
          </button>
        )}
        <button type="button" onClick={() => handleModeSwitch("manual")}
          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[9px] font-black uppercase tracking-wide border transition-all ${mode === "manual" ? "bg-blue-500 text-white border-blue-500" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}>
          <FiPercent size={8} />Manual
        </button>
        {hasDiscount && (
          <button type="button" onClick={() => { onClear(index); setMode("none"); }}
            className="px-2 py-1 rounded text-[9px] font-black border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all">✕</button>
        )}
      </div>

      {mode === "dealer" && options.length > 0 && (
        <>
          <button ref={triggerRef} type="button"
            onClick={() => dropOpen ? setDropOpen(false) : openDrop()}
            className={`w-full px-2.5 py-2 bg-white border rounded-lg text-xs text-left flex items-center justify-between gap-1.5 transition-all ${dropOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
              }`}>
            <span className={`truncate font-semibold ${selectedDealer ? "text-slate-800" : "text-slate-400"}`}>
              {selectedDealer
                ? (selectedDealer.is_percentage ? `${selectedDealer.discount_value}% off` : `₹ ${selectedDealer.discount_value} off`)
                : "Pick discount…"}
            </span>
            <FiChevronDown size={11} className={`text-slate-400 flex-shrink-0 transition-transform ${dropOpen ? "rotate-180" : ""}`} />
          </button>
          {dropOpen && (
            <div ref={panelRef} style={panelStyle}
              className="bg-white border border-blue-100/80 rounded-xl shadow-[0_16px_48px_-8px_rgba(15,23,42,0.16)] overflow-hidden">
              <div className="p-2 border-b border-blue-100/60">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
                  className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300" />
              </div>
              <div className="max-h-40 overflow-y-auto dropdown-scroll">
                {filtered.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-slate-400 text-center font-semibold">No discounts</div>
                ) : filtered.map((opt) => (
                  <button key={opt.dealer_discount_id} type="button"
                    onClick={() => { onDealerChange(index, opt.dealer_discount_id); setDropOpen(false); setSearch(""); }}
                    className={`w-full px-3 py-2.5 text-left text-xs font-semibold border-b border-blue-50 last:border-0 transition-colors ${item.dealer_discount_id === opt.dealer_discount_id ? "bg-blue-50/70 text-blue-700" : "hover:bg-blue-50/30 text-slate-700"
                      }`}>
                    <span className="font-black">{opt.is_percentage ? `${opt.discount_value}%` : `₹ ${opt.discount_value}`}</span>
                    <span className="ml-1.5 text-[10px] text-slate-400">{opt.is_percentage ? "% off" : "flat off"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mode === "manual" && (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
          <StyledInput type="number" value={item.discount_price ?? ""}
            onChange={(e) => { const v = e.target.value; onManualChange(index, v === "" ? "" : Number(v)); }}
            className="pl-6 text-right text-xs" placeholder="0" min={0} />
        </div>
      )}
    </div>
  );
};

/* ================================================================
   ORDER SUMMARY CARD
   ================================================================ */
const OrderSummaryCard = ({ financialSummary, itemCount }) => {
  const { subtotal, totalDiscount, netAmount, amountPaid, balance } = financialSummary;
  const isPaid = balance <= 0;
  const savingsPct = subtotal > 0 ? ((totalDiscount / subtotal) * 100).toFixed(1) : 0;

  return (
    <div className="rounded-2xl border border-blue-100/60 bg-white overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-amber-400" />

      <div className="flex items-center justify-between px-5 py-4 border-b border-blue-100/60 bg-blue-50/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <FiBarChart2 size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Bill Breakdown</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
              {itemCount} {itemCount === 1 ? "line item" : "line items"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalDiscount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wide">
              <FiGift size={8} />{savingsPct}% saved
            </span>
          )}
          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider ${isPaid ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
            }`}>{isPaid ? "✓ Settled" : "⏳ Outstanding"}</span>
        </div>
      </div>

      <div className="px-5 py-3 space-y-1">
        {/* Gross Total */}
        <div className="flex items-center justify-between py-2.5 border-b border-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <FiLayers size={10} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Gross Total</p>
              <p className="text-[9px] text-slate-400 font-medium">Before discounts</p>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-500 tabular-nums">
            ₹ {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Discount */}
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between py-2.5 border-b border-blue-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <FiTrendingDown size={10} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-600">Discount Applied</p>
                <p className="text-[9px] text-rose-400 font-medium">{savingsPct}% off gross total</p>
              </div>
            </div>
            <span className="text-sm font-bold text-rose-500 tabular-nums">
              − ₹ {totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Net Payable */}
        <div className="py-3">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-500/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-100">Net Payable</p>
              <p className="text-[9px] text-blue-200 font-medium mt-0.5">After all discounts</p>
            </div>
            <span className="text-2xl font-black text-white tabular-nums">
              ₹ {netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Amount Paid */}
        {amountPaid > 0 && (
          <div className="flex items-center justify-between py-2.5 border-b border-blue-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FiCreditCard size={10} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">Paid Now</p>
                <p className="text-[9px] text-amber-500 font-medium">Amount tendered</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-700 tabular-nums">
              − ₹ {amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-1 space-y-2.5">
        {/* Balance */}
        <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 ${isPaid ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"
          }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid ? "bg-emerald-100" : "bg-rose-100"}`}>
              {isPaid ? <FiCheck size={13} className="text-emerald-600" /> : <FiDollarSign size={13} className="text-rose-600" />}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${isPaid ? "text-emerald-700" : "text-rose-700"}`}>
                {isPaid ? "Fully Settled" : "Balance Due"}
              </p>
              <p className={`text-[9px] font-medium mt-0.5 ${isPaid ? "text-emerald-500" : "text-rose-500"}`}>
                {isPaid ? "No outstanding dues" : "Collect on delivery"}
              </p>
            </div>
          </div>
          <span className={`text-xl font-black tabular-nums ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>
            ₹ {Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Savings */}
        {totalDiscount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200">
            <span className="text-base flex-shrink-0">🎉</span>
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-700">
                Total Savings: ₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] text-emerald-500 font-medium mt-0.5">{savingsPct}% off the original price</p>
            </div>
            <FiTrendingDown size={16} className="text-emerald-400 flex-shrink-0 ml-auto" />
          </div>
        )}
      </div>
    </div>
  );
};

/* ================================================================
   ITEM CARD — Desktop
   ================================================================ */
const ItemCard = ({
  item, index, totalItems, stockInfo, itemProductOptions, brandOptions, modelOptions,
  currentBrand, currentModel, discountOptions, productsMap, loadingProducts,
  dealerSelected, getMinDeliveryDate, itemTotal, finalAmount, discountLabel,
  onBrandChange, onModelChange, onItemChange, onDealerDiscount, onManualDiscount,
  onClearDiscount, onRemove,
}) => {
  const hasProduct = !!item.product_name;

  return (
    <div className="hidden xl:block bg-white border border-blue-100/60 rounded-2xl overflow-visible transition-all duration-200 hover:border-blue-200 hover:shadow-lg group">

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 bg-blue-50/30 border-b border-blue-100/60 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
            <span className="text-[10px] font-black text-white">{index + 1}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-700">
              {hasProduct ? capitalizeFirstLetter(item.product_name) : `Item #${index + 1}`}
            </span>
            {hasProduct && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.product_brand && (
                  <span className="text-[9px] font-semibold text-slate-400">{capitalizeFirstLetter(item.product_brand)}</span>
                )}
                {item.product_model && (
                  <>
                    <span className="text-slate-200 text-[9px]">·</span>
                    <span className="text-[9px] font-semibold text-slate-400">{capitalizeFirstLetter(item.product_model)}</span>
                  </>
                )}
                {item.product_type && (
                  <span className="px-1.5 py-0 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 uppercase">
                    {item.product_type}
                  </span>
                )}
              </div>
            )}
          </div>
          {item.is_product_scheme && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black uppercase shadow-sm">
              <FiZap size={7} />Scheme
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasProduct && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
              {item.is_product_scheme ? (
                <span className="text-xs font-black text-emerald-600">FREE</span>
              ) : (
                <>
                  {discountLabel && (
                    <span className="text-[10px] text-slate-400 line-through">₹{itemTotal.toLocaleString("en-IN")}</span>
                  )}
                  <span className="text-xs font-black text-blue-700">₹{Math.max(0, finalAmount).toLocaleString("en-IN")}</span>
                  {discountLabel && (
                    <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1 rounded">{discountLabel}</span>
                  )}
                </>
              )}
            </div>
          )}

          <button type="button"
            onClick={() => onItemChange(index, "is_product_scheme", !item.is_product_scheme)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wide transition-all ${item.is_product_scheme
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-sm"
              : "bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
              }`}>
            <FiZap size={9} />Scheme
          </button>

          {totalItems > 1 && (
            <button type="button" onClick={() => onRemove(index)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200">
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 pb-5 space-y-4">
        {/* Brand + Model row */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-blue-100/60">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Brand</span>
              {currentBrand && (
                <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black leading-4">
                  <FiCheck size={7} />{currentBrand}
                </span>
              )}
            </div>
            <CascadeSelect value={currentBrand} options={brandOptions}
              onChange={(val) => onBrandChange(index, val)}
              placeholder={dealerSelected ? "Select brand…" : "Select dealer first"}
              disabled={!dealerSelected || loadingProducts || brandOptions.length === 0}
              color="indigo" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex-shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Model</span>
              {currentModel && (
                <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black leading-4">
                  <FiCheck size={7} />{currentModel}
                </span>
              )}
            </div>
            <CascadeSelect value={currentModel} options={modelOptions}
              onChange={(val) => onModelChange(index, val)}
              placeholder={currentBrand ? "Select model…" : "Brand first"}
              disabled={!currentBrand || modelOptions.length === 0}
              color="violet" />
          </div>
        </div>

        <div className="rounded-xl border border-blue-100/60 bg-white p-4 hover:shadow-md transition-all duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_90px_120px_180px_160px] gap-4 items-start">

            {/* Product */}
            <div>
              <label className="flex items-center gap-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <FiPackage size={10} className="text-slate-400" />Product<span className="text-rose-400">*</span>
              </label>
              <div className="space-y-1.5">
                <ProductDropdown value={item.product_id} options={itemProductOptions}
                  onChange={(e) => onItemChange(index, "product_id", e.target.value)}
                  placeholder={currentBrand ? "Search product…" : "Select brand first"}
                  isLoading={loadingProducts} productsMap={productsMap} />
                {stockInfo && item.product_id && <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />}
              </div>
            </div>

            {/* Qty */}
            <div>
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Qty</label>
              <StyledInput type="number" min="1" value={item.qty_ordered}
                onChange={(e) => onItemChange(index, "qty_ordered", e.target.value)}
                className="text-center font-semibold" />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Unit Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
                <StyledInput type="number" value={item.product_price} readOnly
                  className="pl-6 pr-2 text-right text-sm bg-slate-50 border-slate-200 font-semibold" />
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Discount</label>
              <DiscountField item={item} index={index} discountOptions={discountOptions}
                onDealerChange={onDealerDiscount} onManualChange={onManualDiscount} onClear={onClearDiscount} />
            </div>

            {/* Delivery */}
            <div>
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Delivery</label>
              <StyledInput type="date" min={getMinDeliveryDate()} value={item.delivery_date}
                onChange={(e) => onItemChange(index, "delivery_date", e.target.value)} className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   MOBILE ITEM CARD
   ================================================================ */
const MobileItemCard = ({
  item, index, totalItems, stockInfo, itemProductOptions, brandOptions, modelOptions,
  currentBrand, currentModel, discountOptions, productsMap, loadingProducts,
  dealerSelected, getMinDeliveryDate, itemTotal, finalAmount, discountLabel,
  onBrandChange, onModelChange, onItemChange, onDealerDiscount, onManualDiscount,
  onClearDiscount, onRemove,
}) => (
  <div className="xl:hidden bg-white border border-blue-100/60 rounded-2xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 bg-blue-50/30 border-b border-blue-100/60">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-[9px] font-black text-white">{index + 1}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Item #{index + 1}</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onItemChange(index, "is_product_scheme", !item.is_product_scheme)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-black uppercase tracking-wide transition-all ${item.is_product_scheme
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent"
            : "bg-white text-slate-400 border-slate-200 hover:border-blue-300"
            }`}>
          <FiZap size={8} />Scheme
        </button>
        {totalItems > 1 && (
          <button type="button" onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
            <FiTrash2 size={12} />
          </button>
        )}
      </div>
    </div>
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand" required>
          <CascadeSelect value={currentBrand} options={brandOptions} onChange={(v) => onBrandChange(index, v)}
            placeholder={dealerSelected ? "Select brand" : "Select dealer"} disabled={!dealerSelected || loadingProducts} color="indigo" />
        </Field>
        <Field label="Model">
          <CascadeSelect value={currentModel} options={modelOptions} onChange={(v) => onModelChange(index, v)}
            placeholder={currentBrand ? "Select model" : "Brand first"} disabled={!currentBrand || modelOptions.length === 0} color="violet" />
        </Field>
      </div>
      <Field label="Product" required>
        <ProductDropdown value={item.product_id} options={itemProductOptions}
          onChange={(e) => onItemChange(index, "product_id", e.target.value)}
          placeholder={currentBrand ? "Search product…" : "Select brand first"}
          isLoading={loadingProducts} productsMap={productsMap} />
        {stockInfo && item.product_id && <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" required>
          <StyledInput type="number" min="1" value={item.qty_ordered}
            onChange={(e) => onItemChange(index, "qty_ordered", e.target.value)} className="text-center font-bold" />
        </Field>
        <Field label="Unit Price">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
            <StyledInput type="number" value={item.product_price} readOnly className="pl-6 text-right bg-slate-50 cursor-default font-semibold" />
          </div>
        </Field>
      </div>
      <Field label="Discount">
        <DiscountField item={item} index={index} discountOptions={discountOptions}
          onDealerChange={onDealerDiscount} onManualChange={onManualDiscount} onClear={onClearDiscount} />
      </Field>
      <Field label="Delivery Date" required>
        <StyledInput type="date" min={getMinDeliveryDate()} value={item.delivery_date}
          onChange={(e) => onItemChange(index, "delivery_date", e.target.value)} />
      </Field>
      {item.product_name && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-50/40 to-amber-50/30 border border-blue-100/60">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{capitalizeFirstLetter(item.product_name)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {item.product_brand && capitalizeFirstLetter(item.product_brand)}
              {item.product_model && ` · ${capitalizeFirstLetter(item.product_model)}`}
            </p>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            {item.is_product_scheme ? <span className="text-sm font-black text-emerald-600">FREE</span> : (
              <>
                {discountLabel && <span className="text-[10px] text-slate-400 line-through">₹{itemTotal.toLocaleString("en-IN")}</span>}
                <span className="text-sm font-black text-slate-900">₹{Math.max(0, finalAmount).toLocaleString("en-IN")}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);

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
  const [allBrands, setAllBrands] = useState([]);
  const [discountOptions, setDiscountOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [error, setError] = useState("");
  const [itemBrands, setItemBrands] = useState({});
  const [itemModels, setItemModels] = useState({});

  const canSelectSalesmanPermission = useMemo(() => canSelectSalesman(user?.role), [user?.role]);

  const productsMap = useMemo(() => {
    const map = {};
    products.forEach((p) => { map[p.product_id] = p; });
    return map;
  }, [products]);

  const brandModelsMap = useMemo(() => {
    const map = {};
    allBrands.forEach((b) => { map[b.brand_name] = b.brand_models || []; });
    return map;
  }, [allBrands]);

  const getMinDeliveryDate = useCallback(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  /* ----------------------------------------------------------------
     LOAD SALESPERSONS (only for authorized roles)
     On mount — always fetch salespersons list if permitted.
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!canSelectSalesmanPermission) return;

    const loadSalespersons = async () => {
      try {
        const res = await fetchUserByRole(ROLES.SALESMAN);
        if (res?.success && res?.data) setSalespersons(res.data);
      } catch {
        setError("Failed to load salespersons");
      }
    };

    loadSalespersons();
  }, [canSelectSalesmanPermission]);

  /* ----------------------------------------------------------------
     LOAD DEALERS
     - If the current user CAN select a salesman: fetch dealers only
       after a salesman is chosen, scoped to that salesman's assignments.
     - Otherwise (user IS the salesman): fetch all assigned dealers
       immediately on mount using the current user's own ID.
  ---------------------------------------------------------------- */
  useEffect(() => {
    // For roles that pick a salesman — wait until one is selected.
    if (canSelectSalesmanPermission && !formData.salesman_id) {
      setDealers([]);
      return;
    }

    const loadDealers = async () => {
      setLoadingDealers(true);
      // Reset dealer + downstream state when salesman changes.
      setFormData((prev) => ({ ...prev, dealer_id: "" }));
      setDealers([]);
      setProducts([]);
      setAllBrands([]);
      setItemBrands({});
      setItemModels({});

      try {
        const salesmanId = canSelectSalesmanPermission
          ? formData.salesman_id          // manager/admin selected a salesman
          : user?.employee_id;            // user IS the salesman

        const res = await fetchDealers({
          limit: 5000,
          includeDealers: true,
          scope: "ASSIGNED_ONLY",
          salesmanIds: salesmanId ? [salesmanId] : [],
        });

        if (res?.success && res?.data?.employees) {
          setDealers(res.data.employees.filter((e) => e.role === ROLES.DEALER));
        }
      } catch {
        setError("Failed to load dealers");
      } finally {
        setLoadingDealers(false);
      }
    };

    loadDealers();
     
  }, [canSelectSalesmanPermission, formData.salesman_id, user?.employee_id]);

  /* ----------------------------------------------------------------
     LOAD PRODUCTS & BRANDS when dealer changes
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!formData.dealer_id) {
      setProducts([]);
      setAllBrands([]);
      setItemBrands({});
      setItemModels({});
      return;
    }

    const loadProductsForDealer = async () => {
      setLoadingProducts(true);
      try {
        const brandRes = await getBrandsByDealer(formData.dealer_id, "active");
        if (!brandRes?.success || !brandRes?.data?.length) {
          setProducts([]);
          setAllBrands([]);
          return;
        }
        setAllBrands(brandRes.data);

        const brandNames = brandRes.data.map((b) => b.brand_name);
        const productRes = await fetchProductsByBrands(brandNames);
        if (productRes?.success && Array.isArray(productRes.data)) {
          setProducts(productRes.data);
        }
      } catch {
        setError("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProductsForDealer();
  }, [formData.dealer_id]);

  /* ---- Per-item helpers ---- */
  const getItemProductOptions = useCallback((index) => {
    const brand = itemBrands[index];
    const model = itemModels[index];
    return products
      .filter((p) => {
        if (brand && p.brand !== brand) return false;
        if (model && p.model !== model) return false;
        return true;
      })
      .map((p) => ({
        value: p.product_id,
        label: p.product_name,
        product_name: p.product_name,
        product_model: p.model,
        product_type: p.product_type,
        product_brand: p.brand,
      }));
  }, [products, itemBrands, itemModels]);

  const getBrandOptions = useCallback(
    () => allBrands.map((b) => ({ value: b.brand_name, label: b.brand_name })),
    [allBrands]
  );

  const getModelOptions = useCallback((index) => {
    const brand = itemBrands[index];
    if (!brand) return [];
    return (brandModelsMap[brand] || []).map((m) => ({ value: m, label: m }));
  }, [itemBrands, brandModelsMap]);

  /* ---- Brand / Model change handlers ---- */
  const handleItemBrandChange = (index, brandName) => {
    setItemBrands((prev) => ({ ...prev, [index]: brandName }));
    setItemModels((prev) => ({ ...prev, [index]: "" }));
    const updatedItems = [...formData.order_details];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: "", product_brand: "", product_name: "", product_model: "",
      product_type: "", product_price: 0, available_stock: 0, packed_stock: 0,
      unpacked_stock: 0, discount_price: 0, dealer_discount_id: null, delivery_date: "",
    };
    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
    setDiscountOptions((prev) => ({ ...prev, [index]: [] }));
  };

  const handleItemModelChange = (index, modelName) => {
    setItemModels((prev) => ({ ...prev, [index]: modelName }));
    const updatedItems = [...formData.order_details];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: "", product_brand: "", product_name: "", product_model: "",
      product_type: "", product_price: 0, available_stock: 0, packed_stock: 0,
      unpacked_stock: 0, discount_price: 0, dealer_discount_id: null, delivery_date: "",
    };
    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
    setDiscountOptions((prev) => ({ ...prev, [index]: [] }));
  };

  /* ---- Generic field change ---- */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  /* ---- Item field change ---- */
  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.order_details];
    if (field === "qty_ordered") {
      value = value.replace(/[^0-9]/g, "");
      if (value !== "" ) value = Math.max(1, parseInt(value, 10));
    }
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
          available_stock: selectedProduct.available_stock ?? 0,
          packed_stock: selectedProduct.stocks?.[0]?.packed_stock ?? 0,
          unpacked_stock: selectedProduct.stocks?.[0]?.unpacked_stock ?? 0,
          discount_price: 0,
          dealer_discount_id: null,
          delivery_date: getMinDeliveryDate(),
        };
        if (!itemBrands[index] && selectedProduct.brand)
          setItemBrands((prev) => ({ ...prev, [index]: selectedProduct.brand }));
        if (!itemModels[index] && selectedProduct.model)
          setItemModels((prev) => ({ ...prev, [index]: selectedProduct.model }));

        const discountRes = await fetchDealerDiscounts({ dealer_id: formData.dealer_id, product_id: value });
        setDiscountOptions((prev) => ({
          ...prev,
          [index]: discountRes?.success && discountRes?.data?.length ? discountRes.data : [],
        }));
      }
    }

    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  /* ---- Discount helpers ---- */
  const handleDealerDiscount = (index, dealerDiscountId) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index].dealer_discount_id = dealerDiscountId || null;
    updatedItems[index].discount_price = 0;
    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  const handleManualDiscount = (index, value) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index].discount_price = Number(value) || 0;
    updatedItems[index].dealer_discount_id = null;
    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  const handleClearDiscount = (index) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index].dealer_discount_id = null;
    updatedItems[index].discount_price = 0;
    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({ ...prev, order_details: [...prev.order_details, { ...INITIAL_ORDER_ITEM }] }));
  };

  const removeItem = (index) => {
    if (formData.order_details.length === 1) return;
    setFormData((prev) => ({ ...prev, order_details: prev.order_details.filter((_, i) => i !== index) }));
    const reindex = (obj) => {
      const next = { ...obj };
      delete next[index];
      const out = {};
      Object.entries(next).forEach(([k, v]) => { const ki = Number(k); out[ki > index ? ki - 1 : ki] = v; });
      return out;
    };
    setItemBrands(reindex);
    setItemModels(reindex);
    setDiscountOptions((prev) => { const n = { ...prev }; delete n[index]; return n; });
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const validItems = formData.order_details
        .filter((i) => i.product_id && i.delivery_date)
        .map((item) => {
          const qty = parseInt(String(item.qty_ordered).replace(/[^0-9]/g, ""), 10);
          const p = {
            product_id: item.product_id,
            product_brand: item.product_brand,
            product_name: item.product_name,
            product_model: item.product_model,
            product_type: item.product_type,
            product_price: item.product_price,
            qty_ordered: qty,
            delivery_date: item.delivery_date,
            is_product_scheme: item.is_product_scheme,
          };
          if (item.dealer_discount_id) {
            p.dealer_discount_id = item.dealer_discount_id;
          } else {
            const disc = parseFloat(String(item.discount_price).replace(/[^0-9.]/g, ""));
            if (!isNaN(disc) && disc > 0) p.discount_price = disc;
          }
          return p;
        })
        .filter((i) => i.qty_ordered > 0);

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
        toastSuccess("Order Created Successfully 🎉");
        navigate("/orders");
      } else {
        setError(response?.message || "Failed to create order");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---- Financial summary ---- */
  const financialSummary = useMemo(() => {
    let subtotal = 0, totalDiscount = 0;
    formData.order_details.forEach((item, index) => {
      const qty = Number(item.qty_ordered) || 0;
      const price = Number(item.product_price) || 0;
      if (!item.product_id || qty <= 0 || item.is_product_scheme) return;
      const itemTotal = qty * price;
      subtotal += itemTotal;
      const dd = discountOptions[index]?.find((d) => d.dealer_discount_id === item.dealer_discount_id);
      if (dd)
        totalDiscount += dd.is_percentage ? (itemTotal * dd.discount_value) / 100 : Number(dd.discount_value || 0) * qty;
      else if (item.discount_price > 0)
        totalDiscount += Number(item.discount_price || 0) * qty;
    });
    const netAmount = subtotal - totalDiscount;
    const amountPaid = Number(formData.amount_paid) || 0;
    return { subtotal, totalDiscount, netAmount, amountPaid, balance: netAmount - amountPaid };
  }, [formData, discountOptions]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── HEADER ── */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              <button type="button" onClick={() => navigate("/orders")}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:text-blue-600 hover:border-blue-200 transition-colors group">
                <FiArrowLeft size={15} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Place New Order</h1>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">Order Management</p>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-500/30">
              <FiSend size={13} />
              {loading ? "Creating…" : "Submit Order"}
            </button>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
              <FiAlertCircle size={15} className="text-rose-500 flex-shrink-0" />{error}
            </div>
          )}

          {/* ── ORDER DETAILS ── */}
          <SectionCard icon={<FiFileText size={13} />} title="Order Details" subtitle="Basic Information" accent="indigo">
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* ── SALESMAN (authorized roles only — rendered FIRST) ── */}
                {canSelectSalesmanPermission && (
                  <Field label="Salesman" required>
                    <CustomSelect
                      name="salesman_id"
                      value={formData.salesman_id}
                      onChange={handleChange}
                      options={salespersons.map((s) => ({
                        value: s.employee_id,
                        label: formatName(s.employee_name),
                      }))}
                      placeholder="Select Salesman"
                      searchable
                    />
                  </Field>
                )}

                {/* ── DEALER — gated on salesman selection for privileged roles ── */}
                <Field label="Dealer" required>
                  {canSelectSalesmanPermission && !formData.salesman_id ? (
                    <SalesmanRequiredHint />
                  ) : (
                    <CustomSelect
                      name="dealer_id"
                      value={formData.dealer_id}
                      onChange={handleChange}
                      options={dealers.map((d) => ({
                        value: d.employee_id,
                        label: d.town
                          ? `${capitalizeFirstLetter(d.shop_name)} — ${capitalizeFirstLetter(d.town)}`
                          : capitalizeFirstLetter(d.shop_name) || formatName(d.employee_name),
                        subLabel: d.employee_phone ? String(d.employee_phone) : null,
                      }))}
                      placeholder={loadingDealers ? "Loading dealers…" : "Select Dealer"}
                      searchable
                      disabled={loadingDealers}
                    />
                  )}
                </Field>

                {/* ── PRIORITY ── */}
                <Field label="Priority" required>
                  <CustomSelect name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} />
                </Field>

                {/* ── AMOUNT PAID ── */}
                <Field label="Amount Paid" hint="Optional">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                    <StyledInput type="number" name="amount_paid" value={formData.amount_paid}
                      onChange={handleChange} placeholder="0" min={0} className="pl-7" />
                  </div>
                </Field>

                {/* ── PAYMENT METHOD ── */}
                <Field label="Payment Method" required>
                  <CustomSelect name="payment_method" value={formData.payment_method} onChange={handleChange} options={PAYMENT_METHOD_OPTIONS} />
                </Field>
              </div>

              {/* ── ORDER NOTES ── */}
              <Field label="Order Notes" hint="Optional">
                <textarea name="order_note" value={formData.order_note} onChange={handleChange} rows={3}
                  placeholder="Special instructions or notes…"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none" />
              </Field>
            </div>
          </SectionCard>

          {/* ── ORDER ITEMS ── */}
          <SectionCard
            icon={<FiShoppingCart size={13} />}
            title="Ordered Items"
            subtitle="Products"
            accent="indigo"
            action={
              <div className="flex items-center gap-2">
                {formData.dealer_id && allBrands.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wide border border-slate-200">
                    <FiFilter size={8} />{allBrands.length} brand{allBrands.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                  <FiPackage size={9} />
                  {formData.order_details.length} {formData.order_details.length === 1 ? "Item" : "Items"}
                </span>
              </div>
            }
          >
            <div className="space-y-3">

              {/* ── Context hints ── */}
              {canSelectSalesmanPermission && !formData.salesman_id && (
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50/60 border border-blue-200 border-dashed rounded-xl">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0"><FiUser size={12} /></div>
                  <p className="text-xs font-semibold text-blue-700">Select a salesman to load their assigned dealers and products</p>
                </div>
              )}
              {(!canSelectSalesmanPermission || formData.salesman_id) && !formData.dealer_id && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 border-dashed rounded-xl">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 flex-shrink-0"><FiAlertCircle size={12} /></div>
                  <p className="text-xs font-semibold text-amber-700">Select a dealer to load available brands and products</p>
                </div>
              )}

              {/* ── Item cards ── */}
              {formData.order_details.map((item, index) => {
                const stockInfo = item.product_id
                  ? { total: item.available_stock ?? 0, packed: item.packed_stock ?? 0, unpacked: item.unpacked_stock ?? 0 }
                  : null;
                const qty = Number(item.qty_ordered) || 0;
                const price = Number(item.product_price) || 0;
                const itemTotal = qty * price;
                const dealerDiscount = discountOptions[index]?.find((d) => d.dealer_discount_id === item.dealer_discount_id);

                let finalAmount = itemTotal;
                let discountLabel = null;

                if (!item.is_product_scheme) {
                  if (dealerDiscount) {
                    const da = dealerDiscount.is_percentage
                      ? (itemTotal * dealerDiscount.discount_value) / 100
                      : Number(dealerDiscount.discount_value || 0) * qty;
                    finalAmount -= da;
                    discountLabel = dealerDiscount.is_percentage
                      ? `${dealerDiscount.discount_value}% off`
                      : `₹ ${da.toLocaleString("en-IN")} off`;
                  } else if (item.discount_price > 0) {
                    const da = Number(item.discount_price || 0) * qty;
                    finalAmount -= da;
                    discountLabel = `₹ ${da.toLocaleString("en-IN")} off`;
                  }
                }

                const currentBrand = itemBrands[index] || "";
                const currentModel = itemModels[index] || "";
                const itemProductOptions = getItemProductOptions(index);
                const brandOptions = getBrandOptions();
                const modelOptions = getModelOptions(index);

                const commonProps = {
                  item, index, totalItems: formData.order_details.length, stockInfo,
                  itemProductOptions, brandOptions, modelOptions, currentBrand, currentModel,
                  discountOptions, productsMap, loadingProducts,
                  dealerSelected: !!formData.dealer_id,
                  getMinDeliveryDate, itemTotal, finalAmount, discountLabel,
                  onBrandChange: handleItemBrandChange,
                  onModelChange: handleItemModelChange,
                  onItemChange: handleItemChange,
                  onDealerDiscount: handleDealerDiscount,
                  onManualDiscount: handleManualDiscount,
                  onClearDiscount: handleClearDiscount,
                  onRemove: removeItem,
                };

                return (
                  <React.Fragment key={index}>
                    <ItemCard       {...commonProps} />
                    <MobileItemCard {...commonProps} />
                  </React.Fragment>
                );
              })}

              {/* ── Add item ── */}
              <button type="button" onClick={addItem}
                className="w-full flex items-center justify-center gap-2.5 py-4 border-2 border-dashed border-blue-200/70 rounded-xl text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all group">
                <div className="p-1.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <FiPlus size={12} className="text-blue-500 group-hover:text-blue-600 transition-colors" />
                </div>
                Add Another Item
              </button>
            </div>

            {/* ── Order Summary ── */}
            <div className="mt-6">
              <OrderSummaryCard financialSummary={financialSummary} itemCount={formData.order_details.length} />
            </div>
          </SectionCard>

          {/* ── STICKY FOOTER ── */}
          <div className="sticky bottom-6 z-20 flex justify-end pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-blue-100/80 rounded-xl shadow-lg px-5 py-3 ring-1 ring-blue-100/60">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-slate-500 font-semibold hidden sm:block">
                {formData.order_details.length} {formData.order_details.length === 1 ? "item" : "items"} in cart
              </span>
              <div className="w-px h-4 bg-blue-100 mx-1 hidden sm:block" />
              <button type="button" onClick={() => navigate("/orders")}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:border-blue-200 hover:text-blue-600 active:scale-95 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold rounded-lg hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/30">
                <FiSend size={12} />
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