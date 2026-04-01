// createOrder.jsx — Redesigned UI

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
  FiChevronDown,
  FiPercent,
  FiCreditCard,
  FiBarChart2,
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
    <div className="mt-2 space-y-1.5">
      <div className="relative h-1 rounded-full bg-slate-100 overflow-hidden">
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
            className="absolute top-0 h-full w-0.5 bg-slate-600/50"
            style={{ left: `${Math.min((ordered / total) * 100, 99)}%` }}
          />
        )}
      </div>
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
      {status && (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${status.level === "packed"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status.level === "unpacked"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
        >
          <span>{status.icon}</span>
          {status.label}
          {isOver && <span className="opacity-70 ml-0.5">· Production raised</span>}
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
   SECTION CARD — Premium redesign
   ================================================================ */
const SectionCard = ({ icon, title, subtitle, action, children, accent = "indigo" }) => {
  const accentMap = {
    indigo: {
      dot: "bg-indigo-500",
      icon: "bg-indigo-50 text-indigo-600 border border-indigo-100",
      bar: "bg-indigo-500",
    },
    slate: {
      dot: "bg-slate-400",
      icon: "bg-slate-50 text-slate-500 border border-slate-200",
      bar: "bg-slate-400",
    },
  };
  const a = accentMap[accent] ?? accentMap.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className={`w-[3px] h-8 rounded-full ${a.bar} flex-shrink-0`} />
          <div className={`p-2 rounded-xl ${a.icon} flex-shrink-0`}>{icon}</div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-none">{title}</h2>
            {subtitle && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                {subtitle}
              </p>
            )}
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
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
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
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 440),
      zIndex: 9999,
      ...(spaceBelow >= 320
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setIsOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
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
        ref={triggerRef}
        type="button"
        disabled={isLoading}
        onClick={() =>
          isOpen ? (setIsOpen(false), setSearch("")) : openPanel()
        }
        className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-all duration-150 ${isOpen
          ? "border-indigo-400 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-indigo-300"
          } ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`truncate font-medium ${selected ? "text-slate-800" : "text-slate-400"
            }`}
        >
          {isLoading
            ? "Loading products…"
            : selected
              ? capitalizeFirstLetter(selected.product_name || selected.label || "")
              : placeholder}
        </span>
        <FiChevronDown
          size={14}
          className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && !isLoading && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white border border-slate-200 rounded-xl shadow-[0_16px_48px_-8px_rgba(15,23,42,0.16)] overflow-hidden"
        >
          <div className="px-3 pt-3 pb-2 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, model or type…"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 bg-white placeholder-slate-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_72px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            {["Product", "Brand", "Model", "Type", "Stock"].map((h) => (
              <span
                key={h}
                className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400"
              >
                {h}
              </span>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400 font-semibold">
                No products found
              </div>
            ) : (
              filtered.map((opt) => {
                const product = productsMap?.[opt.value];
                const total = product?.available_stock ?? 0;
                const lvl = total === 0 ? "none" : total < 5 ? "low" : "ok";
                const stockColors = {
                  ok: "text-emerald-600 bg-emerald-50 border-emerald-100",
                  low: "text-amber-600 bg-amber-50 border-amber-100",
                  none: "text-rose-600 bg-rose-50 border-rose-100",
                };
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange({ target: { value: opt.value } });
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full grid grid-cols-[2fr_1fr_1fr_72px] gap-2 items-center px-4 py-3 text-sm text-left transition-colors border-b border-slate-50 last:border-0 ${value === opt.value ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                  >
                    <span
                      className={`font-semibold truncate ${value === opt.value ? "text-indigo-700" : "text-slate-900"
                        }`}
                    >
                      {opt.product_name
                        ? capitalizeFirstLetter(opt.product_name)
                        : opt.label}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate">
                      {opt.product_brand ? (
                        capitalizeFirstLetter(opt.product_brand)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate">
                      {opt.product_model ? (
                        capitalizeFirstLetter(opt.product_model)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                    <span>
                      {opt.product_type ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide whitespace-nowrap">
                          {opt.product_type}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </span>
                    <span>
                      {product ? (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-black border ${stockColors[lvl]}`}
                        >
                          <FiBox size={8} />
                          {total}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
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
   UNIFIED DISCOUNT FIELD
   — dealer discount (dropdown) OR manual (number input), mutually exclusive
   ================================================================ */
const DiscountField = ({ item, index, discountOptions, onDealerChange, onManualChange, onClear }) => {
  const [mode, setMode] = useState(() =>
    item.dealer_discount_id ? "dealer" : item.discount_price > 0 ? "manual" : "none"
  );
  const [dropOpen, setDropOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  const options = discountOptions[index] || [];
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
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 9999,
      ...(spaceBelow >= 200
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setDropOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setDropOpen(false);
        setSearch("");
      }
    };
    if (dropOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  const handleModeSwitch = (m) => {
    setMode(m);
    // clear both on switch
    onClear(index);
  };

  const hasDiscount = item.dealer_discount_id || item.discount_price > 0;
  const isScheme = item.is_product_scheme;

  if (isScheme) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50">
        <FiZap size={11} className="text-emerald-500" />
        <span className="text-xs font-semibold text-slate-400">Scheme — no discount</span>
      </div>
    );
  }

  if (options.length === 0 && mode !== "manual") {
    // only manual entry available
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
        <StyledInput
          type="number"
          value={item.discount_price ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onManualChange(index, v === "" ? "" : Number(v));
          }}
          className="pl-7 text-right"
          placeholder="0"
          min={0}
        />
        {item.discount_price > 0 && (
          <button
            type="button"
            onClick={() => onManualChange(index, 0)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors text-xs font-black"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Mode pills */}
      <div className="flex gap-1">
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => handleModeSwitch("dealer")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide border transition-all ${mode === "dealer"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
          >
            <FiTag size={9} />
            Dealer
          </button>
        )}
        <button
          type="button"
          onClick={() => handleModeSwitch("manual")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide border transition-all ${mode === "manual"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
            }`}
        >
          <FiPercent size={9} />
          Manual
        </button>
        {hasDiscount && (
          <button
            type="button"
            onClick={() => { onClear(index); setMode("none"); }}
            className="px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dealer dropdown */}
      {mode === "dealer" && options.length > 0 && (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => (dropOpen ? setDropOpen(false) : openDrop())}
            className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-all duration-150 ${dropOpen
              ? "border-indigo-400 ring-2 ring-indigo-100"
              : "border-slate-200 hover:border-indigo-300"
              }`}
          >
            <span
              className={`truncate font-medium ${selectedDealer ? "text-slate-800" : "text-slate-400"
                }`}
            >
              {selectedDealer
                ? selectedDealer.is_percentage
                  ? `${selectedDealer.discount_value}% off`
                  : `₹ ${selectedDealer.discount_value * qty} off`
                : "Pick discount…"}
            </span>
            <FiChevronDown
              size={13}
              className={`text-slate-400 flex-shrink-0 transition-transform ${dropOpen ? "rotate-180" : ""
                }`}
            />
          </button>
          {dropOpen && (
            <div
              ref={panelRef}
              style={panelStyle}
              className="bg-white border border-slate-200 rounded-xl shadow-[0_16px_48px_-8px_rgba(15,23,42,0.16)] overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-400 text-center font-semibold">
                    No discounts found
                  </div>
                ) : (
                  filtered.map((opt) => (
                    <button
                      key={opt.dealer_discount_id}
                      type="button"
                      onClick={() => {
                        onDealerChange(index, opt.dealer_discount_id);
                        setDropOpen(false);
                        setSearch("");
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors ${item.dealer_discount_id === opt.dealer_discount_id
                        ? "bg-indigo-50 text-indigo-700"
                        : "hover:bg-slate-50 text-slate-700"
                        }`}
                    >
                      <span className="font-black text-sm">
                        {opt.is_percentage
                          ? `${opt.discount_value}%`
                          : `₹ ${opt.discount_value * qty}`}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {opt.is_percentage ? "percentage off" : "flat off"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual input */}
      {mode === "manual" && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
            ₹
          </span>
          <StyledInput
            type="number"
            value={item.discount_price ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onManualChange(index, v === "" ? "" : Number(v));
            }}
            className="pl-7 text-right"
            placeholder="0"
            min={0}
          />
        </div>
      )}
    </div>
  );
};

/* ================================================================
   ORDER SUMMARY CARD — Redesigned with catchy labels
   ================================================================ */
const OrderSummaryCard = ({ financialSummary, itemCount }) => {
  const { subtotal, totalDiscount, netAmount, amountPaid, balance } = financialSummary;
  const isPaid = balance <= 0;
  const savingsPct = subtotal > 0 ? ((totalDiscount / subtotal) * 100).toFixed(1) : 0;

  const Row = ({ label, value, muted, large, color, icon }) => (
    <div className="flex items-center justify-between py-2.5">
      <span
        className={`flex items-center gap-2 text-sm ${muted ? "text-slate-400" : "text-slate-600"
          } font-medium`}
      >
        {icon && (
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center ${muted ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-500"
              }`}
          >
            {icon}
          </span>
        )}
        {label}
      </span>
      <span
        className={`font-bold tabular-nums ${large
          ? "text-2xl font-black text-slate-900"
          : color
            ? color
            : muted
              ? "text-slate-500 text-sm"
              : "text-slate-800 text-sm"
          }`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Accent strip */}
      <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <FiBarChart2 size={14} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Bill Breakdown</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">
              {itemCount} {itemCount === 1 ? "line item" : "line items"}
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider ${isPaid
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-amber-50 text-amber-600 border-amber-200"
            }`}
        >
          {isPaid ? "Settled" : "Outstanding"}
        </span>
      </div>

      {/* Rows */}
      <div className="px-5 divide-y divide-slate-50">
        <Row
          label="Gross Total"
          value={`₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          icon={<FiLayers size={10} />}
          muted
        />
        {totalDiscount > 0 && (
          <Row
            label={`Savings ${savingsPct > 0 ? `(${savingsPct}%)` : ""}`}
            value={`− ₹ ${totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            icon={<FiTrendingDown size={10} />}
            color="text-rose-500 text-sm font-bold"
          />
        )}
        <div className="py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
              You Pay
            </span>
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              ₹ {netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <Row
          label="Paid Now"
          value={`₹ ${amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          icon={<FiCreditCard size={10} />}
          color="text-indigo-600 text-sm font-bold"
        />
      </div>

      {/* Balance box */}
      <div className="px-5 pb-5 pt-3">
        <div
          className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${isPaid
            ? "bg-emerald-50/80 border-emerald-200"
            : "bg-rose-50/80 border-rose-200"
            }`}
        >
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-[0.1em] ${isPaid ? "text-emerald-600" : "text-rose-500"
                }`}
            >
              {isPaid ? "Fully Paid" : "Balance Due"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {isPaid ? "No dues remaining" : "To be collected on delivery"}
            </p>
          </div>
          <span
            className={`text-xl font-black tabular-nums ${isPaid ? "text-emerald-600" : "text-rose-600"
              }`}
          >
            ₹ {Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {totalDiscount > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
            <span className="text-base leading-none">🎉</span>
            <span className="text-xs font-bold text-emerald-700">
              Saved ₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on this order
            </span>
          </div>
        )}
      </div>
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

  const productsMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.product_id] = p;
    });
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
      } catch {
        setError("Failed to load initial data");
      }
    };
    loadInitialData();
  }, [canSelectSalesmanPermission]);

  /* ---- LOAD PRODUCTS WHEN DEALER CHANGES ---- */
  useEffect(() => {
    const loadProducts = async () => {
      if (!formData.dealer_id) {
        setProducts([]);
        return;
      }
      setLoadingProducts(true);
      try {
        const brandRes = await getBrandsByDealer(formData.dealer_id, "active");
        if (!brandRes?.success || !brandRes?.data?.length) {
          setProducts([]);
          return;
        }
        const brandNames = brandRes.data.map((b) => b.brand_name);
        const productRes = await fetchProductsByBrands(brandNames);
        if (productRes?.success && Array.isArray(productRes.data))
          setProducts(productRes.data);
      } catch {
        setError("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
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
          if (item.dealer_discount_id)
            payloadItem.dealer_discount_id = item.dealer_discount_id;
          else if (item.discount_price > 0)
            payloadItem.discount_price = Number(item.discount_price);
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
        salesman_id: canSelectSalesmanPermission
          ? formData.salesman_id
          : user.employee_id,
        amount_paid: Number(formData.amount_paid) || 0,
        payment_method: formData.payment_method,
        order_details: validItems,
      };

      const response = await createOrder(payload);
      if (response?.success) {
        await Swal.fire({
          icon: "success",
          title: "Order Created Successfully 🎉",
        });
        navigate("/orders");
      } else {
        setError(response?.message || "Failed to create order");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.product_id,
        label: p.product_name,
        product_name: p.product_name,
        product_model: p.model,
        product_type: p.product_type,
        product_brand: p.brand,
      })),
    [products]
  );

  const financialSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    formData.order_details.forEach((item, index) => {
      const qty = Number(item.qty_ordered) || 0;
      const price = Number(item.product_price) || 0;

      if (!item.product_id || qty <= 0) return;
      if (item.is_product_scheme) return;

      const itemTotal = qty * price;
      subtotal += itemTotal;

      const dealerDiscount = discountOptions[index]?.find(
        (d) => d.dealer_discount_id === item.dealer_discount_id
      );

      // ✅ FIXED DISCOUNT CALCULATION
      if (dealerDiscount) {
        if (dealerDiscount.is_percentage) {
          totalDiscount += (itemTotal * dealerDiscount.discount_value) / 100;
        } else {
          totalDiscount += Number(dealerDiscount.discount_value || 0) * qty;
        }
      } else if (item.discount_price > 0) {
        totalDiscount += Number(item.discount_price || 0) * qty;
      }
    });

    const netAmount = subtotal - totalDiscount;
    const amountPaid = Number(formData.amount_paid) || 0;
    const balance = netAmount - amountPaid;

    return {
      subtotal,
      totalDiscount,
      netAmount,
      amountPaid,
      balance,
    };
  }, [formData, discountOptions]);

  const getItemFinalAmount = (item, index) => {
    const qty = Number(item.qty_ordered) || 0;
    const price = Number(item.product_price) || 0;

    const itemTotal = qty * price;

    if (item.is_product_scheme) {
      return { final: 0, discountLabel: null, original: itemTotal };
    }

    const dealerDiscount = discountOptions[index]?.find(
      (d) => d.dealer_discount_id === item.dealer_discount_id
    );

    let discount = 0;
    let discountLabel = null;

    if (dealerDiscount) {
      if (dealerDiscount.is_percentage) {
        discount = (itemTotal * dealerDiscount.discount_value) / 100;
        discountLabel = `${dealerDiscount.discount_value}% off`;
      } else {
        discount = dealerDiscount.discount_value * qty;
        discountLabel = `₹ ${discount.toLocaleString("en-IN")} off`;
      }
    } else if (item.discount_price > 0) {
      discount = item.discount_price * qty;
      discountLabel = `₹ ${discount.toLocaleString("en-IN")} off`;
    }

    discount = Math.min(discount, itemTotal);

    return {
      final: Math.max(0, itemTotal - discount),
      discountLabel,
      original: itemTotal,
    };
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-slate-50/70">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── HEADER ── */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <FiArrowLeft
                  size={15}
                  className="text-slate-400 group-hover:text-slate-700 transition-colors"
                />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Place New Order
                </h1>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">
                  Order Management
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              <FiSend size={13} />
              {loading ? "Creating…" : "Submit Order"}
            </button>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
              <FiAlertCircle size={15} className="text-rose-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── ORDER DETAILS ── */}
          <SectionCard
            icon={<FiFileText size={13} />}
            title="Order Details"
            subtitle="Basic Information"
            accent="indigo"
          >
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field label="Dealer" required>
                  <CustomSelect
                    name="dealer_id"
                    value={formData.dealer_id}
                    onChange={handleChange}
                    options={dealers.map((d) => ({
                      value: d.employee_id,
                      label: `${capitalizeFirstLetter(d.employee_name)} — ${capitalizeFirstLetter(d.shop_name)}`,
                    }))}
                    placeholder="Select Dealer"
                    searchable
                  />
                </Field>
                <Field label="Priority" required>
                  <CustomSelect
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={PRIORITY_OPTIONS}
                  />
                </Field>
                {canSelectSalesmanPermission && (
                  <Field label="Salesman" required>
                    <CustomSelect
                      name="salesman_id"
                      value={formData.salesman_id}
                      onChange={handleChange}
                      options={salespersons.map((s) => ({
                        value: s.employee_id,
                        label: capitalizeFirstLetter(s.employee_name),
                      }))}
                      placeholder="Select Salesman"
                      searchable
                    />
                  </Field>
                )}
                <Field label="Amount Paid" hint="Optional">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      ₹
                    </span>
                    <StyledInput
                      type="number"
                      name="amount_paid"
                      value={formData.amount_paid}
                      onChange={handleChange}
                      placeholder="0"
                      min={0}
                      className="pl-7"
                    />
                  </div>
                </Field>
                <Field label="Payment Method" required>
                  <CustomSelect
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    options={PAYMENT_METHOD_OPTIONS}
                  />
                </Field>
              </div>
              <Field label="Order Notes" hint="Optional">
                <textarea
                  name="order_note"
                  value={formData.order_note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Special instructions or notes…"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
                />
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                <FiPackage size={9} />
                {formData.order_details.length}{" "}
                {formData.order_details.length === 1 ? "Item" : "Items"}
              </span>
            }
          >
            <div className="space-y-4">
              {/* Desktop column headers */}
              <div className="hidden xl:grid xl:grid-cols-[minmax(180px,2fr)_68px_100px_180px_130px_42px] gap-3 px-5 pb-3 border-b border-slate-100">
                {[
                  { label: "Product", icon: <FiPackage size={9} /> },
                  { label: "Qty" },
                  { label: "Unit Price" },
                  { label: "Discount", icon: <FiTag size={9} /> },
                  { label: "Delivery" },
                  { label: "" },
                ].map((col, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {col.icon && <span className="text-slate-300">{col.icon}</span>}
                    <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>

              {formData.order_details.map((item, index) => {
                const stockInfo = item.product_id
                  ? {
                    total: item.available_stock ?? 0,
                    packed: item.packed_stock ?? 0,
                    unpacked: item.unpacked_stock ?? 0,
                  }
                  : null;

                const qty = Number(item.qty_ordered) || 0;
                const price = Number(item.product_price) || 0;
                const itemTotal = qty * price;
                const dealerDiscount = discountOptions[index]?.find(
                  (d) => d.dealer_discount_id === item.dealer_discount_id
                );

                let finalAmount = itemTotal;
                let discountLabel = null;

                if (!item.is_product_scheme) {
                  if (dealerDiscount) {
                    const discountAmount = dealerDiscount.is_percentage
                      ? (itemTotal * dealerDiscount.discount_value) / 100
                      : Number(dealerDiscount.discount_value || 0) * qty;

                    finalAmount -= discountAmount;

                    discountLabel = dealerDiscount.is_percentage
                      ? `${dealerDiscount.discount_value}% off`
                      : `₹ ${discountAmount.toLocaleString("en-IN")} off`;
                  } else if (item.discount_price > 0) {
                    const discountAmount = Number(item.discount_price || 0) * qty;

                    finalAmount -= discountAmount;

                    discountLabel = `₹ ${discountAmount.toLocaleString("en-IN")} off`;
                  }
                }

                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200 rounded-xl overflow-visible hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                  >
                    {/* Mobile header */}
                    <div className="xl:hidden flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">
                        Item #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Scheme toggle mobile */}
                        <button
                          type="button"
                          onClick={() =>
                            handleItemChange(index, "is_product_scheme", !item.is_product_scheme)
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-all ${item.is_product_scheme
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300"
                            }`}
                        >
                          <FiZap size={9} />
                          Scheme
                        </button>
                        {formData.order_details.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div className="hidden xl:grid xl:grid-cols-[minmax(180px,2fr)_68px_100px_180px_130px_42px] gap-3 items-start px-5 py-4">
                      <div>
                        <ProductDropdown
                          value={item.product_id}
                          options={productOptions}
                          onChange={(e) =>
                            handleItemChange(index, "product_id", e.target.value)
                          }
                          placeholder="Search product…"
                          isLoading={loadingProducts}
                          productsMap={productsMap}
                        />
                        {stockInfo && item.product_id && (
                          <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />
                        )}
                      </div>

                      <StyledInput
                        type="number"
                        min="1"
                        value={item.qty_ordered}
                        onChange={(e) =>
                          handleItemChange(index, "qty_ordered", e.target.value)
                        }
                        className="text-center"
                      />

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          ₹
                        </span>
                        <StyledInput
                          type="number"
                          value={item.product_price}
                          readOnly
                          className="pl-6 text-right bg-slate-50 cursor-default"
                        />
                      </div>

                      <DiscountField
                        item={item}
                        index={index}
                        discountOptions={discountOptions}
                        onDealerChange={handleDealerDiscount}
                        onManualChange={handleManualDiscount}
                        onClear={handleClearDiscount}
                      />

                      <StyledInput
                        type="date"
                        min={getMinDeliveryDate()}
                        value={item.delivery_date}
                        onChange={(e) =>
                          handleItemChange(index, "delivery_date", e.target.value)
                        }
                      />

                      <div className="flex flex-col items-center gap-2 pt-0.5">
                        {/* Scheme toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            handleItemChange(
                              index,
                              "is_product_scheme",
                              !item.is_product_scheme
                            )
                          }
                          title={item.is_product_scheme ? "Remove scheme" : "Mark as Scheme"}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${item.is_product_scheme
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400"
                            }`}
                        >
                          <FiZap size={12} />
                        </button>
                        {/* Remove */}
                        {formData.order_details.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    </div>

                    {/* Mobile stacked */}
                    <div className="xl:hidden px-4 py-4 space-y-3.5">
                      <Field label="Product" required>
                        <ProductDropdown
                          value={item.product_id}
                          options={productOptions}
                          onChange={(e) =>
                            handleItemChange(index, "product_id", e.target.value)
                          }
                          placeholder="Search product…"
                          isLoading={loadingProducts}
                          productsMap={productsMap}
                        />
                        {stockInfo && item.product_id && (
                          <StockIndicator stockInfo={stockInfo} qty={item.qty_ordered} />
                        )}
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity" required>
                          <StyledInput
                            type="number"
                            min="1"
                            value={item.qty_ordered}
                            onChange={(e) =>
                              handleItemChange(index, "qty_ordered", e.target.value)
                            }
                            className="text-center"
                          />
                        </Field>
                        <Field label="Unit Price">
                          <StyledInput
                            type="number"
                            value={item.product_price}
                            readOnly
                            className="text-right bg-slate-50 cursor-default"
                          />
                        </Field>
                      </div>
                      <Field label="Discount">
                        <DiscountField
                          item={item}
                          index={index}
                          discountOptions={discountOptions}
                          onDealerChange={handleDealerDiscount}
                          onManualChange={handleManualDiscount}
                          onClear={handleClearDiscount}
                        />
                      </Field>
                      <Field label="Delivery Date" required>
                        <StyledInput
                          type="date"
                          min={getMinDeliveryDate()}
                          value={item.delivery_date}
                          onChange={(e) =>
                            handleItemChange(index, "delivery_date", e.target.value)
                          }
                        />
                      </Field>
                    </div>

                    {/* Product summary strip */}
                    {item.product_name && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white border border-slate-200 text-indigo-500">
                              <FiPackage size={12} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {capitalizeFirstLetter(item.product_name)}
                              </p>
                              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                {item.product_brand && (
                                  <span>{capitalizeFirstLetter(item.product_brand)}</span>
                                )}
                                {item.product_model && (
                                  <>
                                    <span>·</span>
                                    <span>{capitalizeFirstLetter(item.product_model)}</span>
                                  </>
                                )}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {item.product_type && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-white border border-slate-200 text-slate-500 uppercase tracking-wide">
                                    {item.product_type}
                                  </span>
                                )}
                                {item.is_product_scheme && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                                    ⚡ Scheme
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {item.is_product_scheme ? (
                              <>
                                <span className="text-xs text-slate-300 line-through">
                                  ₹{itemTotal.toLocaleString("en-IN")}
                                </span>
                                <span className="text-lg font-black text-emerald-600">FREE</span>
                              </>
                            ) : (
                              <>
                                {discountLabel && (
                                  <span className="text-xs font-semibold text-slate-400 line-through">
                                    ₹{itemTotal.toLocaleString("en-IN")}
                                  </span>
                                )}
                                {discountLabel && (
                                  <span className="text-[10px] font-black text-rose-500">
                                    {discountLabel}
                                  </span>
                                )}
                                <span className="text-lg font-black text-slate-900">
                                  ₹{Math.max(0, finalAmount).toLocaleString("en-IN")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add item */}
              <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all group"
              >
                <div className="p-1 rounded-lg bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                  <FiPlus size={12} className="group-hover:text-indigo-600 transition-colors" />
                </div>
                Add Another Item
              </button>
            </div>

            {/* Order Summary */}
            <div className="mt-6">
              <OrderSummaryCard
                financialSummary={financialSummary}
                itemCount={formData.order_details.length}
              />
            </div>
          </SectionCard>

          {/* ── STICKY FOOTER ── */}
          <div className="sticky bottom-6 z-20 flex justify-end pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg px-5 py-3 ring-1 ring-slate-100">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-sm text-slate-500 font-semibold hidden sm:block">
                {formData.order_details.length}{" "}
                {formData.order_details.length === 1 ? "item" : "items"} in cart
              </span>
              <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
              >
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