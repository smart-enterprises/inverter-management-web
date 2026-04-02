// utils/validationUtils.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX = /^(\+?\d{1,3}[- ]?)?\d{7,15}$/;

const PASSWORD_RULES = [
    { test: (p) => p.length >= 8, message: "Password must be at least 8 characters" },
    { test: (p) => /[A-Z]/.test(p), message: "Password must contain at least one uppercase letter" },
    { test: (p) => /[a-z]/.test(p), message: "Password must contain at least one lowercase letter" },
    { test: (p) => /\d/.test(p), message: "Password must contain at least one number" },
    { test: (p) => /[^A-Za-z0-9]/.test(p), message: "Password must contain at least one special character" },
];

export const validatePassword = (password) => {
    for (const rule of PASSWORD_RULES) {
        if (!rule.test(password)) return rule.message;
    }
    return null;
};

export const validateEmployeeFields = ({
    employee_name,
    employee_email,
    employee_phone,
    password,
    role,
    isUpdate = false,
    allowedRoles = [],
}) => {
    const errors = [];

    // ── Name ────────────────────────────────────────────────────────────────
    if (!isUpdate || employee_name !== undefined) {
        if (!employee_name || employee_name.trim().length < 2)
            errors.push({ field: "employee_name", message: "Name must be at least 2 characters" });
        else if (employee_name.length > 500)
            errors.push({ field: "employee_name", message: "Name cannot exceed 500 characters" });
    }

    // ── Email ───────────────────────────────────────────────────────────────
    if (!isUpdate || employee_email !== undefined) {
        if (!employee_email || employee_email.trim() === "")
            errors.push({ field: "employee_email", message: "Email is required" });
        else if (!EMAIL_REGEX.test(employee_email.trim()))
            errors.push({ field: "employee_email", message: "Invalid email address" });
    }

    // ── Phone ───────────────────────────────────────────────────────────────
    if (!isUpdate || employee_phone !== undefined) {
        if (!employee_phone || String(employee_phone).trim() === "")
            errors.push({ field: "employee_phone", message: "Phone number is required" });
        else if (!PHONE_REGEX.test(String(employee_phone).trim()))
            errors.push({ field: "employee_phone", message: "Invalid phone number" });
    }

    // ── Password (create only) ───────────────────────────────────────────────
    if (!isUpdate && password !== undefined) {
        if (!password || password.trim() === "") {
            errors.push({ field: "password", message: "Password is required" });
        } else {
            const pwError = validatePassword(password);
            if (pwError) errors.push({ field: "password", message: pwError });
        }
    }

    // ── Role ────────────────────────────────────────────────────────────────
    if (!isUpdate || role !== undefined) {
        if (!role || role.trim() === "")
            errors.push({ field: "role", message: "Role is required" });
        else if (
            allowedRoles.length > 0 &&
            !allowedRoles.map((r) => r.toUpperCase()).includes(role.toUpperCase())
        )
            errors.push({
                field: "role",
                message: `Allowed roles: ${allowedRoles.join(", ")}`,
            });
    }

    return errors;
};

export const errorsToMap = (errors) =>
    errors.reduce((acc, { field, message }) => {
        if (!acc[field]) acc[field] = message;
        return acc;
    }, {});

export const safeSheets = (sheets) => {
    if (!sheets) return [];

    // ✅ Case 1: Already array
    if (Array.isArray(sheets)) return sheets;

    // ✅ Case 2: Object → convert to array
    if (typeof sheets === "object") {
        return Object.entries(sheets).map(([name, value]) => ({
            name,
            ...value,
        }));
    }

    return [];
};

export const normalizeUploadDetails = (details) => {
    if (!details) return { success: [], failed: [] };

    const success = [];
    const failed = [];

    Object.entries(details).forEach(([entity, value]) => {
        if (Array.isArray(value?.succeeded)) {
            value.succeeded.forEach((item) => {
                success.push({
                    entity,
                    ...item,
                });
            });
        }

        if (Array.isArray(value?.failed)) {
            value.failed.forEach((item) => {
                failed.push({
                    entity,
                    ...item,
                    error: item.errors?.join(", "),
                });
            });
        }
    });

    return { success, failed };
};

export const normalizeSummary = (summary) => {
    if (!summary) return null;

    let totalRows = 0;
    let successCount = 0;
    let failedCount = 0;

    let dealers = 0;
    let users = 0;
    let brands = 0;

    Object.entries(summary).forEach(([key, val]) => {
        totalRows += val.total || 0;
        successCount += val.created || 0;
        failedCount += val.failed || 0;

        if (key === "dealers") dealers = val.created || 0;
        if (key === "users") users = val.created || 0;
        if (key === "brands") brands = val.created || 0;
    });

    return {
        totalRows,
        successCount,
        failedCount,
        dealers,
        users,
        brands,
    };
};