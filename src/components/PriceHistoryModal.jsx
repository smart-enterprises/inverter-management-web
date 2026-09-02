// price-history-modal.jsx
import React, { useMemo } from "react";
import {
  MdClose,
  MdCurrencyRupee,
  MdNorthEast,
  MdPersonOutline,
  MdSchedule,
  MdSouthEast,
  MdTrendingDown,
  MdTrendingUp,
} from "react-icons/md";

const PriceHistoryModal = ({
    isOpen,
    onClose,
    priceHistory = [],
    userMap = {},
    formatCurrency,
    formatDate
}) => {

    /* SORT HISTORY */
    const sortedHistory = useMemo(() => {
        return [...priceHistory].sort(
            (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
        );
    }, [priceHistory]);

    /* ANALYTICS */
    const analytics = useMemo(() => {

        if (priceHistory.length === 0)
            return { avg: 0, max: 0, min: 0, current: 0 };

        const prices = priceHistory.map(p => p.new_price);

        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const current = prices[0];
        return { max, min, avg, current };

    }, [priceHistory]);

    if (!isOpen) return null;

    return (
        <>
            {/* BACKDROP */}
            <div
                className="fixed inset-0 m3-scrim backdrop-blur-lg z-40"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6">

                <div
                    className="m3-surface-bg/90 backdrop-blur-xl border m3-outline-variant-border
          rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.15)]
          w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-8 py-6 m3-surface-bg/70 backdrop-blur">

                        <div className="flex items-center gap-4">

                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow">
                                <MdCurrencyRupee />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold m3-on-surface">
                                    Price History
                                </h2>

                                <p className="text-sm m3-on-surface-variant">
                                    Historical price movements for this product
                                </p>
                            </div>

                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:m3-surface-container-high-bg transition"
                        >
                            <MdClose size={20} />
                        </button>

                    </div>

                    {/* ANALYTICS CARDS */}
                    <div className="grid grid-cols-4 gap-6 p-8 m3-surface-container-low-bg">

                        <AnalyticsCard
                            label="Highest Price"
                            value={formatCurrency(analytics.max)}
                            icon={<MdTrendingUp />}
                            color="emerald"
                        />

                        <AnalyticsCard
                            label="Lowest Price"
                            value={formatCurrency(analytics.min)}
                            icon={<MdTrendingDown />}
                            color="rose"
                        />

                        <AnalyticsCard
                            label="Average Price"
                            value={formatCurrency(analytics.avg)}
                            icon={<MdCurrencyRupee />}
                            color="indigo"
                        />

                        <AnalyticsCard
                            label="Current Price"
                            value={formatCurrency(analytics.current)}
                            icon={<MdCurrencyRupee />}
                            color="purple"
                        />

                    </div>

                    {/* TABLE */}
                    <div className="overflow-auto px-8 pb-8 pt-4">

                        {sortedHistory.length === 0 ? (

                            <EmptyState />

                        ) : (

                            <div className="rounded-2xl border shadow-sm overflow-hidden">

                                <table className="w-full text-sm">

                                    <thead className="m3-surface-container-low-bg text-xs uppercase tracking-wide m3-on-surface-variant">

                                        <tr>
                                            <th className="px-6 py-4 text-left">Price Movement</th>
                                            <th className="px-6 py-4 text-left">Change</th>
                                            <th className="px-6 py-4 text-left">Reason</th>
                                            <th className="px-6 py-4 text-left">Changed By</th>
                                            <th className="px-6 py-4 text-left">Date</th>
                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-gray-100">

                                        {sortedHistory.map((p) => {

                                            const diff = p.new_price - p.old_price;
                                            const isIncrease = diff > 0;

                                            return (

                                                <tr
                                                    key={p.price_history_id}
                                                    className="hover:m3-surface-container-low-bg transition"
                                                >

                                                    {/* PRICE MOVEMENT */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex flex-col">

                                                            <span className="font-medium m3-on-surface">
                                                                {formatCurrency(p.old_price)} → {formatCurrency(p.new_price)}
                                                            </span>

                                                            <span
                                                                className={`text-xs font-semibold flex items-center gap-1
                                                                    ${isIncrease
                                                                        ? "text-emerald-600"
                                                                        : "text-rose-600"}`
                                                                }
                                                            >
                                                                {isIncrease
                                                                    ? <MdNorthEast />
                                                                    : <MdSouthEast />
                                                                }

                                                                {isIncrease ? `+${formatCurrency(diff)}` : formatCurrency(diff)}

                                                            </span>

                                                        </div>

                                                    </td>

                                                    {/* CHANGE BADGE */}
                                                    <td className="px-6 py-4">

                                                        <span
                                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                                                                ${isIncrease
                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                    : "bg-rose-100 text-rose-700"
                                                                }`}
                                                        >
                                                            {isIncrease ? (
                                                                <>
                                                                    <MdTrendingUp size={12} /> Increase
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <MdTrendingDown size={12} /> Decrease
                                                                </>
                                                            )}
                                                        </span>

                                                    </td>

                                                    {/* REASON */}
                                                    <td
                                                        className="px-6 py-4 m3-on-surface-variant max-w-[220px] truncate"
                                                        title={p.change_reason}
                                                    >
                                                        {p.change_reason || "Manual update"}
                                                    </td>

                                                    {/* USER */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-9 h-9 rounded-full m3-surface-container-high-bg flex items-center justify-center">
                                                                <MdPersonOutline className="m3-on-surface-variant" />
                                                            </div>

                                                            <div className="flex flex-col">

                                                                <span className="font-medium m3-on-surface">
                                                                    {userMap[p.changed_by] || "Unknown"}
                                                                </span>

                                                                {p.changed_by && (
                                                                    <span className="text-xs m3-on-surface-variant font-mono">
                                                                        {p.changed_by}
                                                                    </span>
                                                                )}

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* DATE */}
                                                    <td className="px-6 py-4 text-xs m3-on-surface-variant">
                                                        {formatDate(p.changed_at)}
                                                    </td>

                                                </tr>

                                            );
                                        })}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </div>

            </div>
        </>
    );
};

/* ANALYTICS CARD */
const AnalyticsCard = ({ label, value, icon, color }) => {

    const colors = {
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
        rose: "bg-rose-50 border-rose-100 text-rose-700",
        indigo: "bg-blue-50 border-blue-100 text-blue-700",
        purple: "bg-blue-50 border-blue-100 text-blue-700"
    };

    return (

        <div
            className={`flex items-center gap-4 border rounded-xl px-5 py-4 shadow-sm ${colors[color]}`}
        >

            <div className="w-10 h-10 rounded-lg flex items-center justify-center m3-surface-bg/60">
                {icon}
            </div>

            <div className="flex flex-col">

                <span className="text-xs uppercase tracking-wide opacity-70 font-medium">
                    {label}
                </span>

                <span className="text-xl font-bold">
                    {value}
                </span>

            </div>

        </div>

    );

};

/* EMPTY STATE */

const EmptyState = () => (

    <div className="flex flex-col items-center justify-center py-24 m3-on-surface-variant">

        <MdSchedule size={52} className="mb-4 opacity-40" />

        <p className="text-lg font-semibold">
            No price changes recorded
        </p>

        <p className="text-sm mt-2">
            Price updates will appear here when product prices change
        </p>

    </div>

);

export default PriceHistoryModal;