import { ALLOWED_TRANSITIONS, ORDER_STATUS_LIST, ORDER_STATUSES } from "./status";

// Get allowed next statuses for dropdown
export const getAllowedNextStatuses = (currentStatus) => {

    if (!currentStatus) return [ORDER_STATUSES.PENDING];

    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowed || allowed.length === 0) {
        return [currentStatus]; // locked state
    }

    return [currentStatus, ...allowed];
};