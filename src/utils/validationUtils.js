// validationUtils.js
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;

export const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length === 0) {
        errors.push("Password is required");
        return errors;
    }
    if (password.length < 8) errors.push("Password must be at least 8 characters");
    if (password.length > 128) errors.push("Password cannot exceed 128 characters");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
    if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password))
        errors.push("Password must contain at least one special character");
    return errors;
};

export const validateDealerForm = (formData, isUpdate = false) => {
    const errors = {};

    // employee_name
    if (!isUpdate || formData.name !== undefined) {
        if (!formData.name || formData.name.trim().length === 0) {
            errors.name = "Dealer name is required";
        } else if (formData.name.trim().length < 2) {
            errors.name = "Name must be at least 2 characters";
        } else if (formData.name.trim().length > 500) {
            errors.name = "Name cannot exceed 500 characters";
        }
    }

    // employee_email
    if (!isUpdate || formData.email !== undefined) {
        if (!formData.email || formData.email.trim().length === 0) {
            errors.email = "Email is required";
        } else if (!EMAIL_REGEX.test(formData.email.trim())) {
            errors.email = "Invalid email address";
        }
    }

    // employee_phone
    if (!isUpdate || formData.phone !== undefined) {
        if (!formData.phone || formData.phone.trim().length === 0) {
            errors.phone = "Phone number is required";
        } else if (!PHONE_REGEX.test(formData.phone.trim())) {
            errors.phone = "Invalid phone number (7–15 digits)";
        }
    }

    // password — only on create
    if (!isUpdate) {
        const pwdErrors = validatePassword(formData.password);
        if (pwdErrors.length > 0) errors.password = pwdErrors[0];
    }

    // brands
    if (!formData.brands || formData.brands.length === 0) {
        errors.brands = "Please select at least one brand";
    }

    return errors;
};