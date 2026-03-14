import React, { useMemo } from "react";
import {
    FiX,
    FiUser,
    FiClock,
    FiTrendingUp,
    FiTrendingDown,
    FiDollarSign
} from "react-icons/fi";

const PriceHistoryModal = ({
    isOpen,
    onClose,
    priceHistory = [],
    userMap = {},
    formatCurrency,
    formatDate
}) => {

    if (!isOpen) return null;

    {/* SORTED HISTORY */ }
    const sortedHistory = useMemo(() => {
        return [...priceHistory].sort(
            (a, b) => new Date(b.changed_at) - new Date(a.changed_at)
        );
    }, [priceHistory]);

    {/* ANALYTICS */ }
    const analytics = useMemo(() => {

        if (priceHistory.length === 0)
            return { avg: 0, max: 0, min: 0 };

        const prices = priceHistory.map(p => p.new_price);

        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const avg =
            prices.reduce((sum, p) => sum + p, 0) / prices.length;

        return { max, min, avg };

    }, [priceHistory]);

    {/* PRICE CHANGE BADGE */ }
    const getPriceChangeBadge = (oldPrice, newPrice) => {

        if (newPrice > oldPrice) {
            return {
                icon: <FiTrendingUp size={12} />,
                className: "bg-green-100 text-green-700",
                label: "Increase"
            };
        }

        if (newPrice < oldPrice) {
            return {
                icon: <FiTrendingDown size={12} />,
                className: "bg-red-100 text-red-700",
                label: "Decrease"
            };
        }

        return {
            icon: null,
            className: "bg-gray-100 text-gray-600",
            label: "No Change"
        };

    };

    return (
        <>
            {/* BACKDROP */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">

                <div
                    className="bg-white rounded-2xl shadow-2xl border border-gray-100 
                        max-w-6xl w-full max-h-[80vh] overflow-y-auto p-6
                    "
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div className="flex items-center justify-between mb-6">

                        <div className="flex items-center gap-3">

                            <div className="p-2 rounded-lg bg-gray-100">
                                <FiDollarSign className="text-gray-600" />
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Price History
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Historical price changes for this product
                                </p>
                            </div>

                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition"
                        >
                            <FiX size={20} />
                        </button>

                    </div>

                    {/* ANALYTICS CARDS */}
                    <div className="grid grid-cols-3 gap-4 mb-6">

                        <AnalyticsCard
                            label="Highest Price"
                            value={formatCurrency(analytics.max)}
                            color="green"
                            icon={<FiTrendingUp />}
                        />

                        <AnalyticsCard
                            label="Lowest Price"
                            value={formatCurrency(analytics.min)}
                            color="red"
                            icon={<FiTrendingDown />}
                        />

                        <AnalyticsCard
                            label="Average Price"
                            value={formatCurrency(analytics.avg)}
                            color="purple"
                            icon={<FiDollarSign />}
                        />

                    </div>

                    {/* TABLE OR EMPTY STATE */}
                    {sortedHistory.length === 0 ? (

                        <EmptyState />

                    ) : (

                        <div className="border rounded-xl overflow-hidden">

                            <table className="w-full text-sm">

                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">

                                    <tr>
                                        <th className="py-3 px-4 text-left">Old Price</th>
                                        <th className="py-3 px-4 text-left">New Price</th>
                                        <th className="py-3 px-4 text-left">Change</th>
                                        <th className="py-3 px-4 text-left">Reason</th>
                                        <th className="py-3 px-4 text-left">Changed By</th>
                                        <th className="py-3 px-4 text-left">Changed At</th>
                                    </tr>

                                </thead>

                                <tbody className="divide-y">

                                    {sortedHistory.map((p) => {

                                        const change = getPriceChangeBadge(
                                            p.old_price,
                                            p.new_price
                                        );

                                        return (

                                            <tr
                                                key={p.price_history_id}
                                                className="hover:bg-gray-50 transition"
                                            >

                                                {/* OLD PRICE */}
                                                <td className="py-3 px-4 text-gray-600">
                                                    {formatCurrency(p.old_price)}
                                                </td>

                                                {/* NEW PRICE */}
                                                <td className="py-3 px-4 font-semibold text-purple-600">
                                                    {formatCurrency(p.new_price)}
                                                </td>

                                                {/* CHANGE BADGE */}
                                                <td className="py-3 px-4">

                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${change.className}`}
                                                    >
                                                        {change.icon}
                                                        {change.label}
                                                    </span>

                                                </td>

                                                {/* REASON */}
                                                <td className="py-3 px-4 text-gray-600 max-w-[220px] truncate">
                                                    {p.change_reason || "Manual update"}
                                                </td>

                                                {/* CHANGED BY */}
                                                <td className="py-3 px-4">

                                                    <div className="flex items-center gap-2">

                                                        <FiUser className="text-gray-400" />

                                                        <div className="flex flex-col leading-tight">

                                                            <span className="text-sm font-medium text-gray-900">
                                                                {userMap[p.changed_by] || "Unknown"}
                                                            </span>

                                                            {p.changed_by && (
                                                                <span className="text-xs text-gray-400 font-mono">
                                                                    {p.changed_by}
                                                                </span>
                                                            )}

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* DATE */}
                                                <td className="py-3 px-4 text-xs text-gray-500">
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
        </>
    );
};

{/* ANALYTICS CARD */ }
const AnalyticsCard = ({ label, value, icon, color }) => {

    const colors = {
        green: "bg-green-50 border-green-100 text-green-700",
        red: "bg-red-50 border-red-100 text-red-700",
        purple: "bg-purple-50 border-purple-100 text-purple-700"
    };

    return (

        <div className={`flex items-center gap-3 border rounded-lg p-4 ${colors[color]}`}>

            <div className="text-lg">
                {icon}
            </div>

            <div>
                <p className="text-xs uppercase">{label}</p>
                <p className="text-xl font-bold">{value}</p>
            </div>

        </div>

    );

};

{/* EMPTY STATE */ }
const EmptyState = () => (

    <div className="flex flex-col items-center justify-center py-12 text-gray-400">

        <FiClock size={36} className="mb-3" />

        <p className="text-sm font-medium">
            No price changes recorded
        </p>

        <p className="text-xs text-gray-400 mt-1">
            Price updates will appear here
        </p>

    </div>

);

export default PriceHistoryModal;