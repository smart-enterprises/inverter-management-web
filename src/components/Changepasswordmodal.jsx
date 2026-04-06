// ChangePasswordModal.jsx — Integrated into Navbar
import React, { useState } from "react";
import { FiLock, FiEye, FiEyeOff, FiX, FiCheck, FiAlertCircle, FiShield } from "react-icons/fi";
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
    const map = [
        { label: "", color: "" },
        { label: "Very Weak", color: "#ef4444" },
        { label: "Weak", color: "#f97316" },
        { label: "Fair", color: "#eab308" },
        { label: "Strong", color: "#22c55e" },
        { label: "Very Strong", color: "#10b981" },
    ];
    return { score, ...map[score] };
};

/* ── Password Input ──────────────────────────────────────── */
const PwInput = ({ label, value, onChange, placeholder, name, error }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {label} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FiLock size={13} />
                </div>
                <input
                    type={show ? "text" : "password"}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete="new-password"
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 transition-all ${error
                        ? "border-rose-300 focus:ring-rose-100 focus:border-rose-400"
                        : "border-slate-200 focus:ring-indigo-100 focus:border-indigo-400 hover:border-slate-300"
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {show ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                </button>
            </div>
            {error && (
                <p className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold">
                    <FiAlertCircle size={10} /> {error}
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
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    style={{ animation: "nb-dropdown-in 160ms cubic-bezier(0.4,0,0.2,1) forwards" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-600">
                                <FiShield size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                    Update your account security
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <FiX size={16} />
                        </button>
                    </div>

                    {/* Success state */}
                    {success ? (
                        <div className="px-6 py-12 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                <FiCheck size={28} className="text-emerald-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-slate-900">Password Updated!</p>
                                <p className="text-sm text-slate-400 mt-1">Your password has been changed successfully.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {/* API Error */}
                            {apiError && (
                                <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                                    <FiAlertCircle size={14} className="flex-shrink-0" />
                                    {apiError}
                                </div>
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
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5">
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
                                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${met ? "bg-emerald-500" : "bg-slate-200"
                                                }`}
                                        >
                                            {met && <FiCheck size={8} className="text-white" />}
                                        </div>
                                        <span
                                            className={`text-xs font-medium transition-colors ${met ? "text-emerald-700" : "text-slate-400"
                                                }`}
                                        >
                                            {text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-indigo-200"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Updating…
                                        </>
                                    ) : (
                                        <>
                                            <FiShield size={13} />
                                            Update Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default ChangePasswordModal;