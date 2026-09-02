// pages/CompanyDetails.jsx

import React, { useEffect, useState, useCallback } from "react";
import {
  MdAdd,
  MdAutorenew,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdErrorOutline,
  MdImage,
  MdLocationOn,
  MdMailOutline,
  MdPhone,
  MdPublic,
  MdRefresh,
  MdSave,
  MdShield,
  MdWork,
} from "react-icons/md";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../utils/roles";
import { fetchCompanyAddress, createOrUpdateCompanyAddress } from "../api/companyAddress";

const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

/* ─── Field Input ─── */
const Field = ({ label, icon: Icon, error, className = "", ...props }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        <label className="text-[10px] font-black uppercase tracking-[0.12em] m3-on-surface-variant flex items-center gap-1.5">
            {Icon && <Icon size={10} />}
            {label}
        </label>
        <input
            {...props}
            className={`w-full border rounded-xl px-4 py-3 text-sm font-medium m3-on-surface placeholder-slate-300 m3-surface-container-low-bg focus:m3-surface-bg focus:outline-none focus:ring-2 transition-all duration-150
        ${error
                    ? "border-rose-300 focus:ring-rose-200 focus:border-rose-400"
                    : "m3-outline-variant-border focus:ring-blue-200 focus:border-blue-400 hover:m3-outline-border"
                }`}
        />
        {error && (
            <p className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold">
                <MdErrorOutline size={10} /> {error}
            </p>
        )}
    </div>
);

/* ─── Detail Row (View Mode) ─── */
const DetailRow = ({ icon: Icon, label, value, truncate = false }) => (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-slate-50 last:border-0 group hover:m3-surface-container-low-bg transition-colors duration-100">
        <div className="mt-0.5 p-2 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 flex-shrink-0 group-hover:border-blue-200 transition-colors">
            <Icon size={12} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] m3-on-surface-variant mb-1">{label}</p>
            <p className={`text-sm font-semibold m3-on-surface ${truncate ? "truncate" : "leading-relaxed"}`}>
                {value || <span className="m3-on-surface-variant font-normal italic text-xs">Not provided</span>}
            </p>
        </div>
    </div>
);

/* ─── Main Component ─── */
const CompanyDetails = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!ALLOWED_ROLES.includes(user?.role)) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingData, setExistingData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const EMPTY_FORM = {
        company_name: "", gst_number: "", email: "", phone: "",
        address_line_1: "", address_line_2: "", city: "", state: "",
        pincode: "", country: "", company_logo: "",
    };

    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    /* ── Fetch ── */
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
                setIsEditing(true);
            }
        } catch (err) {
            Swal.fire("Error", err.message || "Failed to load company details", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCompanyDetails(); }, [loadCompanyDetails]);

    /* ── Validate ── */
    const validate = () => {
        const e = {};
        if (!formData.company_name?.trim()) e.company_name = "Company name is required";
        if (!formData.email?.trim()) e.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(formData.email)) e.email = "Invalid email address";
        if (!formData.phone?.trim()) e.phone = "Phone is required";
        if (!formData.address_line_1?.trim()) e.address_line_1 = "Address line 1 is required";
        if (!formData.city?.trim()) e.city = "City is required";
        if (!formData.state?.trim()) e.state = "State is required";
        if (!formData.pincode?.trim()) e.pincode = "Pincode is required";
        if (!formData.country?.trim()) e.country = "Country is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!validate()) return;
        try {
            setSaving(true);
            const payload = { ...formData };
            if (existingData && existingData.company_address_id) {
                payload.company_address_id = existingData.company_address_id;
            }
            const res = await createOrUpdateCompanyAddress(payload);
            if (!res?.success) throw new Error(res?.message || "Failed to save");
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

    /* ── Cancel ── */
    const handleCancel = () => {
        if (!existingData) return;
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

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="min-h-screen m3-surface-container-low-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-10 h-10">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-sm m3-on-surface-variant font-medium animate-pulse">Loading company details…</p>
                </div>
            </div>
        );
    }

    /* ── Logo helper — falls back to /logo.png ── */
    const LogoBox = ({ src, className = "" }) => (
        <div className={`relative overflow-hidden m3-surface-bg border m3-outline-variant-border flex items-center justify-center ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt="Company logo"
                    className="w-full h-full object-contain p-1.5"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/logo.png";
                    }}
                />
            ) : (
                <img
                    src="/logo.png"
                    alt="Smart Enterprises"
                    className="sidebar-logo w-full h-full object-contain p-1.5"
                    onError={(e) => { e.target.style.display = "none"; }}
                />
            )}
        </div>
    );

    return (
        <div className="min-h-screen m3-surface-container-low-bg p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-5">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                                <MdWork size={13} className="text-blue-600" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] m3-on-surface-variant">
                                Organisation
                            </span>
                        </div>
                        <h1 className="text-xl font-bold m3-on-surface tracking-tight">Company Settings</h1>
                        <p className="text-xs m3-on-surface-variant font-medium mt-0.5">
                            {existingData
                                ? "Manage your organisation's profile and contact information"
                                : "Set up your company profile to get started"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {existingData && !isEditing && (
                            <>
                                <button
                                    onClick={loadCompanyDetails}
                                    title="Refresh"
                                    className="p-2.5 rounded-xl border m3-outline-variant-border m3-surface-bg m3-on-surface-variant hover:m3-on-surface hover:m3-outline-border hover:shadow-sm transition-all"
                                >
                                    <MdRefresh size={14} />
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 m3-solid-primary text-sm font-bold rounded-xl active:scale-95 transition-all shadow-sm shadow-blue-200"
                                >
                                    <MdEdit size={13} />
                                    Modify Details
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── VIEW MODE ── */}
                {existingData && !isEditing && (
                    <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm overflow-hidden">

                        {/* Company Banner */}
                        <div className="px-6 py-5 border-b m3-outline-variant-border m3-surface-container-low-bg">
                            <div className="flex items-center gap-5">
                                {/* Logo */}
                                <div className="relative flex-shrink-0">
                                    <LogoBox
                                        src={existingData.company_logo}
                                        className="w-16 h-16 rounded-2xl shadow-sm"
                                    />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center">
                                        <MdCheckCircle size={8} className="text-white" />
                                    </span>
                                </div>

                                {/* Name + GST */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold m3-on-surface truncate">
                                        {existingData.company_name}
                                    </p>
                                    {existingData.gst_number && (
                                        <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-wide">
                                            <MdShield size={9} />
                                            GST · {existingData.gst_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detail Rows */}
                        <div>
                            <DetailRow icon={MdMailOutline} label="Email Address" value={existingData.email} />
                            <DetailRow icon={MdPhone} label="Phone Number" value={existingData.phone} />
                            <DetailRow
                                icon={MdLocationOn}
                                label="Registered Address"
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
                                <DetailRow icon={MdPublic} label="Logo URL" value={existingData.company_logo} truncate />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t m3-outline-variant-border m3-surface-container-low-bg flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] font-semibold m3-on-surface-variant">
                                Last updated: {new Date(existingData.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* ── FORM (Create / Edit) ── */}
                {(isEditing || !existingData) && (
                    <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl shadow-sm overflow-hidden">

                        {/* Form Header */}
                        <div className="px-6 py-5 border-b m3-outline-variant-border m3-surface-container-low-bg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${existingData
                                    ? "bg-sky-50 text-sky-600 border-sky-100"
                                    : "bg-blue-50 text-blue-600 border-blue-100"
                                    }`}>
                                    {existingData ? <MdEdit size={14} /> : <MdAdd size={14} />}
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold m3-on-surface">
                                        {existingData ? "Update Company Details" : "Register Company Details"}
                                    </h2>
                                    <p className="text-[10px] font-semibold m3-on-surface-variant uppercase tracking-[0.1em] mt-0.5">
                                        {existingData ? "Edit and save your changes" : "Fill in your organisation information"}
                                    </p>
                                </div>
                            </div>
                            {existingData && (
                                <button
                                    onClick={handleCancel}
                                    className="p-2 rounded-lg m3-on-surface-variant hover:m3-on-surface-variant hover:m3-surface-container-high-bg transition-all"
                                >
                                    <MdClose size={15} />
                                </button>
                            )}
                        </div>

                        {/* Fields */}
                        <div className="px-6 py-6 space-y-5">

                            {/* Company + GST */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label="Company Name"
                                    icon={MdWork}
                                    placeholder="Smart Enterprises"
                                    value={formData.company_name}
                                    onChange={set("company_name")}
                                    error={errors.company_name}
                                />
                                <Field
                                    label="GST Number"
                                    icon={MdShield}
                                    placeholder="32ABCDE1234F1Z5"
                                    value={formData.gst_number}
                                    onChange={set("gst_number")}
                                    error={errors.gst_number}
                                />
                            </div>

                            {/* Email + Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label="Email Address"
                                    icon={MdMailOutline}
                                    type="email"
                                    placeholder="support@company.com"
                                    value={formData.email}
                                    onChange={set("email")}
                                    error={errors.email}
                                />
                                <Field
                                    label="Phone Number"
                                    icon={MdPhone}
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={set("phone")}
                                    error={errors.phone}
                                />
                            </div>

                            {/* Address Section Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px m3-surface-container-high-bg" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] m3-on-surface-variant flex items-center gap-1.5">
                                    <MdLocationOn size={8} /> Address
                                </span>
                                <div className="flex-1 h-px m3-surface-container-high-bg" />
                            </div>

                            <Field
                                label="Address Line 1"
                                icon={MdLocationOn}
                                placeholder="2nd Floor, Tech Park"
                                value={formData.address_line_1}
                                onChange={set("address_line_1")}
                                error={errors.address_line_1}
                            />
                            <Field
                                label="Address Line 2 (Optional)"
                                icon={MdLocationOn}
                                placeholder="Near Infopark"
                                value={formData.address_line_2}
                                onChange={set("address_line_2")}
                            />

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

                            {/* Branding Section Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px m3-surface-container-high-bg" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] m3-on-surface-variant flex items-center gap-1.5">
                                    <MdImage size={8} /> Branding
                                </span>
                                <div className="flex-1 h-px m3-surface-container-high-bg" />
                            </div>

                            {/* Logo URL + inline preview */}
                            <div className="flex items-end gap-4">
                                <Field
                                    label="Company Logo URL"
                                    icon={MdImage}
                                    className="flex-1"
                                    placeholder="https://cdn.example.com/logo.png"
                                    value={formData.company_logo}
                                    onChange={set("company_logo")}
                                />
                                {/* Preview box — always shows /logo.png as fallback */}
                                <div className="flex-shrink-0 mb-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] m3-on-surface-variant mb-1.5">Preview</p>
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border m3-outline-variant-border m3-surface-container-low-bg shadow-sm flex items-center justify-center">
                                        <img
                                            src={formData.company_logo || "/logo.png"}
                                            alt="Logo preview"
                                            className="w-full h-full object-contain p-1.5"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "/logo.png";
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 py-4 border-t m3-outline-variant-border m3-surface-container-low-bg flex gap-3">
                            {existingData && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 py-2.5 rounded-xl border m3-outline-variant-border m3-on-surface-variant text-sm font-semibold hover:m3-surface-container-low-bg transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl m3-solid-primary text-sm font-bold active:scale-95 transition-all shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <MdAutorenew size={14} className="animate-spin" />
                                ) : (
                                    <MdSave size={14} />
                                )}
                                {saving ? "Saving…" : existingData ? "Save Changes" : "Register Company"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Helper tip */}
                {!existingData && (
                    <p className="text-center text-[11px] m3-on-surface-variant font-medium">
                        This information will appear on invoices and official documents.
                    </p>
                )}

            </div>
        </div>
    );
};

export default CompanyDetails;