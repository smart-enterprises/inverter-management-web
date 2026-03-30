// orderDetails.jsx — Redesigned + PDF Generation

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiMail,
  FiBox,
  FiCalendar,
  FiTruck,
  FiCreditCard,
  FiDollarSign,
  FiEdit2,
  FiSave,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiShoppingCart,
  FiPackage,
  FiAlertCircle,
  FiTrendingUp,
  FiActivity,
  FiChevronRight,
  FiZap,
  FiLayers,
  FiTrendingDown,
  FiBarChart2,
  FiDownload,
  FiPrinter,
} from "react-icons/fi";
import Swal from "sweetalert2";
import CustomSelect from "../components/CustomSelect";
import { fetchOrderById, updateOrderStatus } from "../api/orders";

import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter } from "../utils/constants";
import { formatDealerDiscountNotes, formatStockNotes } from "../utils/notesUtils";
import {
  getStatusStyle,
  ORDER_STATUS_LIST,
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
} from "../utils/status";
import { useUpdateOrderPermissions } from "../hooks/useUpdateOrderPermissions";
import { formatDateForInput } from "../utils/dateUtils";
import { getAllowedNextStatuses } from "../utils/orderStatusHelper";
import { fetchCompanyAddress } from "../api/companyAddress";

/* ================================================================
   FORMAT HELPERS
   ================================================================ */
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "N/A";

const formatCurrency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;

/* ================================================================
   NORMALIZE ORDER
   ================================================================ */
const normalizeOrder = (order) => ({
  ...order,
  payment_method: order.payment_type || "",
  amount_paid: 0,
  delivered_date: order.delivered_date || "",
  delivery_note: order.delivery_note || "",
  order_details: order.order_details.map((detail) => ({
    ...detail,
    delivered_qty: "",
    cancel_qty: "",
    delivery_note: "",
    reason_for_cancellation: "",
    has_unPacked_completed: false,
    has_production_completed: false,
  })),
});

/* ================================================================
   STATUS STYLE HELPERS
   ================================================================ */
const getPriorityStyle = (priority) => {
  const map = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return map[priority?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

const getOrderStatusStyle = (status) => {
  const map = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-indigo-50 text-indigo-700 border-indigo-200",
    PACKED: "bg-violet-50 text-violet-700 border-violet-200",
    INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
    SHIPPED: "bg-orange-50 text-orange-700 border-orange-200",
    DELIVERED: "bg-green-50 text-green-700 border-green-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

const getPaymentStatusStyle = (status) => {
  const map = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UNPAID: "bg-rose-50 text-rose-700 border-rose-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    REFUNDED: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return map[status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

const getPaymentTypeStyle = (type) => {
  const map = {
    CASH: "bg-emerald-50 text-emerald-700 border-emerald-200",
    BANK: "bg-blue-50 text-blue-700 border-blue-200",
    CHEQUE: "bg-amber-50 text-amber-700 border-amber-200",
    ONLINE: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return map[type?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

/* ================================================================
   PDF GENERATION UTILITY
   Generates a professional order invoice PDF using browser print API
   ================================================================ */
const generateOrderPDF = (order, companyInfo, userMap) => {
  console.log("order", order);
  console.log("companyInfo", companyInfo);
  console.log("userMap", userMap);
  const company = companyInfo || {};
  const totalAmount = Number(order?.order_total_price ?? 0);
  const discountAmount = Number(order?.order_total_discount ?? 0);
  const grossAmount = totalAmount + discountAmount;
  const amountDue = Number(order?.amount_due ?? 0);

  const statusColors = {
    PENDING: "#d97706",
    CONFIRMED: "#2563eb",
    PRODUCTION: "#4f46e5",
    PACKED: "#7c3aed",
    INVOICE: "#0891b2",
    SHIPPED: "#ea580c",
    DELIVERED: "#16a34a",
    COMPLETED: "#059669",
    CANCELLED: "#e11d48",
    REJECTED: "#e11d48",
  };
  const statusColor = statusColors[order?.status?.toUpperCase()] || "#64748b";

  const paymentStatusColors = {
    PAID: "#059669",
    UNPAID: "#e11d48",
    PARTIAL: "#d97706",
    REFUNDED: "#2563eb",
  };
  const paymentColor = paymentStatusColors[order?.payment_status?.toUpperCase()] || "#64748b";

  const itemsHTML = (order?.order_details || [])
    .map((d, i) => {
      const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
      const delivered = Number(d.qty_delivered ?? 0);
      const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
      const hasDiscount = !d.is_free && d.total_dealer_discount && d.total_dealer_discount > 0;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";

      return `
        <tr style="background:${bg};">
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:700; color:#0f172a; font-size:12px;">${capitalizeFirstLetter(d.product_name)}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">${capitalizeFirstLetter(d.product_brand || "")} · ${capitalizeFirstLetter(d.product_model || "")} · <span style="font-family:monospace;">${d.product_id}</span></div>
            ${d.is_free ? `<span style="font-size:9px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:1px 6px; border-radius:20px; font-weight:700;">FREE ITEM</span>` : ""}
          </td>
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center; font-weight:700; color:#0f172a; font-size:13px;">${totalOrdered}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center; font-size:11px; color:#94a3b8;">${delivered} / ${cancelled}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:12px; color:#334155;">₹${Number(d.unit_product_price || 0).toLocaleString("en-IN")}</td>
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:right;">
            ${d.is_free
          ? `<span style="font-size:11px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:2px 8px; border-radius:20px; font-weight:700;">FREE</span>`
          : `<div style="font-weight:800; color:#0f172a; font-size:13px;">₹${Number(d.total_price || 0).toLocaleString("en-IN")}</div>
                 ${hasDiscount ? `<div style="font-size:10px; color:#10b981; margin-top:2px;">− ₹${Number(d.total_dealer_discount).toLocaleString("en-IN")} disc.</div>` : ""}`
        }
          </td>
          <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">
            <span style="font-size:9px; font-weight:700; padding:2px 8px; border-radius:20px; background:${statusColors[d?.status?.toUpperCase()] || "#64748b"}20; color:${statusColors[d?.status?.toUpperCase()] || "#64748b"}; border:1px solid ${statusColors[d?.status?.toUpperCase()] || "#64748b"}40; text-transform:uppercase; letter-spacing:0.05em;">${d.status || "—"}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order ${order?.order_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #0f172a; font-size: 13px; line-height: 1.5; }
    .page { max-width: 820px; margin: 0 auto; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
    .company-block { flex: 1; }
    .company-name { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
    .company-gst { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 2px; letter-spacing: 0.05em; text-transform: uppercase; }
    .company-contact { margin-top: 8px; font-size: 11px; color: #64748b; line-height: 1.6; }
    .order-block { text-align: right; }
    .order-number { font-size: 22px; font-weight: 900; color: #4f46e5; font-family: monospace; letter-spacing: -0.02em; }
    .order-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
    .order-date { font-size: 11px; color: #64748b; margin-top: 4px; }
    .badges { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    .badge { font-size: 9px; font-weight: 800; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.08em; border: 1px solid; }
    .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .info-card-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 6px; }
    .info-card-value { font-size: 13px; font-weight: 700; color: #0f172a; }
    .info-card-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .items-table thead tr { background: #f1f5f9; }
    .items-table thead th { padding: 10px 12px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .items-table thead th:nth-child(2), .items-table thead th:nth-child(3) { text-align: center; }
    .items-table thead th:nth-child(4), .items-table thead th:nth-child(5) { text-align: right; }
    .items-table thead th:nth-child(6) { text-align: center; }
    .financial-block { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .financial-card { width: 320px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .financial-card-header { background: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
    .financial-row { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 16px; border-bottom: 1px solid #f1f5f9; }
    .financial-row:last-child { border-bottom: none; }
    .financial-label { font-size: 12px; color: #64748b; font-weight: 500; }
    .financial-value { font-size: 13px; font-weight: 700; color: #0f172a; }
    .financial-total-row { background: #f8fafc; padding: 12px 16px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: baseline; }
    .financial-total-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; }
    .financial-total-value { font-size: 20px; font-weight: 900; color: #0f172a; }
    .balance-row { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer-note { font-size: 10px; color: #94a3b8; font-weight: 500; }
    .footer-company { font-size: 11px; font-weight: 700; color: #64748b; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="company-block">
      ${company.company_logo ? `<img src="${company.company_logo}" alt="Logo" style="height:40px; margin-bottom:8px; object-fit:contain;" onerror="this.style.display='none'"/>` : ""}
      <div class="company-name">${company.company_name || "Company"}</div>
      ${company.gst_number ? `<div class="company-gst">GST: ${company.gst_number}</div>` : ""}
      <div class="company-contact">
        ${[company.address_line_1, company.address_line_2, company.city, company.state, company.pincode, company.country].filter(Boolean).join(", ")}
        ${company.phone ? `<br/>📞 ${company.phone}` : ""}
        ${company.email ? ` &nbsp;·&nbsp; ✉ ${company.email}` : ""}
      </div>
    </div>
    <div class="order-block">
      <div class="order-label">Order Invoice</div>
      <div class="order-number">${order?.order_number}</div>
      <div class="order-date">Created: ${formatDate(order?.created_at)}</div>
      <div class="badges">
        <span class="badge" style="background:${statusColor}18; color:${statusColor}; border-color:${statusColor}40;">${order?.status}</span>
        <span class="badge" style="background:${paymentColor}18; color:${paymentColor}; border-color:${paymentColor}40;">${order?.payment_status}</span>
        ${order?.priority ? `<span class="badge" style="background:#f1f5f9; color:#64748b; border-color:#e2e8f0;">${order.priority}</span>` : ""}
      </div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-label">Dealer</div>
      <div class="info-card-value">${capitalizeFirstLetter(order?.dealer?.employee_name) || "—"}</div>
      <div class="info-card-sub">${capitalizeFirstLetter(order?.dealer?.shop_name) || ""}</div>
      <div class="info-card-sub" style="margin-top:4px; font-size:10px; color:#94a3b8;">
        ${[order?.dealer?.employee_phone, order?.dealer?.employee_email].filter(Boolean).join("  ·  ")}
      </div>
      ${order?.dealer?.address ? `<div class="info-card-sub" style="margin-top:4px; font-size:10px;">${capitalizeFirstLetter(order.dealer.address)}</div>` : ""}
    </div>
    <div class="info-card">
      <div class="info-card-label">Order Details</div>
      <div class="info-card-sub" style="display:flex; flex-direction:column; gap:4px;">
        <span><strong>Salesman:</strong> ${userMap[order?.salesman_id] || order?.salesman_id || "—"}</span>
        <span><strong>Created by:</strong> ${userMap[order?.created_by] || order?.created_by || "—"}</span>
        <span><strong>Delivery by:</strong> ${order?.promised_delivery_date ? formatDate(order.promised_delivery_date) : "N/A"}</span>
        <span><strong>Payment type:</strong> ${order?.payment_type || "—"}</span>
      </div>
    </div>
  </div>

  ${order?.order_note ? `
  <div style="margin-bottom:20px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;">
    <div class="section-title" style="color:#b45309;">Order Note</div>
    <div style="font-size:12px; color:#78350f;">${order.order_note}</div>
  </div>
  ` : ""}

  <!-- ITEMS TABLE -->
  <div class="section-title">Order Items</div>
  <table class="items-table">
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Delivered / Cancelled</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
        <th style="text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <!-- FINANCIAL SUMMARY -->
  <div class="financial-block">
    <div class="financial-card">
      <div class="financial-card-header">Financial Summary</div>
      <div class="financial-row">
        <span class="financial-label">Gross Total</span>
        <span class="financial-value">₹${grossAmount.toLocaleString("en-IN")}</span>
      </div>
      ${discountAmount > 0 ? `
      <div class="financial-row">
        <span class="financial-label" style="color:#10b981;">Total Discount</span>
        <span class="financial-value" style="color:#10b981;">− ₹${discountAmount.toLocaleString("en-IN")}</span>
      </div>` : ""}
      <div class="financial-total-row">
        <span class="financial-total-label">Net Payable</span>
        <span class="financial-total-value">₹${totalAmount.toLocaleString("en-IN")}</span>
      </div>
      ${amountDue > 0 ? `
      <div class="balance-row" style="background:#fff1f2;">
        <div>
          <div style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#e11d48;">Balance Due</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:1px;">To be collected</div>
        </div>
        <span style="font-size:18px; font-weight:900; color:#e11d48;">₹${amountDue.toLocaleString("en-IN")}</span>
      </div>` : `
      <div class="balance-row" style="background:#f0fdf4;">
        <div>
          <div style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#16a34a;">Fully Paid</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:1px;">No dues remaining</div>
        </div>
        <span style="font-size:18px; font-weight:900; color:#16a34a;">₹0</span>
      </div>`}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-note">
      Generated on ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
    </div>
    <div class="footer-company">${company.company_name || ""}</div>
  </div>

</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    Swal.fire({
      icon: "warning",
      title: "Popup Blocked",
      text: "Please allow popups for this site to download the PDF.",
    });
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
};

/* ================================================================
   INFO ROW
   ================================================================ */
const Info = ({ icon, label, children }) => (
  <div className="flex items-start gap-3.5 px-5 py-4 rounded-xl hover:bg-slate-50/60 transition-colors group">
    <div className="mt-0.5 p-2 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100 group-hover:border-indigo-200 transition-colors flex-shrink-0">
      {React.cloneElement(icon, { size: 13 })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-800 leading-relaxed">
        {children || <span className="text-slate-300 font-normal">—</span>}
      </div>
    </div>
  </div>
);

/* ================================================================
   NOTES CARD
   ================================================================ */
const NotesCard = ({ title, notes, color }) => (
  <div
    className={`mt-3 border rounded-xl p-3.5 ${color === "purple"
      ? "bg-indigo-50/60 border-indigo-100 text-indigo-600"
      : "bg-slate-50 border-slate-100 text-slate-500"
      }`}
  >
    <p className="text-[9px] font-black uppercase tracking-[0.12em] mb-2 opacity-70">
      {title}
    </p>
    <ul className="space-y-1.5 text-xs text-slate-700">
      {notes.map((note, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
          {note.replace(
            /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/,
            (match) => formatDate(match)
          )}
        </li>
      ))}
    </ul>
  </div>
);

/* ================================================================
   FORM FIELD WRAPPER
   ================================================================ */
const FormField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
      {label}
    </label>
    {children}
  </div>
);

/* ================================================================
   STYLED INPUT (for edit fields)
   ================================================================ */
const EditInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
  />
);

/* ================================================================
   CHECKBOX FIELD
   ================================================================ */
const CheckboxField = ({ label, checked, onChange, disabled }) => (
  <label
    className={`group flex items-center gap-3 text-sm cursor-pointer px-4 py-2.5 rounded-xl border transition-all ${checked
      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="accent-indigo-600 w-4 h-4"
    />
    <span className="font-semibold">{label}</span>
    {checked && <FiCheckCircle size={13} className="ml-auto text-indigo-500" />}
  </label>
);

/* ================================================================
   SECTION CARD
   ================================================================ */
const SectionCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  editHighlight = false,
}) => (
  <section
    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${editHighlight ? "border-indigo-200 ring-1 ring-indigo-100" : "border-slate-200"
      } ${className}`}
  >
    {(title || action) && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </section>
);

/* ================================================================
   STAT PILL
   ================================================================ */
const StatPill = ({ label, value, color = "gray" }) => {
  const colorMap = {
    gray: "text-slate-700",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
  };
  return (
    <div className="flex-1 px-4 py-3 border-r last:border-0 border-slate-100">
      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black mb-1">
        {label}
      </p>
      <p className={`text-lg font-black tabular-nums ${colorMap[color] || colorMap.gray}`}>
        {value}
      </p>
    </div>
  );
};

/* ================================================================
   FINANCIAL SUMMARY
   ================================================================ */
const FinancialSummary = ({ order }) => {
  const totalAmount = Number(order?.order_total_price ?? 0);
  const discountAmount = Number(order?.order_total_discount ?? 0);
  const grossAmount = totalAmount + discountAmount;
  const netPayable = totalAmount;
  const amountReceived = Number(order?.amount_paid ?? 0);
  const outstandingBalance = Number(
    order?.amount_due ?? netPayable - amountReceived
  );
  const isPaid = outstandingBalance <= 0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <FiBarChart2 size={14} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Bill Breakdown</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">
              Financial Overview
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider ${order.payment_status === "PAID"
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : order.payment_status === "PARTIAL"
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-rose-50 text-rose-600 border-rose-200"
            }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${order.payment_status === "PAID"
              ? "bg-emerald-500"
              : order.payment_status === "PARTIAL"
                ? "bg-amber-500"
                : "bg-rose-500"
              }`}
          />
          {order.payment_status}
        </span>
      </div>

      <div className="px-6 py-5">
        <div className="max-w-md ml-auto space-y-0 divide-y divide-slate-50">
          <div className="flex justify-between items-center py-3">
            <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center">
                <FiLayers size={9} className="text-slate-400" />
              </span>
              Gross Total
            </span>
            <span className="text-sm font-bold text-slate-700">{formatCurrency(grossAmount)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between items-center py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className="w-4 h-4 rounded-md bg-rose-50 flex items-center justify-center">
                  <FiTrendingDown size={9} className="text-rose-400" />
                </span>
                Savings
              </span>
              <span className="text-sm font-bold text-rose-500">
                − {formatCurrency(discountAmount)}
              </span>
            </div>
          )}

          <div className="py-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                You Pay
              </span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {formatCurrency(netPayable)}
              </span>
            </div>
          </div>

          {amountReceived > 0 && (
            <div className="flex justify-between items-center py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <span className="w-4 h-4 rounded-md bg-indigo-50 flex items-center justify-center">
                  <FiCreditCard size={9} className="text-indigo-400" />
                </span>
                Paid Now
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {formatCurrency(amountReceived)}
              </span>
            </div>
          )}

          <div className="pt-3">
            <div
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${isPaid
                ? "bg-emerald-50/80 border-emerald-200"
                : "bg-rose-50/80 border-rose-200"
                }`}
            >
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.1em] ${isPaid ? "text-emerald-600" : "text-rose-500"
                    }`}
                >
                  {isPaid ? "Fully Paid" : "Balance Due"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {isPaid ? "No dues remaining" : "To be collected"}
                </p>
              </div>
              <span
                className={`text-xl font-black tabular-nums ${isPaid ? "text-emerald-600" : "text-rose-600"
                  }`}
              >
                {formatCurrency(Math.abs(outstandingBalance))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ================================================================
   UPDATE FINANCIAL PANEL (edit mode)
   ================================================================ */
const UpdateFinancialSummary = ({ order, amountPaid }) => (
  <section className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
    <div className="flex justify-end p-6">
      <div className="w-full sm:w-[400px] bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Financial Summary
          </h3>
          <span
            className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${order.payment_status === "PAID"
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : order.payment_status === "PARTIAL"
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-rose-50 text-rose-600 border-rose-200"
              }`}
          >
            {order.payment_status}
          </span>
        </div>
        <div className="px-5 py-5 space-y-3.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Total Order Value</span>
            <span className="text-slate-900 font-bold">
              ₹ {order.order_total_price?.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Amount Paid</span>
            <span className="text-emerald-600 font-bold">
              ₹ {amountPaid?.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="border-t border-dashed border-slate-200" />
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-bold text-slate-700">Balance Due</span>
            <span className="text-2xl font-black text-indigo-700 tabular-nums">
              ₹ {order.amount_due?.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ================================================================
   MAIN COMPONENT — OrderDetails
   ================================================================ */
const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ── PDF state ── */
  const [companyInfo, setCompanyInfo] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);

  const permissions = useUpdateOrderPermissions();

  /* ---- Open edit mode if navigated from Orders list with state ---- */
  useEffect(() => {
    if (location.state?.openEditMode) {
      setIsEditMode(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const isCompleted = editOrder?.status === "COMPLETED";
  const isDelivered = editOrder?.status === "DELIVERED";
  const isCancelled = editOrder?.status === "CANCELLED";
  const isOrderLocked = isCompleted || isDelivered || isCancelled;
  const isPaymentFullyDone =
    Number(editOrder?.order_total_price || 0) === Number(amountPaid || 0);
  const isOrderDeliveryDateChanged =
    !!editOrder?.promised_delivery_date &&
    !!originalOrder &&
    editOrder.promised_delivery_date !== originalOrder.promised_delivery_date;

  /* ---- FETCH USERS ---- */
  const fetchUsersForCreatedByMap = useCallback(async () => {
    try {
      const response = await fetchUsers({
        page: 1,
        limit: 500,
        status: "active",
        includePassword: false,
        includeDealers: false,
      });
      if (response?.success && Array.isArray(response?.data?.employees)) {
        const mappedUsers = response.data.employees.reduce((acc, user) => {
          if (user?.employee_id) {
            acc[user.employee_id] = capitalizeFirstLetter(user.employee_name);
          }
          return acc;
        }, {});
        setUserMap(mappedUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  /* ---- FETCH ORDER ---- */
  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchOrderById(id);
      if (response?.success && response?.data?.order) {
        const fetched = response.data.order;
        setOrder(fetched);
        setAmountPaid(fetched?.amount_paid ?? 0);
        const normalized = normalizeOrder(fetched);
        setEditOrder(normalized);
        setOriginalOrder(normalized);
      } else {
        setError(response?.message || "Failed to load order");
      }
    } catch (err) {
      console.error("Order fetch error:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ✅ Fix validator (handle empty object correctly)
  const isValidCompany = (data) => {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Object.keys(data).length > 0
    );
  };

  /* ---- FETCH COMPANY (lazy — only when PDF requested) ---- */
  const loadCompanyAndGeneratePDF = useCallback(async () => {
    if (!order) return;

    setPdfLoading(true);

    try {
      let company = companyInfo;

      if (!isValidCompany(company)) {
        const res = await fetchCompanyAddress();

        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          company = res.data[0];
          setCompanyInfo(company);
        }
      }

      generateOrderPDF(order, company, userMap);
    } catch (err) {
      console.error("PDF generation error:", err);
      Swal.fire({
        icon: "error",
        title: "PDF Generation Failed",
        text: err.message || "Could not fetch company details. Please try again.",
      });
    } finally {
      setPdfLoading(false);
    }
  }, [order, companyInfo, userMap]);

  useEffect(() => {
    loadOrder();
    fetchUsersForCreatedByMap();
  }, [loadOrder, fetchUsersForCreatedByMap]);

  const totalItems = useMemo(() => {
    if (!Array.isArray(order?.order_details)) return 0;
    return order.order_details.reduce(
      (sum, item) => sum + Number(item?.total_qty_ordered ?? 0),
      0
    );
  }, [order]);

  /* ---- FIELD HANDLERS ---- */
  const updateOrderField = (field, value) =>
    setEditOrder((prev) => ({ ...prev, [field]: value }));

  const updateDetailField = (index, field, value) => {
    setEditOrder((prev) => {
      const updated = [...prev.order_details];
      const current = updated[index];
      const updatedDetail = { ...current, [field]: value, __isModified: true };
      if (field === "has_unPacked_completed" && value) updatedDetail.has_production_completed = false;
      if (field === "has_production_completed" && value) updatedDetail.has_unPacked_completed = false;
      updated[index] = updatedDetail;
      return { ...prev, order_details: updated };
    });
  };

  const handleDiscardEdit = () => {
    if (order) setEditOrder(normalizeOrder(order));
    setIsEditMode(false);
  };

  /* ---- PAYLOAD BUILDER ---- */
  const buildPayload = useMemo(() => {
    if (!editOrder || !originalOrder) return null;
    const payload = { order_number: editOrder.order_number };
    ["status", "priority", "payment_method"].forEach((field) => {
      if (editOrder[field] !== originalOrder[field]) payload[field] = editOrder[field];
    });
    if (Number(editOrder.amount_paid) > 0) payload.amount_paid = Number(editOrder.amount_paid);
    const isDateChanged =
      editOrder.promised_delivery_date &&
      editOrder.promised_delivery_date !== originalOrder.promised_delivery_date;
    if (isDateChanged) payload.delivery_date = new Date(editOrder.promised_delivery_date).toISOString();
    if (isDateChanged && editOrder.delivery_note?.trim()) payload.delivery_note = editOrder.delivery_note.trim();
    const updatedDetails = editOrder.order_details
      .map((detail, index) => {
        const originalDetail = originalOrder.order_details[index];
        const item = { order_details_number: detail.order_details_number };
        let hasChanges = false;
        const assignIfChanged = (key, current, previous) => {
          if (current !== previous) { item[key] = current; hasChanges = true; }
        };
        assignIfChanged("status", detail.status, originalDetail.status);
        const deliveredQty = Number(detail.delivered_qty);
        const originalDeliveredQty = Number(originalDetail.qty_delivered || 0);
        const hasQtyChanged = deliveredQty > 0 && deliveredQty !== originalDeliveredQty;
        const hasDateChanged = detail.delivery_date && detail.delivery_date !== originalDetail.delivery_date;
        if (hasQtyChanged) { item.delivered_qty = deliveredQty; hasChanges = true; }
        if (hasQtyChanged || hasDateChanged) { item.delivered_date = new Date(detail.delivery_date).toISOString(); hasChanges = true; }
        if (hasDateChanged && detail.delivery_note?.trim()) { item.delivery_note = detail.delivery_note.trim(); hasChanges = true; }
        const cancelQty = Number(detail.cancel_qty);
        const originalCancelQty = Number(originalDetail.total_cancelled_qty || 0);
        const hasCancelChanged = cancelQty > 0 && cancelQty !== originalCancelQty;
        if (hasCancelChanged) { item.cancel_qty = cancelQty; hasChanges = true; }
        if (hasCancelChanged && detail.reason_for_cancellation?.trim()) { item.reason_for_cancellation = detail.reason_for_cancellation.trim(); hasChanges = true; }
        assignIfChanged("has_unPacked_completed", detail.has_unPacked_completed, originalDetail.has_unPacked_completed);
        assignIfChanged("has_production_completed", detail.has_production_completed, originalDetail.has_production_completed);
        return hasChanges ? item : null;
      })
      .filter(Boolean);
    if (updatedDetails.length > 0) payload.order_details = updatedDetails;
    return payload;
  }, [editOrder, originalOrder]);

  /* ---- SUBMIT ---- */
  const handleSubmit = async () => {
    if (!buildPayload) return;
    if (!buildPayload.status && !buildPayload.priority && !buildPayload.delivery_date && !buildPayload.amount_paid && !buildPayload.payment_method && !buildPayload.order_details) {
      return Swal.fire({ icon: "info", title: "No Changes Detected" });
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(editOrder.order_number, buildPayload);
      if (res?.success) {
        await Swal.fire({ icon: "success", title: "Order Updated Successfully" });
        await loadOrder();
        setIsEditMode(false);
      } else {
        setError(res?.message || "Update failed");
      }
    } catch {
      setError("Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================================================
     UI STATES
     ================================================================ */
  if (loading)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Loading order details…</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
          <FiAlertCircle size={24} className="text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-rose-600">{error}</p>
      </div>
    );

  if (!order)
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-slate-400">Order not found</p>
      </div>
    );

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-screen-xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex items-start sm:items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group flex-shrink-0"
        >
          <FiArrowLeft size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
        </button>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Order <span className="text-indigo-600 font-mono">{order?.order_number}</span>
              </h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getPriorityStyle(order?.priority)}`}>
                {order?.priority || "Normal"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(order?.status)}`}>
                {order?.status || "Unknown"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Created {order?.created_at ? formatDate(order.created_at) : "—"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* ── PDF / Print Button ── */}
            <button
              type="button"
              onClick={loadCompanyAndGeneratePDF}
              disabled={pdfLoading}
              title="Download / Print PDF Invoice"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {pdfLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FiPrinter size={13} />
                  Print / PDF
                </>
              )}
            </button>

            {!isEditMode ? (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                disabled={isOrderLocked && isPaymentFullyDone}
                title={isOrderLocked && isPaymentFullyDone ? "Completed orders cannot be edited" : "Edit this order"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
              >
                <FiEdit2 size={13} />
                Edit Order
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
                >
                  <FiSave size={13} />
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardEdit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                >
                  <FiX size={13} />
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm font-semibold">
          <div className="p-1.5 bg-indigo-100 rounded-lg flex-shrink-0">
            <FiZap size={12} className="text-indigo-600" />
          </div>
          You're in <strong className="font-black mx-1">Edit Mode</strong> — make your changes and click{" "}
          <strong className="font-black ml-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* ── ORDER SUMMARY ── */}
      <SectionCard title="Order Summary" subtitle="Overview">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
          <Info icon={<FiCalendar />} label="Created">{formatDate(order?.created_at)}</Info>
          <Info icon={<FiCalendar />} label="Updated">{formatDate(order?.updated_at)}</Info>
          <Info icon={<FiTruck />} label="Promised Delivery">{formatDate(order?.promised_delivery_date)}</Info>
          <Info icon={<FiCreditCard />} label="Payment Status">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getPaymentStatusStyle(order?.payment_status)}`}>
              {order?.payment_status || "Unknown"}
            </span>
          </Info>
          <Info icon={<FiCreditCard />} label="Payment Type">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getPaymentTypeStyle(order?.payment_type)}`}>
              {order?.payment_type || "Unknown"}
            </span>
          </Info>
          <Info icon={<FiCalendar />} label="Last Payment">{formatDate(order?.last_payment_date)}</Info>
          <Info icon={<FiUser />} label="Salesman">
            <div className="flex flex-col">
              <span>{userMap[order?.salesman_id] || "Unknown"}</span>
              {order?.salesman_id && (
                <span className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{order?.salesman_id}</span>
              )}
            </div>
          </Info>
          <Info icon={<FiUser />} label="Created By">
            <div className="flex flex-col">
              <span>{userMap[order?.created_by] || "Unknown"}</span>
              {order?.created_by && (
                <span className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{order?.created_by}</span>
              )}
            </div>
          </Info>
        </div>
        {order?.order_note && (
          <div className="mt-5 mx-2 pt-5 border-t border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">
              Order Note
            </p>
            <p className="text-sm text-slate-700 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
              {order.order_note}
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── EDIT MODE — ORDER-LEVEL FIELDS ── */}
      {isEditMode && editOrder && (
        <section className="bg-white border border-indigo-200 rounded-2xl shadow-sm ring-1 ring-indigo-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50/40">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-indigo-500 mb-1">
                Editing
              </p>
              <p className="text-sm font-black text-slate-900 font-mono">{editOrder.order_number}</p>
            </div>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg font-black uppercase tracking-wide">
              ✏ Edit Mode Active
            </span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <FormField label="Order Status">
                <CustomSelect
                  value={editOrder.status}
                  disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("status"))}
                  onChange={(e) => {
                    if (permissions.restrictStatusToDelivered && e.target.value !== "DELIVERED") return;
                    updateOrderField("status", e.target.value);
                  }}
                  options={permissions.restrictStatusToDelivered ? ["DELIVERED"] : getAllowedNextStatuses(editOrder.status)}
                />
              </FormField>
              <FormField label="Priority">
                <CustomSelect
                  value={editOrder.priority}
                  disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("priority"))}
                  onChange={(e) => updateOrderField("priority", e.target.value)}
                  options={PRIORITY_OPTIONS}
                />
              </FormField>
              <FormField label="Payment Method">
                <CustomSelect
                  value={editOrder.payment_method}
                  disabled={isPaymentFullyDone || (!permissions.canEditAll && !permissions.editableFields?.includes("payment_method"))}
                  onChange={(e) => updateOrderField("payment_method", e.target.value)}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </FormField>
              <FormField label="Amount Paid">
                <EditInput
                  type="number"
                  disabled={isPaymentFullyDone || (!permissions.canEditAll && !permissions.editableFields?.includes("amount_paid"))}
                  min={0}
                  max={Number(editOrder?.order_total_price || 0) - amountPaid}
                  value={editOrder.amount_paid === 0 ? "" : editOrder.amount_paid}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : Number(e.target.value);
                    if (value <= Number(editOrder?.order_total_price || 0) - amountPaid) updateOrderField("amount_paid", value);
                  }}
                  placeholder="Enter paid amount"
                />
              </FormField>
              <FormField label="Delivered Date">
                <EditInput
                  type="datetime-local"
                  value={formatDateForInput(editOrder.promised_delivery_date)}
                  disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("promised_delivery_date"))}
                  onChange={(e) => updateOrderField("promised_delivery_date", e.target.value)}
                />
              </FormField>
              {isOrderDeliveryDateChanged && (
                <FormField label="Delivery Note">
                  <EditInput
                    type="text"
                    disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("delivery_note"))}
                    onChange={(e) => updateOrderField("delivery_note", e.target.value)}
                    placeholder="Reason for delivery update"
                  />
                </FormField>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── DEALER INFORMATION ── */}
      <SectionCard title="Dealer Information" subtitle="Profile">
        <div className="grid sm:grid-cols-2 gap-1">
          <Info icon={<FiUser />} label="Dealer Name">
            {order?.dealer?.employee_name ? capitalizeFirstLetter(order.dealer.employee_name) : null}
          </Info>
          <Info icon={<FiBox />} label="Shop Name">
            {order?.dealer?.shop_name ? capitalizeFirstLetter(order.dealer.shop_name) : null}
          </Info>
          <Info icon={<FiMail />} label="Email">{order?.dealer?.employee_email}</Info>
          <Info icon={<FiPhone />} label="Phone">{order?.dealer?.employee_phone}</Info>
          <Info icon={<FiMapPin />} label="Address">
            {order?.dealer?.address ? capitalizeFirstLetter(order.dealer.address) : null}
          </Info>
        </div>
      </SectionCard>

      {/* ── ORDER ITEMS ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Order Items</h2>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">Products</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
            <FiPackage size={10} />
            {totalItems} {totalItems === 1 ? "Unit" : "Units"}
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/60 border-b border-slate-100">
              <tr>
                {["Product", "Quantity", "Unit Price", "Total", "Status", ...(isEditMode ? ["Edit"] : [])].map((h, i) => (
                  <th key={i} className={`px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 ${i === 0 ? "text-left" : i === 1 ? "text-center" : "text-right"} ${isEditMode && i === 5 ? "text-center text-indigo-400" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.order_details?.map((d, index) => {
                const stockNotes = formatStockNotes(d.notes);
                const discountNotes = formatDealerDiscountNotes(d.notes);
                const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
                const delivered = Number(d.qty_delivered ?? 0);
                const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
                const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
                const hasDiscount = !d.is_free && d.total_dealer_discount && d.total_dealer_discount > 0;
                const editDetail = editOrder?.order_details?.[index];
                const isLocked = d.status === "COMPLETED" || d.status === "DELIVERED" || d.status === "CANCELLED";
                const maxDeliverableQty = balanceQty;
                const maxCancelableQty = balanceQty;
                const isDeliveryDateChanged = editDetail?.delivery_date && originalOrder?.order_details?.[index] && editDetail.delivery_date !== originalOrder.order_details[index].delivery_date;
                const isCancelQtyChanged = Number(editDetail?.cancel_qty || 0) >= 1;
                const { hasUnpacked, hasProduction } = d.stock_flags || {};
                const showCompletion = isEditMode && !isLocked && (hasUnpacked || hasProduction);
                const progressPct = totalOrdered > 0 ? Math.min(((delivered + cancelled) / totalOrdered) * 100, 100) : 0;

                return (
                  <React.Fragment key={d.order_details_number}>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      {/* Product */}
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{capitalizeFirstLetter(d.product_name)}</span>
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {d.product_id}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            {capitalizeFirstLetter(d.product_brand)} · {capitalizeFirstLetter(d.product_model)}
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {d.is_free && (
                              <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                Free Item
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wide ${d.is_free ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {d.is_free ? "Scheme" : "Regular"}
                            </span>
                          </div>
                          {stockNotes?.length > 0 && <NotesCard title="Stock Notes" color="gray" notes={stockNotes} />}
                          {discountNotes?.length > 0 && <NotesCard title="Dealer Discount Notes" color="purple" notes={discountNotes} />}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-5 align-middle">
                        <div className="min-w-[190px] bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-slate-300 hover:shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-2.5">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Ordered</p>
                              <p className="text-xl font-black text-slate-900 tabular-nums">{totalOrdered}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Balance</p>
                              <p className={`text-xl font-black tabular-nums ${balanceQty === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                {balanceQty}
                              </p>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${balanceQty === 0 ? "bg-emerald-500" : "bg-indigo-500"}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2.5">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Delivered</p>
                              <p className="text-sm font-bold text-emerald-600 tabular-nums">{delivered}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Cancelled</p>
                              <p className="text-sm font-bold text-rose-600 tabular-nums">{cancelled}</p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-5 text-right whitespace-nowrap align-middle">
                        <span className="text-sm font-bold text-slate-700">{formatCurrency(d.unit_product_price)}</span>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-5 text-right whitespace-nowrap align-middle">
                        {d.is_free ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                            FREE
                          </span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {hasDiscount && Number(d.total_product_price) > 0 && (
                              <span className="text-xs text-slate-400 line-through tabular-nums">{formatCurrency(d.total_product_price)}</span>
                            )}
                            {Number(d.total_price) > 0 && (
                              <span className="text-sm font-black text-slate-900 tabular-nums">{formatCurrency(d.total_price)}</span>
                            )}
                            {hasDiscount && Number(d.total_dealer_discount) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                − {formatCurrency(d.total_dealer_discount)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5 text-center align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(d?.status)}`}>
                          {d?.status || "Unknown"}
                        </span>
                      </td>

                      {isEditMode && <td />}
                    </tr>

                    {/* ---- INLINE EDIT ROW ---- */}
                    {isEditMode && editDetail && (
                      <tr className="bg-indigo-50/20">
                        <td colSpan={6} className="px-6 py-5 border-t border-indigo-100">
                          <div className="space-y-4">
                            {/* Quick Stats */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                              <div className="flex divide-x divide-slate-100">
                                <StatPill label="Total Ordered" value={totalOrdered} color="gray" />
                                <StatPill label="Delivered" value={delivered} color="emerald" />
                                <StatPill label="Cancelled" value={cancelled} color="rose" />
                                <StatPill label="Balance" value={balanceQty} color="amber" />
                              </div>
                              <div className="px-4 pb-3 pt-1">
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
                                </div>
                              </div>
                            </div>

                            {/* Editable Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              <FormField label="Status">
                                <CustomSelect
                                  value={editDetail.status}
                                  disabled={isLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("status"))}
                                  onChange={(e) => updateDetailField(index, "status", e.target.value)}
                                  options={getAllowedNextStatuses(editDetail.status)}
                                />
                              </FormField>
                              <FormField label="Delivery Date">
                                <EditInput
                                  type="datetime-local"
                                  value={formatDateForInput(editDetail.delivery_date)}
                                  disabled={isLocked || (!permissions.canEditAll && !permissions.editableFields?.includes("delivery_date"))}
                                  onChange={(e) => updateDetailField(index, "delivery_date", e.target.value)}
                                />
                              </FormField>
                              {isDeliveryDateChanged && (
                                <FormField label="Delivery Note">
                                  <EditInput
                                    type="text"
                                    value={editDetail.delivery_note || ""}
                                    disabled={isLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("delivery_note"))}
                                    onChange={(e) => updateDetailField(index, "delivery_note", e.target.value)}
                                    placeholder="Reason for delivery date change"
                                  />
                                </FormField>
                              )}
                              {!isLocked && (
                                <FormField label="Delivered Quantity">
                                  <EditInput
                                    type="number"
                                    min={0}
                                    max={maxDeliverableQty}
                                    disabled={isLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("delivered_qty"))}
                                    onChange={(e) => { const value = Number(e.target.value || 0); if (value <= maxDeliverableQty) updateDetailField(index, "delivered_qty", value); }}
                                    placeholder={`Max ${maxDeliverableQty}`}
                                  />
                                </FormField>
                              )}
                              {!isLocked && (
                                <FormField label="Cancelled Quantity">
                                  <EditInput
                                    type="number"
                                    min={0}
                                    max={maxCancelableQty}
                                    disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("cancel_qty"))}
                                    onChange={(e) => { const value = Number(e.target.value || 0); if (value <= maxCancelableQty) updateDetailField(index, "cancel_qty", value); }}
                                    placeholder={`Max ${maxCancelableQty}`}
                                  />
                                </FormField>
                              )}
                              {isCancelQtyChanged && (
                                <FormField label="Reason for Cancellation">
                                  <textarea
                                    disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("cancel_qty"))}
                                    onChange={(e) => updateDetailField(index, "reason_for_cancellation", e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
                                    rows={1}
                                    placeholder="Enter reason for cancellation"
                                  />
                                </FormField>
                              )}
                            </div>

                            {/* Completion Flags */}
                            {showCompletion && (
                              <div className="border-t border-indigo-100 pt-4 space-y-3">
                                <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Completion Status</p>
                                <div className="flex gap-3 flex-wrap">
                                  {hasUnpacked && (
                                    <CheckboxField
                                      label="Unpacked Completed"
                                      checked={editDetail.has_unPacked_completed}
                                      disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("has_unPacked_completed"))}
                                      onChange={(e) => updateDetailField(index, "has_unPacked_completed", e.target.checked)}
                                    />
                                  )}
                                  {hasProduction && (
                                    <CheckboxField
                                      label="Production Completed"
                                      checked={editDetail.has_production_completed}
                                      disabled={isOrderLocked || (!permissions.canEditAll && !permissions.editableDetailFields?.includes("has_production_completed"))}
                                      onChange={(e) => updateDetailField(index, "has_production_completed", e.target.checked)}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-4 space-y-4">
          {order.order_details?.map((d, index) => {
            const editDetail = editOrder?.order_details?.[index];
            const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
            const delivered = Number(d.qty_delivered ?? 0);
            const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
            const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
            const isLocked = d.status === "COMPLETED" || d.status === "DELIVERED" || d.status === "CANCELLED";
            const maxDeliverableQty = balanceQty;
            const maxCancelableQty = balanceQty;
            const isCancelQtyChanged = Number(editDetail?.cancel_qty || 0) >= 1;

            return (
              <div key={d.order_details_number} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">{d.order_details_number}</span>
                  <div className="flex items-center gap-2">
                    {d.is_free && (
                      <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">Free</span>
                    )}
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wide ${getOrderStatusStyle(d?.status)}`}>
                      {d?.status}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="font-bold text-slate-900">{capitalizeFirstLetter(d.product_name)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {capitalizeFirstLetter(d.product_brand)} · {capitalizeFirstLetter(d.product_model)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Ordered</p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{totalOrdered}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 font-black">Total</p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{d.is_free ? "FREE" : formatCurrency(d.total_price)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-emerald-500 font-black">Delivered</p>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">{delivered}</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl px-3 py-2.5 border border-rose-100">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-rose-500 font-black">Cancelled</p>
                      <p className="text-lg font-black text-rose-700 mt-0.5">{cancelled}</p>
                    </div>
                  </div>

                  {isEditMode && editDetail && (
                    <div className="pt-4 border-t border-indigo-100 space-y-4">
                      <p className="text-[9px] uppercase font-black tracking-[0.12em] text-indigo-500">Edit Item</p>
                      <FormField label="Status">
                        <CustomSelect value={editDetail.status} disabled={isLocked} onChange={(e) => updateDetailField(index, "status", e.target.value)} options={getAllowedNextStatuses(editDetail.status)} />
                      </FormField>
                      {!isLocked && (
                        <FormField label="Delivered Quantity">
                          <EditInput type="number" min={0} max={maxDeliverableQty} onChange={(e) => { const value = Number(e.target.value || 0); if (value <= maxDeliverableQty) updateDetailField(index, "delivered_qty", value); }} placeholder={`Max ${maxDeliverableQty}`} />
                        </FormField>
                      )}
                      {!isLocked && (
                        <FormField label="Cancelled Quantity">
                          <EditInput type="number" min={0} max={maxCancelableQty} onChange={(e) => { const value = Number(e.target.value || 0); if (value <= maxCancelableQty) updateDetailField(index, "cancel_qty", value); }} placeholder={`Max ${maxCancelableQty}`} />
                        </FormField>
                      )}
                      {isCancelQtyChanged && (
                        <FormField label="Reason for Cancellation">
                          <textarea onChange={(e) => updateDetailField(index, "reason_for_cancellation", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none" rows={2} placeholder="Enter reason for cancellation" />
                        </FormField>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DELIVERY NOTES ── */}
      {order?.delivery_notes && (
        <SectionCard title="Delivery Notes" subtitle="Additional Info">
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {capitalizeFirstLetter(order.delivery_notes)}
            </p>
          </div>
        </SectionCard>
      )}

      {/* ── FINANCIAL SUMMARY ── */}
      <FinancialSummary order={order} />

      {/* ── PAYMENT NOTES ── */}
      {order?.payment_notes?.length > 0 && (
        <SectionCard title="Payment Notes" subtitle="Transaction History">
          <ul className="space-y-2">
            {order.payment_notes.map((note, index) => (
              <li key={index} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 hover:bg-slate-100/60 hover:border-slate-200 transition-all">
                <FiChevronRight size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                {capitalizeFirstLetter(note)}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── FLOATING SAVE BAR ── */}
      {isEditMode && (
        <div className="sticky bottom-6 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg px-5 py-3 ring-1 ring-slate-100">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-slate-500 font-semibold hidden sm:block">
              Unsaved changes
            </span>
            <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleDiscardEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
            >
              <FiX size={12} />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || (isOrderLocked && isPaymentFullyDone)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              <FiSave size={12} />
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;