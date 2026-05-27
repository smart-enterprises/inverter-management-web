const PackageReadyIcon = ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M2.5 4.5L8 2L13.5 4.5V11.5L8 14L2.5 11.5V4.5Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M2.5 4.5L8 7L13.5 4.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M8 7V14" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
);

const InvoiceReadyIcon = ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M3.5 2H10.5L12.5 4V14H3.5V2Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <line x1="5.5" y1="6.5" x2="10.5" y2="6.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="5.5" y1="9" x2="10.5" y2="9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="5.5" y1="11.5" x2="8.5" y2="11.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

const TruckIcon = ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 4H9V11H1.5V4Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M9 6.5H12.5L14.5 8.5V11H9V6.5Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <circle cx="4" cy="12" r="1.2" stroke={color} strokeWidth="1.3" fill="none" />
        <circle cx="11.5" cy="12" r="1.2" stroke={color} strokeWidth="1.3" fill="none" />
    </svg>
);

const DeliveryCheckIcon = ({ size = 12, color }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M2.5 4.5L8 2L13.5 4.5V11.5L8 14L2.5 11.5V4.5Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M5.5 8L7.3 9.8L10.5 6.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const StatusBadge = ({ status }) => {
    const map = {
        PENDING: "bg-amber-50 text-amber-700 border-amber-200",
        CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
        PRODUCTION: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
        PACKED: "bg-teal-50 text-teal-700 border-teal-200",
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

const ICON_MAP = {
    package: PackageReadyIcon,
    invoice: InvoiceReadyIcon,
    truck: TruckIcon,
    delivery: DeliveryCheckIcon,
};

const TONE_MAP = {
    amber: {
        detail: { wrapper: "bg-amber-50 text-amber-900", iconColor: "#92400e" },
        table: { text: "text-amber-700", iconColor: "#b45309" },
    },
    green: {
        detail: { wrapper: "bg-emerald-50 text-emerald-900", iconColor: "#065f46" },
        table: { text: "text-emerald-700", iconColor: "#047857" },
    },
    fuchsia: {
        detail: { wrapper: "bg-fuchsia-50 text-fuchsia-900", iconColor: "#86198f" },
        table: { text: "text-fuchsia-700", iconColor: "#a21caf" },
    },
};

const SubLine = ({ text, icon = "package", tone = "amber", variant = "table" }) => {
    const Icon = ICON_MAP[icon] || PackageReadyIcon;
    const t = TONE_MAP[tone] || TONE_MAP.amber;
    if (variant === "detail") {
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${t.detail.wrapper}`}>
                <Icon size={12} color={t.detail.iconColor} />
                {text}
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium pl-0.5 ${t.table.text}`}>
            <Icon size={11} color={t.table.iconColor} />
            {text}
        </span>
    );
};

const ProductionStatusBadge = ({
    status = "Production",
    subLine = null,
    subLineIcon = "package",
    subLines = null,
    variant = "table",
}) => {
    const lines = subLines && subLines.length > 0
        ? subLines
        : subLine
            ? [{ text: subLine, icon: subLineIcon }]
            : [];

    if (variant === "detail") {
        return (
            <div className="items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                <StatusBadge status={status} />
                {lines.map((l, i) => (
                    <SubLine key={i} text={l.text} icon={l.icon} tone={l.tone} variant="detail" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={status} />
            {lines.map((l, i) => (
                <SubLine key={i} text={l.text} icon={l.icon} tone={l.tone} variant="table" />
            ))}
        </div>
    );
};

export default ProductionStatusBadge;
