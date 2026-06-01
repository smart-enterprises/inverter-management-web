// OrderDetails.jsx — Senior Refactor: Strict RBAC + Cancellation History + Conditional UI
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useParams } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox,
  FiCalendar, FiTruck, FiCreditCard, FiEdit2,
  FiSave, FiX, FiCheckCircle, FiXCircle, FiShoppingCart,
  FiPackage, FiAlertCircle, FiActivity,
  FiChevronRight, FiLayers, FiTrendingDown, FiBarChart2,
  FiPrinter, FiInfo, FiPlus,
  FiRefreshCw, FiCheck, FiAlertTriangle, FiFlag,
  FiArrowRight, FiClock, FiSlash,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { toastSuccess } from "../utils/toast";
import { useAuth } from "../hooks/useAuth";
import CustomSelect from "../components/CustomSelect";
import { fetchOrderById, updateOrderStatus } from "../api/orders";
import { fetchUsers } from "../api/user";
import { capitalizeFirstLetter, formatName } from "../utils/constants";
import { formatDealerDiscountNotes, formatDeliveryNotes, formatStockNotes } from "../utils/notesUtils";
import { ORDER_STATUS_LIST, ORDER_STATUSES, PAYMENT_METHOD_OPTIONS, PRIORITY_OPTIONS } from "../utils/status";
import { useUpdateOrderPermissions } from "../hooks/useUpdateOrderPermissions";
import { formatDateForInput, formatDeliveryDate } from "../utils/dateUtils";
import { getAllowedNextStatuses } from "../utils/orderStatusHelper";
import { fetchCompanyAddress } from "../api/companyAddress";
import { canPrintOrder, canViewOrderPrice, canViewDealerInformation, canViewFullDealerInformation } from "../utils/orderPermissions";
import DeliveryNotesCard from "../components/DeliveryNotesCard";
import ProductionStatusBadge from "../components/ProductionStatusBadge";
import AddItemsModal from "../components/AddItemsModal";
import { ROLES } from "../utils/roles";

const ADMIN_PRIVILEGED_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER];
const ADD_ITEMS_BLOCKED_STATUSES = ["PENDING", "DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"];

// ─────────────────────────────────────────────────────────────────────────────
// RBAC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns what order-level actions a role can perform.
 */
const getRoleOrderPermissions = (role) => {
  const r = (role || "").toUpperCase();
  switch (r) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
    case ROLES.MANAGER:
      return {
        canUpdateStatus: true,
        canUpdateDelivery: true,
        canCancelOrder: true,
        canAddPayment: true,
        canUpdateItemStatus: true,
        canUpdateItemDelivery: true,
        canCancelItem: true,
        allowedItemStatuses: null, // null = all
        allowedOrderStatuses: null, // null = all from getAllowedNextStatuses
      };
    case ROLES.SALESMAN:
      return {
        canUpdateStatus: false,
        canUpdateDelivery: true,
        canCancelOrder: false,
        canAddPayment: false,
        canUpdateItemStatus: false,
        canUpdateItemDelivery: true, // Date + note only (no qty)
        hideDeliveredQty: true,
        canCancelItem: false,
        allowedItemStatuses: [],
        allowedOrderStatuses: [],
      };
    case ROLES.PRODUCTION:
      return {
        canUpdateStatus: false,
        canUpdateDelivery: false,
        canCancelOrder: false,
        canAddPayment: false,
        canUpdateItemStatus: true,
        canUpdateItemDelivery: true, // Date + note only (no qty)
        hideDeliveredQty: true,
        canCancelItem: false,
        allowedItemStatuses: [], // no status change, only production flag
        allowedOrderStatuses: [],
        hideUnpackedFlag: true,
        statusModalTitle: "Update Production Status",
      };
    case ROLES.PACKING:
      return {
        canUpdateStatus: true,
        canUpdateDelivery: true,
        canCancelOrder: false,
        canAddPayment: false,
        canUpdateItemStatus: true,
        canUpdateItemDelivery: true, // Date + note only (no qty)
        hideDeliveredQty: true,
        canCancelItem: false,
        allowedItemStatuses: ["PACKED", "SHIPPED", "DELIVERED"],
        allowedOrderStatuses: ["SHIPPED"],
        hideProductionFlag: true,
        statusModalTitle: "Update Packing Status",
      };
    case ROLES.ACCOUNTS:
      return {
        canUpdateStatus: true,
        canUpdateDelivery: true,
        canCancelOrder: false,
        canAddPayment: true,
        canUpdateItemStatus: true,
        canUpdateItemDelivery: true,
        canCancelItem: false,
        allowedItemStatuses: ["INVOICE", "SHIPPED", "DELIVERED"],
        allowedOrderStatuses: ["INVOICE", "SHIPPED", "DELIVERED"],
        hideProductionFlag: true,
        hideUnpackedFlag: true,
      };
    case ROLES.DELIVERY:
      return {
        canUpdateStatus: false,
        canUpdateDelivery: true,
        canCancelOrder: false,
        canAddPayment: false,
        canUpdateItemStatus: true,
        canUpdateItemDelivery: true,
        canCancelItem: false,
        allowedItemStatuses: ["SHIPPED", "DELIVERED"],
        allowedOrderStatuses: ["SHIPPED", "DELIVERED"],
      };
    default:
      return {
        canUpdateStatus: false,
        canUpdateDelivery: false,
        canCancelOrder: false,
        canAddPayment: false,
        canUpdateItemStatus: false,
        canUpdateItemDelivery: false,
        canCancelItem: false,
        allowedItemStatuses: [],
        allowedOrderStatuses: [],
      };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Mark as Confirmed", color: "blue" },
  { value: "REJECTED", label: "Mark as Rejected", color: "rose" },
  { value: "INVOICE", label: "Mark as Invoiced", color: "cyan" },
  { value: "CANCELLED", label: "Mark as Cancelled", color: "slate" },
  { value: "SHIPPED", label: "Mark as Shipped", color: "orange" },
  { value: "DELIVERED", label: "Mark as Delivered", color: "emerald" },
];

const STATUS_COLOR_MAP = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500", ring: "ring-rose-200" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500", ring: "ring-cyan-200" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", dot: "bg-slate-400", ring: "ring-slate-200" },
  orange: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500", ring: "ring-blue-200" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
};

const MODAL = {
  ITEM_STATUS: "itemStatus",
  DELIVERY: "delivery",
  CANCEL_ITEM: "cancelItem",
  ORDER_STATUS: "orderStatus",
  ORDER_DELIVERY: "orderDelivery",
  PAYMENT: "payment",
};

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "N/A";

const formatDateShort = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/A";

const formatCurrency = (value) => {
  if (!value || isNaN(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(value));
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_HEX = {
  PENDING: "#d97706", CONFIRMED: "#2563eb", PRODUCTION: "#c026d3",
  PACKED: "#14b8a6", INVOICE: "#0891b2", SHIPPED: "#f97316",
  DELIVERED: "#16a34a", COMPLETED: "#059669", CANCELLED: "#e11d48",
  REJECTED: "#e11d48",
};

const getOrderStatusStyle = (status) => {
  const map = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-blue-50 text-blue-700 border-blue-200",
    PACKED: "bg-amber-50 text-amber-700 border-amber-200",
    INVOICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
    SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
    DELIVERED: "bg-green-50 text-green-700 border-green-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[status?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

const getPriorityStyle = (p) => {
  const map = {
    HIGH: "bg-rose-50 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return map[p?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

const getPaymentStatusStyle = (s) => {
  const map = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UNPAID: "bg-rose-50 text-rose-700 border-rose-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    REFUNDED: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return map[s?.toUpperCase()] || "bg-slate-50 text-slate-600 border-slate-200";
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE BADGE HELPER
// ─────────────────────────────────────────────────────────────────────────────

const getRoleBadgeStyle = (role) => {
  const map = {
    ROLE_SUPER_ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
    ROLE_ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
    ROLE_MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
    ROLE_SALESMAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ROLE_PRODUCTION: "bg-blue-50 text-blue-700 border-blue-200",
    ROLE_PACKING: "bg-pink-50 text-pink-700 border-pink-200",
    ROLE_ACCOUNTS: "bg-cyan-50 text-cyan-700 border-cyan-200",
    ROLE_DELIVERY: "bg-teal-50 text-teal-700 border-teal-200",
  };
  return map[role] || "bg-slate-50 text-slate-600 border-slate-200";
};

const formatRoleLabel = (role) =>
  (role || "").replace("ROLE_", "").replace(/_/g, " ");

// ─────────────────────────────────────────────────────────────────────────────
// PDF GENERATOR (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const generateOrderPDF = (order, companyInfo) => {
  const company = companyInfo || {};
  const totalAmount = Number(order?.order_total_price ?? 0);
  const discountAmount = Number(order?.order_total_discount ?? 0);
  const grossAmount = totalAmount + discountAmount;
  const amountDue = Number(order?.amount_due ?? 0);
  const statusColor = STATUS_HEX[order?.status?.toUpperCase()] || "#64748b";

  const itemsHTML = (order?.order_details || [])
    .map((d, i) => {
      const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
      const delivered = Number(d.qty_delivered ?? 0);
      const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
      const hasDiscount = !d.is_free && d.total_dealer_discount && d.total_dealer_discount > 0;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const sc = STATUS_HEX[d?.status?.toUpperCase()] || "#64748b";
      return `
        <tr style="background:${bg};">
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:700;color:#0f172a;font-size:12px;">${capitalizeFirstLetter(d.product_name)}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${capitalizeFirstLetter(d.product_brand || "")} · ${capitalizeFirstLetter(d.product_model || "")}</div>
            ${d.is_free ? `<span style="font-size:9px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:1px 6px;border-radius:20px;font-weight:700;">FREE ITEM</span>` : ""}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:#0f172a;">${totalOrdered}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">${delivered} / ${cancelled}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;color:#334155;">₹${Number(d.unit_product_price || 0).toLocaleString("en-IN")}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">
            ${d.is_free
          ? `<span style="font-size:11px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:2px 8px;border-radius:20px;font-weight:700;">FREE</span>`
          : `<div style="font-weight:800;color:#0f172a;font-size:13px;">₹${Number(d.total_price || 0).toLocaleString("en-IN")}</div>${hasDiscount ? `<div style="font-size:10px;color:#10b981;margin-top:2px;">− ₹${Number(d.total_dealer_discount).toLocaleString("en-IN")} disc.</div>` : ""}`
        }
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;background:${sc}20;color:${sc};border:1px solid ${sc}40;text-transform:uppercase;">${d.status || "—"}</span>
          </td>
        </tr>`;
    }).join("");

  const companyAddress = [
    company.address_line_1, company.address_line_2, company.city,
    company.state, company.pincode, company.country,
  ].filter(Boolean).join(", ");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Order ${order?.order_number}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',-apple-system,sans-serif;background:#fff;color:#0f172a;font-size:13px;line-height:1.5;}.page{max-width:820px;margin:0 auto;padding:32px;}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e2e8f0;}.order-number{font-size:22px;font-weight:900;color:#4f46e5;font-family:monospace;}.badges{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;}.badge{font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.08em;border:1px solid;}.items-table{width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;}.items-table thead tr{background:#f1f5f9;}.items-table thead th{padding:10px 12px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;}.financial-block{display:flex;justify-content:flex-end;margin-bottom:24px;}.financial-card{width:320px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}.financial-card-header{background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;}.financial-row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 16px;border-bottom:1px solid #f1f5f9;}.financial-label{font-size:12px;color:#64748b;font-weight:500;}.financial-value{font-size:13px;font-weight:700;color:#0f172a;}.financial-total-row{background:#f8fafc;padding:12px 16px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:baseline;}.financial-total-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#0f172a;}.financial-total-value{font-size:20px;font-weight:900;color:#0f172a;}.footer{margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style>
  </head><body><div class="page">
  <div class="header"><div><div style="font-size:20px;font-weight:900;color:#0f172a;">${company.company_name || "Company"}</div>${company.gst_number ? `<div style="font-size:10px;color:#94a3b8;font-weight:600;margin-top:2px;">GST: ${company.gst_number}</div>` : ""}<div style="margin-top:8px;font-size:11px;color:#64748b;line-height:1.6;">${companyAddress}${company.phone ? `<br/>📞 ${company.phone}` : ""}${company.email ? ` · ✉ ${company.email}` : ""}</div></div><div style="text-align:right;"><div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:4px;">Order Invoice</div><div class="order-number">${order?.order_number}</div><div style="font-size:11px;color:#64748b;margin-top:4px;">Created: ${formatDate(order?.created_at)}</div><div class="badges"><span class="badge" style="background:${statusColor}18;color:${statusColor};border-color:${statusColor}40;">${order?.status}</span>${order?.priority ? `<span class="badge" style="background:#f1f5f9;color:#64748b;border-color:#e2e8f0;">${order.priority}</span>` : ""}</div></div></div>
  <div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;margin-bottom:10px;">Order Items</div>
  <table class="items-table"><thead><tr><th>Product</th><th>Qty</th><th>Del / Can</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th><th style="text-align:center;">Status</th></tr></thead><tbody>${itemsHTML}</tbody></table>
  <div class="financial-block"><div class="financial-card"><div class="financial-card-header">Financial Summary</div><div class="financial-row"><span class="financial-label">Gross Total</span><span class="financial-value">₹${grossAmount.toLocaleString("en-IN")}</span></div>${discountAmount > 0 ? `<div class="financial-row"><span class="financial-label" style="color:#10b981;">Total Discount</span><span class="financial-value" style="color:#10b981;">− ₹${discountAmount.toLocaleString("en-IN")}</span></div>` : ""}<div class="financial-total-row"><span class="financial-total-label">Net Payable</span><span class="financial-total-value">₹${totalAmount.toLocaleString("en-IN")}</span></div>${amountDue > 0 ? `<div style="padding:12px 16px;background:#fff1f2;display:flex;justify-content:space-between;"><div><div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#e11d48;">Balance Due</div></div><span style="font-size:18px;font-weight:900;color:#e11d48;">₹${amountDue.toLocaleString("en-IN")}</span></div>` : `<div style="padding:12px 16px;background:#f0fdf4;display:flex;justify-content:space-between;"><div><div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#16a34a;">Fully Paid</div></div><span style="font-size:18px;font-weight:900;color:#16a34a;">₹0</span></div>`}</div></div>
  <div class="footer"><div style="font-size:10px;color:#94a3b8;font-weight:500;">Generated on ${new Date().toLocaleString("en-IN")}</div><div style="font-size:11px;font-weight:700;color:#64748b;">${company.company_name || ""}</div></div>
  </div></body></html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    Swal.fire({ icon: "warning", title: "Popup Blocked", text: "Please allow popups to download the PDF." });
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => setTimeout(() => { printWindow.focus(); printWindow.print(); }, 400);
};

// ═════════════════════════════════════════════════════════════════════════════
// PRIMITIVE UI ATOMS
// ═════════════════════════════════════════════════════════════════════════════

const FormField = memo(({ label, required, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && (
      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
        <FiInfo size={10} />{hint}
      </p>
    )}
  </div>
));

const EditInput = memo(({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
  />
));

const InfoCell = memo(({ icon, label, children }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
    <div className="mt-0.5 p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 group-hover:border-blue-200 transition-colors flex-shrink-0">
      {React.cloneElement(icon, { size: 12 })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800 leading-snug">
        {children || <span className="text-slate-300 font-normal italic text-xs">N/A</span>}
      </div>
    </div>
  </div>
));

const SectionCard = memo(({ title, subtitle, action, children, className = "", editHighlight = false, headerExtra }) => (
  <section className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${editHighlight ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"} ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>
          {subtitle && <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">{subtitle}</p>}
          {headerExtra}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </section>
));

const QtyTracker = memo(({ ordered, delivered, cancelled }) => {
  const balance = Math.max(ordered - delivered - cancelled, 0);
  const pct = ordered > 0 ? Math.min(((delivered + cancelled) / ordered) * 100, 100) : 0;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500">Progress</span>
        <span className={`font-bold ${balance === 0 ? "text-emerald-600" : "text-slate-700"}`}>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${balance === 0 ? "bg-emerald-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: "Ordered", value: ordered, cls: "text-slate-800" },
          { label: "Delivered", value: delivered, cls: "text-emerald-600" },
          { label: "Cancelled", value: cancelled, cls: "text-rose-600" },
          { label: "Balance", value: balance, cls: balance === 0 ? "text-emerald-600" : "text-amber-600" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-slate-50 rounded-lg py-2 px-1">
            <p className="text-[8px] uppercase tracking-[0.1em] text-slate-400 font-black">{label}</p>
            <p className={`text-sm font-black tabular-nums mt-0.5 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

const NotesList = memo(({ title, notes, variant = "default" }) => {
  if (!notes?.length) return null;
  const styles = variant === "purple"
    ? "bg-blue-50/70 border-blue-100 text-blue-700"
    : "bg-slate-50 border-slate-100 text-slate-600";
  return (
    <div className={`mt-2 border rounded-lg p-3 ${styles}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] mb-1.5 opacity-60">{title}</p>
      <ul className="space-y-1 text-xs text-slate-700">
        {notes.map((note, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-40 flex-shrink-0" />
            {note.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/, (m) => formatDate(m))}
          </li>
        ))}
      </ul>
    </div>
  );
});

const FieldError = ({ msg }) => (
  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
    <FiAlertCircle size={10} />{msg}
  </p>
);

const ModalDivider = ({ label }) => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-slate-100" />
    {label && <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 flex-shrink-0">{label}</span>}
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATION HISTORY CARD (NEW)
// ─────────────────────────────────────────────────────────────────────────────

const CancellationHistoryCard = memo(({ history = [], userMap = {} }) => {
  if (!history?.length) return null;

  return (
    <div className="mt-3 border border-rose-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border-b border-rose-100">
        <FiSlash size={11} className="text-rose-500" />
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-rose-600">
          Cancellation History ({history.length})
        </p>
      </div>
      <div className="divide-y divide-rose-50">
        {history.map((entry, idx) => (
          <div key={idx} className="px-3 py-3 bg-white hover:bg-rose-50/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                {/* Timeline dot */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center">
                    <FiXCircle size={10} className="text-rose-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-rose-700">
                      {entry.cancelled_qty} unit{entry.cancelled_qty !== 1 ? "s" : ""} cancelled
                    </span>
                    {entry.cancelled_by_role && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wide ${getRoleBadgeStyle(entry.cancelled_by_role)}`}>
                        {formatRoleLabel(entry.cancelled_by_role)}
                      </span>
                    )}
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 mt-1">
                      "{entry.reason}"
                    </p>
                  )}
                  {entry.cancelled_by && userMap[entry.cancelled_by] && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      By: {userMap[entry.cancelled_by]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {entry.cancelled_at && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-medium whitespace-nowrap">
                    <FiClock size={9} />
                    {formatDateShort(entry.cancelled_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL SHELL
// ═════════════════════════════════════════════════════════════════════════════

const ModalShell = memo(({
  isOpen, onClose, title, subtitle, icon,
  accentClass = "bg-blue-600", children, footer, width = "max-w-lg",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6" role="dialog" aria-modal="true">
        <div
          className={`bg-white rounded-2xl shadow-2xl w-full ${width} border border-slate-200 flex flex-col`}
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl ${accentClass} text-white shadow-sm flex-shrink-0`}>
                {icon}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">{title}</h2>
                {subtitle && (
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <FiX size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex gap-3 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: STATUS RADIO ROW
// ─────────────────────────────────────────────────────────────────────────────

const StatusRadioRow = memo(({ option, isSelected, isDisabled, onChange }) => {
  const colors = STATUS_COLOR_MAP[option.color] || STATUS_COLOR_MAP.slate;
  return (
    <label
      className={`
        group flex items-center gap-3.5 px-4 py-3.5 rounded-xl border cursor-pointer transition-all select-none
        ${isSelected
          ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}`
          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
        }
        ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
      `}
    >
      <div className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? `border-current ${colors.text}` : "border-slate-300"}`}>
        {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />}
        <input type="radio" name="item_status" value={option.value} checked={isSelected} disabled={isDisabled} onChange={() => onChange(option.value)} className="sr-only" />
      </div>
      <span className={`text-sm font-semibold transition-colors ${isSelected ? colors.text : "text-slate-700"}`}>
        {option.label}
      </span>
      {isSelected && <FiCheckCircle size={14} className={`ml-auto flex-shrink-0 ${colors.text}`} />}
    </label>
  );
});

const CheckboxToggleRow = memo(({ label, description, checked, onChange, disabled = false }) => (
  <label
    className={`
      group flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all select-none
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      ${checked
        ? "bg-amber-50 border-amber-200 ring-1 ring-amber-100"
        : "bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30"
      }
    `}
  >
    <div className={`relative mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-amber-600 border-amber-600" : "border-slate-300 bg-white"}`}>
      {checked && <FiCheck size={11} className="text-white" strokeWidth={3} />}
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
    </div>
    <div className="flex-1 min-w-0">
      <span className={`text-sm font-semibold block ${checked ? "text-amber-700" : "text-slate-700"}`}>{label}</span>
      {description && <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{description}</span>}
    </div>
    {checked && <FiCheckCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />}
  </label>
));

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: ITEM STATUS — RBAC-aware
// ═════════════════════════════════════════════════════════════════════════════

const ItemStatusModal = memo(({ isOpen, onClose, detail, onSubmit, submitting, rolePermissions }) => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [hasUnpackedDone, setHasUnpackedDone] = useState(false);
  const [hasProdDone, setHasProdDone] = useState(false);

  const currentStatus = detail?.status || "";
  const isProduction = currentStatus === "PRODUCTION";
  const { hasUnpacked, hasProduction } = detail?.stock_flags || {};
  const hasProductionFlags = hasUnpacked || hasProduction;

  // RBAC: what statuses can this role select?
  const allowedByRole = rolePermissions?.allowedItemStatuses; // null = all, [] = none
  const hideProductionFlag = rolePermissions?.hideProductionFlag;
  const hideUnpackedFlag = rolePermissions?.hideUnpackedFlag;

  useEffect(() => {
    if (isOpen && detail) {
      setSelectedStatus(detail.status || "");
      setHasUnpackedDone(detail.has_unPacked_completed || false);
      setHasProdDone(detail.has_production_completed || false);
    }
  }, [isOpen, detail]);

  const allowedNextStatuses = getAllowedNextStatuses(currentStatus);

  // Filter status options by role
  const visibleStatusOptions = ITEM_STATUS_OPTIONS.filter((opt) => {
    if (!allowedNextStatuses.includes(opt.value)) return false;
    if (allowedByRole === null) return true; // all allowed
    if (Array.isArray(allowedByRole)) return allowedByRole.includes(opt.value);
    return true;
  });

  const showStatusList = !isProduction && visibleStatusOptions.length > 0;
  const showProductionCheckbox = hasProduction && !hideProductionFlag;
  const showUnpackedCheckbox = hasUnpacked && !hideUnpackedFlag;

  const isStatusChanged = selectedStatus && selectedStatus !== currentStatus;
  const hasChanges =
    (showStatusList && isStatusChanged) ||
    (showUnpackedCheckbox && hasUnpackedDone !== (detail?.has_unPacked_completed || false)) ||
    (showProductionCheckbox && hasProdDone !== (detail?.has_production_completed || false));

  const handleSubmit = () => {
    const payload = {};
    if (showStatusList && isStatusChanged) payload.status = selectedStatus;
    if (showUnpackedCheckbox) payload.has_unPacked_completed = hasUnpackedDone;
    if (showProductionCheckbox) payload.has_production_completed = hasProdDone;
    if (Object.keys(payload).length === 0) { onClose(); return; }
    onSubmit(payload);
  };

  const modalTitle = rolePermissions?.statusModalTitle || "Update Item Status";

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose}
      title={modalTitle}
      subtitle={isProduction ? "Production milestones" : "Status · Production milestones"}
      icon={<FiFlag size={14} />}
      accentClass="bg-blue-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !hasChanges}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
          >
            {submitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
              : <><FiSave size={13} />Apply Changes</>
            }
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">Current Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(currentStatus)}`}>
              {currentStatus || "—"}
            </span>
          </div>
          {!isProduction && isStatusChanged && (
            <>
              <FiArrowRight size={14} className="text-slate-300 mx-1" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">New Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(selectedStatus)}`}>
                  {selectedStatus}
                </span>
              </div>
            </>
          )}
        </div>

        {showStatusList && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Select New Status</p>
            <div className="space-y-2">
              {visibleStatusOptions.map((opt) => (
                <StatusRadioRow key={opt.value} option={opt} isSelected={selectedStatus === opt.value} isDisabled={false} onChange={setSelectedStatus} />
              ))}
            </div>
          </div>
        )}

        {!showStatusList && !hasProductionFlags && (
          <p className="text-xs text-slate-400 font-medium italic px-1 py-4 text-center">
            No status transitions available for your role.
          </p>
        )}

        {hasProductionFlags && (showProductionCheckbox || showUnpackedCheckbox) && (
          <>
            <ModalDivider label="Production Milestones" />
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Mark stages for <span className="text-slate-600 normal-case font-bold">{capitalizeFirstLetter(detail?.product_name)}</span>
              </p>
              <div className="space-y-2">
                {showUnpackedCheckbox && (
                  <CheckboxToggleRow label="Packing Completed" description="All unpacked items have been packed" checked={hasUnpackedDone} onChange={setHasUnpackedDone} />
                )}
                {showProductionCheckbox && (
                  <CheckboxToggleRow label="Production Completed" description="Manufacturing / production is complete" checked={hasProdDone} onChange={setHasProdDone} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: DELIVERY UPDATE
// ═════════════════════════════════════════════════════════════════════════════

const DeliveryUpdateModal = memo(({ isOpen, onClose, detail, onSubmit, submitting, rolePermissions }) => {
  const [form, setForm] = useState({ delivery_date: "", delivery_note: "", delivered_qty: "" });
  const [errors, setErrors] = useState({});

  const totalOrdered = Number(detail?.total_qty_ordered ?? detail?.qty_ordered ?? 0);
  const alreadyDelivered = Number(detail?.qty_delivered ?? 0);
  const cancelled = Number(detail?.qty_cancelled ?? detail?.total_cancelled_qty ?? 0);
  const maxDeliverable = Math.max(totalOrdered - alreadyDelivered - cancelled, 0);
  const originalDate = detail?.delivery_date || "";

  useEffect(() => {
    if (isOpen) {
      const date = detail?.delivery_date || "";
      setForm({ delivery_date: date ? formatDateForInput(date) : "", delivery_note: "", delivered_qty: "" });
      setErrors({});
    }
  }, [isOpen, detail]);

  const isDateChanged = form.delivery_date && form.delivery_date !== formatDateForInput(originalDate);

  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.delivery_date) e.delivery_date = "Delivery date is required";
    if (isDateChanged && !form.delivery_note?.trim()) e.delivery_note = "Note required when changing delivery date";
    if (form.delivered_qty !== "" && (isNaN(Number(form.delivered_qty)) || Number(form.delivered_qty) < 0)) e.delivered_qty = "Invalid quantity";
    if (form.delivered_qty !== "" && Number(form.delivered_qty) > maxDeliverable) e.delivered_qty = `Max deliverable: ${maxDeliverable}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {};
    if (form.delivery_date) payload.delivery_date = form.delivery_date;
    if (form.delivery_note?.trim()) payload.delivery_note = form.delivery_note.trim();
    if (form.delivered_qty !== "" && Number(form.delivered_qty) > 0) payload.delivered_qty = Number(form.delivered_qty);
    onSubmit(payload);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Update Delivery Details" subtitle="Schedule & delivery quantity" icon={<FiTruck size={14} />} accentClass="bg-emerald-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
            {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={13} />Save Delivery</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
          {[{ label: "Ordered", value: totalOrdered, cls: "text-slate-800" }, { label: "Already Delivered", value: alreadyDelivered, cls: "text-emerald-600" }, { label: "Cancelled", value: cancelled, cls: "text-rose-600" }, { label: "Max Deliverable", value: maxDeliverable, cls: "text-amber-600" }].map(({ label, value, cls }) => (
            <div key={label}><span className="text-slate-400 font-semibold block mb-0.5">{label}</span><span className={`font-black ${cls}`}>{value}</span></div>
          ))}
        </div>
        <FormField label="Delivery Date" required><EditInput type="datetime-local" value={form.delivery_date} onChange={(e) => setField("delivery_date", e.target.value)} />{errors.delivery_date && <FieldError msg={errors.delivery_date} />}</FormField>
        {isDateChanged && (
          <FormField label="Delivery Note" required hint="Required when updating delivery date">
            <textarea rows={2} value={form.delivery_note} onChange={(e) => setField("delivery_note", e.target.value)} placeholder="Reason for delivery date change…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all resize-none" />
            {errors.delivery_note && <FieldError msg={errors.delivery_note} />}
          </FormField>
        )}
        {!rolePermissions?.hideDeliveredQty && (
          <FormField label={`Delivered Quantity (Max: ${maxDeliverable})`} hint="Leave empty to skip quantity update"><EditInput type="number" min={0} max={maxDeliverable} value={form.delivered_qty} onChange={(e) => setField("delivered_qty", e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }} placeholder={`0 – ${maxDeliverable}`} />{errors.delivered_qty && <FieldError msg={errors.delivered_qty} />}</FormField>
        )}
      </div>
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: CANCEL ITEM
// ═════════════════════════════════════════════════════════════════════════════

const CancelItemModal = memo(({ isOpen, onClose, detail, onSubmit, submitting }) => {
  const [cancelAll, setCancelAll] = useState(false);
  const [cancelQty, setCancelQty] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  const totalOrdered = Number(detail?.total_qty_ordered ?? detail?.qty_ordered ?? 0);
  const delivered = Number(detail?.qty_delivered ?? 0);
  const alreadyCancelled = Number(detail?.qty_cancelled ?? detail?.total_cancelled_qty ?? 0);
  const maxCancellable = Math.max(totalOrdered - delivered - alreadyCancelled, 0);

  useEffect(() => { setCancelQty(cancelAll ? String(maxCancellable) : ""); }, [cancelAll, maxCancellable]);
  useEffect(() => { if (isOpen) { setCancelAll(false); setCancelQty(""); setReason(""); setErrors({}); } }, [isOpen]);

  const validate = () => {
    const e = {};
    const qty = Number(cancelQty);
    if (!cancelQty || isNaN(qty) || qty <= 0) e.cancelQty = "Enter a valid quantity";
    else if (qty > maxCancellable) e.cancelQty = `Max cancellable: ${maxCancellable}`;
    if (!reason.trim()) e.reason = "Cancellation reason is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const qty = Number(cancelQty);
    const isFullCancellation = qty === maxCancellable && maxCancellable > 0;
    const { isConfirmed } = await Swal.fire({
      title: isFullCancellation ? "Cancel All Remaining Items?" : "Confirm Cancellation",
      html: isFullCancellation
        ? `<p class="text-sm text-slate-600 leading-relaxed">This will cancel the <strong>remaining ${maxCancellable} unit(s)</strong>.<br/><strong class="text-rose-600">This action cannot be undone.</strong></p>`
        : `<p class="text-sm text-slate-600">Cancel <strong>${qty} unit(s)</strong> of this item?</p>`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: isFullCancellation ? "Yes, Cancel All" : "Confirm",
      cancelButtonText: "Go Back", confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-2xl" },
    });
    if (!isConfirmed) return;
    onSubmit({ cancel_qty: qty, reason_for_cancellation: reason.trim() });
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Cancel Order Item" subtitle="Partial or full item cancellation" icon={<FiXCircle size={14} />} accentClass="bg-rose-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Go Back</button>
          <button onClick={handleSubmit} disabled={submitting || maxCancellable === 0} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
            {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Cancelling…</> : <><FiXCircle size={13} />Cancel Items</>}
          </button>
        </>
      }
    >
      {maxCancellable === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-slate-400"><FiCheckCircle size={24} className="text-emerald-500" /><p className="text-sm font-semibold text-slate-600">No units available for cancellation</p></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-xs">
            {[{ label: "Ordered", value: totalOrdered, cls: "text-slate-800" }, { label: "Delivered", value: delivered, cls: "text-emerald-600" }, { label: "Already Cancelled", value: alreadyCancelled, cls: "text-rose-600" }, { label: "Max Cancellable", value: maxCancellable, cls: "text-amber-700" }].map(({ label, value, cls }) => (
              <div key={label}><span className="text-slate-400 font-semibold block mb-0.5">{label}</span><span className={`font-black ${cls}`}>{value}</span></div>
            ))}
          </div>
          <label className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all select-none ${cancelAll ? "bg-rose-50 border-rose-200 ring-1 ring-rose-100" : "bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30"}`}>
            <div className={`relative mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${cancelAll ? "bg-rose-600 border-rose-600" : "border-slate-300 bg-white"}`}>
              {cancelAll && <FiCheck size={11} className="text-white" strokeWidth={3} />}
              <input type="checkbox" checked={cancelAll} onChange={(e) => setCancelAll(e.target.checked)} className="sr-only" />
            </div>
            <div className="flex-1">
              <span className={`text-sm font-bold block ${cancelAll ? "text-rose-700" : "text-slate-700"}`}>Cancel All Items</span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Auto-set quantity to remaining balance ({maxCancellable})</span>
            </div>
            {cancelAll && <FiAlertTriangle size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />}
          </label>
          <FormField label={`Cancelled Quantity (Max: ${maxCancellable})`} required>
            <EditInput type="number" min={1} max={maxCancellable} value={cancelQty} disabled={cancelAll} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setCancelQty(v); setErrors((p) => ({ ...p, cancelQty: undefined })); }} onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }} placeholder={cancelAll ? `${maxCancellable} (auto-filled)` : `1 – ${maxCancellable}`} />
            {!cancelAll && <button type="button" onClick={() => setCancelQty(String(maxCancellable))} className="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition-colors mt-1">Set to max ({maxCancellable})</button>}
            {errors.cancelQty && <FieldError msg={errors.cancelQty} />}
          </FormField>
          {Number(cancelQty) === maxCancellable && maxCancellable > 0 && (
            <div className="flex items-start gap-2.5 px-3 py-3 bg-rose-50 border border-rose-200 rounded-xl"><FiAlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" /><p className="text-xs font-semibold text-rose-700">This will fully cancel the remaining balance for this item.</p></div>
          )}
          <FormField label="Reason for Cancellation" required>
            <textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: undefined })); }} placeholder="Explain the reason for cancellation…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all resize-none" />
            {errors.reason && <FieldError msg={errors.reason} />}
          </FormField>
        </div>
      )}
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: ORDER STATUS & PRIORITY — RBAC-filtered
// ═════════════════════════════════════════════════════════════════════════════

const OrderStatusModal = memo(({ isOpen, onClose, order, onSubmit, submitting, rolePermissions }) => {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [priority, setPriority] = useState("LOW");

  useEffect(() => {
    if (isOpen && order) { setSelectedStatus(order.status || ""); setPriority(order.priority || "LOW"); }
  }, [isOpen, order]);

  const ORDER_STATUS_COLOR_MAP = {
    PENDING: { value: "PENDING", label: "Mark as Pending", color: "slate" },
    CONFIRMED: { value: "CONFIRMED", label: "Mark as Confirmed", color: "blue" },
    PRODUCTION: { value: "PRODUCTION", label: "Mark as Production", color: "blue" },
    PACKED: { value: "PACKED", label: "Mark as Packed", color: "blue" },
    INVOICE: { value: "INVOICE", label: "Mark as Invoiced", color: "cyan" },
    SHIPPED: { value: "SHIPPED", label: "Mark as Shipped", color: "orange" },
    DELIVERED: { value: "DELIVERED", label: "Mark as Delivered", color: "emerald" },
    COMPLETED: { value: "COMPLETED", label: "Mark as Completed", color: "emerald" },
    CANCELLED: { value: "CANCELLED", label: "Mark as Cancelled", color: "rose" },
    REJECTED: { value: "REJECTED", label: "Mark as Rejected", color: "rose" },
  };

  const allowedNextStatuses = getAllowedNextStatuses(order?.status);
  const allowedByRole = rolePermissions?.allowedOrderStatuses; // null = all

  const statusOptions = allowedNextStatuses
    .filter((s) => {
      if (allowedByRole === null) return true;
      return (allowedByRole || []).includes(s);
    })
    .map((s) => ORDER_STATUS_COLOR_MAP[s])
    .filter(Boolean);

  const isStatusChanged = selectedStatus && selectedStatus !== order?.status;
  const isPriorityChanged = priority !== order?.priority;
  const hasChanges = isStatusChanged || isPriorityChanged;

  const handleSubmit = () => {
    const payload = {};
    if (isStatusChanged) payload.status = selectedStatus;
    if (isPriorityChanged) payload.priority = priority;
    if (Object.keys(payload).length === 0) { onClose(); return; }
    onSubmit(payload);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Update Order Status & Priority" subtitle="Change workflow state and urgency" icon={<FiActivity size={14} />} accentClass="bg-blue-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !hasChanges} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
            {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={13} />Apply Changes</>}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">Current Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(order?.status)}`}>{order?.status || "—"}</span>
          </div>
          {isStatusChanged && (
            <><FiArrowRight size={14} className="text-slate-300 mx-1" /><div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">New Status</p><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(selectedStatus)}`}>{selectedStatus}</span></div></>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Order Status</p>
          {statusOptions.length > 0 ? (
            <div className="space-y-2">{statusOptions.map((opt) => <StatusRadioRow key={opt.value} option={opt} isSelected={selectedStatus === opt.value} isDisabled={false} onChange={setSelectedStatus} />)}</div>
          ) : (
            <p className="text-xs text-slate-400 font-medium italic px-1">No further status transitions available for your role.</p>
          )}
        </div>
        <ModalDivider label="Priority" />
        <FormField label="Priority" required>
          <CustomSelect name="priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={["LOW", "MEDIUM", "HIGH"]} />
        </FormField>
      </div>
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: ORDER DELIVERY SCHEDULE
// ═════════════════════════════════════════════════════════════════════════════

const OrderDeliveryModal = memo(({ isOpen, onClose, order, onSubmit, submitting }) => {
  const [form, setForm] = useState({ promised_delivery_date: "", delivery_note: "" });
  const [errors, setErrors] = useState({});
  const originalDate = order?.promised_delivery_date || "";

  useEffect(() => {
    if (isOpen) {
      const date = order?.promised_delivery_date || "";
      setForm({ promised_delivery_date: date ? formatDateForInput(date) : "", delivery_note: "" });
      setErrors({});
    }
  }, [isOpen, order]);

  const isDateChanged = form.promised_delivery_date && form.promised_delivery_date !== formatDateForInput(originalDate);

  const setField = (key, val) => { setForm((p) => ({ ...p, [key]: val })); setErrors((p) => ({ ...p, [key]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.promised_delivery_date) e.promised_delivery_date = "Delivery date is required";
    if (isDateChanged && !form.delivery_note?.trim()) e.delivery_note = "Note required when changing delivery date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Update Delivery Schedule" subtitle="Promised delivery date and notes" icon={<FiCalendar size={14} />} accentClass="bg-teal-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={() => validate() && onSubmit(form)} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
            {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={13} />Update Schedule</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Promised Delivery Date" required><EditInput type="datetime-local" value={form.promised_delivery_date} onChange={(e) => setField("promised_delivery_date", e.target.value)} />{errors.promised_delivery_date && <FieldError msg={errors.promised_delivery_date} />}</FormField>
        <FormField label="Delivery Note" required={isDateChanged} hint={isDateChanged ? "Required when changing delivery date" : "Optional"}>
          <textarea rows={3} value={form.delivery_note} onChange={(e) => setField("delivery_note", e.target.value)} placeholder="Notes about delivery schedule change…" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all resize-none" />
          {errors.delivery_note && <FieldError msg={errors.delivery_note} />}
        </FormField>
      </div>
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: ADD PAYMENT
// ═════════════════════════════════════════════════════════════════════════════

const AddPaymentModal = memo(({ isOpen, onClose, order, onSubmit, submitting }) => {
  const [form, setForm] = useState({ amount_paid: "", payment_method: "CASH" });
  const [errors, setErrors] = useState({});

  const totalAmount = Number(order?.order_total_price ?? 0);
  const amountAlreadyPaid = Number(order?.amount_paid ?? 0);
  const maxPayable = Math.max(totalAmount - amountAlreadyPaid, 0);

  useEffect(() => { if (isOpen) { setForm({ amount_paid: "", payment_method: "CASH" }); setErrors({}); } }, [isOpen]);

  const setField = (key, val) => { setForm((p) => ({ ...p, [key]: val })); setErrors((p) => ({ ...p, [key]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.amount_paid || isNaN(Number(form.amount_paid)) || Number(form.amount_paid) <= 0) e.amount_paid = "Enter a valid amount";
    else if (Number(form.amount_paid) > maxPayable) e.amount_paid = `Maximum payable: ${formatCurrency(maxPayable)}`;
    if (!form.payment_method) e.payment_method = "Select payment method";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Add Payment" subtitle="Record a payment against this order" icon={<FiCreditCard size={14} />} accentClass="bg-emerald-600"
      footer={
        <>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={() => validate() && onSubmit(form)} disabled={submitting || maxPayable === 0} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
            {submitting ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Recording…</> : <><FiPlus size={13} />Add Payment</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
          {[{ label: "Order Total", value: formatCurrency(totalAmount), cls: "text-slate-800" }, { label: "Paid", value: formatCurrency(amountAlreadyPaid), cls: "text-emerald-600" }, { label: "Balance", value: formatCurrency(maxPayable), cls: "text-rose-600" }].map(({ label, value, cls }) => (
            <div key={label}><span className="text-slate-400 font-semibold block mb-0.5">{label}</span><span className={`font-black ${cls}`}>{value}</span></div>
          ))}
        </div>
        {maxPayable === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-400"><FiCheckCircle size={24} className="text-emerald-500" /><p className="text-sm font-semibold text-slate-600">Order is fully paid</p></div>
        ) : (
          <>
            <FormField label="Payment Method" required><CustomSelect name="payment_method" value={form.payment_method} onChange={(e) => setField("payment_method", e.target.value)} options={PAYMENT_METHOD_OPTIONS} />{errors.payment_method && <FieldError msg={errors.payment_method} />}</FormField>
            <FormField label="Amount" required hint={`Max: ${formatCurrency(maxPayable)}`}>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">₹</span><EditInput type="number" min={1} max={maxPayable} value={form.amount_paid} onChange={(e) => setField("amount_paid", e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))} onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }} className="pl-7" placeholder="0.00" /></div>
              {errors.amount_paid && <FieldError msg={errors.amount_paid} />}
              <button type="button" onClick={() => setForm((p) => ({ ...p, amount_paid: String(maxPayable) }))} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors mt-1">Pay full balance ({formatCurrency(maxPayable)})</button>
            </FormField>
          </>
        )}
      </div>
    </ModalShell>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// FINANCIAL SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

const FinancialSummary = memo(({ order, onAddPayment, canViewPrice, canAddPayment, submitting }) => {
  const totalAmount = Number(order?.order_total_price ?? 0);
  const discountAmount = Number(order?.order_total_discount ?? 0);
  const grossAmount = totalAmount + discountAmount;
  const amountReceived = Number(order?.amount_paid ?? 0);
  const outstandingBalance = Number(order?.amount_due ?? totalAmount - amountReceived);
  const isPaid = outstandingBalance <= 0;

  if (!canViewPrice) return null;

  const paymentStatusStyle = {
    PAID: "bg-emerald-50 text-emerald-600 border-emerald-200",
    PARTIAL: "bg-amber-50 text-amber-600 border-amber-200",
  }[order?.payment_status] || "bg-rose-50 text-rose-600 border-rose-200";

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-blue-400 via-amber-400 to-blue-400" />
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100"><FiBarChart2 size={14} /></div>
          <div><h2 className="text-sm font-bold text-slate-800">Bill Breakdown</h2><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">Financial Overview</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider ${paymentStatusStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${order?.payment_status === "PAID" ? "bg-emerald-500" : order?.payment_status === "PARTIAL" ? "bg-amber-500" : "bg-rose-500"}`} />
            {order?.payment_status}
          </span>
          {!isPaid && canAddPayment && (
            <button onClick={onAddPayment} disabled={submitting} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50">
              <FiPlus size={12} />Add Payment
            </button>
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="max-w-md ml-auto space-y-0 divide-y divide-slate-50">
          <div className="flex justify-between items-center py-3"><span className="flex items-center gap-2 text-sm text-slate-500 font-medium"><span className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center"><FiLayers size={9} className="text-slate-400" /></span>Gross Total</span><span className="text-sm font-bold text-slate-700">{formatCurrency(grossAmount)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between items-center py-3"><span className="flex items-center gap-2 text-sm text-slate-500 font-medium"><span className="w-4 h-4 rounded-md bg-rose-50 flex items-center justify-center"><FiTrendingDown size={9} className="text-rose-400" /></span>Savings</span><span className="text-sm font-bold text-rose-500">− {formatCurrency(discountAmount)}</span></div>}
          <div className="py-3"><div className="flex justify-between items-baseline"><span className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">You Pay</span><span className="text-2xl font-black text-slate-900 tabular-nums">{formatCurrency(totalAmount)}</span></div></div>
          {amountReceived > 0 && <div className="flex justify-between items-center py-3"><span className="flex items-center gap-2 text-sm text-slate-500 font-medium"><span className="w-4 h-4 rounded-md bg-blue-50 flex items-center justify-center"><FiCreditCard size={9} className="text-blue-400" /></span>Total Paid</span><span className="text-sm font-bold text-blue-600">{formatCurrency(amountReceived)}</span></div>}
          <div className="pt-3">
            <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${isPaid ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"}`}>
              <div><p className={`text-[10px] font-black uppercase tracking-[0.1em] ${isPaid ? "text-emerald-600" : "text-rose-500"}`}>{isPaid ? "Fully Paid" : "Balance Due"}</p><p className="text-[10px] text-slate-500 font-medium mt-0.5">{isPaid ? "No dues remaining" : "To be collected"}</p></div>
              <span className={`text-xl font-black tabular-nums ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(Math.abs(outstandingBalance))}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// ORDER ITEM CARD — RBAC-aware action buttons
// ═════════════════════════════════════════════════════════════════════════════

const PriceCard = memo(({ label, value, note, strikethrough, variant = "default" }) => {
  const isSuccess = variant === "success";
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 hover:shadow-sm transition-all ${isSuccess ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300" : "bg-white border-slate-200 hover:border-slate-300"}`}>
      <div className={`absolute top-0 inset-x-0 h-0.5 rounded-t-xl ${isSuccess ? "bg-emerald-500" : "bg-blue-500"}`} />
      <p className={`text-[10px] font-black uppercase tracking-[0.12em] mb-2 ${isSuccess ? "text-emerald-700" : "text-slate-400"}`}>{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-lg font-black tabular-nums ${isSuccess ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
        {strikethrough && <span className="text-xs text-slate-400 line-through tabular-nums">{strikethrough}</span>}
      </div>
      {note && <p className={`text-[10px] font-medium mt-1 ${isSuccess ? "text-emerald-600" : "text-slate-400"}`}>{note}</p>}
    </div>
  );
});

const OrderItemCard = memo(({
  d, index, userCanViewPrice,
  onDeliveryUpdate, onCancelItem, onItemStatusUpdate,
  rolePermissions, userMap,
  orderStatus,
}) => {
  const stockNotes = formatStockNotes(d.notes);
  const discountNotes = formatDealerDiscountNotes(d.notes);
  const deliveryNotes = formatDeliveryNotes(d.delivery_notes);
  const cancellationHistory = d.cancellation_history || [];

  const totalOrdered = Number(d.total_qty_ordered ?? d.qty_ordered ?? 0);
  const delivered = Number(d.qty_delivered ?? 0);
  const cancelled = Number(d.qty_cancelled ?? d.total_cancelled_qty ?? 0);
  const balanceQty = Math.max(totalOrdered - delivered - cancelled, 0);
  const hasDiscount = !d.is_free && Number(d.total_dealer_discount) > 0;

  const isLocked = ["COMPLETED", "DELIVERED", "CANCELLED"].includes(d.status);
  const canCancelItem = !isLocked && balanceQty > 0 && rolePermissions?.canCancelItem;
  const parsedDelivery = d.delivery_date ? formatDeliveryDate(d.delivery_date) : null;

  const currentStatus = d.status.toUpperCase();
  const isProductionStatus = currentStatus === ORDER_STATUSES.PRODUCTION;

  const { hasUnpacked, hasProduction } = d.stock_flags || {};
  const showProductionBadge = isProductionStatus && (hasProduction || hasUnpacked);

  // Hide item status button when order is PENDING
  const isPendingOrder = orderStatus?.toUpperCase() === "PENDING";

  const canShowItemStatus = !isLocked && !isPendingOrder && rolePermissions?.canUpdateItemStatus;
  const canShowDeliveryUpdate = !isLocked && rolePermissions?.canUpdateItemDelivery;

  const actionBtns = [
    canShowItemStatus && {
      key: "status",
      label: "Update Item Status",
      icon: <FiFlag size={11} />,
      colorClass: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
      onClick: () => onItemStatusUpdate(index, d),
    },
    canShowDeliveryUpdate && {
      key: "delivery",
      label: "Update Delivery",
      icon: <FiTruck size={11} />,
      colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
      onClick: () => onDeliveryUpdate(index, d),
    },
    canCancelItem && {
      key: "cancel",
      label: "Cancel Item",
      icon: <FiXCircle size={11} />,
      colorClass: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100",
      onClick: () => onCancelItem(index, d),
    },
  ].filter(Boolean);

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${isLocked ? "border-slate-200 opacity-80" : "border-slate-200 hover:border-blue-200 hover:shadow-md"}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0"><FiPackage size={14} className="text-blue-500" /></div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{capitalizeFirstLetter(d.product_name)}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{[d.product_category, d.product_brand, d.product_model].filter(Boolean).map(capitalizeFirstLetter).join(" · ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {d.is_free && <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase">Free</span>}
          {showProductionBadge ? (
            <ProductionStatusBadge status="Production" subLine={hasUnpacked ? "Ready for packing" : null} variant="detail" />
          ) : (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(d?.status)}`}>{d?.status || "Unknown"}</span>
          )}
          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md hidden sm:inline">{d.product_id}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <QtyTracker ordered={totalOrdered} delivered={delivered} cancelled={cancelled} />

        {userCanViewPrice && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {!d.is_free && Number(d.unit_product_price) > 0 && <PriceCard label="Unit Price" value={formatCurrency(d.unit_product_price)} note="per unit" />}
            {!d.is_free && Number(d.total_price) > 0 && <PriceCard label="Total Price" value={formatCurrency(d.total_price)} strikethrough={hasDiscount && Number(d.total_product_price) > 0 ? formatCurrency(d.total_product_price) : null} note={hasDiscount ? "after dealer discount" : "total amount"} />}
            {hasDiscount && Number(d.total_dealer_discount) > 0 && <PriceCard label="Discount Saved" value={`− ${formatCurrency(d.total_dealer_discount)}`} note="dealer discount applied" variant="success" />}
          </div>
        )}

        {parsedDelivery && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
            <FiCalendar size={11} className="text-slate-400" />
            <span className="font-black text-slate-400 uppercase text-[9px] tracking-[0.1em]">Delivery Date</span>
            <span className="ml-auto font-semibold text-slate-700">{parsedDelivery.date} · {parsedDelivery.time}</span>
          </div>
        )}

        {stockNotes?.length > 0 && <NotesList title="Stock Notes" notes={stockNotes} />}
        {discountNotes?.length > 0 && <NotesList title="Dealer Discount Notes" notes={discountNotes} variant="purple" />}
        {deliveryNotes?.length > 0 && <DeliveryNotesCard title="Delivery Notes" color="blue" notes={deliveryNotes} />}

        {/* Cancellation History (NEW) */}
        {cancellationHistory.length > 0 && (
          <CancellationHistoryCard history={cancellationHistory} userMap={userMap} />
        )}

        {!isLocked && !isPendingOrder && actionBtns.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 mb-3">Item Actions</p>
            <div className="flex flex-wrap gap-2">
              {actionBtns.map((btn) => (
                <button key={btn.key} onClick={btn.onClick} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all active:scale-95 ${btn.colorClass}`}>
                  {btn.icon}{btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLocked && !isPendingOrder && actionBtns.length === 0 && rolePermissions && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400 font-medium italic text-center">View only — no actions available for your role</p>
          </div>
        )}
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// PAGE HEADER — RBAC-filtered action buttons
// ═════════════════════════════════════════════════════════════════════════════

const PageHeader = memo(({ order, userCanPrint, pdfLoading, onPrint, openStatusModal, openDelivery, openCancelOrder, openAddItems, canAddItems, submitting, rolePermissions }) => {
  const isTerminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(order?.status);
  const isPending = order?.status?.toUpperCase() === "PENDING";

  const currentStatus = order?.status?.toUpperCase();
  const isProductionStatus = currentStatus === ORDER_STATUSES.PRODUCTION;
  const hasProduction = order?.order_details?.some((d) => d?.stock_flags?.hasProduction === true);
  const hasUnpacked = order?.order_details?.some((d) => d?.stock_flags?.hasUnpacked === true);
  const showProductionBadge = isProductionStatus && (hasProduction || hasUnpacked);

  return (
    <div className="flex items-start sm:items-center gap-4 flex-wrap">
      <button type="button" onClick={() => window.history.back()} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group flex-shrink-0">
        <FiArrowLeft size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
      </button>

      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Order <span className="text-blue-600 font-mono">{order?.order_number}</span></h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getPriorityStyle(order?.priority)}`}>{order?.priority || "Normal"}</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getOrderStatusStyle(order?.status)}`}>{order?.status || "Unknown"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Created {order?.created_at ? formatDate(order.created_at) : "—"}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userCanPrint && (
            <button type="button" onClick={onPrint} disabled={pdfLoading} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
              {pdfLoading ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />Generating…</> : <><FiPrinter size={13} />Print / PDF</>}
            </button>
          )}

          {!isTerminal && (
            <>
              {/* Status & Priority: shown only when PENDING (mandatory), or when role allows + not production badge */}
              {rolePermissions?.canUpdateStatus && (isPending || !showProductionBadge) && (
                <button onClick={openStatusModal} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 disabled:opacity-50">
                  <FiActivity size={13} />
                  {isPending ? "Confirm Order" : "Status & Priority"}
                </button>
              )}

              {rolePermissions?.canUpdateDelivery && !isPending && (
                <button onClick={openDelivery} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-sm shadow-teal-200 disabled:opacity-50">
                  <FiCalendar size={13} />Delivery Schedule
                </button>
              )}

              {canAddItems && (
                <button onClick={openAddItems} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50">
                  <FiPlus size={13} />Add Items
                </button>
              )}

              {rolePermissions?.canCancelOrder && !isPending && (
                <button onClick={openCancelOrder} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 active:scale-95 transition-all shadow-sm shadow-rose-200 disabled:opacity-50">
                  <FiXCircle size={13} />Cancel Order
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SWAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const confirmCancelOrder = async () => {
  const { isConfirmed } = await Swal.fire({
    title: "Cancel Order",
    html: `<p class="text-sm text-slate-600 leading-relaxed">Are you sure you want to cancel this entire order?<br/><strong class="text-rose-600">This action cannot be undone.</strong></p>`,
    icon: "warning", showCancelButton: true,
    confirmButtonText: "Yes, Cancel Order", cancelButtonText: "Go Back",
    confirmButtonColor: "#e11d48", customClass: { popup: "rounded-2xl" },
  });
  return isConfirmed;
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const OrderDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const userCanPrint = canPrintOrder(user?.role);
  const userCanViewPrice = canViewOrderPrice(user?.role);
  const userCanViewDealerInfo = canViewDealerInformation(user?.role);
  const userCanViewFullDealerInfo = canViewFullDealerInformation(user?.role);
  const rolePermissions = useMemo(() => getRoleOrderPermissions(user?.role), [user?.role]);
  const permissions = useUpdateOrderPermissions();

  const [order, setOrder] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);

  const [modal, setModal] = useState({ name: null, itemIndex: null, itemData: null });
  const [addItemsOpen, setAddItemsOpen] = useState(false);

  // Add Items is allowed when:
  //  - the order isn't in a terminal state (DELIVERED/COMPLETED/CANCELLED/REJECTED)
  //  - AND the caller is the original creator OR has an admin-privileged role
  const canAddItems = useMemo(() => {
    if (!order) return false;
    const statusOk = !ADD_ITEMS_BLOCKED_STATUSES.includes(String(order.status).toUpperCase());
    const isPrivileged = ADMIN_PRIVILEGED_ROLES.includes(user?.role);
    return statusOk && isPrivileged;
  }, [order, user?.role]);

  const openItemModal = useCallback((name, index, data) => setModal({ name, itemIndex: index, itemData: data }), []);
  const openOrderModal = useCallback((name) => setModal({ name, itemIndex: null, itemData: null }), []);
  const closeModal = useCallback(() => setModal({ name: null, itemIndex: null, itemData: null }), []);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOrderById(id);
      if (res?.success && res?.data?.order) {
        setOrder(res.data.order);
      } else {
        setError(res?.message || "Failed to load order");
      }
    } catch {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUsersForMap = useCallback(async () => {
    try {
      const res = await fetchUsers({ page: 1, limit: 500, status: "active", includePassword: false, includeDealers: false });
      if (res?.success && Array.isArray(res?.data?.employees)) {
        setUserMap(res.data.employees.reduce((acc, u) => {
          if (u?.employee_id) acc[u.employee_id] = formatName(u.employee_name);
          return acc;
        }, {}));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadOrder(); fetchUsersForMap(); }, [loadOrder, fetchUsersForMap]);

  const handlePrint = useCallback(async () => {
    if (!order) return;
    setPdfLoading(true);
    try {
      let company = companyInfo;
      if (!company || Object.keys(company).length === 0) {
        const res = await fetchCompanyAddress();
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) { company = res.data[0]; setCompanyInfo(company); }
      }
      generateOrderPDF(order, company);
    } catch (err) {
      Swal.fire({ icon: "error", title: "PDF Generation Failed", text: err.message || "Could not generate PDF." });
    } finally {
      setPdfLoading(false);
    }
  }, [order, companyInfo]);

  const submitUpdate = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      const body = { order_number: order.order_number, ...payload };
      if (!body.delivery_date && order?.promised_delivery_date) {
        body.delivery_date = new Date(order.promised_delivery_date).toISOString();
      }
      const res = await updateOrderStatus(order.order_number, body);
      if (res?.success) {
        closeModal();
        toastSuccess("Updated Successfully");
        await loadOrder();
      } else {
        Swal.fire({ icon: "error", title: "Update Failed", text: res?.message || "Something went wrong." });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Network Error", text: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }, [order, closeModal, loadOrder]);

  const handleItemStatusSubmit = useCallback((payload) => {
    const detailNumber = modal.itemData?.order_details_number;
    if (!detailNumber) return;
    const existingDeliveryDate = modal.itemData?.delivery_date;
    const detail = { order_details_number: detailNumber, ...payload };
    if (!detail.delivery_date && existingDeliveryDate) {
      detail.delivery_date = new Date(existingDeliveryDate).toISOString();
    }
    submitUpdate({ order_details: [detail] });
  }, [modal.itemData, submitUpdate]);

  const handleDeliveryUpdateSubmit = useCallback((payload) => {
    const detailNumber = modal.itemData?.order_details_number;
    if (!detailNumber) return;
    const detail = { order_details_number: detailNumber };
    if (payload.delivery_date) detail.delivered_date = new Date(payload.delivery_date).toISOString();
    if (payload.delivery_note) detail.delivery_note = payload.delivery_note;
    if (payload.delivered_qty) detail.delivered_qty = payload.delivered_qty;
    submitUpdate({ order_details: [detail] });
  }, [modal.itemData, submitUpdate]);

  const handleCancelItemSubmit = useCallback((payload) => {
    const detailNumber = modal.itemData?.order_details_number;
    if (!detailNumber) return;
    const existingDeliveryDate = modal.itemData?.delivery_date;
    const detail = {
      order_details_number: detailNumber,
      cancel_qty: payload.cancel_qty,
      reason_for_cancellation: payload.reason_for_cancellation,
    };
    if (existingDeliveryDate) {
      detail.delivery_date = new Date(existingDeliveryDate).toISOString();
    }
    submitUpdate({ order_details: [detail] });
  }, [modal.itemData, submitUpdate]);

  const handleOrderStatusSubmit = useCallback((payload) => {
    if (Object.keys(payload).length === 0) { closeModal(); return; }
    submitUpdate(payload);
  }, [submitUpdate, closeModal]);

  const handleOrderDeliverySubmit = useCallback((form) => {
    const payload = {};
    if (form.promised_delivery_date) payload.delivery_date = new Date(form.promised_delivery_date).toISOString();
    if (form.delivery_note?.trim()) payload.delivery_note = form.delivery_note.trim();
    submitUpdate(payload);
  }, [submitUpdate]);

  const handleAddPaymentSubmit = useCallback((form) => {
    submitUpdate({ amount_paid: Number(form.amount_paid), payment_method: form.payment_method });
  }, [submitUpdate]);

  const handleCancelOrder = useCallback(async () => {
    const confirmed = await confirmCancelOrder();
    if (!confirmed) return;
    submitUpdate({ status: "CANCELLED" });
  }, [submitUpdate]);

  const totalUnits = useMemo(
    () => (order?.order_details || []).reduce((sum, item) => sum + Number(item?.total_qty_ordered ?? 0), 0),
    [order]
  );

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative w-10 h-10"><div className="absolute inset-0 border-4 border-blue-100 rounded-full" /><div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      <p className="text-sm text-slate-400 font-medium">Loading order details…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100"><FiAlertCircle size={24} className="text-rose-500" /></div>
      <p className="text-sm font-semibold text-rose-600">{error}</p>
    </div>
  );

  if (!order) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-sm text-slate-400">Order not found</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-screen-xl mx-auto">

      <PageHeader
        order={order}
        userCanPrint={userCanPrint}
        pdfLoading={pdfLoading}
        submitting={submitting}
        onPrint={handlePrint}
        openStatusModal={() => openOrderModal(MODAL.ORDER_STATUS)}
        openDelivery={() => openOrderModal(MODAL.ORDER_DELIVERY)}
        openCancelOrder={handleCancelOrder}
        openAddItems={() => setAddItemsOpen(true)}
        canAddItems={canAddItems}
        rolePermissions={rolePermissions}
      />

      <AddItemsModal
        isOpen={addItemsOpen}
        onClose={() => setAddItemsOpen(false)}
        order={order}
        onSuccess={(updatedOrder) => {
          if (updatedOrder) setOrder(updatedOrder);
          else loadOrder();
        }}
      />

      <SectionCard title="Order Summary" subtitle="Overview">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
          <InfoCell icon={<FiCalendar />} label="Created">{formatDate(order?.created_at)}</InfoCell>
          <InfoCell icon={<FiCalendar />} label="Updated">{formatDate(order?.updated_at)}</InfoCell>
          <InfoCell icon={<FiTruck />} label="Promised Delivery">{formatDate(order?.promised_delivery_date)}</InfoCell>
          <InfoCell icon={<FiCreditCard />} label="Payment Status">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide ${getPaymentStatusStyle(order?.payment_status)}`}>{order?.payment_status || "Unknown"}</span>
          </InfoCell>
          <InfoCell icon={<FiCreditCard />} label="Payment Type">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wide bg-slate-50 text-slate-600 border-slate-200">{order?.payment_type || "Unknown"}</span>
          </InfoCell>
          <InfoCell icon={<FiUser />} label="Salesman">
            <div className="flex flex-col"><span>{userMap[order?.salesman_id] || "Unknown"}</span>{order?.salesman_id && <span className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{order.salesman_id}</span>}</div>
          </InfoCell>
          <InfoCell icon={<FiUser />} label="Created By">
            <div className="flex flex-col"><span>{formatName(userMap[order?.created_by] || order?.created_by) || "Unknown"}</span>{order?.created_by && <span className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">{order.created_by}</span>}</div>
          </InfoCell>
        </div>
        {order?.order_note && (
          <div className="mt-5 mx-2 pt-5 border-t border-slate-100">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">Order Note</p>
            <p className="text-sm text-slate-700 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">{order.order_note}</p>
          </div>
        )}
      </SectionCard>

      {userCanViewDealerInfo && (
        <SectionCard title="Dealer Information" subtitle="Profile">
          <div className="grid sm:grid-cols-2 gap-1">
            <InfoCell icon={<FiUser />} label="Dealer Name">{order?.dealer?.employee_name ? formatName(order.dealer.employee_name) : null}</InfoCell>
            <InfoCell icon={<FiBox />} label="Shop Name">{order?.dealer?.shop_name ? capitalizeFirstLetter(order.dealer.shop_name) : null}</InfoCell>
            {userCanViewFullDealerInfo && (
              <>
                <InfoCell icon={<FiMail />} label="Email">{order?.dealer?.employee_email}</InfoCell>
                <InfoCell icon={<FiPhone />} label="Phone">{order?.dealer?.employee_phone}</InfoCell>
                <InfoCell icon={<FiMapPin />} label="Address">{order?.dealer?.address ? capitalizeFirstLetter(order.dealer.address) : null}</InfoCell>
              </>
            )}
          </div>
        </SectionCard>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-sm font-bold text-slate-800 tracking-tight">Order Items</h2><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mt-0.5">Products &amp; Details</p></div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide"><FiPackage size={10} />{totalUnits} {totalUnits === 1 ? "Unit" : "Units"}</span>
        </div>
        <div className="space-y-4">
          {order.order_details?.map((d, index) => (
            <OrderItemCard
              key={d.order_details_number}
              d={d}
              index={index}
              userCanViewPrice={userCanViewPrice}
              permissions={permissions}
              rolePermissions={rolePermissions}
              userMap={userMap}
              orderStatus={order.status}
              onItemStatusUpdate={(i, data) => openItemModal(MODAL.ITEM_STATUS, i, data)}
              onDeliveryUpdate={(i, data) => openItemModal(MODAL.DELIVERY, i, data)}
              onCancelItem={(i, data) => openItemModal(MODAL.CANCEL_ITEM, i, data)}
            />
          ))}
        </div>
      </section>

      <FinancialSummary
        order={order}
        canViewPrice={userCanViewPrice}
        canAddPayment={rolePermissions?.canAddPayment}
        submitting={submitting}
        onAddPayment={() => openOrderModal(MODAL.PAYMENT)}
      />

      {userCanViewPrice && order?.payment_notes?.length > 0 && (
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

      {/* MODALS */}
      <ItemStatusModal
        isOpen={modal.name === MODAL.ITEM_STATUS}
        onClose={closeModal}
        detail={modal.itemData}
        onSubmit={handleItemStatusSubmit}
        submitting={submitting}
        rolePermissions={rolePermissions}
      />
      <DeliveryUpdateModal isOpen={modal.name === MODAL.DELIVERY} onClose={closeModal} detail={modal.itemData} onSubmit={handleDeliveryUpdateSubmit} submitting={submitting} rolePermissions={rolePermissions} />
      <CancelItemModal isOpen={modal.name === MODAL.CANCEL_ITEM} onClose={closeModal} detail={modal.itemData} onSubmit={handleCancelItemSubmit} submitting={submitting} />
      <OrderStatusModal isOpen={modal.name === MODAL.ORDER_STATUS} onClose={closeModal} order={order} onSubmit={handleOrderStatusSubmit} submitting={submitting} rolePermissions={rolePermissions} />
      <OrderDeliveryModal isOpen={modal.name === MODAL.ORDER_DELIVERY} onClose={closeModal} order={order} onSubmit={handleOrderDeliverySubmit} submitting={submitting} />
      <AddPaymentModal isOpen={modal.name === MODAL.PAYMENT} onClose={closeModal} order={order} onSubmit={handleAddPaymentSubmit} submitting={submitting} />
    </div>
  );
};

export default OrderDetails;