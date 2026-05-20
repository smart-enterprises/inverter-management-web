// src/pages/Analytics.jsx
//
// Server-side analytics dashboard.
//   GET /api/v1/analytics/summary
//   GET /api/v1/analytics/sales-trend
//   GET /api/v1/analytics/top-products
//
// Features:
//   - Quick date-range chips + custom range
//   - Previous-period comparison (Δ% on every KPI)
//   - Clickable KPI cards → filtered Orders page
//   - Gradient area + bar composed chart for sales trend
//   - Donut with % labels + side legend for status pipeline
//   - Top products bar with end-of-bar value labels

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiActivity, FiAlertCircle, FiArrowDownRight, FiArrowUpRight,
    FiAward, FiBarChart, FiBarChart2, FiCheckCircle, FiChevronLeft,
    FiChevronRight, FiDollarSign, FiFilter, FiPackage, FiPieChart,
    FiRefreshCw, FiShoppingBag, FiTrendingUp, FiUsers, FiXCircle,
} from "react-icons/fi";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
    LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from "recharts";

import {
    fetchAnalyticsSummary, fetchSalesTrend, fetchTopProducts,
    fetchTopDealers, fetchTopBrands, fetchTopSalesmen,
    fetchSalesmanAchievement,
} from "../api/analytics";
import { fetchDealers } from "../api/dealer";
import { capitalizeFirstLetter } from "../utils/constants";
import CustomSelect from "../components/CustomSelect";

/* ─────────────────────────────── Formatting ─────────────────────────────── */
const compactINR = (n) => {
    const v = Math.abs(Number(n) || 0);
    if (v >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
    if (v >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
    if (v >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${Number(n || 0).toLocaleString("en-IN")}`;
};
const fullINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const compactNum = (n) => {
    const v = Math.abs(Number(n) || 0);
    if (v >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)}Cr`;
    if (v >= 1_00_000) return `${(n / 1_00_000).toFixed(2)}L`;
    if (v >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return Number(n || 0).toLocaleString("en-IN");
};
const fullNum = (n) => Number(n || 0).toLocaleString("en-IN");

const toISODate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
};
const daysBetween = (from, to) =>
    Math.max(1, Math.round((new Date(to) - new Date(from)) / 86_400_000) + 1);

/* ─────────────────────────────── Palette ─────────────────────────────── */
const STATUS_COLOR = {
    PENDING: "#f59e0b",
    CONFIRMED: "#3b82f6",
    PRODUCTION: "#6366f1",
    PACKED: "#8b5cf6",
    INVOICE: "#06b6d4",
    SHIPPED: "#f97316",
    DELIVERED: "#10b981",
    COMPLETED: "#059669",
    CANCELLED: "#f43f5e",
    REJECTED: "#94a3b8",
};

const KPI_COLORS = {
    indigo: { bg: "bg-indigo-50", border: "border-indigo-100", icon: "text-indigo-600", val: "text-indigo-700", ring: "ring-indigo-200" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", val: "text-emerald-700", ring: "ring-emerald-200" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", val: "text-amber-700", ring: "ring-amber-200" },
    rose: { bg: "bg-rose-50", border: "border-rose-100", icon: "text-rose-600", val: "text-rose-700", ring: "ring-rose-200" },
    violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600", val: "text-violet-700", ring: "ring-violet-200" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", val: "text-blue-700", ring: "ring-blue-200" },
    sky: { bg: "bg-sky-50", border: "border-sky-100", icon: "text-sky-600", val: "text-sky-700", ring: "ring-sky-200" },
    slate: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-600", val: "text-slate-700", ring: "ring-slate-200" },
};

/* ─────────────────────────────── Range presets ─────────────────────────────── */
const buildPresets = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = toISODate(now);
    const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = toISODate(new Date(now.getFullYear(), now.getMonth(), 0));
    return [
        { id: "today", label: "Today", from: today, to: today },
        { id: "7d", label: "7d", from: toISODate(addDays(now, -6)), to: today },
        { id: "30d", label: "30d", from: toISODate(addDays(now, -29)), to: today },
        { id: "mtd", label: "MTD", from: monthStart, to: today },
        { id: "lastMonth", label: "Last Month", from: lastMonthStart, to: lastMonthEnd },
    ];
};

/* ─────────────────────────────── Tooltip ─────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="rounded-xl bg-white/95 backdrop-blur border border-slate-200 shadow-lg px-3 py-2 text-xs">
            {label && <p className="font-bold text-slate-800 mb-1.5">{label}</p>}
            <div className="space-y-1">
                {payload.map((row) => (
                    <div key={row.dataKey} className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: row.color || row.fill }}
                        />
                        <span className="text-slate-500 capitalize">{row.name}:</span>
                        <span className="font-bold tabular-nums text-slate-900">
                            {formatter ? formatter(row.value, row.dataKey, row) : row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─────────────────────────────── KPI Card ─────────────────────────────── */
const KpiCard = ({ icon, title, value, delta, color = "indigo", loading, onClick }) => {
    const c = KPI_COLORS[color] || KPI_COLORS.indigo;
    const interactive = !!onClick && !loading;
    const deltaSign = delta == null || !Number.isFinite(delta) ? null : delta >= 0 ? "+" : "−";
    const deltaAbs = delta == null || !Number.isFinite(delta) ? null : Math.abs(delta).toFixed(1);

    return (
        <div
            onClick={interactive ? onClick : undefined}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={interactive ? (e) => e.key === "Enter" && onClick() : undefined}
            className={[
                "group relative bg-white border border-slate-200 rounded-2xl shadow-sm p-5 transition-all duration-200",
                interactive ? `cursor-pointer hover:shadow-md hover:ring-2 ${c.ring}` : "",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 mb-2">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
                    ) : (
                        <p className={`text-2xl font-black tabular-nums ${c.val}`}>{value}</p>
                    )}
                    {!loading && deltaSign && (
                        <div
                            className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-black rounded-full px-1.5 py-0.5 ${
                                delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            }`}
                        >
                            {delta >= 0 ? <FiArrowUpRight size={10} /> : <FiArrowDownRight size={10} />}
                            {deltaAbs}% vs prev
                        </div>
                    )}
                </div>
                <div className={`p-2.5 rounded-xl border ${c.bg} ${c.border} flex-shrink-0`}>
                    {React.cloneElement(icon, { size: 16, className: c.icon })}
                </div>
            </div>
            {interactive && (
                <FiChevronRight
                    size={13}
                    className="absolute bottom-3 right-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                />
            )}
        </div>
    );
};

/* ─────────────────────────────── Card frame ─────────────────────────────── */
const Card = ({ title, subtitle, action, children }) => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                {subtitle && (
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5 truncate">
                        {subtitle}
                    </p>
                )}
            </div>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Skeleton = ({ className = "" }) => (
    <div className={`bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl animate-pulse ${className}`} />
);
const Empty = ({ label }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="p-4 bg-slate-100 rounded-2xl">
            <FiBarChart2 size={22} className="text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
);
const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>
        {children}
    </label>
);

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MonthPicker = ({ month, onChange }) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth0 = now.getMonth();
    const isCurrentMonth = month.year === currentYear && month.month0 === currentMonth0;

    const goPrev = () => {
        const m0 = month.month0 - 1;
        if (m0 < 0) onChange({ year: month.year - 1, month0: 11 });
        else onChange({ year: month.year, month0: m0 });
    };
    const goNext = () => {
        if (isCurrentMonth) return; // can't go into the future
        const m0 = month.month0 + 1;
        if (m0 > 11) onChange({ year: month.year + 1, month0: 0 });
        else onChange({ year: month.year, month0: m0 });
    };
    const goCurrent = () => onChange({ year: currentYear, month0: currentMonth0 });

    return (
        <div className="inline-flex items-center gap-1">
            <button
                onClick={goPrev}
                title="Previous month"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 bg-white transition-all"
            >
                <FiChevronLeft size={13} />
            </button>
            <button
                onClick={goCurrent}
                title={isCurrentMonth ? "Current month" : "Jump to current month"}
                className={[
                    "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all min-w-[100px] text-center",
                    isCurrentMonth
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200",
                ].join(" ")}
            >
                {MONTH_LABELS[month.month0]} {month.year}
            </button>
            <button
                onClick={goNext}
                disabled={isCurrentMonth}
                title={isCurrentMonth ? "Already on current month" : "Next month"}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <FiChevronRight size={13} />
            </button>
        </div>
    );
};

const ChartTypeSwitch = ({ value, onChange, options }) => (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        {options.map((opt) => {
            const active = value === opt.value;
            return (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    title={opt.label}
                    className={[
                        "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                        active
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700",
                    ].join(" ")}
                >
                    {React.cloneElement(opt.icon, { size: 12 })}
                    <span className="hidden sm:inline">{opt.label}</span>
                </button>
            );
        })}
    </div>
);

/* ─────────────────────────────── Chart renderers ─────────────────────────────── */
const TREND_GRADIENTS = (
    <defs>
        <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="grad-paid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="grad-orders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
    </defs>
);

// orders is the only count field; everything else is ₹
const TREND_MONEY_KEYS = new Set(["revenue", "delivered", "cancelled", "paid"]);

const trendTooltip = (
    <Tooltip
        content={
            <ChartTooltip
                formatter={(v, key) => TREND_MONEY_KEYS.has(key) ? fullINR(v) : fullNum(v)}
            />
        }
    />
);

const trendXAxis = (
    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
);
const trendYLeft = (
    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
        tickFormatter={(v) => compactNum(v)} />
);
const trendYRight = (
    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
        tickFormatter={(v) => compactINR(v)} />
);

const renderTrendChart = (type, data) => {
    const common = { data, margin: { top: 16, right: 20, left: 0, bottom: 0 } };
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />;
    const legend = <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />;

    // Series legend:
    //   revenue   (Booked)    — emerald
    //   delivered (Delivered) — violet
    //   cancelled (Cancelled) — rose
    //   paid      (Paid)      — blue
    //   orders    (Orders #)  — indigo (left axis = counts; everything else right axis = ₹)

    if (type === "area") {
        return (
            <AreaChart {...common}>
                {TREND_GRADIENTS}
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke="#10b981" strokeWidth={2} fill="url(#grad-revenue)" />
                <Area yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke="#8b5cf6" strokeWidth={2} fill="none" />
                <Area yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke="#f43f5e" strokeWidth={2} fill="none" />
                <Area yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke="#3b82f6" strokeWidth={2} fill="url(#grad-paid)" />
                <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2} fill="url(#grad-orders)" />
            </AreaChart>
        );
    }

    if (type === "bar") {
        return (
            <BarChart {...common} barCategoryGap="20%">
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Bar yAxisId="right" dataKey="revenue" name="Bookings" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="delivered" name="Delivered" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="cancelled" name="Cancelled" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="paid" name="Paid" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
        );
    }

    if (type === "line") {
        return (
            <LineChart {...common}>
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
        );
    }

    // composed (default)
    return (
        <ComposedChart {...common}>
            {TREND_GRADIENTS}
            {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke="#10b981" strokeWidth={2} fill="url(#grad-revenue)" />
            <Line yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke="#f43f5e" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={14} />
        </ComposedChart>
    );
};

const renderPipelineChart = (type, statusBars, totalStatus) => {
    if (type === "bar") {
        return (
            <BarChart
                data={statusBars}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                barCategoryGap="22%"
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => compactNum(v)} />
                <YAxis type="category" dataKey="status" stroke="#94a3b8" fontSize={11}
                    tickLine={false} axisLine={false} width={92} />
                <Tooltip
                    content={
                        <ChartTooltip
                            formatter={(v) => `${fullNum(v)} (${((v / totalStatus) * 100).toFixed(1)}%)`}
                        />
                    }
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18}>
                    {statusBars.map((row) => <Cell key={row.status} fill={row.fill} />)}
                    <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(v) => `${fullNum(v)} · ${((v / totalStatus) * 100).toFixed(0)}%`}
                        fill="#475569"
                        fontSize={11}
                        fontWeight={700}
                    />
                </Bar>
            </BarChart>
        );
    }

    // donut (default)
    return (
        <PieChart>
            <Pie
                data={statusBars}
                dataKey="count"
                nameKey="status"
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={108}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                label={({ count }) => `${((count / totalStatus) * 100).toFixed(0)}%`}
                labelLine={false}
            >
                {statusBars.map((row) => <Cell key={row.status} fill={row.fill} />)}
            </Pie>
            <Tooltip
                content={
                    <ChartTooltip
                        formatter={(v) => `${fullNum(v)} (${((v / totalStatus) * 100).toFixed(1)}%)`}
                    />
                }
            />
            <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ fontSize: 11, paddingLeft: 8 }}
                iconType="circle"
            />
        </PieChart>
    );
};

/* ─────────────────────────────── % delta helper ─────────────────────────────── */
const pct = (curr, prev) => {
    const c = Number(curr) || 0;
    const p = Number(prev) || 0;
    if (p === 0) return c === 0 ? 0 : null; // null = no baseline
    return ((c - p) / p) * 100;
};

/* ─────────────────────────────── Page ─────────────────────────────── */
const Analytics = () => {
    const navigate = useNavigate();
    const presets = useMemo(buildPresets, []);

    const [activePreset, setActivePreset] = useState("mtd");
    const [from, setFrom] = useState(presets.find((p) => p.id === "mtd").from);
    const [to, setTo] = useState(presets.find((p) => p.id === "mtd").to);
    const [interval, setInterval] = useState("day");
    const [metric, setMetric] = useState("revenue");
    const [brandMetric, setBrandMetric] = useState("qty");

    // Chart-type toggles
    const [trendType, setTrendType] = useState("composed"); // composed | area | bar | line
    const [pipelineType, setPipelineType] = useState("donut"); // donut | bar

    // Dealer filter
    const [dealerId, setDealerId] = useState("ALL");
    const [dealers, setDealers] = useState([]);

    // Achievement month picker (independent of page date range)
    // Stored as { year, month0 } where month0 is 0-indexed (Jan=0).
    const [achMonth, setAchMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month0: now.getMonth() };
    });

    const [summary, setSummary] = useState(null);
    const [prevSummary, setPrevSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [topDealers, setTopDealers] = useState([]);
    const [topBrands, setTopBrands] = useState([]);
    const [topSalesmen, setTopSalesmen] = useState([]);
    const [achievement, setAchievement] = useState({ default_target_qty: 0, items: [] });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load dealer list once for the filter dropdown.
    useEffect(() => {
        let cancelled = false;
        fetchDealers({ page: 1, limit: 500, status: "active" }).then((res) => {
            if (cancelled) return;
            setDealers(res?.data?.employees || []);
        });
        return () => { cancelled = true; };
    }, []);

    const applyPreset = (preset) => {
        setActivePreset(preset.id);
        setFrom(preset.from);
        setTo(preset.to);
    };

    const onCustomFrom = (v) => { setActivePreset("custom"); setFrom(v); };
    const onCustomTo = (v) => { setActivePreset("custom"); setTo(v); };

    const previousRange = useMemo(() => {
        const span = daysBetween(from, to);
        const prevTo = toISODate(addDays(new Date(from), -1));
        const prevFrom = toISODate(addDays(new Date(prevTo), -(span - 1)));
        return { from: prevFrom, to: prevTo };
    }, [from, to]);

    const load = useCallback(async (signal) => {
        setLoading(true);
        setError(null);

        const scope = dealerId === "ALL" ? {} : { dealer_id: dealerId };
        const showTopDealers = dealerId === "ALL";

        // Salesman target is MONTHLY — resets on the 1st of each month.
        // The achievement card uses the picked month (achMonth), not the page date filter.
        // - "from" = 1st day of the picked month
        // - "to"   = today (if picked month is current) OR last day of the picked month
        const now = new Date();
        const isCurrentMonth =
            achMonth.year === now.getFullYear() && achMonth.month0 === now.getMonth();
        const monthStart = toISODate(new Date(achMonth.year, achMonth.month0, 1));
        const monthEnd = isCurrentMonth
            ? toISODate(now)
            : toISODate(new Date(achMonth.year, achMonth.month0 + 1, 0));

        const [sumRes, prevRes, trendRes, topRes, brandRes, dealerRes, salesmenRes, achRes] = await Promise.all([
            fetchAnalyticsSummary({ from, to, ...scope }),
            fetchAnalyticsSummary({ from: previousRange.from, to: previousRange.to, ...scope }),
            fetchSalesTrend({ from, to, interval, ...scope }),
            fetchTopProducts({ from, to, metric, limit: 10, ...scope }),
            fetchTopBrands({ from, to, metric: brandMetric, limit: 8, ...scope }),
            showTopDealers
                ? fetchTopDealers({ from, to, limit: 10 })
                : Promise.resolve({ success: true, data: { items: [] } }),
            fetchTopSalesmen({ from, to, limit: 10, ...scope }),
            fetchSalesmanAchievement({ from: monthStart, to: monthEnd, ...scope }),
        ]);

        if (signal?.aborted) return;

        const fail = [sumRes, prevRes, trendRes, topRes, brandRes, dealerRes, salesmenRes, achRes].find((r) => !r.success);
        if (fail) {
            setError(fail.message || "Failed to load analytics.");
            setLoading(false);
            return;
        }

        setSummary(sumRes.data || null);
        setPrevSummary(prevRes.data || null);
        setTrend(trendRes.data?.series || []);
        setTopProducts(topRes.data?.items || []);
        setTopBrands(brandRes.data?.items || []);
        setTopDealers(dealerRes.data?.items || []);
        setTopSalesmen(salesmenRes.data?.items || []);
        setAchievement(achRes.data || { default_target_qty: 0, items: [] });
        setLoading(false);
    }, [from, to, interval, metric, brandMetric, dealerId, achMonth.year, achMonth.month0, previousRange.from, previousRange.to]);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    /* ── Derived ──────────────────────────────────────────── */
    const statusBars = useMemo(() => {
        if (!summary?.status_distribution) return [];
        return Object.entries(summary.status_distribution)
            .map(([status, count]) => ({ status, count, fill: STATUS_COLOR[status] || "#94a3b8" }))
            .filter((row) => row.count > 0);
    }, [summary]);

    const totalStatus = statusBars.reduce((s, r) => s + r.count, 0);

    const trendData = useMemo(() => trend, [trend]);
    const topData = useMemo(() => {
        const key = metric === "qty" ? "qty_sold" : "revenue";
        return [...topProducts]
            .map((p) => ({ ...p, _value: p[key] || 0 }))
            .sort((a, b) => b._value - a._value);
    }, [topProducts, metric]);

    /* ── Drill-down nav (mirrors existing patterns from Dashboard.jsx) ── */
    const drillTo = (params) => navigate("/orders", { state: { ...params } });

    /* ── KPI deltas ──────────────────────────────────────── */
    const d = {
        orders: pct(summary?.orders_total, prevSummary?.orders_total),
        booked: pct(summary?.revenue_booked, prevSummary?.revenue_booked),
        delivered: pct(summary?.revenue_delivered, prevSummary?.revenue_delivered),
        cancelled: pct(summary?.revenue_cancelled, prevSummary?.revenue_cancelled),
        pending: pct(summary?.revenue_pending, prevSummary?.revenue_pending),
        paid: pct(summary?.revenue_paid, prevSummary?.revenue_paid),
        due: pct(summary?.revenue_due, prevSummary?.revenue_due),
    };

    /* ─────────────────────────── Render ─────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Analytics</h1>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Server-side aggregation · <span className="font-mono text-[11px]">/api/v1/analytics</span>
                    </p>
                </div>

                {/* Quick range chips */}
                <div className="flex flex-wrap items-center gap-2">
                    {presets.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            className={[
                                "px-3 py-1.5 text-xs font-bold rounded-xl border transition-all",
                                activePreset === p.id
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600",
                            ].join(" ")}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => load()}
                        title="Refresh"
                        className="p-2 bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all"
                    >
                        <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Custom range + dealer filter */}
            <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl">
                <Field label="From">
                    <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={(e) => onCustomFrom(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                </Field>
                <Field label="To">
                    <input
                        type="date"
                        value={to}
                        min={from}
                        onChange={(e) => onCustomTo(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                </Field>

                <Field label={<span className="flex items-center gap-1"><FiFilter size={10} /> Dealer</span>}>
                    <div className="min-w-[260px]">
                        <CustomSelect
                            name="dealer"
                            value={dealerId}
                            onChange={(e) => setDealerId(e.target.value)}
                            searchable
                            placeholder="Search dealer…"
                            options={[
                                { value: "ALL", label: "All Dealers" },
                                ...dealers.map((d) => ({
                                    value: d.employee_id,
                                    label: `${capitalizeFirstLetter(d.employee_name || "")}${d.shop_name ? ` — ${capitalizeFirstLetter(d.shop_name)}` : ""}${d.district ? ` · ${capitalizeFirstLetter(d.district)}` : ""}`,
                                })),
                            ]}
                        />
                    </div>
                </Field>

                <div className="text-[11px] text-slate-400 font-medium pb-2 ml-2">
                    {daysBetween(from, to)} day{daysBetween(from, to) > 1 ? "s" : ""}
                    {" · "}
                    <span className="font-mono">vs {previousRange.from} → {previousRange.to}</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                    <FiAlertCircle size={14} />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* KPI strip — revenue split into Booked / Delivered / Cancelled / Pending */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={<FiShoppingBag />} title="Orders" color="indigo"
                    value={fullNum(summary?.orders_total)} delta={d.orders} loading={loading}
                    onClick={() => drillTo({ startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={<FiDollarSign />} title="Bookings" color="emerald"
                    value={compactINR(summary?.revenue_booked)} delta={d.booked} loading={loading}
                />
                <KpiCard
                    icon={<FiPackage />} title="Delivered ₹" color="violet"
                    value={compactINR(summary?.revenue_delivered)} delta={d.delivered} loading={loading}
                    onClick={() => drillTo({ status: "DELIVERED", startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={<FiXCircle />} title="Cancelled ₹" color="rose"
                    value={compactINR(summary?.revenue_cancelled)} delta={d.cancelled} loading={loading}
                    onClick={() => drillTo({ status: "CANCELLED", startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={<FiActivity />} title="Pending ₹" color="amber"
                    value={compactINR(summary?.revenue_pending)} delta={d.pending} loading={loading}
                />
                <KpiCard
                    icon={<FiCheckCircle />} title="Paid" color="blue"
                    value={compactINR(summary?.revenue_paid)} delta={d.paid} loading={loading}
                />
                <KpiCard
                    icon={<FiActivity />} title="Due" color="amber"
                    value={compactINR(summary?.revenue_due)} delta={d.due} loading={loading}
                />
                <KpiCard
                    icon={<FiTrendingUp />} title="Avg / Order" color="sky"
                    value={summary?.orders_total ? compactINR(summary.revenue_booked / summary.orders_total) : "—"}
                    loading={loading}
                />
            </div>

            {/* Sales trend */}
            <Card
                title="Sales Trend"
                subtitle={`${interval.toUpperCase()} · ${from} → ${to}`}
                action={
                    <div className="flex items-center gap-2">
                        <ChartTypeSwitch
                            value={trendType}
                            onChange={setTrendType}
                            options={[
                                { value: "composed", label: "Mixed", icon: <FiBarChart2 /> },
                                { value: "area", label: "Area", icon: <FiTrendingUp /> },
                                { value: "bar", label: "Bar", icon: <FiBarChart /> },
                                { value: "line", label: "Line", icon: <FiActivity /> },
                            ]}
                        />
                        <select
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                }
            >
                {loading ? (
                    <Skeleton className="h-80" />
                ) : trendData.length === 0 ? (
                    <Empty label="No orders in this range." />
                ) : (
                    <ResponsiveContainer width="100%" height={340}>
                        {renderTrendChart(trendType, trendData)}
                    </ResponsiveContainer>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Status pipeline */}
                <div className="lg:col-span-2">
                    <Card
                        title="Order Pipeline"
                        subtitle="Status distribution"
                        action={
                            <ChartTypeSwitch
                                value={pipelineType}
                                onChange={setPipelineType}
                                options={[
                                    { value: "donut", label: "Donut", icon: <FiPieChart /> },
                                    { value: "bar", label: "Bar", icon: <FiBarChart /> },
                                ]}
                            />
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : statusBars.length === 0 ? (
                            <Empty label="No orders." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                {renderPipelineChart(pipelineType, statusBars, totalStatus)}
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                {/* Top products */}
                <div className="lg:col-span-3">
                    <Card
                        title="Top Products"
                        subtitle={`Top 10 · by ${metric === "revenue" ? "revenue" : "quantity"}`}
                        action={
                            <select
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                                <option value="revenue">Revenue</option>
                                <option value="qty">Quantity</option>
                            </select>
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topData.length === 0 ? (
                            <Empty label="No products sold in this range." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <ComposedChart
                                    data={topData}
                                    layout="vertical"
                                    margin={{ top: 8, right: 64, left: 8, bottom: 8 }}
                                    barCategoryGap="20%"
                                >
                                    <defs>
                                        <linearGradient id="grad-bar" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.85} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => metric === "revenue" ? compactINR(v) : compactNum(v)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="product_name"
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={150}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                formatter={(v, key) => key === "revenue" ? fullINR(v) : fullNum(v)}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey={metric === "qty" ? "qty_sold" : "revenue"}
                                        fill="url(#grad-bar)"
                                        radius={[0, 8, 8, 0]}
                                        barSize={18}
                                    >
                                        <LabelList
                                            dataKey={metric === "qty" ? "qty_sold" : "revenue"}
                                            position="right"
                                            formatter={(v) => metric === "revenue" ? compactINR(v) : compactNum(v)}
                                            fill="#475569"
                                            fontSize={11}
                                            fontWeight={700}
                                        />
                                    </Bar>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

            </div>

            {/* Top Brands + Top Dealers row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Top Brands chart */}
                <div className="lg:col-span-2">
                    <Card
                        title="Top Brands"
                        subtitle={`By ${brandMetric === "revenue" ? "revenue" : "quantity"}`}
                        action={
                            <select
                                value={brandMetric}
                                onChange={(e) => setBrandMetric(e.target.value)}
                                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                                <option value="qty">Quantity</option>
                                <option value="revenue">Revenue</option>
                            </select>
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topBrands.length === 0 ? (
                            <Empty label="No brand data." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <BarChart
                                    data={topBrands}
                                    layout="vertical"
                                    margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
                                    barCategoryGap="22%"
                                >
                                    <defs>
                                        <linearGradient id="grad-brand" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.85} />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.85} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => brandMetric === "revenue" ? compactINR(v) : compactNum(v)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="product_brand"
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={120}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                formatter={(v, key) => key === "revenue" ? fullINR(v) : fullNum(v)}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey={brandMetric === "revenue" ? "revenue" : "qty_sold"}
                                        fill="url(#grad-brand)"
                                        radius={[0, 8, 8, 0]}
                                        barSize={18}
                                    >
                                        <LabelList
                                            dataKey={brandMetric === "revenue" ? "revenue" : "qty_sold"}
                                            position="right"
                                            formatter={(v) => brandMetric === "revenue" ? compactINR(v) : compactNum(v)}
                                            fill="#475569"
                                            fontSize={11}
                                            fontWeight={700}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

                {/* Top Dealers table (hidden when a specific dealer is filtered) */}
                <div className="lg:col-span-3">
                    {dealerId !== "ALL" ? (
                        <Card title="Top Dealers" subtitle="Hidden — filtering by single dealer">
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="p-4 bg-slate-100 rounded-2xl">
                                    <FiUsers size={22} className="text-slate-400" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500">
                                    Switch dealer filter back to "All Dealers" to see the leaderboard.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Top Dealers" subtitle="By revenue · top 10">
                            {loading ? (
                                <Skeleton className="h-80" />
                            ) : topDealers.length === 0 ? (
                                <Empty label="No dealer activity in this range." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                                                {["#", "Dealer", "Orders", "Revenue", "Paid", "Due"].map((h, i) => (
                                                    <th
                                                        key={h}
                                                        className={[
                                                            "px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap",
                                                            i >= 2 ? "text-right" : "",
                                                        ].join(" ")}
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {topDealers.map((d, i) => (
                                                <tr key={d.dealer_id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-3 py-3 text-slate-400 font-bold tabular-nums">
                                                        {i + 1}
                                                        {i === 0 && (
                                                            <FiAward className="inline ml-1 text-amber-500" size={12} />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p className="font-bold text-slate-900">
                                                            {capitalizeFirstLetter(d.dealer_name || "—")}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {d.shop_name ? capitalizeFirstLetter(d.shop_name) : ""}
                                                            {d.district ? ` · ${capitalizeFirstLetter(d.district)}` : ""}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-700">
                                                        {fullNum(d.orders_count)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700">
                                                        {compactINR(d.revenue)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-blue-700">
                                                        {compactINR(d.paid)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">
                                                        {compactINR(d.due)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

            </div>

            {/* Top Salesmen + Target vs Achievement */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Top Salesmen table */}
                <div className="lg:col-span-2">
                    <Card title="Top Salesmen" subtitle="By revenue · top 10">
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topSalesmen.length === 0 ? (
                            <Empty label="No salesman activity in this range." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                                            {["#", "Salesman", "Orders", "Revenue", "Due"].map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={[
                                                        "px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap",
                                                        i >= 2 ? "text-right" : "",
                                                    ].join(" ")}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {topSalesmen.map((s, i) => (
                                            <tr key={s.salesman_id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3 py-3 text-slate-400 font-bold tabular-nums">
                                                    {i + 1}
                                                    {i === 0 && (
                                                        <FiAward className="inline ml-1 text-amber-500" size={12} />
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <p className="font-bold text-slate-900">
                                                        {capitalizeFirstLetter(s.salesman_name || "—")}
                                                    </p>
                                                    {s.district && (
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {capitalizeFirstLetter(s.district)}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-700">
                                                    {fullNum(s.orders_count)}
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700">
                                                    {compactINR(s.revenue)}
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">
                                                    {compactINR(s.due)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Salesman target vs achievement */}
                <div className="lg:col-span-3">
                    <Card
                        title="Salesman Target vs Achievement"
                        subtitle={`Monthly · Target ${fullNum(achievement.default_target_qty)} items (resets every 1st)`}
                        action={
                            <MonthPicker month={achMonth} onChange={setAchMonth} />
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : achievement.items.length === 0 ? (
                            <Empty label="No salesman activity in this range." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <BarChart
                                    data={achievement.items}
                                    margin={{ top: 24, right: 20, left: 0, bottom: 0 }}
                                    barGap={6}
                                >
                                    <defs>
                                        <linearGradient id="grad-achieved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                                        </linearGradient>
                                        <linearGradient id="grad-target" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#cbd5e1" stopOpacity={0.95} />
                                            <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                    <XAxis
                                        dataKey="salesman_name"
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tickFormatter={(v) => capitalizeFirstLetter(v || "")}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => compactNum(v)}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                formatter={(v, key, row) => {
                                                    if (key === "target_qty") return `${fullNum(v)} target`;
                                                    if (key === "achieved_qty") {
                                                        return `${fullNum(v)} items (${row?.payload?.achievement_pct ?? 0}%)`;
                                                    }
                                                    return fullNum(v);
                                                }}
                                            />
                                        }
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                                    <Bar dataKey="target_qty" name="Target" fill="url(#grad-target)" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="achieved_qty" name="Achieved" fill="url(#grad-achieved)" radius={[6, 6, 0, 0]}>
                                        <LabelList
                                            dataKey="achievement_pct"
                                            position="top"
                                            formatter={(v) => `${v}%`}
                                            fill="#10b981"
                                            fontSize={11}
                                            fontWeight={800}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>

            </div>

        </div>
    );
};

export default Analytics;
