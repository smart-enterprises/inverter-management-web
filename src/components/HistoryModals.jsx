// HistoryModals.jsx
// Exports: HistoryModal (base), PriceHistoryModal, CostHistoryModal
import React, { useEffect, useMemo } from "react";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdCalendarMonth,
  MdClose,
  MdCurrencyRupee,
  MdInbox,
  MdNorthEast,
  MdOutlineInsights,
  MdPersonOutline,
  MdRemove,
  MdSchedule,
  MdSell,
  MdSouthEast,
  MdTrendingDown,
  MdTrendingUp,
} from "react-icons/md";

// ─── Utility ──────────────────────────────────────────────────────────────────

const cls = (...args) => args.filter(Boolean).join(" ");

// ─── Design Tokens ────────────────────────────────────────────────────────────

const CARD_COLORS = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50    border-rose-100    text-rose-700",
    indigo: "bg-blue-50  border-blue-100  text-blue-700",
    violet: "bg-amber-50  border-amber-100  text-amber-700",
    amber: "bg-amber-50   border-amber-100   text-amber-700",
    purple: "bg-blue-50  border-blue-100  text-blue-700",
    slate: "m3-surface-container-high-bg  m3-outline-variant-border   m3-on-surface-variant",
};

// ─── Analytics Card ───────────────────────────────────────────────────────────

const AnalyticsCard = ({ label, value, icon, color = "slate" }) => (
    <div className={cls(
        "flex items-center gap-4 border rounded-xl px-5 py-4 shadow-sm transition-shadow hover:shadow-md",
        CARD_COLORS[color] ?? CARD_COLORS.slate
    )}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center m3-surface-bg/60 flex-shrink-0 text-[18px]">
            {icon}
        </div>
        <div className="flex flex-col min-w-0">
            <span className="text-xs uppercase tracking-wide opacity-70 font-medium leading-none mb-1">
                {label}
            </span>
            <span className="text-xl font-bold leading-tight truncate">
                {value ?? "—"}
            </span>
        </div>
    </div>
);

// ─── Delta Badge ──────────────────────────────────────────────────────────────

const DeltaBadge = ({ diff }) => {
    if (diff == null || isNaN(diff)) return null;

    if (diff === 0) return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold m3-surface-container-high-bg m3-on-surface-variant">
            <MdRemove size={10} aria-hidden /> No change
        </span>
    );

    const up = diff > 0;

    return (
        <span className={cls(
            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold",
            up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
            {up ? <MdTrendingUp size={12} aria-hidden /> : <MdTrendingDown size={12} aria-hidden />}
            {up ? "Increase" : "Decrease"}
        </span>
    );
};

// ─── Movement Cell ────────────────────────────────────────────────────────────

const MovementCell = ({ oldVal, newVal, format, upColor = "text-emerald-600", downColor = "text-rose-600" }) => {
    const diff = newVal - oldVal;
    const isUp = diff > 0;
    const colorCls = isUp ? upColor : downColor;
    const Icon = isUp ? MdNorthEast : MdSouthEast;

    return (
        <div className="flex flex-col gap-0.5">
            <span className="font-medium m3-on-surface text-sm">
                {format(oldVal)}
                <span className="m3-on-surface-variant mx-1.5">→</span>
                {format(newVal)}
            </span>
            <span className={cls("text-xs font-semibold flex items-center gap-0.5", colorCls)}>
                <Icon size={12} aria-hidden />
                {isUp ? `+${format(Math.abs(diff))}` : `−${format(Math.abs(diff))}`}
            </span>
        </div>
    );
};

// ─── User Cell ────────────────────────────────────────────────────────────────

const UserCell = ({ name, id }) => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full m3-surface-container-high-bg border m3-outline-variant-border flex items-center justify-center flex-shrink-0">
            <MdPersonOutline size={13} className="m3-on-surface-variant" aria-hidden />
        </div>
        <div className="flex flex-col min-w-0">
            <span className="font-medium m3-on-surface text-sm truncate">{name}</span>
            {id && (
                <span className="text-[11px] m3-on-surface-variant font-mono truncate">{id}</span>
            )}
        </div>
    </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ title = "No records found", message }) => (
    <div className="flex flex-col items-center justify-center py-20 m3-on-surface-variant text-center px-6">
        <div className="w-14 h-14 rounded-2xl m3-surface-container-high-bg flex items-center justify-center mb-4">
            <MdInbox size={26} className="opacity-50" aria-hidden />
        </div>
        <p className="text-base font-semibold m3-on-surface-variant mb-1">{title}</p>
        {message && <p className="text-sm m3-on-surface-variant max-w-xs leading-relaxed">{message}</p>}
    </div>
);

// ─── Section Divider ──────────────────────────────────────────────────────────

const SectionLabel = ({ label }) => (
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] m3-on-surface-variant mb-3 flex items-center gap-2">
        <span className="flex-1 border-t m3-outline-variant-border" />
        {label}
        <span className="flex-1 border-t m3-outline-variant-border" />
    </p>
);

// ─── Table Head ───────────────────────────────────────────────────────────────

const TableHead = ({ columns }) => (
    <thead className="m3-surface-container-low-bg text-xs uppercase tracking-wide m3-on-surface-variant">
        <tr>
            {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 text-left font-semibold whitespace-nowrap">
                    {col.label}
                </th>
            ))}
        </tr>
    </thead>
);

// ─── HistoryModal (base) ──────────────────────────────────────────────────────

/**
 * Props:
 *   isOpen, onClose, title, subtitle, icon (ReactElement), headerIcon (ReactElement),
 *   emptyMessage, analyticsCards, columns, rows, children
 */
export const HistoryModal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    headerIcon,
    headerIconClass = "from-slate-400 to-slate-500",
    emptyMessage = "No history available.",
    analyticsCards = [],
    columns = [],
    rows = [],
    children,
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 m3-scrim backdrop-blur-lg z-40"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className="m3-surface-bg/90 backdrop-blur-xl border m3-outline-variant-border rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.15)] w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-8 py-6 m3-surface-bg/70 backdrop-blur flex-shrink-0 border-b m3-outline-variant-border">
                        <div className="flex items-center gap-4">
                            <div className={cls(
                                "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md text-lg",
                                headerIconClass
                            )}>
                                {headerIcon}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold m3-on-surface">{title}</h2>
                                {subtitle && (
                                    <p className="text-sm m3-on-surface-variant mt-0.5">{subtitle}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 rounded-lg hover:m3-surface-container-high-bg transition m3-on-surface-variant hover:m3-on-surface"
                        >
                            <MdClose size={20} aria-hidden />
                        </button>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto">
                        {children ?? (
                            <>
                                {/* Analytics Strip */}
                                {analyticsCards.length > 0 && (
                                    <div className="m3-surface-container-low-bg border-b m3-outline-variant-border px-8 py-6">
                                        <SectionLabel label="Overview" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {analyticsCards.map((card, i) => (
                                                <AnalyticsCard key={i} {...card} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Table */}
                                <div className="px-8 py-6">
                                    {rows.length === 0 ? (
                                        <EmptyState message={emptyMessage} />
                                    ) : (
                                        <>
                                            <SectionLabel label={`History · ${rows.length} ${rows.length === 1 ? "record" : "records"}`} />
                                            <div className="rounded-2xl border m3-outline-variant-border shadow-sm overflow-hidden">
                                                <table className="w-full text-sm">
                                                    {columns.length > 0 && <TableHead columns={columns} />}
                                                    <tbody className="divide-y divide-gray-100">
                                                        {rows.map((row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="hover:m3-surface-container-low-bg/80 transition-colors"
                                                            >
                                                                {row.cells.map(({ key, content, className }) => (
                                                                    <td key={key} className={cls("px-6 py-4 align-middle", className)}>
                                                                        {content}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    {rows.length > 0 && (
                        <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t m3-outline-variant-border m3-surface-container-low-bg/60">
                            <span className="text-xs m3-on-surface-variant font-medium">
                                {rows.length} {rows.length === 1 ? "record" : "records"} total
                            </span>
                            <button
                                onClick={onClose}
                                className="text-xs font-semibold m3-on-surface-variant hover:m3-on-surface transition-colors px-3 py-1.5 rounded-lg hover:m3-surface-container-high-bg"
                            >
                                Close
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};

// ─── PriceHistoryModal ────────────────────────────────────────────────────────

export const PriceHistoryModal = ({
    isOpen, onClose,
    priceHistory = [],
    userMap = {},
    formatCurrency,
    formatDate,
}) => {

    const sorted = useMemo(() =>
        [...priceHistory].sort((a, b) =>
            new Date(b.changed_at ?? b.updated_at ?? b.created_at) -
            new Date(a.changed_at ?? a.updated_at ?? a.created_at)
        ), [priceHistory]);

    const analytics = useMemo(() => {
        if (!sorted.length) return [];
        const prices = sorted.map(e => parseFloat(e.new_price ?? e.price ?? 0));
        const current = prices[0];
        const highest = Math.max(...prices);
        const lowest = Math.min(...prices);
        const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
        const firstOld = parseFloat(sorted[sorted.length - 1]?.old_price ?? 0);
        const net = current - firstOld;
        return [
            { label: "Current Price", value: formatCurrency(current), icon: <MdSell />, color: "indigo" },
            { label: "All-Time High", value: formatCurrency(highest), icon: <MdTrendingUp />, color: "emerald" },
            { label: "All-Time Low", value: formatCurrency(lowest), icon: <MdArrowDownward />, color: "rose" },
            { label: "Average Price", value: formatCurrency(Math.round(avg)), icon: <MdCurrencyRupee />, color: "amber" },
            { label: "Total Changes", value: sorted.length, icon: <MdOutlineInsights />, color: "slate" },
            {
                label: "Net Movement",
                value: (net >= 0 ? "+" : "") + formatCurrency(Math.abs(net)),
                icon: net >= 0 ? <MdArrowUpward /> : <MdArrowDownward />,
                color: net >= 0 ? "emerald" : "rose",
            },
        ];
    }, [sorted, formatCurrency]);

    const columns = [
        { key: "movement", label: "Price Movement" },
        { key: "change", label: "Change" },
        { key: "reason", label: "Reason" },
        { key: "user", label: "Changed By" },
        { key: "date", label: "Date" },
    ];

    const rows = sorted.map((entry, i) => {
        const newVal = parseFloat(entry.new_price ?? entry.price ?? 0);
        const oldVal = parseFloat(entry.old_price ?? 0);
        const diff = newVal - oldVal;

        return {
            id: entry.price_history_id ?? entry.id ?? `price-${i}`,
            cells: [
                {
                    key: "movement",
                    content: (
                        <MovementCell
                            oldVal={oldVal}
                            newVal={newVal}
                            format={formatCurrency}
                        />
                    ),
                },
                {
                    key: "change",
                    content: <DeltaBadge diff={diff} format={formatCurrency} />,
                    className: "whitespace-nowrap",
                },
                {
                    key: "reason",
                    content: (
                        <span
                            className="m3-on-surface-variant text-sm max-w-[180px] block truncate"
                            title={entry.change_reason ?? entry.notes ?? ""}
                        >
                            {entry.change_reason ?? entry.notes ?? "Manual update"}
                        </span>
                    ),
                    className: "max-w-[200px]",
                },
                {
                    key: "user",
                    content: (
                        <UserCell
                            name={userMap[entry.changed_by] || entry.changed_by || "Unknown"}
                            id={entry.changed_by && userMap[entry.changed_by] ? entry.changed_by : null}
                        />
                    ),
                },
                {
                    key: "date",
                    content: (
                        <span className="text-xs m3-on-surface-variant whitespace-nowrap flex items-center gap-1.5">
                            <MdCalendarMonth size={11} className="m3-on-surface-variant" aria-hidden />
                            {formatDate(entry.changed_at ?? entry.updated_at ?? entry.created_at)}
                        </span>
                    ),
                    className: "whitespace-nowrap",
                },
            ],
        };
    });

    return (
        <HistoryModal
            isOpen={isOpen}
            onClose={onClose}
            title="Price History"
            subtitle="Historical price movements for this product"
            headerIcon={<MdCurrencyRupee />}
            headerIconClass="from-green-500 to-emerald-600"
            emptyMessage="Price updates will appear here when the product price changes."
            analyticsCards={analytics}
            columns={columns}
            rows={rows}
        />
    );
};

// ─── CostHistoryModal ─────────────────────────────────────────────────────────

export const CostHistoryModal = ({
    isOpen, onClose,
    costHistory = [],
    userMap = {},
    formatCurrency,
    formatDate,
}) => {

    const sorted = useMemo(() =>
        [...costHistory].sort((a, b) =>
            new Date(b.changed_at ?? b.updated_at ?? b.created_at) -
            new Date(a.changed_at ?? a.updated_at ?? a.created_at)
        ), [costHistory]);

    const analytics = useMemo(() => {
        if (!sorted.length) return [];
        const costs = sorted.map(e => parseFloat(e.new_price ?? e.cost ?? 0));
        const current = costs[0];
        const highest = Math.max(...costs);
        const lowest = Math.min(...costs);
        const avg = costs.reduce((s, v) => s + v, 0) / costs.length;
        const firstOld = parseFloat(sorted[sorted.length - 1]?.old_price ?? 0);
        const net = current - firstOld;
        return [
            { label: "Current Cost", value: formatCurrency(current), icon: <MdSell />, color: "violet" },
            { label: "Highest Cost", value: formatCurrency(highest), icon: <MdTrendingUp />, color: "rose" },
            { label: "Lowest Cost", value: formatCurrency(lowest), icon: <MdArrowDownward />, color: "emerald" },
            { label: "Average Cost", value: formatCurrency(Math.round(avg)), icon: <MdCurrencyRupee />, color: "amber" },
            { label: "Total Changes", value: sorted.length, icon: <MdOutlineInsights />, color: "slate" },
            {
                label: "Net Movement",
                value: (net >= 0 ? "+" : "") + formatCurrency(Math.abs(net)),
                icon: net >= 0 ? <MdArrowUpward /> : <MdArrowDownward />,
                color: net >= 0 ? "rose" : "emerald",
            },
        ];
    }, [sorted, formatCurrency]);

    const columns = [
        { key: "movement", label: "Cost Movement" },
        { key: "change", label: "Change" },
        { key: "reason", label: "Reason" },
        { key: "user", label: "Changed By" },
        { key: "date", label: "Date" },
    ];

    const rows = sorted.map((entry, i) => {
        const newVal = parseFloat(entry.new_price ?? entry.cost ?? 0);
        const oldVal = parseFloat(entry.old_price ?? 0);
        const diff = newVal - oldVal;

        return {
            id: entry.cost_history_id ?? entry.id ?? `cost-${i}`,
            cells: [
                {
                    key: "movement",
                    content: (
                        <MovementCell
                            oldVal={oldVal}
                            newVal={newVal}
                            format={formatCurrency}
                            upColor="text-rose-600"
                            downColor="text-emerald-600"
                        />
                    ),
                },
                {
                    key: "change",
                    content: <DeltaBadge diff={diff} format={formatCurrency} />,
                    className: "whitespace-nowrap",
                },
                {
                    key: "reason",
                    content: (
                        <span
                            className="m3-on-surface-variant text-sm max-w-[180px] block truncate"
                            title={entry.change_reason ?? entry.notes ?? ""}
                        >
                            {entry.change_reason ?? entry.notes ?? "Manual update"}
                        </span>
                    ),
                    className: "max-w-[200px]",
                },
                {
                    key: "user",
                    content: (
                        <UserCell
                            name={userMap[entry.changed_by] || entry.changed_by || "Unknown"}
                            id={entry.changed_by && userMap[entry.changed_by] ? entry.changed_by : null}
                        />
                    ),
                },
                {
                    key: "date",
                    content: (
                        <span className="text-xs m3-on-surface-variant whitespace-nowrap flex items-center gap-1.5">
                            <MdCalendarMonth size={11} className="m3-on-surface-variant" aria-hidden />
                            {formatDate(entry.changed_at ?? entry.updated_at ?? entry.created_at)}
                        </span>
                    ),
                    className: "whitespace-nowrap",
                },
            ],
        };
    });

    return (
        <HistoryModal
            isOpen={isOpen}
            onClose={onClose}
            title="Cost History"
            subtitle="Historical cost movements for this product"
            headerIcon={<MdSchedule />}
            headerIconClass="from-amber-500 to-blue-600"
            emptyMessage="Cost updates will appear here when the product cost changes."
            analyticsCards={analytics}
            columns={columns}
            rows={rows}
        />
    );
};