/* ============================================================
   M3 tokens — JS handles for the CSS custom properties defined
   in src/styles/m3.css.

   Use `T` for anything rendered as CSS (inline styles resolve
   var() at paint time, so a future theme swap needs no JS
   change). Use `CHART` where a library needs a concrete value
   it can read in JavaScript — recharts passes colours to its
   legend and tooltip code, and cannot resolve var().
   ============================================================ */

export const T = {
    // Primary
    primary: "var(--md-sys-color-primary)",
    onPrimary: "var(--md-sys-color-on-primary)",
    primaryContainer: "var(--md-sys-color-primary-container)",
    onPrimaryContainer: "var(--md-sys-color-on-primary-container)",

    // Secondary
    secondary: "var(--md-sys-color-secondary)",
    onSecondary: "var(--md-sys-color-on-secondary)",
    secondaryContainer: "var(--md-sys-color-secondary-container)",
    onSecondaryContainer: "var(--md-sys-color-on-secondary-container)",

    // Tertiary
    tertiary: "var(--md-sys-color-tertiary)",
    tertiaryContainer: "var(--md-sys-color-tertiary-container)",
    onTertiaryContainer: "var(--md-sys-color-on-tertiary-container)",

    // Error
    error: "var(--md-sys-color-error)",
    onError: "var(--md-sys-color-on-error)",
    errorContainer: "var(--md-sys-color-error-container)",
    onErrorContainer: "var(--md-sys-color-on-error-container)",

    // Custom roles
    success: "var(--md-sys-color-success)",
    successContainer: "var(--md-sys-color-success-container)",
    onSuccessContainer: "var(--md-sys-color-on-success-container)",
    warning: "var(--md-sys-color-warning)",
    warningContainer: "var(--md-sys-color-warning-container)",
    onWarningContainer: "var(--md-sys-color-on-warning-container)",

    // Surfaces
    surface: "var(--md-sys-color-surface)",
    surfaceContainerLowest: "var(--md-sys-color-surface-container-lowest)",
    surfaceContainerLow: "var(--md-sys-color-surface-container-low)",
    surfaceContainer: "var(--md-sys-color-surface-container)",
    surfaceContainerHigh: "var(--md-sys-color-surface-container-high)",
    surfaceContainerHighest: "var(--md-sys-color-surface-container-highest)",
    onSurface: "var(--md-sys-color-on-surface)",
    onSurfaceVariant: "var(--md-sys-color-on-surface-variant)",
    inverseSurface: "var(--md-sys-color-inverse-surface)",
    inverseOnSurface: "var(--md-sys-color-inverse-on-surface)",

    // Outlines
    outline: "var(--md-sys-color-outline)",
    outlineVariant: "var(--md-sys-color-outline-variant)",
    scrim: "var(--md-sys-color-scrim)",

    // Shape
    cornerExtraSmall: "var(--md-sys-shape-corner-extra-small)",
    cornerSmall: "var(--md-sys-shape-corner-small)",
    cornerMedium: "var(--md-sys-shape-corner-medium)",
    cornerLarge: "var(--md-sys-shape-corner-large)",
    cornerExtraLarge: "var(--md-sys-shape-corner-extra-large)",
    cornerFull: "var(--md-sys-shape-corner-full)",

    // Elevation
    elevation1: "var(--md-sys-elevation-1)",
    elevation2: "var(--md-sys-elevation-2)",
    elevation3: "var(--md-sys-elevation-3)",
};

/* ── Chart palette ────────────────────────────────────────────
   Literals, because recharts needs values it can read in JS.

   The categorical series were validated for contrast, chroma,
   colour-vision separation and normal-vision separation rather
   than chosen by eye.

   Known limitation: `delivered` (green) and `cancelled` (red)
   are status colours, and no green/red pair is separable under
   deuteranopia. Both always carry a text label, which is the
   secondary encoding that keeps them readable without hue.
   ──────────────────────────────────────────────────────────── */
export const CHART = {
    delivered: "#2E7D32",
    bookings: "#0B57D0",
    orders: "#A85400",
    paid: "#8E4EC6",
    cancelled: "#B3261E",
    grid: "#C4C6D0",
    axis: "#44464F",
    track: "#E2E2E9",
};

/* Pipeline stages are ordinal, so they read as a single-hue
   sequential ramp (light → dark). Terminal states keep their
   reserved status colours. */
export const STATUS_COLOR = {
    PENDING: "#A8C7FA",
    CONFIRMED: "#7CACF8",
    PRODUCTION: "#4C8DF6",
    PACKED: "#1B6EF3",
    INVOICE: "#0B57D0",
    SHIPPED: "#0842A0",
    DELIVERED: "#2E7D32",
    COMPLETED: "#146C2E",
    CANCELLED: "#B3261E",
    REJECTED: "#74777F",
};

/* Order status → M3 tonal container pair, for chips and badges. */
export const STATUS_TONE = {
    PENDING: { bg: T.warningContainer, fg: T.onWarningContainer },
    CONFIRMED: { bg: T.primaryContainer, fg: T.onPrimaryContainer },
    PRODUCTION: { bg: T.tertiaryContainer, fg: T.onTertiaryContainer },
    PACKED: { bg: T.secondaryContainer, fg: T.onSecondaryContainer },
    INVOICE: { bg: T.surfaceContainerHighest, fg: T.onSurfaceVariant },
    SHIPPED: { bg: T.primaryContainer, fg: T.onPrimaryContainer },
    DELIVERED: { bg: T.successContainer, fg: T.onSuccessContainer },
    COMPLETED: { bg: T.successContainer, fg: T.onSuccessContainer },
    CANCELLED: { bg: T.errorContainer, fg: T.onErrorContainer },
    REJECTED: { bg: T.errorContainer, fg: T.onErrorContainer },
};

/* Named tones for the generic <Chip tone="…"> */
export const CHIP_TONES = {
    primary: { bg: T.primaryContainer, fg: T.onPrimaryContainer },
    secondary: { bg: T.secondaryContainer, fg: T.onSecondaryContainer },
    tertiary: { bg: T.tertiaryContainer, fg: T.onTertiaryContainer },
    success: { bg: T.successContainer, fg: T.onSuccessContainer },
    warning: { bg: T.warningContainer, fg: T.onWarningContainer },
    error: { bg: T.errorContainer, fg: T.onErrorContainer },
    neutral: { bg: T.surfaceContainerHighest, fg: T.onSurfaceVariant },
};
