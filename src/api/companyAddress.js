import { apiRequest } from "./apiClient";

// ✅ Fetch Company Address / Details
export const fetchCompanyAddress = async () => {
    return apiRequest(`/company-address`, {
        method: "GET",
    });
};

// ✅ Create or Update Company Address / Details
export const createOrUpdateCompanyAddress = async (payload) => {
    return apiRequest(`/company-address`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
};