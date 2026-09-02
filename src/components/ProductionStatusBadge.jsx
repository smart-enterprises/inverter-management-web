import { StatusChip as M3StatusChip } from "./m3";
import { T } from "./m3/tokens";

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

/* The order-status palette lives in the M3 kit, so this badge and the
   plain chips on Orders/Dashboard can never drift apart. */
const StatusBadge = ({ status }) => (
    <M3StatusChip status={status?.toUpperCase()} />
);

const ICON_MAP = {
    package: PackageReadyIcon,
    invoice: InvoiceReadyIcon,
    truck: TruckIcon,
    delivery: DeliveryCheckIcon,
};

/* Sub-line tones map onto the M3 roles. The icons are drawn with
   currentColor so they follow the text rather than a second palette. */
const TONE_MAP = {
    amber: { container: T.warningContainer, onContainer: T.onWarningContainer, text: T.warning },
    green: { container: T.successContainer, onContainer: T.onSuccessContainer, text: T.success },
    fuchsia: { container: T.tertiaryContainer, onContainer: T.onTertiaryContainer, text: T.tertiary },
};

const SubLine = ({ text, icon = "package", tone = "amber", variant = "table" }) => {
    const Icon = ICON_MAP[icon] || PackageReadyIcon;
    const t = TONE_MAP[tone] || TONE_MAP.amber;
    if (variant === "detail") {
        return (
            <span
                className="inline-flex items-center gap-1.5 px-3 py-1 m3-body-small"
                style={{
                    backgroundColor: t.container,
                    color: t.onContainer,
                    borderRadius: T.cornerSmall,
                }}
            >
                <Icon size={12} color="currentColor" />
                {text}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 m3-body-small pl-0.5" style={{ color: t.text }}>
            <Icon size={12} color="currentColor" />
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
