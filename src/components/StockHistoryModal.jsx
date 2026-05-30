import React, { useMemo } from "react";
import {
    FiX,
    FiUser,
    FiClock,
    FiTrendingUp,
    FiTrendingDown,
    FiCornerDownLeft,
    FiBox,
    FiArrowUpRight,
    FiArrowDownRight,
    FiPackage
} from "react-icons/fi";

import { STOCK_ACTIONS, STOCK_TYPES, formatName } from "../utils/constants";

/* ACTION BADGE */
const getActionBadge = (action) => {
    switch (action) {
        case STOCK_ACTIONS.STOCK_ADD:
            return {
                label: "Added",
                className: "bg-emerald-100 text-emerald-700",
                icon: <FiTrendingUp size={12} />
            };

        case STOCK_ACTIONS.STOCK_SALE:
            return {
                label: "Sale",
                className: "bg-rose-100 text-rose-700",
                icon: <FiTrendingDown size={12} />
            };

        case STOCK_ACTIONS.STOCK_RETURN:
            return {
                label: "Return",
                className: "bg-sky-100 text-sky-700",
                icon: <FiCornerDownLeft size={12} />
            };

        default:
            return {
                label: action,
                className: "bg-gray-100 text-gray-700",
                icon: null
            };
    }
};

/* STOCK TYPE BADGE */
const getStockTypeBadge = (type) => {
    if (type === STOCK_TYPES.STOCK_PACKED)
        return "bg-blue-100 text-blue-700";

    if (type === STOCK_TYPES.STOCK_UNPACKED)
        return "bg-blue-100 text-blue-700";

    return "bg-gray-100 text-gray-700";
};

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

    /* SORT HISTORY */
    const sortedHistory = useMemo(() => {
        return [...stockHistory].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }, [stockHistory]);

    /* SUMMARY */
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

        return {
            added,
            sold,
            returned,
            currentStock: added - sold + returned
        };

    }, [stockHistory]);

    if (!isOpen) return null;

    return (
        <>
            {/* BACKDROP */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6">

                <div
                    className="bg-white/90 backdrop-blur-xl border border-gray-200
                        rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.15)]
                        w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden
                    "
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-8 py-6 bg-white/70 backdrop-blur">

                        <div className="flex items-center gap-4">

                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow">
                                <FiClock />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Stock History
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Inventory movements & stock analytics
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

                    {/* SUMMARY */}
                    <div className="grid grid-cols-4 gap-6 p-8 bg-gray-50 ">

                        <SummaryCard
                            label="Stock Added"
                            value={summary.added}
                            icon={<FiTrendingUp />}
                            color="emerald"
                        />

                        <SummaryCard
                            label="Stock Sold"
                            value={summary.sold}
                            icon={<FiTrendingDown />}
                            color="rose"
                        />

                        <SummaryCard
                            label="Returned"
                            value={summary.returned}
                            icon={<FiCornerDownLeft />}
                            color="sky"
                        />

                        <SummaryCard
                            label="Current Inventory"
                            value={summary.currentStock}
                            icon={<FiBox />}
                            color="indigo"
                        />

                    </div>

                    {/* TABLE */}
                    <div className="overflow-auto px-8 pb-8 pt-4">

                        {sortedHistory.length === 0 ? (
                            <EmptyState />
                        ) : (

                            <div className="rounded-2xl border shadow-sm overflow-hidden">

                                <table className="w-full text-sm">

                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">

                                        <tr>
                                            <th className="px-6 py-4 text-left">Action</th>
                                            <th className="px-6 py-4 text-left">Type</th>
                                            <th className="px-6 py-4 text-left">Stock Movement</th>
                                            <th className="px-6 py-4 text-left">Qty</th>
                                            <th className="px-6 py-4 text-left">Order</th>
                                            <th className="px-6 py-4 text-left">Notes</th>
                                            <th className="px-6 py-4 text-left">User</th>
                                            <th className="px-6 py-4 text-left">Date</th>
                                        </tr>

                                    </thead>

                                    <tbody className="divide-y divide-gray-100">

                                        {sortedHistory.map((item) => {

                                            const action = getActionBadge(item.action);

                                            const diff = item.new_stock - item.previous_stock;

                                            const showOrder =
                                                item.action === STOCK_ACTIONS.STOCK_SALE ||
                                                item.action === STOCK_ACTIONS.STOCK_RETURN;

                                            const isUp = diff > 0;

                                            return (

                                                <tr
                                                    key={item.stock_history_id}
                                                    className="hover:bg-gray-50 transition"
                                                >

                                                    {/* ACTION */}
                                                    <td className="px-6 py-4">

                                                        <span
                                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${action.className}`}
                                                        >
                                                            {action.icon}
                                                            {action.label}
                                                        </span>

                                                    </td>

                                                    {/* TYPE */}
                                                    <td className="px-6 py-4">

                                                        <span
                                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStockTypeBadge(item.stock_type)}`}
                                                        >
                                                            <FiPackage size={12} />
                                                            {item.stock_type}
                                                        </span>

                                                    </td>

                                                    {/* STOCK MOVEMENT */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex flex-col">

                                                            <span className="font-medium text-gray-800">
                                                                {item.previous_stock} → {item.new_stock}
                                                            </span>

                                                            <span
                                                                className={`text-xs font-semibold flex items-center gap-1
                                                                    ${isUp ? "text-emerald-600" : "text-rose-600"}`}
                                                            >
                                                                {isUp ? (
                                                                    <FiArrowUpRight />
                                                                ) : (
                                                                    <FiArrowDownRight />
                                                                )}

                                                                {isUp ? `+${diff}` : diff}

                                                            </span>

                                                        </div>

                                                    </td>

                                                    {/* QTY */}
                                                    <td className="px-6 py-4 font-semibold text-gray-900">
                                                        {item.quantity}
                                                    </td>

                                                    {/* ORDER */}
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {showOrder ? item.order_number || "—" : "—"}
                                                    </td>

                                                    {/* NOTES */}
                                                    <td
                                                        className="px-6 py-4 max-w-[220px] truncate text-gray-600"
                                                        title={formatNotes(item.notes)}
                                                    >
                                                        {formatNotes(item.notes)}
                                                    </td>

                                                    {/* USER */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                                                <FiUser className="text-gray-500" />
                                                            </div>

                                                            <div className="flex flex-col">

                                                                <span className="font-medium text-gray-900">
                                                                    {formatName(userMap[item.created_by] || item.created_by) || "Unknown"}
                                                                </span>

                                                                <span className="text-xs text-gray-400 font-mono">
                                                                    {item.created_by}
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* DATE */}
                                                    <td className="px-6 py-4 text-xs text-gray-500">
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

            </div>
        </>
    );
};

/* SUMMARY CARD */

const SummaryCard = ({ label, value, icon, color }) => {

    const colors = {
        emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
        rose: "border-rose-100 bg-rose-50 text-rose-700",
        sky: "border-sky-100 bg-sky-50 text-sky-700",
        indigo: "border-blue-100 bg-blue-50 text-blue-700"
    };

    return (

        <div className={`rounded-2xl border shadow-sm p-5 flex items-center justify-between transition hover:shadow-md ${colors[color]}`}>

            <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out bg-${color}-100 text-${color}-700`}
            >
                {icon}
            </div>

            <div>

                <p className="text-xs uppercase text-gray-500 font-medium">
                    {label}
                </p>

                <p className="text-2xl font-bold text-gray-900">
                    {value}
                </p>

            </div>

        </div >

    );
};

/* EMPTY */

const EmptyState = () => (

    <div className="flex flex-col items-center justify-center py-24 text-gray-400">

        <FiClock size={52} className="mb-4 opacity-40" />

        <p className="text-lg font-semibold">
            No stock history yet
        </p>

        <p className="text-sm mt-2">
            Stock transactions will appear here when inventory changes occur
        </p>

    </div>

);

export default StockHistoryModal;