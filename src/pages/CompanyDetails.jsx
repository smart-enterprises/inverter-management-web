// pages/CompanyDetails.jsx

import React, { useEffect, useState, useCallback } from "react";
import {
    FiSave, FiEdit2, FiPlus, FiLoader, FiAlertCircle,
    FiGlobe, FiMail, FiPhone, FiMapPin, FiShield, FiImage,
    FiCheckCircle,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../utils/roles";
import { fetchCompanyAddress, createOrUpdateCompanyAddress } from "../api/companyAddress";

// Guard — only SUPER_ADMIN & ADMIN
const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

// Small reusable field input
const Field = ({ label, icon: Icon, error, className = "", ...props }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 flex items-center gap-1.5">
            {Icon && <Icon size={10} />}
            {label}
        </label>
        <input
            {...props}
            className={`w-full border rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 transition-all
        ${error
                    ? "border-rose-300 focus:ring-rose-200 focus:border-rose-400"
                    : "border-slate-200 focus:ring-indigo-200 focus:border-indigo-400"
                }`}
        />
        {error && (
            <p className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold">
                <FiAlertCircle size={10} /> {error}
            </p>
        )}
    </div>
);

// Main Component
const CompanyDetails = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* Access guard */
    useEffect(() => {
        if (!ALLOWED_ROLES.includes(user?.role)) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingData, setExistingData] = useState(null); // null = not loaded yet, false = no record
    const [isEditing, setIsEditing] = useState(false);

    const EMPTY_FORM = {
        company_name: "",
        gst_number: "",
        email: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        pincode: "",
        country: "",
        company_logo: "",
    };

    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    /* ── Fetch existing record ── */
    const loadCompanyDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchCompanyAddress();
            if (res?.success && res.data?.length > 0) {
                const record = res.data[0];
                setExistingData(record);
                setFormData({
                    company_name: record.company_name || "",
                    gst_number: record.gst_number || "",
                    email: record.email || "",
                    phone: record.phone || "",
                    address_line_1: record.address_line_1 || "",
                    address_line_2: record.address_line_2 || "",
                    city: record.city || "",
                    state: record.state || "",
                    pincode: record.pincode || "",
                    country: record.country || "",
                    company_logo: record.company_logo || "",
                });
            } else {
                setExistingData(false);
                setIsEditing(true); // auto-open form when no record
            }
        } catch (err) {
            Swal.fire("Error", err.message || "Failed to load company details", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCompanyDetails();
    }, [loadCompanyDetails]);

    /* ── Validation ── */
    const validate = () => {
        const newErrors = {};
        if (!formData.company_name?.trim()) newErrors.company_name = "Company name is required";
        if (!formData.email?.trim()) newErrors.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email address";
        if (!formData.phone?.trim()) newErrors.phone = "Phone is required";
        if (!formData.address_line_1?.trim()) newErrors.address_line_1 = "Address line 1 is required";
        if (!formData.city?.trim()) newErrors.city = "City is required";
        if (!formData.state?.trim()) newErrors.state = "State is required";
        if (!formData.pincode?.trim()) newErrors.pincode = "Pincode is required";
        if (!formData.country?.trim()) newErrors.country = "Country is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!validate()) return;
        try {
            setSaving(true);
            const payload = { ...formData };
            // Include ID only when updating
            if (existingData && existingData.company_address_id) {
                payload.company_address_id = existingData.company_address_id;
            }
            const res = await createOrUpdateCompanyAddress(payload);
            if (!res?.success) throw new Error(res?.message || "Failed to save company details");
            await Swal.fire({
                icon: "success",
                title: existingData ? "Details Updated" : "Details Saved",
                text: res.message || "Company details saved successfully.",
                confirmButtonColor: "#4f46e5",
            });
            setIsEditing(false);
            loadCompanyDetails();
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    /* ── Cancel edit ── */
    const handleCancel = () => {
        if (!existingData) return; // can't cancel if no record yet
        // Restore original values
        setFormData({
            company_name: existingData.company_name || "",
            gst_number: existingData.gst_number || "",
            email: existingData.email || "",
            phone: existingData.phone || "",
            address_line_1: existingData.address_line_1 || "",
            address_line_2: existingData.address_line_2 || "",
            city: existingData.city || "",
            state: existingData.state || "",
            pincode: existingData.pincode || "",
            country: existingData.country || "",
            company_logo: existingData.company_logo || "",
        });
        setErrors({});
        setIsEditing(false);
    };

    const set = (key) => (e) => {
        setFormData((p) => ({ ...p, [key]: e.target.value }));
        if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    };

    /* ─────────────────────────────────────────────────────────
       LOADING STATE
       ───────────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/60 flex items-center justify-center">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────
       RENDER
       ───────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-5">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Settings</h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {existingData
                                ? "Manage your organisation's profile and contact information"
                                : "Set up your company profile to get started"}
                        </p>
                    </div>

                    {/* Edit / Update button — shown only when a record exists and not currently editing */}
                    {existingData && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
                        >
                            <FiEdit2 size={13} />
                            Modify Company Details
                        </button>
                    )}
                </div>

                {/* ── View Mode: Summary Card ── */}
                {existingData && !isEditing && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                        {/* Logo / Name banner */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                            {existingData.company_logo ? (
                                <img
                                    src={existingData.company_logo}
                                    alt="Company logo"
                                    className="w-14 h-14 rounded-xl object-contain border border-slate-200 bg-white p-1"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                                    <FiImage size={20} />
                                </div>
                            )}
                            <div>
                                <p className="text-base font-bold text-slate-900">{existingData.company_name}</p>
                                {existingData.gst_number && (
                                    <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-black uppercase tracking-wide">
                                        <FiShield size={9} />
                                        GST: {existingData.gst_number}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Detail rows */}
                        <div className="divide-y divide-slate-50">
                            <DetailRow icon={FiMail} label="Email" value={existingData.email} />
                            <DetailRow icon={FiPhone} label="Phone" value={existingData.phone} />
                            <DetailRow
                                icon={FiMapPin}
                                label="Address"
                                value={[
                                    existingData.address_line_1,
                                    existingData.address_line_2,
                                    existingData.city,
                                    existingData.state,
                                    existingData.pincode,
                                    existingData.country,
                                ].filter(Boolean).join(", ")}
                            />
                            {existingData.company_logo && (
                                <DetailRow icon={FiGlobe} label="Logo URL" value={existingData.company_logo} truncate />
                            )}
                        </div>

                        {/* Status footer */}
                        <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                            <FiCheckCircle size={12} className="text-emerald-500" />
                            <span className="text-[11px] font-semibold text-slate-500">
                                Last updated: {new Date(existingData.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Form: Create or Edit ── */}
                {(isEditing || !existingData) && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                        {/* Form header */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div className={`p-2 rounded-xl border ${existingData ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"}`}>
                                {existingData ? <FiEdit2 size={14} /> : <FiPlus size={14} />}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">
                                    {existingData ? "Update Company Details" : "Register Company Details"}
                                </h2>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                                    {existingData ? "Edit and save your changes" : "Fill in your organisation information"}
                                </p>
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="px-6 py-5 space-y-4">

                            {/* Company name + GST */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label="Company Name"
                                    icon={FiShield}
                                    placeholder="SMART ENTERPRISES"
                                    value={formData.company_name}
                                    onChange={set("company_name")}
                                    error={errors.company_name}
                                />
                                <Field
                                    label="GST Number"
                                    icon={FiShield}
                                    placeholder="32ABCDE1234F1Z5"
                                    value={formData.gst_number}
                                    onChange={set("gst_number")}
                                    error={errors.gst_number}
                                />
                            </div>

                            {/* Email + Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label="Email"
                                    icon={FiMail}
                                    type="email"
                                    placeholder="support@company.com"
                                    value={formData.email}
                                    onChange={set("email")}
                                    error={errors.email}
                                />
                                <Field
                                    label="Phone"
                                    icon={FiPhone}
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={set("phone")}
                                    error={errors.phone}
                                />
                            </div>

                            {/* Address lines */}
                            <Field
                                label="Address Line 1"
                                icon={FiMapPin}
                                placeholder="2nd Floor, Tech Park"
                                value={formData.address_line_1}
                                onChange={set("address_line_1")}
                                error={errors.address_line_1}
                            />
                            <Field
                                label="Address Line 2"
                                icon={FiMapPin}
                                placeholder="Near Infopark (optional)"
                                value={formData.address_line_2}
                                onChange={set("address_line_2")}
                            />

                            {/* City, State, Pincode, Country */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Field
                                    label="City"
                                    placeholder="Kochi"
                                    value={formData.city}
                                    onChange={set("city")}
                                    error={errors.city}
                                />
                                <Field
                                    label="State"
                                    placeholder="Kerala"
                                    value={formData.state}
                                    onChange={set("state")}
                                    error={errors.state}
                                />
                                <Field
                                    label="Pincode"
                                    placeholder="682030"
                                    value={formData.pincode}
                                    onChange={set("pincode")}
                                    error={errors.pincode}
                                />
                                <Field
                                    label="Country"
                                    placeholder="India"
                                    value={formData.country}
                                    onChange={set("country")}
                                    error={errors.country}
                                />
                            </div>

                            {/* Logo URL */}
                            <Field
                                label="Company Logo URL"
                                icon={FiImage}
                                placeholder="https://cdn.example.com/logo.png"
                                value={formData.company_logo}
                                onChange={set("company_logo")}
                            />

                            {/* Logo preview */}
                            {formData.company_logo && (
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                                    <img
                                        src={formData.company_logo}
                                        alt="Logo preview"
                                        className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5"
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                    <p className="text-xs text-slate-500 font-medium">Logo preview</p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                            {existingData && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 disabled:opacity-60"
                            >
                                {saving ? (
                                    <FiLoader size={14} className="animate-spin" />
                                ) : (
                                    <FiSave size={14} />
                                )}
                                {saving
                                    ? "Saving…"
                                    : existingData
                                        ? "Save Changes"
                                        : "Register Company"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// DetailRow — used in view mode
const DetailRow = ({ icon: Icon, label, value, truncate = false }) => (
    <div className="flex items-start gap-3 px-6 py-3.5">
        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
            <Icon size={12} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-0.5">{label}</p>
            <p className={`text-sm font-medium text-slate-800 ${truncate ? "truncate" : ""}`}>
                {value || <span className="text-slate-300 italic">Not provided</span>}
            </p>
        </div>
    </div>
);

export default CompanyDetails;