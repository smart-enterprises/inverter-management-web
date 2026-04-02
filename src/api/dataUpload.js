// dataUpload.js
import { API_BASE_URL, apiRequest, getAuthHeaders } from "./apiClient";

/* ================= CONFIG ================= */
const ENDPOINTS = Object.freeze({
    UPLOAD: "/upload-excel/upload",
    TEMPLATE: "/upload-excel/template",
});

const FILE_CONFIG = Object.freeze({
    MAX_SIZE_MB: 50,
    EXTENSION: ".xlsx",
    LABEL: "Excel (.xlsx)",
    MIME_TYPES: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ],
});

const MAX_FILE_SIZE_MB = 50;

/* ================= ERROR HANDLER ================= */
const normalizeError = (error = {}) => ({
    success: false,
    message: error.message || "Something went wrong",
    errors: error.errors || [],
    status: error.status || null,
});

/* ================= FILE VALIDATION ================= */
export const validateExcelFile = (file) => {
    if (!file) return "No file selected.";

    const isValidType =
        FILE_CONFIG.MIME_TYPES.includes(file.type) ||
        file.name?.toLowerCase().endsWith(FILE_CONFIG.EXTENSION);

    if (!isValidType) {
        return `Only ${FILE_CONFIG.LABEL} files are accepted.`;
    }

    const maxBytes = FILE_CONFIG.MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
        return `File size must not exceed ${FILE_CONFIG.MAX_SIZE_MB} MB.`;
    }

    return null;
};

/* ================= UPLOAD EXCEL ================= */
const uploadWithProgress = (file, onUploadProgress) => {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();

            formData.append("file", file);

            const url = `${API_BASE_URL}${ENDPOINTS.UPLOAD}`;
            const headers = getAuthHeaders?.(true) || {};

            // 🔹 Initialize request
            xhr.open("POST", url, true);

            if (headers && typeof headers === "object") {
                Object.entries(headers).forEach(([key, value]) => {
                    if (!value) return;

                    if (key.toLowerCase() === "content-type") return;

                    xhr.setRequestHeader(key, value);
                });
            }

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && typeof onUploadProgress === "function") {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onUploadProgress(percent);
                }
            };

            xhr.onload = () => {
                try {
                    const response = JSON.parse(xhr.responseText || "{}");

                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(response);
                    } else {
                        reject(
                            normalizeError({
                                message: response?.message || "Upload failed",
                                errors: response?.errors,
                                status: xhr.status,
                            })
                        );
                    }
                } catch (parseError) {
                    reject(normalizeError(parseError));
                }
            };

            xhr.onerror = () => {
                reject(
                    normalizeError({
                        message: "Network error during file upload",
                    })
                );
            };

            xhr.onabort = () => {
                reject(
                    normalizeError({
                        message: "Upload cancelled",
                    })
                );
            };

            xhr.send(formData);
        } catch (error) {
            reject(normalizeError(error));
        }
    });
};

export const uploadExcel = async (file, onUploadProgress) => {
    try {
        // Step 1: Validate file
        const validationError = validateExcelFile(file);
        if (validationError) {
            return normalizeError({ message: validationError });
        }

        // Step 2: Use XHR for progress support
        const response = await uploadWithProgress(file, onUploadProgress);

        return response;
    } catch (error) {
        return normalizeError(error);
    }
};

export const fetchTemplate = async () => {
    try {
        const { data } = await apiRequest(ENDPOINTS.TEMPLATE, {
            method: "GET",
        });

        return data;
    } catch (error) {
        return normalizeError(error);
    }
};

export const downloadTemplate = async () => {
    let url = null;

    try {
        const baseUrl = `${API_BASE_URL}${ENDPOINTS.TEMPLATE}`;
        const queryParams = new URLSearchParams({
            download: "true",
        });

        const finalUrl = `${baseUrl}?${queryParams.toString()}`;

        const headers = getAuthHeaders?.(true) || {};

        const response = await fetch(finalUrl, {
            method: "GET",
            headers,
        });

        if (!response.ok) {
            throw new Error("Failed to download template");
        }

        const blob = await response.blob();

        url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "file_upload_template.xlsx";

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
    } catch (error) {
        console.error("Template download failed:", error);
        throw normalizeError(error);
    } finally {
        if (url) {
            window.URL.revokeObjectURL(url);
        }
    }
};

export const ACCEPTED_FILE_TYPES = {
    mime: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ],
    extension: ".xlsx",
    label: "Excel (.xlsx)",
};