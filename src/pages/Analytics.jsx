// src/pages/Analytics.jsx — Material Design 3
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
    MdAreaChart, MdBarChart, MdBlock, MdCancel, MdCheckCircle,
    MdChevronLeft, MdChevronRight, MdCurrencyRupee, MdEmojiEvents,
    MdErrorOutline, MdFilterList, MdInsertChartOutlined, MdInventory2,
    MdNorthEast, MdOutlineGroup, MdOutlineInsights, MdOutlinePendingActions,
    MdPieChartOutline, MdRefresh, MdShoppingBag, MdShowChart, MdSouthEast,
    MdTrendingUp,
} from "react-icons/md";
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
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import CustomSelect from "../components/CustomSelect";
import {
    Card, Button, IconButton, Chip, FilterChip, SegmentedButton,
    Skeleton, EmptyState, Banner,
} from "../components/m3";
import { T, CHART, STATUS_COLOR, CHIP_TONES } from "../components/m3/tokens";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";

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

/* KPI icon container tones, keyed by this page's legacy colour names. */
const KPI_TINTS = {
    orange: CHIP_TONES.primary,
    emerald: CHIP_TONES.success,
    blue: CHIP_TONES.primary,
    violet: CHIP_TONES.tertiary,
    rose: CHIP_TONES.error,
    amber: CHIP_TONES.warning,
    cyan: CHIP_TONES.secondary,
    slate: CHIP_TONES.neutral,
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
        <div
            className="px-3 py-2"
            style={{
                backgroundColor: "var(--md-sys-color-inverse-surface)",
                color: "var(--md-sys-color-inverse-on-surface)",
                borderRadius: T.cornerSmall,
                boxShadow: "var(--md-sys-elevation-2)",
            }}
        >
            {label && <p className="m3-label-large mb-1.5">{label}</p>}
            <div className="flex flex-col gap-1">
                {payload.map((row) => (
                    <div key={row.dataKey} className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 flex-shrink-0"
                            style={{ background: row.color || row.fill, borderRadius: T.cornerFull }}
                        />
                        <span className="m3-body-small capitalize opacity-80">{row.name}:</span>
                        <span className="m3-label-medium m3-numeric">
                            {formatter ? formatter(row.value, row.dataKey, row) : row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─────────────────────────────── KPI Card ─────────────────────────────── */
const KpiCard = ({ icon, title, value, delta, color = "orange", loading, onClick }) => {
    const tint = KPI_TINTS[color] || KPI_TINTS.orange;
    const Icon = icon;
    const interactive = !!onClick && !loading;
    const deltaSign = delta == null || !Number.isFinite(delta) ? null : delta >= 0 ? "+" : "−";
    const deltaAbs = delta == null || !Number.isFinite(delta) ? null : Math.abs(delta).toFixed(1);

    return (
        <button
            type="button"
            onClick={interactive ? onClick : undefined}
            disabled={!interactive}
            className={`text-left w-full p-5 m3-focus ${interactive ? "m3-state-layer cursor-pointer" : "cursor-default"}`}
            style={{
                backgroundColor: T.surfaceContainerLow,
                borderRadius: T.cornerMedium,
                color: T.onSurface,
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <p className="m3-label-large mt-1" style={{ color: T.onSurfaceVariant }}>{title}</p>
                <div
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    style={{ borderRadius: T.cornerFull, backgroundColor: tint.bg, color: tint.fg }}
                >
                    <Icon size={20} />
                </div>
            </div>
            {loading ? (
                <div
                    className="h-8 w-24 animate-pulse"
                    style={{ backgroundColor: T.surfaceContainerHighest, borderRadius: T.cornerSmall }}
                />
            ) : (
                <>
                    <p className="m3-title-large m3-numeric" style={{ color: T.onSurface, fontWeight: 500 }}>{value}</p>
                    {deltaSign && (
                        <Chip
                            tone={delta >= 0 ? "success" : "error"}
                            icon={delta >= 0 ? MdNorthEast : MdSouthEast}
                            className="mt-2"
                        >
                            {deltaAbs}% vs prev
                        </Chip>
                    )}
                </>
            )}
        </button>
    );
};

const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1">
        <span className="m3-label-medium" style={{ color: T.onSurfaceVariant }}>{label}</span>
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
        if (isCurrentMonth) return;
        const m0 = month.month0 + 1;
        if (m0 > 11) onChange({ year: month.year + 1, month0: 0 });
        else onChange({ year: month.year, month0: m0 });
    };
    const goCurrent = () => onChange({ year: currentYear, month0: currentMonth0 });

    return (
        <div className="inline-flex items-center gap-1">
            <IconButton
                icon={MdChevronLeft}
                onClick={goPrev}
                title="Previous month"
                aria-label="Previous month"
                style={{ width: 32, height: 32 }}
            />
            <Button
                variant={isCurrentMonth ? "tonal" : "outlined"}
                onClick={goCurrent}
                title={isCurrentMonth ? "Current month" : "Jump to current month"}
                style={{ height: 32, minWidth: 108, padding: "0 16px" }}
            >
                {MONTH_LABELS[month.month0]} {month.year}
            </Button>
            <IconButton
                icon={MdChevronRight}
                onClick={goNext}
                disabled={isCurrentMonth}
                title={isCurrentMonth ? "Already on current month" : "Next month"}
                aria-label="Next month"
                className="disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ width: 32, height: 32 }}
            />
        </div>
    );
};

/* ─────────────────────────────── Chart renderers ─────────────────────────────── */
const TREND_GRADIENTS = (
    <defs>
        <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.bookings} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART.bookings} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="grad-paid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.paid} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHART.paid} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="grad-orders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.orders} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART.orders} stopOpacity={0} />
        </linearGradient>
    </defs>
);

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
    <XAxis dataKey="date" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={{ stroke: CHART.grid }} />
);
const trendYLeft = (
    <YAxis yAxisId="left" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false}
        tickFormatter={(v) => compactNum(v)} />
);
const trendYRight = (
    <YAxis yAxisId="right" orientation="right" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false}
        tickFormatter={(v) => compactINR(v)} />
);

const renderTrendChart = (type, data) => {
    const common = { data, margin: { top: 16, right: 20, left: 0, bottom: 0 } };
    const grid = <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />;
    const legend = <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />;

    if (type === "area") {
        return (
            <AreaChart {...common}>
                {TREND_GRADIENTS}
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Area yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke={CHART.delivered} strokeWidth={2} fill="none" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke={CHART.bookings} strokeWidth={2} fill="url(#grad-revenue)" />
                <Area yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke={CHART.orders} strokeWidth={2} fill="url(#grad-orders)" />
                <Area yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke={CHART.paid} strokeWidth={2} fill="url(#grad-paid)" />
                <Area yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke={CHART.cancelled} strokeWidth={2} fill="none" />
            </AreaChart>
        );
    }

    if (type === "bar") {
        return (
            <BarChart {...common} barCategoryGap="20%">
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Bar yAxisId="right" dataKey="delivered" name="Delivered" fill={CHART.delivered} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="Bookings" fill={CHART.bookings} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill={CHART.orders} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="paid" name="Paid" fill={CHART.paid} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="cancelled" name="Cancelled" fill={CHART.cancelled} radius={[4, 4, 0, 0]} />
            </BarChart>
        );
    }

    if (type === "line") {
        return (
            <LineChart {...common}>
                {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
                <Line yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke={CHART.delivered} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke={CHART.bookings} strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke={CHART.orders} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke={CHART.paid} strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke={CHART.cancelled} strokeWidth={2} dot={false} />
            </LineChart>
        );
    }

    return (
        <ComposedChart {...common}>
            {TREND_GRADIENTS}
            {grid}{trendXAxis}{trendYLeft}{trendYRight}{trendTooltip}{legend}
            <Line yAxisId="right" type="monotone" dataKey="delivered" name="Delivered" stroke={CHART.delivered} strokeWidth={2} dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Bookings" stroke={CHART.bookings} strokeWidth={2} fill="url(#grad-revenue)" />
            <Bar yAxisId="left" dataKey="orders" name="Orders" fill={CHART.orders} radius={[4, 4, 0, 0]} barSize={14} />
            <Line yAxisId="right" type="monotone" dataKey="paid" name="Paid" stroke={CHART.paid} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cancelled" name="Cancelled" stroke={CHART.cancelled} strokeWidth={2} dot={false} />
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
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => compactNum(v)} />
                <YAxis type="category" dataKey="status" stroke={CHART.axis} fontSize={11}
                    tickLine={false} axisLine={false} width={92} />
                <Tooltip
                    content={
                        <ChartTooltip
                            formatter={(v) => `${fullNum(v)} (${((v / totalStatus) * 100).toFixed(1)}%)`}
                        />
                    }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {statusBars.map((row) => <Cell key={row.status} fill={row.fill} />)}
                    <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(v) => `${fullNum(v)} · ${((v / totalStatus) * 100).toFixed(0)}%`}
                        fill={CHART.axis}
                        fontSize={11}
                        fontWeight={700}
                    />
                </Bar>
            </BarChart>
        );
    }

    return (
        <PieChart>
            <Pie
                data={statusBars}
                dataKey="count"
                nameKey="status"
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={108}
                paddingAngle={2}
                stroke="var(--md-sys-color-surface)"
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
    if (p === 0) return c === 0 ? 0 : null;
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
    const [topView, setTopView] = useState("delivered");
    const [compactNumbers, setCompactNumbers] = useState(true);
    const fmtINR = compactNumbers ? compactINR : fullINR;

    const { user } = useAuth();
    const canSeeProfit = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

    useEffect(() => {
        if (!canSeeProfit) {
            if (metric === "profit") setMetric("revenue");
            if (brandMetric === "profit") setBrandMetric("qty");
        }
    }, [canSeeProfit, metric, brandMetric]);

    const [trendType, setTrendType] = useState("composed");
    const [pipelineType, setPipelineType] = useState("donut");

    const [dealerId, setDealerId] = useState("ALL");
    const [dealers, setDealers] = useState([]);

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
            fetchTopProducts({ from, to, metric, view: topView, limit: 10, ...scope }),
            fetchTopBrands({ from, to, metric: brandMetric, view: topView, limit: 8, ...scope }),
            showTopDealers
                ? fetchTopDealers({ from, to, view: topView, limit: 10 })
                : Promise.resolve({ success: true, data: { items: [] } }),
            fetchTopSalesmen({ from, to, view: topView, limit: 10, ...scope }),
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
    }, [from, to, interval, metric, brandMetric, topView, dealerId, achMonth.year, achMonth.month0, previousRange.from, previousRange.to]);

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
        const key = metric === "qty" ? "qty_sold" : metric;
        return [...topProducts]
            .map((p) => ({ ...p, _value: p[key] || 0 }))
            .sort((a, b) => b._value - a._value);
    }, [topProducts, metric]);

    const drillTo = (params) => navigate("/orders", { state: { ...params } });

    const d = {
        orders: pct(summary?.orders_total, prevSummary?.orders_total),
        booked: pct(summary?.revenue_booked, prevSummary?.revenue_booked),
        delivered: pct(summary?.revenue_delivered, prevSummary?.revenue_delivered),
        cancelled: pct(summary?.revenue_cancelled, prevSummary?.revenue_cancelled),
        rejected: pct(summary?.revenue_rejected, prevSummary?.revenue_rejected),
        pending: pct(summary?.revenue_pending, prevSummary?.revenue_pending),
        profit: pct(summary?.profit_delivered, prevSummary?.profit_delivered),
        paid: pct(summary?.revenue_paid, prevSummary?.revenue_paid),
        due: pct(summary?.revenue_due, prevSummary?.revenue_due),
    };

    /* ─────────────────────────── Render ─────────────────────────── */
    return (
        <div
            className="min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6"
            style={{ backgroundColor: T.surface }}
        >

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="m3-headline-small" style={{ color: T.onSurface }}>Analytics</h1>
                    <p className="m3-body-medium mt-1" style={{ color: T.onSurfaceVariant }}>
                        Sales, fulfillment &amp; dealer performance. Range: <span className="font-mono">{from} → {to}</span>
                    </p>
                </div>

                {/* Quick range chips */}
                <div className="flex flex-wrap items-center gap-2">
                    {presets.map((p) => (
                        <FilterChip
                            key={p.id}
                            selected={activePreset === p.id}
                            onClick={() => applyPreset(p)}
                        >
                            {p.label}
                        </FilterChip>
                    ))}
                    <IconButton
                        icon={MdRefresh}
                        onClick={() => load()}
                        title="Refresh"
                        aria-label="Refresh"
                        className={loading ? "[&>svg]:animate-spin" : ""}
                    />
                </div>
            </div>

            {/* Custom range + dealer filter */}
            <div
                className="flex flex-wrap items-end gap-3 px-4 py-3"
                style={{
                    backgroundColor: T.surface,
                    border: `1px solid ${T.outlineVariant}`,
                    borderRadius: T.cornerMedium,
                }}
            >
                <Field label="From">
                    <input
                        type="date"
                        value={from}
                        max={to}
                        onChange={(e) => onCustomFrom(e.target.value)}
                        className="m3-body-medium px-3 h-10 focus:outline-none"
                        style={{
                            border: `1px solid ${T.outline}`,
                            borderRadius: T.cornerSmall,
                            backgroundColor: T.surface,
                            color: T.onSurface,
                        }}
                    />
                </Field>
                <Field label="To">
                    <input
                        type="date"
                        value={to}
                        min={from}
                        onChange={(e) => onCustomTo(e.target.value)}
                        className="m3-body-medium px-3 h-10 focus:outline-none"
                        style={{
                            border: `1px solid ${T.outline}`,
                            borderRadius: T.cornerSmall,
                            backgroundColor: T.surface,
                            color: T.onSurface,
                        }}
                    />
                </Field>

                <Field label={<span className="flex items-center gap-1"><MdFilterList size={14} /> Dealer</span>}>
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
                                    label: `${formatName(d.employee_name || "")}${d.shop_name ? ` — ${capitalizeFirstLetter(d.shop_name)}` : ""}${d.district ? ` · ${capitalizeFirstLetter(d.district)}` : ""}`,
                                })),
                            ]}
                        />
                    </div>
                </Field>

                <div className="m3-body-small pb-2 ml-2" style={{ color: T.onSurfaceVariant }}>
                    {daysBetween(from, to)} day{daysBetween(from, to) > 1 ? "s" : ""}
                    {" · "}
                    <span className="font-mono">vs {previousRange.from} → {previousRange.to}</span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Banner tone="error">{error}</Banner>
            )}

            {/* KPI number-format toggle */}
            <div className="flex items-center justify-end">
                <SegmentedButton
                    ariaLabel="Number format"
                    value={compactNumbers}
                    onChange={setCompactNumbers}
                    options={[
                        { value: true, label: "Compact (5L)" },
                        { value: false, label: "Full (5,00,000)" },
                    ]}
                />
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                    icon={MdShoppingBag} title="Orders" color="orange"
                    value={fullNum(summary?.orders_total)} delta={d.orders} loading={loading}
                    onClick={() => drillTo({ startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={MdCurrencyRupee} title="Bookings" color="emerald"
                    value={fmtINR(summary?.revenue_booked)} delta={d.booked} loading={loading}
                />
                <KpiCard
                    icon={MdInventory2} title="Delivered ₹" color="violet"
                    value={fmtINR(summary?.revenue_delivered)} delta={d.delivered} loading={loading}
                    onClick={() => drillTo({ status: "DELIVERED", startDate: from, endDate: to })}
                />
                {canSeeProfit && (
                    <KpiCard
                        icon={MdEmojiEvents} title="Profit ₹" color="emerald"
                        value={fmtINR(summary?.profit_delivered)} delta={d.profit} loading={loading}
                    />
                )}
                <KpiCard
                    icon={MdCancel} title="Cancelled ₹" color="rose"
                    value={fmtINR(summary?.revenue_cancelled)} delta={d.cancelled} loading={loading}
                    onClick={() => drillTo({ status: "CANCELLED", startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={MdBlock} title="Rejected ₹" color="rose"
                    value={fmtINR(summary?.revenue_rejected)} delta={d.rejected} loading={loading}
                    onClick={() => drillTo({ status: "REJECTED", startDate: from, endDate: to })}
                />
                <KpiCard
                    icon={MdOutlinePendingActions} title="Pending ₹" color="amber"
                    value={fmtINR(summary?.revenue_pending)} delta={d.pending} loading={loading}
                />
                <KpiCard
                    icon={MdCheckCircle} title="Paid" color="blue"
                    value={fmtINR(summary?.revenue_paid)} delta={d.paid} loading={loading}
                />
                <KpiCard
                    icon={MdOutlineInsights} title="Due" color="amber"
                    value={fmtINR(summary?.revenue_due)} delta={d.due} loading={loading}
                />
                <KpiCard
                    icon={MdTrendingUp} title="Avg / Order" color="cyan"
                    value={summary?.orders_total ? fmtINR(summary.revenue_booked / summary.orders_total) : "—"}
                    loading={loading}
                />
            </div>

            {/* Sales trend */}
            <Card
                title="Sales Trend"
                subtitle={`${interval.toUpperCase()} · ${from} → ${to}`}
                action={
                    <div className="flex items-center gap-2">
                        <SegmentedButton
                            value={trendType}
                            onChange={setTrendType}
                            options={[
                                { value: "composed", label: "Mixed", icon: MdInsertChartOutlined },
                                { value: "area", label: "Area", icon: MdAreaChart },
                                { value: "bar", label: "Bar", icon: MdBarChart },
                                { value: "line", label: "Line", icon: MdShowChart },
                            ]}
                        />
                        <select
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="m3-label-large px-3 h-8 focus:outline-none"
                            style={{
                                border: `1px solid ${T.outline}`,
                                borderRadius: T.cornerFull,
                                backgroundColor: "transparent",
                                color: T.onSurfaceVariant,
                            }}
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
                    <EmptyState label="No orders in this range." />
                ) : (
                    <ResponsiveContainer width="100%" height={340}>
                        {renderTrendChart(trendType, trendData)}
                    </ResponsiveContainer>
                )}
            </Card>

            {/* Top performance section header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between pt-2">
                <div>
                    <h2 className="m3-title-large" style={{ color: T.onSurface }}>Top Performance</h2>
                    <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>
                        {topView === "delivered"
                            ? "Ranked by what was actually delivered (real business)."
                            : "Ranked by all booked orders (including pending & cancelled)."}
                    </p>
                </div>
                <div className="self-start sm:self-auto">
                    <SegmentedButton
                        ariaLabel="Ranking basis"
                        value={topView}
                        onChange={setTopView}
                        options={[
                            { value: "delivered", label: "Delivered" },
                            { value: "booked", label: "Booked" },
                        ]}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Status pipeline */}
                <div className="lg:col-span-2">
                    <Card
                        title="Order Pipeline"
                        subtitle="Status distribution"
                        action={
                            <SegmentedButton
                                value={pipelineType}
                                onChange={setPipelineType}
                                options={[
                                    { value: "donut", label: "Donut", icon: MdPieChartOutline },
                                    { value: "bar", label: "Bar", icon: MdBarChart },
                                ]}
                            />
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : statusBars.length === 0 ? (
                            <EmptyState label="No orders." />
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
                        subtitle={`${topView === "delivered" ? "Delivered" : "Booked"} · by ${metric === "revenue" ? "revenue" : metric === "profit" ? "profit" : "quantity"} · top 10`}
                        action={
                            <select
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                                className="m3-label-large px-3 h-8 focus:outline-none"
                                style={{
                                    border: `1px solid ${T.outline}`,
                                    borderRadius: T.cornerFull,
                                    backgroundColor: "transparent",
                                    color: T.onSurfaceVariant,
                                }}
                            >
                                <option value="revenue">Revenue</option>
                                {canSeeProfit && <option value="profit">Profit</option>}
                                <option value="qty">Quantity</option>
                            </select>
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topData.length === 0 ? (
                            <EmptyState label="No products sold in this range." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <ComposedChart
                                    data={topData}
                                    layout="vertical"
                                    margin={{ top: 8, right: 64, left: 8, bottom: 8 }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                                    <XAxis
                                        type="number"
                                        stroke={CHART.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => metric === "qty" ? compactNum(v) : compactINR(v)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="product_name"
                                        stroke={CHART.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={150}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                formatter={(v, key) => (key === "revenue" || key === "profit") ? fullINR(v) : fullNum(v)}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey={metric === "qty" ? "qty_sold" : metric}
                                        fill={CHART.bookings}
                                        radius={[0, 4, 4, 0]}
                                        barSize={18}
                                    >
                                        <LabelList
                                            dataKey={metric === "qty" ? "qty_sold" : metric}
                                            position="right"
                                            formatter={(v) => metric === "qty" ? compactNum(v) : compactINR(v)}
                                            fill={CHART.axis}
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
                        subtitle={`${topView === "delivered" ? "Delivered" : "Booked"} · by ${brandMetric === "revenue" ? "revenue" : brandMetric === "profit" ? "profit" : "quantity"}`}
                        action={
                            <select
                                value={brandMetric}
                                onChange={(e) => setBrandMetric(e.target.value)}
                                className="m3-label-large px-3 h-8 focus:outline-none"
                                style={{
                                    border: `1px solid ${T.outline}`,
                                    borderRadius: T.cornerFull,
                                    backgroundColor: "transparent",
                                    color: T.onSurfaceVariant,
                                }}
                            >
                                <option value="qty">Quantity</option>
                                <option value="revenue">Revenue</option>
                                {canSeeProfit && <option value="profit">Profit</option>}
                            </select>
                        }
                    >
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topBrands.length === 0 ? (
                            <EmptyState label="No brand data." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <BarChart
                                    data={topBrands}
                                    layout="vertical"
                                    margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
                                    barCategoryGap="22%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                                    <XAxis
                                        type="number"
                                        stroke={CHART.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => brandMetric === "qty" ? compactNum(v) : compactINR(v)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="product_brand"
                                        stroke={CHART.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={120}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                formatter={(v, key) => (key === "revenue" || key === "profit") ? fullINR(v) : fullNum(v)}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey={brandMetric === "qty" ? "qty_sold" : brandMetric}
                                        fill={CHART.bookings}
                                        radius={[0, 4, 4, 0]}
                                        barSize={18}
                                    >
                                        <LabelList
                                            dataKey={brandMetric === "qty" ? "qty_sold" : brandMetric}
                                            position="right"
                                            formatter={(v) => brandMetric === "qty" ? compactNum(v) : compactINR(v)}
                                            fill={CHART.axis}
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
                                <div className="p-4 bg-blue-50 rounded-2xl">
                                    <MdOutlineGroup size={24} style={{ color: T.onSurfaceVariant }} />
                                </div>
                                <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>
                                    Switch dealer filter back to "All Dealers" to see the leaderboard.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Top Dealers" subtitle={`By ${topView} revenue · top 10`}>
                            {loading ? (
                                <Skeleton className="h-80" />
                            ) : topDealers.length === 0 ? (
                                <EmptyState label="No dealer activity in this range." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left" style={{ backgroundColor: T.surfaceContainerLow }}>
                                                {["#", "Dealer", "Orders", "Revenue", ...(canSeeProfit ? ["Profit"] : []), "Paid", "Due"].map((h, i) => (
                                                    <th
                                                        key={h}
                                                        className={[
                                                            "m3-label-medium px-3 py-3 whitespace-nowrap",
                                                            i >= 2 ? "text-right" : "",
                                                        ].join(" ")}
                                                        style={{ color: T.onSurfaceVariant, fontWeight: 500 }}
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topDealers.map((d, i) => (
                                                <tr key={d.dealer_id} className="m3-state-layer" style={{ borderTop: `1px solid ${T.outlineVariant}`, color: T.onSurface }}>
                                                    <td className="px-3 py-3 m3-label-large m3-numeric" style={{ color: T.onSurfaceVariant }}>
                                                        {i + 1}
                                                        {i === 0 && (
                                                            <MdEmojiEvents className="inline ml-1" size={14} style={{ color: "var(--md-sys-color-warning)" }} />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p className="m3-body-medium" style={{ color: T.onSurface }}>
                                                            {formatName(d.dealer_name || "—")}
                                                        </p>
                                                        <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                                                            {d.shop_name ? capitalizeFirstLetter(d.shop_name) : ""}
                                                            {d.district ? ` · ${capitalizeFirstLetter(d.district)}` : ""}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-3 text-right m3-body-medium m3-numeric" style={{ color: T.onSurfaceVariant }}>
                                                        {fullNum(d.orders_count)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right m3-label-large m3-numeric" style={{ color: T.onSurface }}>
                                                        {compactINR(d.revenue)}
                                                    </td>
                                                    {canSeeProfit && (
                                                        <td className="px-3 py-3 text-right m3-label-large m3-numeric" style={{ color: T.onSurface }}>
                                                            {compactINR(d.profit)}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-3 text-right m3-body-medium m3-numeric" style={{ color: T.onSurfaceVariant }}>
                                                        {compactINR(d.paid)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right m3-body-medium m3-numeric" style={{ color: T.onSurfaceVariant }}>
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

                <div className="lg:col-span-2">
                    <Card title="Top Salesmen" subtitle={`By ${topView} revenue · top 10`}>
                        {loading ? (
                            <Skeleton className="h-80" />
                        ) : topSalesmen.length === 0 ? (
                            <EmptyState label="No salesman activity in this range." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left" style={{ backgroundColor: T.surfaceContainerLow }}>
                                            {["#", "Salesman", "Orders", "Revenue", ...(canSeeProfit ? ["Profit"] : []), "Due"].map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={[
                                                        "m3-label-medium px-3 py-3 whitespace-nowrap",
                                                        i >= 2 ? "text-right" : "",
                                                    ].join(" ")}
                                                    style={{ color: T.onSurfaceVariant, fontWeight: 500 }}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSalesmen.map((s, i) => (
                                            <tr key={s.salesman_id} className="m3-state-layer" style={{ borderTop: `1px solid ${T.outlineVariant}`, color: T.onSurface }}>
                                                <td className="px-3 py-3 m3-label-large m3-numeric" style={{ color: T.onSurfaceVariant }}>
                                                    {i + 1}
                                                    {i === 0 && (
                                                        <MdEmojiEvents className="inline ml-1" size={14} style={{ color: "var(--md-sys-color-warning)" }} />
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <p className="m3-body-medium" style={{ color: T.onSurface }}>
                                                        {formatName(s.salesman_name || "—")}
                                                    </p>
                                                    {s.district && (
                                                        <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                                                            {capitalizeFirstLetter(s.district)}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-right m3-body-medium m3-numeric" style={{ color: T.onSurfaceVariant }}>
                                                    {fullNum(s.orders_count)}
                                                </td>
                                                <td className="px-3 py-3 text-right m3-label-large m3-numeric" style={{ color: T.onSurface }}>
                                                    {compactINR(s.revenue)}
                                                </td>
                                                {canSeeProfit && (
                                                    <td className="px-3 py-3 text-right m3-label-large m3-numeric" style={{ color: T.onSurface }}>
                                                        {compactINR(s.profit)}
                                                    </td>
                                                )}
                                                <td className="px-3 py-3 text-right m3-body-medium m3-numeric" style={{ color: T.onSurfaceVariant }}>
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
                            <EmptyState label="No salesman activity in this range." />
                        ) : (
                            <ResponsiveContainer width="100%" height={340}>
                                <BarChart
                                    data={achievement.items}
                                    margin={{ top: 24, right: 20, left: 0, bottom: 0 }}
                                    barGap={6}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                                    <XAxis
                                        dataKey="salesman_name"
                                        stroke={CHART.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={{ stroke: CHART.grid }}
                                        tickFormatter={(v) => capitalizeFirstLetter(v || "")}
                                    />
                                    <YAxis
                                        stroke={CHART.axis}
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
                                    <Bar dataKey="target_qty" name="Target" fill={CHART.track} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="achieved_qty" name="Achieved" fill={CHART.bookings} radius={[4, 4, 0, 0]}>
                                        <LabelList
                                            dataKey="achievement_pct"
                                            position="top"
                                            formatter={(v) => `${v}%`}
                                            fill={CHART.axis}
                                            fontSize={11}
                                            fontWeight={600}
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
