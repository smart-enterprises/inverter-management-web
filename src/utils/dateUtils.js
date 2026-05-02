/* ==================== DATE UTILITIES ==================== */

// Convert ISO date to datetime-local input format
export const formatDateForInput = (isoDate) => {
    if (!isoDate) return "";

    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset();

    const localDate = new Date(date.getTime() - offset * 60000);

    return localDate.toISOString().slice(0, 16);
};

export const formatDeliveryDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    return { date, time };
};

// Convert input date to API ISO format
export const formatDateForAPI = (value) => {
    if (!value) return undefined;

    return new Date(value).toISOString();
};

// Get today and first day of month in YYYY-MM-DD format
export const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return { today, firstDayOfMonth };
};