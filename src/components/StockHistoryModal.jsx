import React, { useMemo } from "react";
import {
  MdClose,
  MdInventory,
  MdInventory2,
  MdNorthEast,
  MdPersonOutline,
  MdSchedule,
  MdSouthEast,
  MdSubdirectoryArrowLeft,
  MdTrendingDown,
  MdTrendingUp,
} from "react-icons/md";

import { STOCK_ACTIONS, STOCK_TYPES, formatName } from "../utils/constants";

/* ACTION BADGE */
const getActionBadge = (action) => {
    switch (action) {
        case STOCK_ACTIONS.STOCK_ADD:
            return {
                label: "Added",
                className: "bg-emerald-100 text-emerald-700",
                icon: <MdTrendingUp size={12} />
            };

        case STOCK_ACTIONS.STOCK_SALE:
            return {
                label: "Sale",
                className: "bg-rose-100 text-rose-700",
                icon: <MdTrendingDown size={12} />
            };

        case STOCK_ACTIONS.STOCK_RETURN:
            return {
                label: "Return",
                className: "bg-sky-100 text-sky-700",
                icon: <MdSubdirectoryArrowLeft size={12} />
            };

        default:
            return {
                label: action,
                className: "m3-surface-container-high-bg m3-on-surface",
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

    return "m3-surface-container-high-bg m3-on-surface";
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
                className="fixed inset-0 m3-scrim backdrop-blur-lg z-40"
                onClick={onClose}
            />

            {/* MODAL */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6">

                <div
                    className="m3-surface-bg/90 backdrop-blur-xl border m3-outline-variant-border
                        rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.15)]
                        w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden
                    "
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-8 py-6 m3-surface-bg/70 backdrop-blur">

                        <div className="flex items-center gap-4">

                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow">
                                <MdSchedule />
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold m3-on-surface">
                                    Stock History
                                </h2>
                                <p className="text-sm m3-on-surface-variant">
                                    Inventory movements & stock analytics
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

                    {/* SUMMARY */}
                    <div className="grid grid-cols-4 gap-6 p-8 m3-surface-container-low-bg ">

                        <SummaryCard
                            label="Stock Added"
                            value={summary.added}
                            icon={<MdTrendingUp />}
                            color="emerald"
                        />

                        <SummaryCard
                            label="Stock Sold"
                            value={summary.sold}
                            icon={<MdTrendingDown />}
                            color="rose"
                        />

                        <SummaryCard
                            label="Returned"
                            value={summary.returned}
                            icon={<MdSubdirectoryArrowLeft />}
                            color="sky"
                        />

                        <SummaryCard
                            label="Current Inventory"
                            value={summary.currentStock}
                            icon={<MdInventory2 />}
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

                                    <thead className="m3-surface-container-low-bg text-xs uppercase tracking-wide m3-on-surface-variant">

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
                                                    className="hover:m3-surface-container-low-bg transition"
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
                                                            <MdInventory size={12} />
                                                            {item.stock_type}
                                                        </span>

                                                    </td>

                                                    {/* STOCK MOVEMENT */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex flex-col">

                                                            <span className="font-medium m3-on-surface">
                                                                {item.previous_stock} → {item.new_stock}
                                                            </span>

                                                            <span
                                                                className={`text-xs font-semibold flex items-center gap-1
                                                                    ${isUp ? "text-emerald-600" : "text-rose-600"}`}
                                                            >
                                                                {isUp ? (
                                                                    <MdNorthEast />
                                                                ) : (
                                                                    <MdSouthEast />
                                                                )}

                                                                {isUp ? `+${diff}` : diff}

                                                            </span>

                                                        </div>

                                                    </td>

                                                    {/* QTY */}
                                                    <td className="px-6 py-4 font-semibold m3-on-surface">
                                                        {item.quantity}
                                                    </td>

                                                    {/* ORDER */}
                                                    <td className="px-6 py-4 m3-on-surface-variant">
                                                        {showOrder ? item.order_number || "—" : "—"}
                                                    </td>

                                                    {/* NOTES */}
                                                    <td
                                                        className="px-6 py-4 max-w-[220px] truncate m3-on-surface-variant"
                                                        title={formatNotes(item.notes)}
                                                    >
                                                        {formatNotes(item.notes)}
                                                    </td>

                                                    {/* USER */}
                                                    <td className="px-6 py-4">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-9 h-9 rounded-full m3-surface-container-high-bg flex items-center justify-center">
                                                                <MdPersonOutline className="m3-on-surface-variant" />
                                                            </div>

                                                            <div className="flex flex-col">

                                                                <span className="font-medium m3-on-surface">
                                                                    {formatName(userMap[item.created_by] || item.created_by) || "Unknown"}
                                                                </span>

                                                                <span className="text-xs m3-on-surface-variant font-mono">
                                                                    {item.created_by}
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* DATE */}
                                                    <td className="px-6 py-4 text-xs m3-on-surface-variant">
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

                <p className="text-xs uppercase m3-on-surface-variant font-medium">
                    {label}
                </p>

                <p className="text-2xl font-bold m3-on-surface">
                    {value}
                </p>

            </div>

        </div >

    );
};

/* EMPTY */

const EmptyState = () => (

    <div className="flex flex-col items-center justify-center py-24 m3-on-surface-variant">

        <MdSchedule size={52} className="mb-4 opacity-40" />

        <p className="text-lg font-semibold">
            No stock history yet
        </p>

        <p className="text-sm mt-2">
            Stock transactions will appear here when inventory changes occur
        </p>

    </div>

);

export default StockHistoryModal;