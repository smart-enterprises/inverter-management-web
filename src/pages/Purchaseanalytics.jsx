// PurchaseAnalytics.jsx — Weekly/Monthly order analytics
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdBarChart,
  MdChevronLeft,
  MdChevronRight,
  MdCurrencyRupee,
  MdFilterList,
  MdGroup,
  MdInventory,
  MdNorthEast,
  MdOutlineInsights,
  MdRefresh,
  MdSell,
  MdShoppingCart,
  MdSouthEast,
} from "react-icons/md";
import { fetchOrders } from "../api/orders";
import { fetchDealers } from "../api/dealer";
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import CustomSelect from "../components/CustomSelect";

/* ================================================================
   HELPERS
   ================================================================ */
const fmt = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtNum = (n) => Number(n || 0).toLocaleString("en-IN");

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const getWeekRange = (offset = 0) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return {
        start: monday.toISOString().split("T")[0],
        end: sunday.toISOString().split("T")[0],
        label: offset === 0
            ? "This Week"
            : offset === -1
                ? "Last Week"
                : `Week of ${monday.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
    };
};

const getMonthRange = (year, month) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
    };
};

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

// ── KPI Card ─────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color, loading, trend, trendVal }) => {
    const colorMap = {
        indigo: {
            bg: "bg-blue-50 border-blue-100",
            icon: "text-blue-600",
            val: "text-blue-700",
        },
        emerald: {
            bg: "bg-emerald-50 border-emerald-100",
            icon: "text-emerald-600",
            val: "text-emerald-700",
        },
        amber: {
            bg: "bg-amber-50 border-amber-100",
            icon: "text-amber-600",
            val: "text-amber-700",
        },
        violet: {
            bg: "bg-amber-50 border-amber-100",
            icon: "text-amber-600",
            val: "text-amber-700",
        },
    }[color] || { bg: "m3-surface-container-low-bg m3-outline-variant-border", icon: "m3-on-surface-variant", val: "m3-on-surface" };

    return (
        <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] m3-on-surface-variant mb-2">
                        {title}
                    </p>
                    {loading ? (
                        <div className="h-8 w-24 m3-surface-container-high-bg rounded-lg animate-pulse" />
                    ) : (
                        <p className={`text-2xl font-black tabular-nums ${colorMap.val}`}>{value}</p>
                    )}
                    {sub && !loading && (
                        <p className="text-xs m3-on-surface-variant font-medium mt-1">{sub}</p>
                    )}
                    {trend !== undefined && !loading && (
                        <div
                            className={`flex items-center gap-1 text-[10px] font-black mt-1.5 ${trend >= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                        >
                            {trend >= 0 ? <MdNorthEast size={11} /> : <MdSouthEast size={11} />}
                            {Math.abs(trendVal || trend)}% vs previous period
                        </div>
                    )}
                </div>
                <div className={`p-2.5 rounded-xl border ${colorMap.bg} flex-shrink-0`}>
                    {React.cloneElement(icon, { size: 16, className: colorMap.icon })}
                </div>
            </div>
        </div>
    );
};

// ── Section Card ──────────────────────────────────────────────────
const SCard = ({ title, subtitle, action, children }) => (
    <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b m3-outline-variant-border m3-surface-container-low-bg">
            <div>
                <h2 className="text-sm font-bold m3-on-surface">{title}</h2>
                {subtitle && (
                    <p className="text-[10px] font-semibold m3-on-surface-variant uppercase tracking-[0.1em] mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// ── Horizontal Bar ────────────────────────────────────────────────
const HBar = ({ label, value, max, colorClass = "bg-blue-500", sub }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="w-28 flex-shrink-0">
                <p className="text-xs font-semibold m3-on-surface truncate" title={label}>{label}</p>
                {sub && <p className="text-[10px] m3-on-surface-variant">{sub}</p>}
            </div>
            <div className="flex-1 h-2 m3-surface-container-high-bg rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-black m3-on-surface min-w-[40px] text-right tabular-nums">
                {fmtNum(value)}
            </span>
        </div>
    );
};

const Stat = ({ label, value, highlight, success, warning }) => {
    let color = "m3-on-surface";

    if (highlight) color = "text-blue-600";
    if (success) color = "text-emerald-600";
    if (warning) color = "text-amber-600";

    return (
        <div className="text-right min-w-[70px]">
            <p className="text-[10px] uppercase tracking-wider m3-on-surface-variant font-bold">
                {label}
            </p>
            <p className={`text-sm font-extrabold ${color}`}>
                {value}
            </p>
        </div>
    );
};

/* ================================================================
   MAIN — PurchaseAnalytics
   ================================================================ */
const PurchaseAnalytics = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    // ── Mode ─────────────────────────────────────────────────────
    const [mode, setMode] = useState("monthly"); // "weekly" | "monthly"
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // ── Data ─────────────────────────────────────────────────────
    const [orders, setOrders] = useState([]);
    const [prevOrders, setPrevOrders] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Dealer filter ─────────────────────────────────────────────
    const [selectedDealer, setSelectedDealer] = useState("ALL");

    /* Date ranges */
    const dateRange = useMemo(() => {
        if (mode === "weekly") {
            return getWeekRange(weekOffset);
        }
        return {
            ...getMonthRange(selectedYear, selectedMonth),
            label: `${MONTHS[selectedMonth]} ${selectedYear}`,
        };
    }, [mode, weekOffset, selectedYear, selectedMonth]);

    const prevDateRange = useMemo(() => {
        if (mode === "weekly") {
            return getWeekRange(weekOffset - 1);
        }
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        return {
            ...getMonthRange(prevYear, prevMonth),
            label: `${MONTHS[prevMonth]} ${prevYear}`,
        };
    }, [mode, weekOffset, selectedYear, selectedMonth]);

    /* Load orders */
    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [curRes, prevRes, dealerRes] = await Promise.all([
                fetchOrders({
                    page: 1,
                    limit: 500,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    includeRejected: true,
                }),

                fetchOrders({
                    page: 1,
                    limit: 500,
                    startDate: prevDateRange.start,
                    endDate: prevDateRange.end,
                    includeRejected: true,
                }),

                fetchDealers({ page: 1, limit: 500, role: "ROLE_DEALER", includeDealers: true }),
            ]);

            const extractOrders = (res) =>
                (res?.data || []).map((item) => item.order).filter(Boolean);

            setOrders(extractOrders(curRes));
            setPrevOrders(extractOrders(prevRes));
            setDealers(dealerRes?.data?.employees || []);
        } catch {
            setError("Failed to load analytics data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [dateRange, prevDateRange]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    /* Filter by dealer */
    const filteredOrders = useMemo(() => {
        if (selectedDealer === "ALL") return orders;
        return orders.filter((o) => o.dealer?.employee_id === selectedDealer);
    }, [orders, selectedDealer]);

    /* KPIs */
    const kpis = useMemo(() => {
        const totalRevenue = filteredOrders.reduce(
            (s, o) => s + Number(o.order_total_price || 0), 0
        );
        const totalOrders = filteredOrders.length;
        const totalItems = filteredOrders.reduce(
            (s, o) =>
                s + (o.order_details || []).reduce((ss, d) => ss + Number(d.total_qty_ordered || d.qty_ordered || 0), 0),
            0
        );
        const uniqueDealers = new Set(filteredOrders.map((o) => o.dealer?.employee_id)).size;
        const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

        const prevRevenue = prevOrders.reduce(
            (s, o) => s + Number(o.order_total_price || 0), 0
        );
        const prevOrderCount = prevOrders.length;

        const revTrend =
            prevRevenue > 0
                ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
                : null;
        const orderTrend =
            prevOrderCount > 0
                ? Math.round(((totalOrders - prevOrderCount) / prevOrderCount) * 100)
                : null;

        return { totalRevenue, totalOrders, totalItems, uniqueDealers, avgOrder, revTrend, orderTrend };
    }, [filteredOrders, prevOrders]);

    /* Top Products */
    const topProducts = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            (o.order_details || []).forEach((d) => {
                if (d.is_free) return;
                const key = `${d.product_name}||${d.product_brand}||${d.product_model}`;
                if (!map[key]) {
                    map[key] = {
                        name: d.product_name,
                        brand: d.product_brand,
                        model: d.product_model,
                        qty: 0,
                        revenue: 0,
                    };
                }
                map[key].qty += Number(d.total_qty_ordered || d.qty_ordered || 0);
                map[key].revenue += Number(d.total_price || 0);
            });
        });
        return Object.values(map)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 8);
    }, [filteredOrders]);

    /* Top Brands */
    const topBrands = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            (o.order_details || []).forEach((d) => {
                if (d.is_free || !d.product_brand) return;
                if (!map[d.product_brand]) map[d.product_brand] = { qty: 0, revenue: 0, orders: new Set() };
                map[d.product_brand].qty += Number(d.total_qty_ordered || d.qty_ordered || 0);
                map[d.product_brand].revenue += Number(d.total_price || 0);
                map[d.product_brand].orders.add(o.order_number);
            });
        });
        return Object.entries(map)
            .map(([brand, v]) => ({ brand, qty: v.qty, revenue: v.revenue, orders: v.orders.size }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 6);
    }, [filteredOrders]);

    /* Top Dealers */
    const topDealers = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            const id = o.dealer?.employee_id;
            if (!id) return;
            if (!map[id]) map[id] = { name: o.dealer?.employee_name, shop: o.dealer?.shop_name, employee_id: o.dealer?.employee_id, orders: 0, revenue: 0, paid: 0, pending: 0 };
            map[id].orders++;
            map[id].revenue += Number(o.order_total_price || 0);
            map[id].paid += Number(o.amount_paid || 0);
            map[id].pending += Number((o.order_total_price || 0) - (o.amount_paid || 0));
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    }, [filteredOrders]);

    /* Status breakdown */
    const statusBreakdown = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            const s = o.status || "UNKNOWN";
            map[s] = (map[s] || 0) + 1;
        });
        return Object.entries(map)
            .map(([status, count]) => ({ status, count, pct: kpis.totalOrders > 0 ? Math.round((count / kpis.totalOrders) * 100) : 0 }))
            .sort((a, b) => b.count - a.count);
    }, [filteredOrders, kpis.totalOrders]);

    const STATUS_COLORS = {
        COMPLETED: "bg-emerald-500",
        DELIVERED: "bg-green-500",
        SHIPPED: "bg-blue-500",
        PACKED: "bg-amber-500",
        PRODUCTION: "bg-blue-500",
        CONFIRMED: "bg-blue-500",
        PENDING: "bg-amber-500",
        CANCELLED: "bg-rose-500",
        REJECTED: "bg-red-500",
    };

    const yearOptions = Array.from({ length: 4 }, (_, i) => ({
        value: currentYear - i,
        label: String(currentYear - i),
    }));

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="min-h-screen m3-surface-container-low-bg p-4 sm:p-6 lg:p-8 space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold m3-on-surface tracking-tight">
                        Purchase Analytics
                    </h1>
                    <p className="text-xs m3-on-surface-variant font-medium mt-0.5">
                        {loading ? "Loading…" : `${fmtNum(kpis.totalOrders)} orders · ${dateRange.label}`}
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className="p-2.5 rounded-xl border m3-outline-variant-border m3-surface-bg m3-on-surface-variant hover:m3-on-surface hover:m3-outline-border hover:shadow-sm transition-all disabled:opacity-50"
                    >
                        <MdRefresh size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">

                {/* Mode toggle */}
                <div className="inline-flex m3-surface-container-high-bg rounded-xl p-1 gap-1">
                    {["weekly", "monthly"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${mode === m
                                ? "m3-solid-primary shadow-sm"
                                : "m3-on-surface-variant hover:m3-on-surface"
                                }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {/* Week navigator */}
                {mode === "weekly" && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setWeekOffset((p) => p - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border m3-outline-variant-border m3-on-surface-variant hover:m3-surface-container-low-bg hover:m3-outline-border transition-all"
                        >
                            <MdChevronLeft size={13} />
                        </button>
                        <span className="text-sm font-bold m3-on-surface whitespace-nowrap min-w-[100px] text-center">
                            {dateRange.label}
                        </span>
                        <button
                            onClick={() => setWeekOffset((p) => Math.min(0, p + 1))}
                            disabled={weekOffset >= 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border m3-outline-variant-border m3-on-surface-variant hover:m3-surface-container-low-bg hover:m3-outline-border transition-all disabled:opacity-40"
                        >
                            <MdChevronRight size={13} />
                        </button>
                    </div>
                )}

                {/* Month/Year picker */}
                {mode === "monthly" && (
                    <div className="flex items-center gap-2">
                        <div className="w-32">
                            <CustomSelect
                                name="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                options={MONTHS.map((m, i) => ({ value: i, label: m }))}
                            />
                        </div>
                        <div className="w-28">
                            <CustomSelect
                                name="year"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                options={yearOptions.map((y) => ({ value: y.value, label: y.label }))}
                            />
                        </div>
                    </div>
                )}

                <div className="w-px h-6 bg-slate-200" />

                {/* Dealer filter */}
                <div className="flex items-center gap-2">
                    <MdFilterList size={13} className="m3-on-surface-variant" />
                    <div className="w-48">
                        <CustomSelect
                            name="dealer"
                            value={selectedDealer}
                            onChange={(e) => setSelectedDealer(e.target.value)}
                            options={[
                                { value: "ALL", label: "All Dealers" },
                                ...dealers.map((d) => ({
                                    value: d.employee_id,
                                    label: `${formatName(d.employee_name)} — ${capitalizeFirstLetter(d.shop_name || "")}`,
                                })),
                            ]}
                            searchable
                        />
                    </div>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    value={fmt(kpis.totalRevenue)}
                    sub={`vs ${fmt(prevOrders.reduce((s, o) => s + Number(o.order_total_price || 0), 0))} prev`}
                    icon={<MdCurrencyRupee />}
                    color="emerald"
                    loading={loading}
                    trend={kpis.revTrend}
                    trendVal={kpis.revTrend}
                />
                <KPICard
                    title="Total Orders"
                    value={fmtNum(kpis.totalOrders)}
                    sub={`${fmtNum(prevOrders.length)} previous period`}
                    icon={<MdShoppingCart />}
                    color="indigo"
                    loading={loading}
                    trend={kpis.orderTrend}
                    trendVal={kpis.orderTrend}
                />
                <KPICard
                    title="Units Sold"
                    value={fmtNum(kpis.totalItems)}
                    sub="across all products"
                    icon={<MdInventory />}
                    color="violet"
                    loading={loading}
                />
                <KPICard
                    title="Avg. Order Value"
                    value={fmt(kpis.avgOrder)}
                    sub={`${fmtNum(kpis.uniqueDealers)} active dealers`}
                    icon={<MdBarChart />}
                    color="amber"
                    loading={loading}
                />
            </div>

            {/* ── Top Products + Brands Row ── */}
            <div className="grid lg:grid-cols-2 gap-5">

                {/* Top Products */}
                <SCard
                    title="Top Products by Volume"
                    subtitle="Units sold this period"
                    action={
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                            <MdInventory size={9} /> {topProducts.length} products
                        </span>
                    }
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-8 m3-surface-container-high-bg rounded-lg animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                            ))}
                        </div>
                    ) : topProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="p-4 m3-surface-container-high-bg rounded-2xl"><MdInventory size={22} className="m3-on-surface-variant" /></div>
                            <p className="text-sm font-semibold m3-on-surface-variant">No product data</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topProducts.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 group">
                                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[9px] font-black text-blue-600">{i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-xs font-bold m3-on-surface truncate">
                                                {capitalizeFirstLetter(p.name)}
                                            </p>
                                            <span className="text-[10px] font-black text-blue-700 flex-shrink-0">
                                                {fmtNum(p.qty)} units
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 m3-surface-container-high-bg rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${topProducts[0].qty > 0 ? (p.qty / topProducts[0].qty) * 100 : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] m3-on-surface-variant font-medium whitespace-nowrap">
                                                {fmt(p.revenue)}
                                            </span>
                                        </div>
                                        <p className="text-[9px] m3-on-surface-variant font-medium mt-0.5">
                                            {p.brand} · {p.model}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SCard>

                {/* Top Brands */}
                <SCard
                    title="Top Brands"
                    subtitle="By units purchased"
                    action={
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wide">
                            <MdSell size={9} /> {topBrands.length} brands
                        </span>
                    }
                >
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-8 m3-surface-container-high-bg rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : topBrands.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="p-4 m3-surface-container-high-bg rounded-2xl"><MdSell size={22} className="m3-on-surface-variant" /></div>
                            <p className="text-sm font-semibold m3-on-surface-variant">No brand data</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topBrands.map((b, i) => (
                                <HBar
                                    key={b.brand}
                                    label={b.brand}
                                    sub={`${b.orders} orders · ${fmt(b.revenue)}`}
                                    value={b.qty}
                                    max={topBrands[0].qty}
                                    colorClass={
                                        ["bg-amber-500", "bg-blue-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500"][i] || "bg-slate-400"
                                    }
                                />
                            ))}
                        </div>
                    )}
                </SCard>
            </div>

            {/* ── Top Dealers + Status Breakdown ── */}
            <div className="grid lg:grid-cols-3 gap-5">

                {/* Top Dealers */}
                <div className="lg:col-span-2">
                    <SCard
                        title="Top Dealers by Revenue"
                        subtitle="Highest purchasing dealers"
                    >
                        {loading ? (
                            <div className="space-y-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-14 m3-surface-container-high-bg rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : topDealers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="p-4 m3-surface-container-high-bg rounded-2xl"><MdGroup size={22} className="m3-on-surface-variant" /></div>
                                <p className="text-sm font-semibold m3-on-surface-variant">No dealer data</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topDealers.map((d, i) => {
                                    const rankColors = [
                                        "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white",
                                        "bg-gradient-to-br from-slate-300 to-slate-500 text-white",
                                        "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
                                    ];

                                    return (
                                        <div
                                            key={i}
                                            className="group relative overflow-hidden rounded-2xl border m3-outline-variant-border m3-surface-bg shadow-sm hover:shadow-lg transition-all duration-300 p-4"
                                        >
                                            {/* Hover Gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

                                            <div className="relative flex items-center gap-4">

                                                {/* Rank */}
                                                <div
                                                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm shadow ${i < 3 ? rankColors[i] : "m3-surface-container-high-bg m3-on-surface-variant"
                                                        }`}
                                                >
                                                    #{i + 1}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Name + ID */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold m3-on-surface break-words">
                                                            {capitalizeFirstLetter(d.name)}
                                                        </p>

                                                        <span className="text-[10px] px-2 py-0.5 rounded-full m3-surface-container-high-bg m3-on-surface-variant font-semibold">
                                                            ID: {d.employee_id}
                                                        </span>
                                                    </div>

                                                    {/* Shop Name */}
                                                    <p className="text-xs m3-on-surface-variant font-medium mt-1 break-words">
                                                        {capitalizeFirstLetter(d.shop || "No Shop")}
                                                    </p>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-6">
                                                    <Stat label="Orders" value={d.orders} />
                                                    <Stat label="Revenue" value={fmt(d.revenue)} highlight />
                                                    <Stat label="Paid" value={fmt(d.paid)} success />
                                                    <Stat label="Pending" value={fmt(d.pending)} warning />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SCard>
                </div>

                {/* Order Status Breakdown */}
                <SCard title="Order Status" subtitle="Distribution">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-8 m3-surface-container-high-bg rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : statusBreakdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="p-4 m3-surface-container-high-bg rounded-2xl"><MdOutlineInsights size={22} className="m3-on-surface-variant" /></div>
                            <p className="text-sm font-semibold m3-on-surface-variant">No data</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {statusBreakdown.map(({ status, count, pct }) => (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-wide m3-on-surface-variant">
                                            {status}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black m3-on-surface">{count}</span>
                                            <span className="text-[9px] m3-on-surface-variant">({pct}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 m3-surface-container-high-bg rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[status] || "bg-slate-400"}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SCard>
            </div>

            {/* ── Raw Order Table ── */}
            <SCard
                title="Order Details"
                subtitle={`${fmtNum(filteredOrders.length)} orders in period`}
            >
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 m3-surface-container-high-bg rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="p-4 m3-surface-container-high-bg rounded-2xl">
                            <MdShoppingCart size={22} className="m3-on-surface-variant" />
                        </div>
                        <p className="text-sm font-semibold m3-on-surface-variant">
                            No orders in this period
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border m3-outline-variant-border">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="m3-surface-container-low-bg border-b m3-outline-variant-border">
                                    {["Order #", "Dealer", "Date", "Items", "Amount", "Status", "Payment"].map((h) => (
                                        <th key={h} className="px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.12em] m3-on-surface-variant text-left whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y m3-divide-outline-variant">
                                {filteredOrders.slice(0, 20).map((o) => {
                                    const items = (o.order_details || []).reduce(
                                        (s, d) => s + Number(d.total_qty_ordered || d.qty_ordered || 0), 0
                                    );
                                    return (
                                        <tr key={o.order_number} className="hover:m3-surface-container-low-bg transition-colors">
                                            <td className="px-5 py-3.5 font-mono font-bold m3-on-surface text-xs">{o.order_number}</td>
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold m3-on-surface text-xs">{formatName(o.dealer?.employee_name)}</p>
                                                <p className="text-[10px] m3-on-surface-variant">{capitalizeFirstLetter(o.dealer?.shop_name || "")}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs m3-on-surface-variant whitespace-nowrap">
                                                {new Date(o.created_at).toLocaleDateString("en-IN")}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black m3-surface-container-high-bg m3-on-surface-variant border m3-outline-variant-border">
                                                    {items}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 font-bold m3-on-surface whitespace-nowrap text-xs">
                                                {fmt(o.order_total_price)}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold m3-on-surface whitespace-nowrap text-xs">
                                                {fmt(o.amount_paid)}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold m3-on-surface whitespace-nowrap text-xs">
                                                {fmt(o.order_total_price - o.amount_paid)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wide ${STATUS_COLORS[o.status] ? "" : ""} ${o.status === "COMPLETED" ? "m3-tone-success"
                                                    : o.status === "DELIVERED" ? "m3-tone-success"
                                                        : o.status === "CANCELLED" ? "m3-tone-error"
                                                            : o.status === "PENDING" ? "m3-tone-warning"
                                                                : "m3-surface-container-low-bg m3-on-surface-variant m3-outline-variant-border"
                                                    }`}>
                                                    {o.status}
                                                </span>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wide ${o.payment_status === "PAID" ? "m3-tone-success"
                                                    : o.payment_status === "PARTIAL" ? "m3-tone-warning"
                                                        : "m3-tone-error"
                                                    }`}>
                                                    {o.payment_status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredOrders.length > 20 && (
                            <div className="px-5 py-3 m3-surface-container-low-bg border-t m3-outline-variant-border text-center">
                                <p className="text-xs m3-on-surface-variant font-medium">
                                    Showing 20 of {fmtNum(filteredOrders.length)} orders
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </SCard>
        </div>
    );
};

export default PurchaseAnalytics;