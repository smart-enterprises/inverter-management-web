/* ==================== DATE UTILITIES ==================== */

// Convert ISO date to datetime-local input format
export const formatDateForInput = (isoDate) => {
    if (!isoDate) return "";

    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset();

    const localDate = new Date(date.getTime() - offset * 60000);

    return localDate.toISOString().slice(0, 16);
};

// Convert input date to API ISO format
export const formatDateForAPI = (value) => {
    if (!value) return undefined;

    return new Date(value).toISOString();
};