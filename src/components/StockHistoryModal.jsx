import React, { useMemo } from "react";
import {
    FiX,
    FiUser,
    FiClock,
    FiTrendingUp,
    FiTrendingDown,
    FiRefreshCw,
    FiCornerDownLeft
} from "react-icons/fi";
import { STOCK_ACTIONS, STOCK_TYPES } from "../utils/constants";

{/* ACTION BADGE */ }
export const getActionBadge = (action) => {

    switch (action) {

        case STOCK_ACTIONS.STOCK_ADD:
            return {
                label: "Added",
                className: "bg-green-100 text-green-700",
                icon: <FiTrendingUp size={12} />,
            };

        case STOCK_ACTIONS.STOCK_SALE:
            return {
                label: "Sale",
                className: "bg-red-100 text-red-700",
                icon: <FiTrendingDown size={12} />,
            };

        case STOCK_ACTIONS.STOCK_RETURN:
            return {
                label: "Return",
                className: "bg-blue-100 text-blue-700",
                icon: <FiCornerDownLeft size={12} />,
            };

        default:
            return {
                label: action,
                className: "bg-gray-100 text-gray-700",
                icon: null,
            };
    }

};

{/* STOCK TYPE BADGE */ }
export const getStockTypeBadge = (type) => {

    if (type === STOCK_TYPES.STOCK_PACKED) {
        return "bg-purple-100 text-purple-700";
    }

    if (type === STOCK_TYPES.STOCK_UNPACKED) {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";

};

{/* FORMAT NOTES */ }
const formatNotes = (notes) => {
    if (!notes) return "—";
    return notes.split("||")[0].trim();
};

const StockHistoryModal = ({
    isOpen,
    onClose,
    stockHistory = [],
    userMap = {},
    formatDate
}) => {

    if (!isOpen) return null;

    {/* SORTED HISTORY */ }
    const sortedHistory = useMemo(() => {
        return [...stockHistory].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }, [stockHistory]);

    {/* SUMMARY */ }
    const summary = useMemo(() => {

        let added = 0;
        let sold = 0;
        let returned = 0;

        stockHistory.forEach((item) => {

            if (item.action === STOCK_ACTIONS.STOCK_ADD)
                added += item.quantity;

            if (item.action === STOCK_ACTIONS.STOCK_SALE)
                sold += item.quantity;

            if (item.action === STOCK_ACTIONS.STOCK_RETURN)
                returned += item.quantity;

        });

        return { added, sold, returned };

    }, [stockHistory]);

    {/* UI */ }
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
                        max-w-5xl w-full max-h-[80vh] overflow-y-auto p-6
                    "
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div className="flex items-center justify-between mb-6">

                        <div className="flex items-center gap-3">

                            <div className="p-2 bg-gray-100 rounded-lg">
                                <FiClock className="text-gray-600" />
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Stock History
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Recent inventory movements
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

                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-3 gap-4 mb-6">

                        <SummaryCard
                            label="Total Added"
                            value={summary.added}
                            icon={<FiTrendingUp />}
                            color="green"
                        />

                        <SummaryCard
                            label="Total Sold"
                            value={summary.sold}
                            icon={<FiTrendingDown />}
                            color="red"
                        />

                        <SummaryCard
                            label="Total Returned"
                            value={summary.returned}
                            icon={<FiCornerDownLeft />}
                            color="blue"
                        />

                    </div>

                    {/* TABLE OR EMPTY STATE */}
                    {sortedHistory.length === 0 ? (
                        <EmptyState />
                    ) : (

                        <div className="border rounded-xl overflow-hidden">

                            <table className="w-full text-sm">

                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">

                                    <tr>
                                        <th className="py-3 px-4 text-left">Action</th>
                                        <th className="py-3 px-4 text-left">Type</th>
                                        <th className="py-3 px-4 text-left">Qty</th>
                                        <th className="py-3 px-4 text-left">Previous</th>
                                        <th className="py-3 px-4 text-left">New</th>
                                        <th className="py-3 px-4 text-left">Notes</th>
                                        <th className="py-3 px-4 text-left">Created By</th>
                                        <th className="py-3 px-4 text-left">Created At</th>
                                    </tr>

                                </thead>

                                <tbody className="divide-y">

                                    {sortedHistory.map((item) => {

                                        const action = getActionBadge(item.action);

                                        return (
                                            <tr
                                                key={item.stock_history_id}
                                                className="hover:bg-gray-50 transition"
                                            >

                                                {/* ACTION */}
                                                <td className="py-3 px-4">

                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${action.className}`}
                                                    >
                                                        {action.icon}
                                                        {action.label}
                                                    </span>

                                                </td>

                                                {/* TYPE */}
                                                <td className="py-3 px-4">

                                                    <span
                                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getStockTypeBadge(item.stock_type)}`}
                                                    >
                                                        {item.stock_type}
                                                    </span>

                                                </td>

                                                {/* QUANTITY */}
                                                <td className="py-3 px-4 font-semibold text-gray-900">
                                                    {item.quantity}
                                                </td>

                                                {/* PREVIOUS */}
                                                <td className="py-3 px-4 text-gray-600">
                                                    {item.previous_stock}
                                                </td>

                                                {/* NEW */}
                                                <td className="py-3 px-4 font-semibold text-purple-600">
                                                    {item.new_stock}
                                                </td>

                                                {/* NOTES */}
                                                <td className="py-3 px-4 text-gray-600 max-w-[240px] truncate">
                                                    {formatNotes(item.notes)}
                                                </td>

                                                {/* CREATED BY */}
                                                <td className="py-3 px-4">

                                                    <div className="flex items-center gap-2">

                                                        <FiUser className="text-gray-400" />

                                                        <div className="flex flex-col leading-tight">

                                                            <span className="text-sm font-medium text-gray-900">
                                                                {userMap[item.created_by] || "Unknown"}
                                                            </span>

                                                            <span className="text-xs text-gray-400 font-mono">
                                                                {item.created_by}
                                                            </span>

                                                        </div>

                                                    </div>

                                                </td>

                                                {/* DATE */}
                                                <td className="py-3 px-4 text-xs text-gray-500">
                                                    {formatDate(item.created_at)}
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

{/* Summary Card */ }
const SummaryCard = ({ label, value, icon, color }) => {

    const colors = {
        green: "bg-green-50 border-green-100 text-green-700",
        red: "bg-red-50 border-red-100 text-red-700",
        blue: "bg-blue-50 border-blue-100 text-blue-700"
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

{/* Empty State */ }
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">

        <FiClock size={36} className="mb-3" />

        <p className="text-sm font-medium">
            No stock history recorded
        </p>

        <p className="text-xs text-gray-400 mt-1">
            Stock movements will appear here
        </p>

    </div>
);

export default StockHistoryModal;