// ChangePasswordModal.jsx — Integrated into Navbar
import React, { useState } from "react";
import { MdLockOutline, MdVisibility, MdVisibilityOff, MdClose, MdCheck, MdErrorOutline, MdShield } from "react-icons/md";
import { Button, IconButton, Banner } from "./m3";
import { T } from "./m3/tokens";
import { resetOwnPassword } from "../api/user";

/* ── Strength meter ───────────────────────────────────────── */
const getStrength = (pw) => {
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    /* Strength is also spelled out in words beside the bar, so the
       colour is reinforcement rather than the only signal. */
    const map = [
        { label: "", color: "" },
        { label: "Very Weak", color: "var(--md-sys-color-error)" },
        { label: "Weak", color: "var(--md-sys-color-error)" },
        { label: "Fair", color: "var(--md-sys-color-warning)" },
        { label: "Strong", color: "var(--md-sys-color-success)" },
        { label: "Very Strong", color: "var(--md-sys-color-success)" },
    ];
    return { score, ...map[score] };
};

/* ── Password Input ──────────────────────────────────────── */
const PwInput = ({ label, value, onChange, placeholder, name, error }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1.5">
            <label className="block m3-label-medium" style={{ color: T.onSurfaceVariant }}>
                {label} <span style={{ color: T.error }}>*</span>
            </label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.onSurfaceVariant }}>
                    <MdLockOutline size={18} />
                </div>
                <input
                    type={show ? "text" : "password"}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete="new-password"
                    className="w-full pl-11 pr-11 h-12 m3-body-medium focus:outline-none"
                    style={{
                        border: `1px solid ${error ? T.error : T.outline}`,
                        borderRadius: T.cornerExtraSmall,
                        backgroundColor: T.surface,
                        color: T.onSurface,
                    }}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: T.onSurfaceVariant }}
                >
                    {show ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
            </div>
            {error && (
                <p className="flex items-center gap-1 m3-body-small" style={{ color: T.error }}>
                    <MdErrorOutline size={14} /> {error}
                </p>
            )}
        </div>
    );
};

/* ── Main Modal ──────────────────────────────────────────── */
const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [form, setForm] = useState({
        current_password: "",
        password: "",
        confirm: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState("");

    const strength = getStrength(form.password);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        setErrors((p) => ({ ...p, [name]: undefined }));
        setApiError("");
    };

    const validate = () => {
        const e = {};
        if (!form.current_password.trim()) e.current_password = "Current password is required";
        if (!form.password.trim()) e.password = "New password is required";
        else if (form.password.length < 8) e.password = "Must be at least 8 characters";
        else if (strength.score < 3) e.password = "Password is too weak";
        if (!form.confirm.trim()) e.confirm = "Please confirm your new password";
        else if (form.confirm !== form.password) e.confirm = "Passwords do not match";
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setApiError("");
        try {
            const res = await resetOwnPassword({
                current_password: form.current_password,
                password: form.password,
            });

            if (res?.success) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setForm({ current_password: "", password: "", confirm: "" });
                    onClose();
                }, 1800);
            } else {
                setApiError(res?.message || "Failed to update password. Please try again.");
            }
        } catch (err) {
            setApiError(err?.message || "Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm({ current_password: "", password: "", confirm: "" });
        setErrors({});
        setApiError("");
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className="w-full max-w-md overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: "var(--md-sys-color-surface-container-high)",
                        borderRadius: T.cornerExtraLarge,
                        boxShadow: T.elevation3,
                        animation: "nb-dropdown-in 160ms cubic-bezier(0.2,0,0,1) forwards",
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-6 py-5"
                        style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 flex items-center justify-center"
                                style={{
                                    borderRadius: T.cornerFull,
                                    backgroundColor: T.primaryContainer,
                                    color: T.onPrimaryContainer,
                                }}
                            >
                                <MdShield size={20} />
                            </div>
                            <div>
                                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>Change Password</h2>
                                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>
                                    Update your account security
                                </p>
                            </div>
                        </div>
                        <IconButton icon={MdClose} onClick={handleClose} aria-label="Close dialog" />
                    </div>

                    {/* Success state */}
                    {success ? (
                        <div className="px-6 py-12 flex flex-col items-center gap-4">
                            <div
                                className="w-16 h-16 flex items-center justify-center"
                                style={{
                                    borderRadius: T.cornerFull,
                                    backgroundColor: T.successContainer,
                                    color: T.onSuccessContainer,
                                }}
                            >
                                <MdCheck size={32} />
                            </div>
                            <div className="text-center">
                                <p className="m3-title-medium" style={{ color: T.onSurface }}>Password Updated</p>
                                <p className="m3-body-medium mt-1" style={{ color: T.onSurfaceVariant }}>
                                    Your password has been changed successfully.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {/* API Error */}
                            {apiError && (
                                <Banner tone="error">{apiError}</Banner>
                            )}

                            <PwInput
                                label="Current Password"
                                name="current_password"
                                value={form.current_password}
                                onChange={handleChange}
                                placeholder="Enter current password"
                                error={errors.current_password}
                            />

                            <div className="space-y-1.5">
                                <PwInput
                                    label="New Password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Min. 8 characters"
                                    error={errors.password}
                                />
                                {/* Strength bar */}
                                {form.password && (
                                    <div className="space-y-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: i <= strength.score ? strength.color : "#e2e8f0",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        {strength.label && (
                                            <p
                                                className="text-[11px] font-semibold"
                                                style={{ color: strength.color }}
                                            >
                                                {strength.label}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <PwInput
                                label="Confirm New Password"
                                name="confirm"
                                value={form.confirm}
                                onChange={handleChange}
                                placeholder="Repeat new password"
                                error={errors.confirm}
                            />

                            {/* Requirements hint */}
                            <div
                                className="p-3 space-y-1"
                                style={{ backgroundColor: T.surfaceContainerLow, borderRadius: T.cornerMedium }}
                            >
                                <p className="m3-label-medium mb-1.5" style={{ color: T.onSurfaceVariant }}>
                                    Requirements
                                </p>
                                {[
                                    ["8+ characters", form.password.length >= 8],
                                    ["Uppercase letter", /[A-Z]/.test(form.password)],
                                    ["Lowercase letter", /[a-z]/.test(form.password)],
                                    ["Number", /\d/.test(form.password)],
                                    ["Special character", /[^A-Za-z0-9]/.test(form.password)],
                                ].map(([text, met]) => (
                                    <div key={text} className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all"
                                            style={{
                                                borderRadius: T.cornerFull,
                                                backgroundColor: met ? T.success : T.surfaceContainerHighest,
                                                color: met ? T.onPrimary : T.onSurfaceVariant,
                                            }}
                                        >
                                            {met && <MdCheck size={11} />}
                                        </div>
                                        <span
                                            className="m3-body-small transition-colors"
                                            style={{ color: met ? T.success : T.onSurfaceVariant }}
                                        >
                                            {text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-1">
                                <Button variant="text" type="button" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button variant="filled" type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Updating…
                                        </>
                                    ) : (
                                        <>
                                            <MdShield size={18} />
                                            Update Password
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChangePasswordModal;