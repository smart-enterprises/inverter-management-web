// HistoryModals.jsx
// Exports: HistoryModal (base), PriceHistoryModal, CostHistoryModal
import React, { useEffect, useMemo } from "react";
import {
    FiX, FiClock, FiTrendingUp, FiTrendingDown,
    FiUser, FiCalendar, FiInbox, FiActivity,
    FiArrowUp, FiArrowDown, FiMinus, FiDollarSign,
    FiArrowUpRight, FiArrowDownRight, FiTag
} from "react-icons/fi";

// ─── Utility ──────────────────────────────────────────────────────────────────

const cls = (...args) => args.filter(Boolean).join(" ");

// ─── Design Tokens ────────────────────────────────────────────────────────────

const CARD_COLORS = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    rose: "bg-rose-50    border-rose-100    text-rose-700",
    indigo: "bg-indigo-50  border-indigo-100  text-indigo-700",
    violet: "bg-violet-50  border-violet-100  text-violet-700",
    amber: "bg-amber-50   border-amber-100   text-amber-700",
    purple: "bg-purple-50  border-purple-100  text-purple-700",
    slate: "bg-slate-100  border-slate-200   text-slate-600",
};

// ─── Analytics Card ───────────────────────────────────────────────────────────

const AnalyticsCard = ({ label, value, icon, color = "slate" }) => (
    <div className={cls(
        "flex items-center gap-4 border rounded-xl px-5 py-4 shadow-sm transition-shadow hover:shadow-md",
        CARD_COLORS[color] ?? CARD_COLORS.slate
    )}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/60 flex-shrink-0 text-[18px]">
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
            <FiMinus size={10} aria-hidden /> No change
        </span>
    );

    const up = diff > 0;

    return (
        <span className={cls(
            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold",
            up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        )}>
            {up ? <FiTrendingUp size={12} aria-hidden /> : <FiTrendingDown size={12} aria-hidden />}
            {up ? "Increase" : "Decrease"}
        </span>
    );
};

// ─── Movement Cell ────────────────────────────────────────────────────────────

const MovementCell = ({ oldVal, newVal, format, upColor = "text-emerald-600", downColor = "text-rose-600" }) => {
    const diff = newVal - oldVal;
    const isUp = diff > 0;
    const colorCls = isUp ? upColor : downColor;
    const Icon = isUp ? FiArrowUpRight : FiArrowDownRight;

    return (
        <div className="flex flex-col gap-0.5">
            <span className="font-medium text-gray-800 text-sm">
                {format(oldVal)}
                <span className="text-gray-400 mx-1.5">→</span>
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
        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <FiUser size={13} className="text-gray-500" aria-hidden />
        </div>
        <div className="flex flex-col min-w-0">
            <span className="font-medium text-gray-900 text-sm truncate">{name}</span>
            {id && (
                <span className="text-[11px] text-gray-400 font-mono truncate">{id}</span>
            )}
        </div>
    </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ title = "No records found", message }) => (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FiInbox size={26} className="opacity-50" aria-hidden />
        </div>
        <p className="text-base font-semibold text-gray-500 mb-1">{title}</p>
        {message && <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{message}</p>}
    </div>
);

// ─── Section Divider ──────────────────────────────────────────────────────────

const SectionLabel = ({ label }) => (
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-3 flex items-center gap-2">
        <span className="flex-1 border-t border-gray-100" />
        {label}
        <span className="flex-1 border-t border-gray-100" />
    </p>
);

// ─── Table Head ───────────────────────────────────────────────────────────────

const TableHead = ({ columns }) => (
    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
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
                className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
                onClick={onClose}
                aria-hidden
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.15)] w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-8 py-6 bg-white/70 backdrop-blur flex-shrink-0 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className={cls(
                                "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md text-lg",
                                headerIconClass
                            )}>
                                {headerIcon}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                                {subtitle && (
                                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-800"
                        >
                            <FiX size={20} aria-hidden />
                        </button>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="flex-1 overflow-y-auto">
                        {children ?? (
                            <>
                                {/* Analytics Strip */}
                                {analyticsCards.length > 0 && (
                                    <div className="bg-gray-50 border-b border-gray-100 px-8 py-6">
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
                                            <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                <table className="w-full text-sm">
                                                    {columns.length > 0 && <TableHead columns={columns} />}
                                                    <tbody className="divide-y divide-gray-100">
                                                        {rows.map((row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="hover:bg-gray-50/80 transition-colors"
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
                        <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-gray-100 bg-gray-50/60">
                            <span className="text-xs text-gray-400 font-medium">
                                {rows.length} {rows.length === 1 ? "record" : "records"} total
                            </span>
                            <button
                                onClick={onClose}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
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
            { label: "Current Price", value: formatCurrency(current), icon: <FiTag />, color: "indigo" },
            { label: "All-Time High", value: formatCurrency(highest), icon: <FiTrendingUp />, color: "emerald" },
            { label: "All-Time Low", value: formatCurrency(lowest), icon: <FiArrowDown />, color: "rose" },
            { label: "Average Price", value: formatCurrency(Math.round(avg)), icon: <FiDollarSign />, color: "amber" },
            { label: "Total Changes", value: sorted.length, icon: <FiActivity />, color: "slate" },
            {
                label: "Net Movement",
                value: (net >= 0 ? "+" : "") + formatCurrency(Math.abs(net)),
                icon: net >= 0 ? <FiArrowUp /> : <FiArrowDown />,
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
                            className="text-gray-600 text-sm max-w-[180px] block truncate"
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
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                            <FiCalendar size={11} className="text-gray-400" aria-hidden />
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
            headerIcon={<FiDollarSign />}
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
            { label: "Current Cost", value: formatCurrency(current), icon: <FiTag />, color: "violet" },
            { label: "Highest Cost", value: formatCurrency(highest), icon: <FiTrendingUp />, color: "rose" },
            { label: "Lowest Cost", value: formatCurrency(lowest), icon: <FiArrowDown />, color: "emerald" },
            { label: "Average Cost", value: formatCurrency(Math.round(avg)), icon: <FiDollarSign />, color: "amber" },
            { label: "Total Changes", value: sorted.length, icon: <FiActivity />, color: "slate" },
            {
                label: "Net Movement",
                value: (net >= 0 ? "+" : "") + formatCurrency(Math.abs(net)),
                icon: net >= 0 ? <FiArrowUp /> : <FiArrowDown />,
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
                            className="text-gray-600 text-sm max-w-[180px] block truncate"
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
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                            <FiCalendar size={11} className="text-gray-400" aria-hidden />
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
            headerIcon={<FiClock />}
            headerIconClass="from-violet-500 to-purple-600"
            emptyMessage="Cost updates will appear here when the product cost changes."
            analyticsCards={analytics}
            columns={columns}
            rows={rows}
        />
    );
};