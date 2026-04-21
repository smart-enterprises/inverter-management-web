/* ==================== NOTES UTILITIES ==================== */
const parseNotes = (notes) => {
    if (!notes) return [];

    return notes
        .split("|")
        .map((note) => note.trim())
        .filter(Boolean);
};

/* ================= STOCK NOTES ================= */
export const formatStockNotes = (notes) => {
    const STOCK_NOTE_REGEX = /^(production|required|unpacked|delivered)/i;

    return parseNotes(notes).filter((note) =>
        STOCK_NOTE_REGEX.test(note)
    );
};

/* ================= DISCOUNT NOTES ================= */
export const formatDealerDiscountNotes = (notes) => {
    const DISCOUNT_NOTE_REGEX = /^(dealer discount|manual discount)/i;

    return parseNotes(notes).filter((note) =>
        DISCOUNT_NOTE_REGEX.test(note)
    );
};

/* ================================================================
   DELIVERY NOTES PARSER
   Handles two formats:
     1. Structured: "Employee: X | Role: Y | Note: Z | Date: A → B"
     2. Plain text:  "testing"
   ================================================================ */

const formatDateLabel = (rawDate) => {
    if (!rawDate) return "";
    try {
        return new Date(rawDate.trim()).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return rawDate.trim();
    }
};

export const formatDeliveryNotes = (notes) => {
    if (!notes) return [];

    /* Normalize to a flat string array */
    const raw = Array.isArray(notes)
        ? notes.map((n) => String(n).trim()).filter(Boolean)
        : typeof notes === "string"
            ? notes.split("||").map((s) => s.trim()).filter(Boolean)
            : [];

    return raw.map((entry) => {
        /* ── Structured format: pipe-separated key:value pairs ── */
        if (entry.includes("|")) {
            const segments = entry.split("|").map((s) => s.trim());
            const get = (key) => {
                const seg = segments.find((s) =>
                    s.toLowerCase().startsWith(key.toLowerCase() + ":")
                );
                return seg ? seg.slice(key.length + 1).trim() : "";
            };

            const employee = get("Employee").replace(/_/g, " ");
            const role = get("Role");
            const noteText = get("Note");
            const dateSeg = get("Date");

            /* Date segment: "Tue Apr 21 2026 02:00:00 ... → Tue Apr 21 2026 04:02:00 ..." */
            let fromDate = "";
            let toDate = "";
            if (dateSeg) {
                const [from, to] = dateSeg.split("→");
                fromDate = formatDateLabel(from);
                toDate = formatDateLabel(to);
            }

            return { employee, role, noteText, fromDate, toDate, isPlain: false };
        }

        /* ── Plain text format: "testing" ── */
        return {
            employee: "",
            role: "",
            noteText: entry,
            fromDate: "",
            toDate: "",
            isPlain: true,
        };
    }).filter((n) => n.noteText || n.employee);
};