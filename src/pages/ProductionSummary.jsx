// ProductionSummary.jsx — per-product remaining qty by status

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiSearch, FiX, FiRefreshCw, FiPackage, FiAlertCircle, FiActivity,
  FiChevronRight, FiChevronDown, FiUsers, FiHash,
} from "react-icons/fi";
import { fetchProductionSummary } from "../api/orders";
import { capitalizeFirstLetter } from "../utils/constants";

const TRACKED_STATUSES = ["PRODUCTION", "PACKED", "INVOICE", "SHIPPED"];

const STATUS_STYLE = {
  PRODUCTION: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  PACKED: "bg-teal-50 text-teal-700 border-teal-200",
  INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
};

const QtyCell = ({ qty, status }) => {
  if (!qty) {
    return <span className="text-xs text-slate-300 font-medium">—</span>;
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLE[status]}`}
    >
      {qty.toLocaleString("en-IN")}
    </span>
  );
};

const ProductionSummary = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (productId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProductionSummary();
      if (res?.success) {
        setRows(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res?.message || "Failed to load production summary");
      }
    } catch {
      setError("Failed to load production summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      [r.product_name, r.product_brand, r.product_model, r.product_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const totals = useMemo(() => {
    const base = TRACKED_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    let grand = 0;
    filteredRows.forEach((r) => {
      TRACKED_STATUSES.forEach((s) => {
        base[s] += r.counts?.[s] || 0;
      });
      grand += r.total_qty || 0;
    });
    return { byStatus: base, grand };
  }, [filteredRows]);

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading summary…</p>
        </div>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <FiAlertCircle size={24} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 sm:px-6 py-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FiActivity size={18} className="text-blue-500" />
              Production Summary
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Remaining quantity per product, grouped by status
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* ── TOTALS STRIP ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TRACKED_STATUSES.map((s) => (
            <div
              key={s}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {s}
              </p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {totals.byStatus[s].toLocaleString("en-IN")}
              </p>
            </div>
          ))}
          <div className="bg-blue-600 text-white border border-blue-600 rounded-xl px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
              Total
            </p>
            <p className="text-lg font-bold mt-1">
              {totals.grand.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Filter bar */}
          <div className="px-5 py-3 border-b border-slate-200 bg-white">
            <div className="relative max-w-sm">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product, brand, model..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Inline loading */}
          {loading && rows.length > 0 && (
            <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-xs text-blue-600 font-semibold">Updating…</span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-10 px-2 py-3.5"></th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
                    Product
                  </th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
                    Brand / Model
                  </th>
                  {TRACKED_STATUSES.map((s) => (
                    <th
                      key={s}
                      className="px-5 py-3.5 text-center text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap"
                    >
                      {s}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4 + TRACKED_STATUSES.length} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-5 bg-slate-100 rounded-2xl">
                          <FiPackage size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No items pending</p>
                        <p className="text-xs text-slate-400">Nothing is currently in production, packing, invoicing, or shipping.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isExpanded = expandedIds.has(row.product_id);
                    const dealers = Array.isArray(row.dealers) ? row.dealers : [];
                    const dealerCount = row.dealer_count ?? dealers.length;

                    return (
                      <React.Fragment key={row.product_id}>
                        <tr
                          onClick={() => toggleExpand(row.product_id)}
                          className="hover:bg-slate-50/60 transition-colors duration-100 cursor-pointer"
                        >
                          <td className="w-10 px-2 py-4 text-center">
                            {dealers.length > 0 ? (
                              isExpanded
                                ? <FiChevronDown size={14} className="text-blue-500 inline-block" />
                                : <FiChevronRight size={14} className="text-slate-400 inline-block" />
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">
                              {capitalizeFirstLetter(row.product_name)}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{row.product_id}</span>
                              {dealerCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-slate-500">
                                  <FiUsers size={9} /> {dealerCount} dealer{dealerCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-700">
                              {capitalizeFirstLetter(row.product_brand)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {row.product_model}
                            </p>
                          </td>
                          {TRACKED_STATUSES.map((s) => (
                            <td key={s} className="px-5 py-4 text-center">
                              <QtyCell qty={row.counts?.[s] || 0} status={s} />
                            </td>
                          ))}
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              {(row.total_qty || 0).toLocaleString("en-IN")}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && dealers.length > 0 && (
                          <tr className="bg-blue-50/20">
                            <td colSpan={4 + TRACKED_STATUSES.length} className="px-5 pt-2 pb-4">
                              {/* Reddit-style threaded view: Product → Dealer → Order */}
                              <ul className="pl-3">
                                {dealers.map((d, i) => {
                                  const orders = Array.isArray(d.orders) ? d.orders : [];
                                  const isLastDealer = i === dealers.length - 1;
                                  return (
                                    <li
                                      key={`${d.dealer_id || "unknown"}-${i}`}
                                      className="relative pl-7"
                                    >
                                      {/* dealer vertical line — full height for non-last, stops at elbow for last */}
                                      <span
                                        aria-hidden
                                        className={`absolute left-2 top-0 w-px bg-blue-200 ${isLastDealer ? "h-6" : "h-full"}`}
                                      />
                                      {/* dealer L-elbow */}
                                      <span
                                        aria-hidden
                                        className="absolute left-2 top-6 w-4 h-px bg-blue-200"
                                      />

                                      {/* dealer header row */}
                                      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-blue-100/70 px-3.5 py-2.5 mt-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-slate-800 truncate">
                                            {capitalizeFirstLetter(d.dealer_name) || d.dealer_id || "—"}
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                            {capitalizeFirstLetter(d.shop_name) || "—"}
                                            {d.town && <> · {capitalizeFirstLetter(d.town)}</>}
                                            {d.employee_phone && <> · {d.employee_phone}</>}
                                          </p>
                                        </div>

                                        {/* compact status counts */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {TRACKED_STATUSES.map((s) => {
                                            const qty = d.counts?.[s] || 0;
                                            if (!qty) return null;
                                            return (
                                              <QtyCell key={s} qty={qty} status={s} />
                                            );
                                          })}
                                        </div>

                                        {/* dealer total */}
                                        <div className="text-right pl-3 border-l border-blue-100 ml-1">
                                          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">Total</p>
                                          <p className="text-base font-extrabold text-slate-900 tabular-nums">
                                            {(d.total_qty || 0).toLocaleString("en-IN")}
                                          </p>
                                        </div>
                                      </div>

                                      {/* orders under this dealer — second thread level */}
                                      {orders.length > 0 && (
                                        <ul className="mt-1 mb-1">
                                          {orders.map((o, oi) => {
                                            const isLastOrder = oi === orders.length - 1;
                                            return (
                                              <li
                                                key={`${o.order_number || "unknown"}-${oi}`}
                                                className="relative pl-7 ml-3"
                                              >
                                                {/* order vertical line */}
                                                <span
                                                  aria-hidden
                                                  className={`absolute left-2 top-0 w-px bg-blue-200/70 ${isLastOrder ? "h-4" : "h-full"}`}
                                                />
                                                {/* order L-elbow */}
                                                <span
                                                  aria-hidden
                                                  className="absolute left-2 top-4 w-4 h-px bg-blue-200/70"
                                                />

                                                <div className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded hover:bg-blue-50/60 transition-colors">
                                                  <span className="inline-flex items-center gap-1.5 font-mono text-slate-600">
                                                    <FiHash size={10} className="text-blue-400" />
                                                    {o.order_number || "—"}
                                                  </span>
                                                  <span className="font-bold text-slate-700 tabular-nums">
                                                    {(o.qty || 0).toLocaleString("en-IN")}
                                                  </span>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionSummary;
