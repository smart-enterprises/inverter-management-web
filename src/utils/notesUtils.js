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