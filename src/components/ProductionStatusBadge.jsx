const WarningIcon = ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M8 2L14 13H2L8 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <line x1="8" y1="7" x2="8" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.75" fill={color} />
    </svg>
);

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: "bg-amber-50 text-amber-700 border-amber-200",
        CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
        PRODUCTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
        PACKED: "bg-violet-50 text-violet-700 border-violet-200",
        INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
        SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
        DELIVERED: "bg-green-50 text-green-700 border-green-200",
        COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
        CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
        REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const key = status?.toUpperCase();
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${map[key] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
            {status}
        </span>
    );
};

const ProductionStatusBadge = ({
    hasUnpacked = false,
    variant = "table",
}) => {

    if (variant === "detail") {
        return (
            <div className={`items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wide`}>
                <StatusBadge status="Production" />
                {hasUnpacked && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-900">
                        <WarningIcon size={12} color="#92400e" />
                        Waiting for packing
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <StatusBadge status="Production" />
            {hasUnpacked && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 pl-0.5">
                    <WarningIcon size={11} color="#b45309" />
                    Unpacked items pending
                </span>
            )}
        </div>
    );
};

export default ProductionStatusBadge;