/* ============================================================
   Material 3 component kit
   ------------------------------------------------------------
   The pieces every M3 page reuses. Colour, shape and type come
   from the token layer (src/styles/m3.css) via `T`, so nothing
   here hard-codes a palette.

   import { Card, Button, Chip } from "../components/m3";
   import { T } from "../components/m3/tokens";
   ============================================================ */
import React from "react";
import { MdBarChart, MdCheckCircle, MdErrorOutline, MdWarningAmber } from "react-icons/md";
import { T, CHIP_TONES, STATUS_TONE } from "./tokens";

/* ── Surface: the bare M3 card background ─────────────────── */
export const Surface = ({
    variant = "outlined",     // outlined | filled | elevated
    corner = T.cornerMedium,
    className = "",
    style = {},
    children,
    ...rest
}) => {
    const variants = {
        outlined: { backgroundColor: T.surface, border: `1px solid ${T.outlineVariant}` },
        filled: { backgroundColor: T.surfaceContainerLow },
        elevated: { backgroundColor: T.surfaceContainerLow, boxShadow: T.elevation1 },
    };
    return (
        <div
            className={className}
            style={{ borderRadius: corner, color: T.onSurface, ...variants[variant], ...style }}
            {...rest}
        >
            {children}
        </div>
    );
};

/* ── Card: surface + optional header row ──────────────────── */
export const Card = ({
    title,
    subtitle,
    action,
    variant = "outlined",
    padded = true,
    className = "",
    style = {},
    children,
}) => (
    <Surface variant={variant} className={`overflow-hidden ${className}`} style={style}>
        {(title || action) && (
            <div
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
            >
                <div className="min-w-0">
                    {title && (
                        <h2 className="m3-title-medium" style={{ color: T.onSurface }}>{title}</h2>
                    )}
                    {subtitle && (
                        <p className="m3-body-small mt-0.5 truncate" style={{ color: T.onSurfaceVariant }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {action}
            </div>
        )}
        <div className={padded ? "p-5" : ""}>{children}</div>
    </Surface>
);

/* ── Buttons ──────────────────────────────────────────────── */
const BUTTON_VARIANTS = {
    filled: { backgroundColor: T.primary, color: T.onPrimary },
    tonal: { backgroundColor: T.secondaryContainer, color: T.onSecondaryContainer },
    outlined: { backgroundColor: "transparent", color: T.primary, border: `1px solid ${T.outline}` },
    text: { backgroundColor: "transparent", color: T.primary },
};

export const Button = ({
    variant = "filled",
    icon: Icon,
    iconSize = 18,
    className = "",
    style = {},
    children,
    ...rest
}) => (
    <button
        type="button"
        className={`m3-button m3-state-layer m3-focus ${Icon ? "m3-button-with-icon" : ""} ${variant === "text" ? "m3-button-text" : ""} ${className}`}
        style={{ ...BUTTON_VARIANTS[variant], ...style }}
        {...rest}
    >
        {Icon && <Icon size={iconSize} />}
        {children}
    </button>
);

export const IconButton = ({ icon: Icon, size = 20, className = "", style = {}, ...rest }) => (
    <button
        type="button"
        className={`m3-icon-button m3-state-layer m3-focus ${className}`}
        style={style}
        {...rest}
    >
        <Icon size={size} />
    </button>
);

/* ── Chips ────────────────────────────────────────────────── */
export const Chip = ({ tone = "neutral", icon: Icon, className = "", style = {}, children }) => {
    const c = CHIP_TONES[tone] ?? CHIP_TONES.neutral;
    return (
        <span
            className={`m3-chip ${className}`}
            style={{ backgroundColor: c.bg, color: c.fg, ...style }}
        >
            {Icon && <Icon size={14} />}
            {children}
        </span>
    );
};

/* Order status chip — the label is always rendered, so status is
   never carried by colour alone. */
export const StatusChip = ({ status, className = "" }) => {
    const c = STATUS_TONE[status] ?? CHIP_TONES.neutral;
    return (
        <span className={`m3-chip ${className}`} style={{ backgroundColor: c.bg, color: c.fg }}>
            {status}
        </span>
    );
};

/* ── Filter chip (selectable) ─────────────────────────────── */
export const FilterChip = ({ selected, className = "", style = {}, children, ...rest }) => (
    <button
        type="button"
        aria-pressed={selected}
        className={`m3-label-large m3-state-layer m3-focus px-4 ${className}`}
        style={{
            height: 32,
            borderRadius: T.cornerSmall,
            backgroundColor: selected ? T.secondaryContainer : "transparent",
            color: selected ? T.onSecondaryContainer : T.onSurfaceVariant,
            border: selected ? "none" : `1px solid ${T.outline}`,
            ...style,
        }}
        {...rest}
    >
        {children}
    </button>
);

/* ── Segmented button ─────────────────────────────────────── */
export const SegmentedButton = ({ value, onChange, options, ariaLabel, className = "" }) => (
    <div
        role="group"
        aria-label={ariaLabel}
        className={`inline-flex items-center overflow-hidden ${className}`}
        style={{ border: `1px solid ${T.outline}`, borderRadius: T.cornerFull, height: 32 }}
    >
        {options.map((opt, i) => {
            const active = value === opt.value;
            const Icon = opt.icon;
            return (
                <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    title={opt.label}
                    aria-pressed={active}
                    className="m3-label-medium m3-state-layer flex items-center gap-1.5 h-full px-3"
                    style={{
                        backgroundColor: active ? T.secondaryContainer : "transparent",
                        color: active ? T.onSecondaryContainer : T.onSurfaceVariant,
                        borderLeft: i > 0 ? `1px solid ${T.outline}` : "none",
                    }}
                >
                    {Icon && <Icon size={16} />}
                    <span className={opt.icon ? "hidden sm:inline" : ""}>{opt.label}</span>
                </button>
            );
        })}
    </div>
);

/* ── KPI card ─────────────────────────────────────────────── */
export const KpiCard = ({
    icon: Icon,
    tone = "primary",
    label,
    value,
    footer,
    loading,
    onClick,
    valueClass = "m3-display-small",
}) => {
    const c = CHIP_TONES[tone] ?? CHIP_TONES.primary;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`text-left w-full p-5 m3-focus ${onClick ? "m3-state-layer cursor-pointer" : "cursor-default"}`}
            style={{
                backgroundColor: T.surfaceContainerLow,
                borderRadius: T.cornerMedium,
                color: T.onSurface,
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-4">
                <p className="m3-label-large mt-1" style={{ color: T.onSurfaceVariant }}>{label}</p>
                {Icon && (
                    <div
                        className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        style={{ borderRadius: T.cornerFull, backgroundColor: c.bg, color: c.fg }}
                    >
                        <Icon size={20} />
                    </div>
                )}
            </div>
            {loading ? (
                <Skeleton className="h-9 w-24" />
            ) : (
                <>
                    <p className={`${valueClass} m3-numeric`} style={{ color: T.onSurface }}>{value}</p>
                    {footer}
                </>
            )}
        </button>
    );
};

/* ── Feedback ─────────────────────────────────────────────── */
export const Skeleton = ({ className = "" }) => (
    <div
        className={`animate-pulse ${className}`}
        style={{ backgroundColor: T.surfaceContainerHighest, borderRadius: T.cornerSmall }}
    />
);

export const EmptyState = ({ icon: Icon = MdBarChart, label, className = "" }) => (
    <div className={`flex flex-col items-center justify-center py-16 gap-3 ${className}`}>
        <div className="p-4" style={{ backgroundColor: T.surfaceContainerHigh, borderRadius: T.cornerFull }}>
            <Icon size={24} style={{ color: T.onSurfaceVariant }} />
        </div>
        <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>{label}</p>
    </div>
);

const BANNER_TONES = {
    error: { bg: T.errorContainer, fg: T.onErrorContainer, Icon: MdErrorOutline },
    warning: { bg: T.warningContainer, fg: T.onWarningContainer, Icon: MdWarningAmber },
    success: { bg: T.successContainer, fg: T.onSuccessContainer, Icon: MdCheckCircle },
};

export const Banner = ({ tone = "error", children, className = "" }) => {
    const c = BANNER_TONES[tone] ?? BANNER_TONES.error;
    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 m3-body-medium ${className}`}
            style={{ backgroundColor: c.bg, color: c.fg, borderRadius: T.cornerMedium }}
        >
            <c.Icon size={20} />
            <span>{children}</span>
        </div>
    );
};

/* ── Section heading ──────────────────────────────────────── */
export const SectionTitle = ({ icon: Icon, children, className = "" }) => (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
        {Icon && <Icon size={20} style={{ color: T.onSurfaceVariant }} />}
        <h3 className="m3-title-medium" style={{ color: T.onSurface }}>{children}</h3>
    </div>
);

/* ── Table primitives ─────────────────────────────────────────
   Thin wrappers, not a DataTable: the pages differ too much in
   columns and behaviour to share one, but they should not each
   re-derive the M3 surface, divider and state-layer rules.
   ──────────────────────────────────────────────────────────── */
export const Table = ({ className = "", children }) => (
    <div className="overflow-x-auto">
        <table className={`min-w-full ${className}`}>{children}</table>
    </div>
);

export const Thead = ({ children }) => (
    <thead>
        <tr style={{ backgroundColor: T.surfaceContainerLow }}>{children}</tr>
    </thead>
);

export const Th = ({ align = "left", className = "", children }) => (
    <th
        className={`m3-label-medium px-5 py-3 whitespace-nowrap ${className}`}
        style={{ color: T.onSurfaceVariant, textAlign: align, fontWeight: 500 }}
    >
        {children}
    </th>
);

export const Tr = ({ onClick, className = "", children, ...rest }) => (
    <tr
        onClick={onClick}
        className={`${onClick ? "cursor-pointer m3-state-layer" : ""} ${className}`}
        style={{ borderTop: `1px solid ${T.outlineVariant}`, color: T.onSurface }}
        {...rest}
    >
        {children}
    </tr>
);

export const Td = ({ align = "left", muted = false, numeric = false, className = "", children }) => (
    <td
        className={`px-5 py-3 ${numeric ? "m3-numeric" : ""} ${muted ? "m3-body-medium" : "m3-label-large"} ${className}`}
        style={{ textAlign: align, color: muted ? T.onSurfaceVariant : T.onSurface }}
    >
        {children}
    </td>
);
