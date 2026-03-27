import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiPlus,
  FiArrowLeft,
  FiTrash2,
  FiSend,
  FiPackage,
  FiAlertCircle,
  FiShoppingCart,
  FiTag,
  FiDollarSign,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import { fetchDealerDiscounts, fetchDealers } from "../api/dealer";
import { fetchProductsByBrands } from "../api/products";
import { createOrder } from "../api/orders";
import { fetchUserByRole } from "../api/user";
import { getBrandsByDealer } from "../api/brands";
import { useAuth } from "../hooks/useAuth";
import Swal from "sweetalert2";
import { PAYMENT_METHOD_OPTIONS, PRIORITY_OPTIONS } from "../utils/status";
import { canSelectSalesman, ROLES } from "../utils/roles";
import {
  capitalizeFirstLetter,
  INITIAL_FORM_STATE,
  INITIAL_ORDER_ITEM,
} from "../utils/constants";

/* ================================================================
   REUSABLE — FORM FIELD WRAPPER WITH LABEL
   ================================================================ */

const Field = ({ label, required, children, hint }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {hint && (
        <span className="text-[10px] text-gray-300 font-medium">{hint}</span>
      )}
    </div>
    {children}
  </div>
);

/* ================================================================
   REUSABLE — SECTION CARD
   ================================================================ */

const SectionCard = ({ icon, title, subtitle, action, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-7 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl text-violet-500">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
    <div className="p-7">{children}</div>
  </div>
);

/* ================================================================
   REUSABLE — STYLED INPUT
   ================================================================ */

const StyledInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 placeholder-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${className}`}
  />
);

/* ================================================================
   PRODUCT DROPDOWN
   Custom dropdown showing: Product Name | Model | Type
   Uses position:fixed panel to avoid being clipped by overflow:hidden
   ================================================================ */

const ProductDropdown = ({ value, options, onChange, placeholder, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const panelRef = React.useRef(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        (o.product_name || "").toLowerCase().includes(q) ||
        (o.product_model || "").toLowerCase().includes(q) ||
        (o.product_type || "").toLowerCase().includes(q)
    );
  }, [search, options]);

  /* Position panel relative to trigger using fixed positioning */
  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = 300;

    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 400),
      zIndex: 9999,
      ...(spaceBelow >= panelHeight
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
    setIsOpen(true);
  };

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  /* Auto-focus search when opened */
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={isLoading}
        onClick={() => (isOpen ? (setIsOpen(false), setSearch("")) : openPanel())}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-left flex items-center justify-between gap-2 transition-all duration-200 ${isOpen
          ? "border-violet-400 ring-2 ring-violet-200"
          : "border-gray-200 hover:border-violet-300"
          } ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`truncate font-medium ${selected ? "text-gray-800" : "text-gray-400"
            }`}
        >
          {isLoading
            ? "Loading products…"
            : selected
              ? capitalizeFirstLetter(selected.product_name || selected.label || "")
              : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel — rendered via fixed positioning to escape overflow:hidden parents */}
      {isOpen && !isLoading && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-300/40 overflow-hidden"
        >
          {/* Search bar */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1111 5a6 6 0 016 6z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, model or type…"
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-400 bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Product Name
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Model
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Type
            </span>
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400 font-medium">
                No products found
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full grid grid-cols-[2fr_1fr_1fr] gap-3 items-center px-4 py-3 text-sm text-left transition-colors duration-150 border-b border-gray-50 last:border-0 ${value === opt.value
                    ? "bg-violet-50"
                    : "hover:bg-gray-50/80"
                    }`}
                >
                  <span
                    className={`font-semibold truncate text-sm ${value === opt.value ? "text-violet-700" : "text-gray-900"
                      }`}
                  >
                    {opt.product_name
                      ? capitalizeFirstLetter(opt.product_name)
                      : opt.label}
                  </span>
                  <span className="text-xs text-gray-500 font-medium truncate">
                    {opt.product_model
                      ? capitalizeFirstLetter(opt.product_model)
                      : <span className="text-gray-300">—</span>}
                  </span>
                  <span>
                    {opt.product_type ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                        {capitalizeFirstLetter(opt.product_type)}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================
   DEALER DISCOUNT DROPDOWN
   ================================================================ */

const DiscountDropdown = ({
  value,
  options,
  onChange,
  placeholder = "Select discount",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState({});

  const triggerRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const searchRef = React.useRef(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();

    return options.filter((o) =>
      o.label.toLowerCase().includes(q)
    );
  }, [search, options]);

  const openPanel = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = 260;

    setPanelStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(spaceBelow >= panelHeight
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });

    setIsOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          isOpen ? (setIsOpen(false), setSearch("")) : openPanel()
        }
        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-left flex items-center justify-between transition-all duration-200 ${isOpen
          ? "border-violet-400 ring-2 ring-violet-200"
          : "border-gray-200 hover:border-violet-300"
          }`}
      >
        <span
          className={`truncate font-medium ${selected ? "text-gray-800" : "text-gray-400"
            }`}
        >
          {selected ? selected.label : placeholder}
        </span>

        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""
            }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discount…"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-sm text-gray-400 text-center">
                No discounts found
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full px-4 py-3 text-left text-sm border-b last:border-0 ${value === opt.value
                    ? "bg-violet-50 text-violet-700"
                    : "hover:bg-gray-50"
                    }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ================================================================
   MAIN COMPONENT — CreateOrder
   ================================================================ */

const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [dealers, setDealers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [discountOptions, setDiscountOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState("");

  const canSelectSalesmanPermission = useMemo(
    () => canSelectSalesman(user?.role),
    [user?.role]
  );

  const getMinDeliveryDate = useCallback(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5); // add 5 days

    return date.toISOString().split("T")[0];
  }, []);

  /* ---- LOAD INITIAL DATA ---- */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const requests = [
          fetchDealers(),
          ...(canSelectSalesmanPermission ? [fetchUserByRole(ROLES.SALESMAN)] : []),
        ];
        const [dealerRes, salesRes] = await Promise.all(requests);

        if (dealerRes?.success && dealerRes?.data?.employees) {
          setDealers(
            dealerRes.data.employees.filter((emp) => emp.role === ROLES.DEALER)
          );
        }
        if (canSelectSalesmanPermission && salesRes?.success && salesRes?.data) {
          setSalespersons(salesRes.data);
        }
      } catch {
        setError("Failed to load initial data");
      }
    };
    loadInitialData();
  }, [canSelectSalesmanPermission]);

  /* ---- LOAD PRODUCTS WHEN DEALER CHANGES ---- */
  useEffect(() => {
    const loadProducts = async () => {
      if (!formData.dealer_id) {
        setProducts([]);
        return;
      }
      setLoadingProducts(true);
      try {
        const brandRes = await getBrandsByDealer(formData.dealer_id, "active");
        if (!brandRes?.success || !brandRes?.data?.length) {
          setProducts([]);
          return;
        }
        const brandNames = brandRes.data.map((b) => b.brand_name);
        const productRes = await fetchProductsByBrands(brandNames);
        if (productRes?.success && Array.isArray(productRes.data)) {
          setProducts(productRes.data);
        }
      } catch {
        setError("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [formData.dealer_id]);

  /* ---- HANDLE BASIC CHANGE ---- */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  /* ---- HANDLE ITEM CHANGE ---- */
  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index][field] = value;

    if (field === "product_id") {
      const selectedProduct = products.find((p) => p.product_id === value);
      if (selectedProduct) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: selectedProduct.product_id,
          product_brand: selectedProduct.brand,
          product_name: selectedProduct.product_name,
          product_model: selectedProduct.model,
          product_type: selectedProduct.product_type,
          product_price: selectedProduct.price,
          discount_price: 0,
          dealer_discount_id: null,
          delivery_date: getMinDeliveryDate(),
        };

        const discountRes = await fetchDealerDiscounts({
          dealer_id: formData.dealer_id,
          product_id: value,
        });

        setDiscountOptions((prev) => ({
          ...prev,
          [index]:
            discountRes?.success && discountRes?.data?.length
              ? discountRes.data
              : [],
        }));
      }
    }

    /* Dealer discount selected → clear manual discount */
    if (field === "dealer_discount_id") {
      updatedItems[index].dealer_discount_id = value || null;
      if (value) updatedItems[index].discount_price = 0;
    }

    /* Manual discount entered → clear dealer discount */
    if (field === "discount_price") {
      updatedItems[index].discount_price = Number(value) || 0;
      updatedItems[index].dealer_discount_id = null;
    }

    setFormData((prev) => ({ ...prev, order_details: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      order_details: [...prev.order_details, { ...INITIAL_ORDER_ITEM }],
    }));
  };

  const removeItem = (index) => {
    if (formData.order_details.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      order_details: prev.order_details.filter((_, i) => i !== index),
    }));
  };

  /* ---- SUBMIT ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const validItems = formData.order_details
        .filter(
          (i) => i.product_id && Number(i.qty_ordered) > 0 && i.delivery_date
        )
        .map((item) => {
          const payloadItem = {
            product_id: item.product_id,
            product_brand: item.product_brand,
            product_name: item.product_name,
            product_model: item.product_model,
            product_type: item.product_type,
            product_price: item.product_price,
            qty_ordered: Number(item.qty_ordered),
            delivery_date: item.delivery_date,
            is_product_scheme: item.is_product_scheme,
          };

          if (item.dealer_discount_id) {
            payloadItem.dealer_discount_id = item.dealer_discount_id;
          } else if (item.discount_price > 0) {
            payloadItem.discount_price = Number(item.discount_price);
          }

          return payloadItem;
        });

      if (!validItems.length) {
        setError("Add at least one valid product");
        setLoading(false);
        return;
      }

      const payload = {
        dealer_id: formData.dealer_id,
        priority: formData.priority,
        order_note: formData.order_note,
        salesman_id: canSelectSalesmanPermission
          ? formData.salesman_id
          : user.employee_id,
        amount_paid: Number(formData.amount_paid) || 0,
        payment_method: formData.payment_method,
        order_details: validItems,
      };

      const response = await createOrder(payload);

      if (response?.success) {
        await Swal.fire({ icon: "success", title: "Order Created Successfully 🎉" });
        navigate("/orders");
      } else {
        setError(response?.message || "Failed to create order");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---- Build product options with metadata ---- */
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.product_id,
        label: p.product_name,
        product_name: p.product_name,
        product_model: p.model,
        product_type: p.product_type,
      })),
    [products]
  );

  /* ================================================================
     FINANCIAL SUMMARY
     ================================================================ */

  const financialSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    formData.order_details.forEach((item, index) => {
      const qty = Number(item.qty_ordered) || 0;
      const price = Number(item.product_price) || 0;

      const itemTotal = qty * price;

      // 🟢 SCHEME PRODUCT → skip completely
      if (item.is_product_scheme) {
        return;
      }

      subtotal += itemTotal;

      // 🔹 Dealer discount (priority)
      const dealerDiscount = discountOptions[index]?.find(
        (d) => d.dealer_discount_id === item.dealer_discount_id
      );

      if (dealerDiscount) {
        if (dealerDiscount.is_percentage) {
          totalDiscount += (itemTotal * dealerDiscount.discount_value) / 100;
        } else {
          totalDiscount += dealerDiscount.discount_value;
        }
      }

      // 🔹 Manual discount (only if no dealer discount)
      else if (item.discount_price > 0) {
        totalDiscount += item.discount_price;
      }
    });

    const netAmount = subtotal - totalDiscount;
    const amountPaid = Number(formData.amount_paid) || 0;
    const balance = netAmount - amountPaid;

    return {
      subtotal,
      totalDiscount,
      netAmount,
      amountPaid,
      balance,
    };
  }, [formData, discountOptions]);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ================================================================
              HEADER
              ================================================================ */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
              >
                <FiArrowLeft
                  size={17}
                  className="text-gray-400 group-hover:text-gray-700 transition-colors"
                />
              </button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  Place Order
                </h1>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                  New Order
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
            >
              <FiSend size={14} />
              {loading ? "Creating…" : "Submit Order"}
            </button>
          </div>

          {/* ================================================================
              ERROR BANNER
              ================================================================ */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-semibold shadow-sm">
              <div className="p-1.5 bg-rose-100 rounded-lg flex-shrink-0">
                <FiAlertCircle size={14} className="text-rose-600" />
              </div>
              {error}
            </div>
          )}

          {/* ================================================================
              ORDER DETAILS SECTION
              ================================================================ */}
          <SectionCard
            icon={<FiFileText size={15} />}
            title="Order Details"
            subtitle="Basic Information"
          >
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

                <Field label="Dealer" required>
                  <CustomSelect
                    name="dealer_id"
                    value={formData.dealer_id}
                    onChange={handleChange}
                    options={dealers.map((d) => ({
                      value: d.employee_id,
                      label: `${capitalizeFirstLetter(d.employee_name)} — ${capitalizeFirstLetter(d.shop_name)}`,
                    }))}
                    placeholder="Select Dealer"
                    searchable
                  />
                </Field>

                <Field label="Priority" required>
                  <CustomSelect
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={PRIORITY_OPTIONS}
                  />
                </Field>

                {canSelectSalesmanPermission && (
                  <Field label="Salesman" required>
                    <CustomSelect
                      name="salesman_id"
                      value={formData.salesman_id}
                      onChange={handleChange}
                      options={salespersons.map((s) => ({
                        value: s.employee_id,
                        label: capitalizeFirstLetter(s.employee_name),
                      }))}
                      placeholder="Select Salesman"
                      searchable
                    />
                  </Field>
                )}

                <Field label="Amount Paid" hint="Optional">
                  <StyledInput
                    type="number"
                    name="amount_paid"
                    value={formData.amount_paid}
                    onChange={handleChange}
                    placeholder="0"
                    min={0}
                  />
                </Field>

                <Field label="Payment Method" required>
                  <CustomSelect
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    options={PAYMENT_METHOD_OPTIONS}
                  />
                </Field>
              </div>

              <Field label="Order Notes" hint="Optional">
                <textarea
                  name="order_note"
                  value={formData.order_note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Add any special instructions or notes for this order…"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm font-medium text-gray-800 placeholder-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all duration-200 resize-none"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ================================================================
              ORDER ITEMS SECTION
              ================================================================ */}
          <SectionCard
            icon={<FiShoppingCart size={15} />}
            title="Ordered Items"
            subtitle="Products"
            action={
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                <FiPackage size={10} />
                {formData.order_details.length}{" "}
                {formData.order_details.length === 1 ? "Item" : "Items"}
              </span>
            }
          >
            <div className="space-y-4">

              {/* ---- DESKTOP COLUMN HEADERS ---- */}
              <div className="hidden xl:grid xl:grid-cols-[minmax(200px,2fr)_76px_108px_154px_148px_140px_68px_38px] gap-3 px-4 pb-2.5 border-b border-gray-100">
                {[
                  { label: "Product", icon: <FiPackage size={10} /> },
                  { label: "Qty" },
                  { label: "Unit Price", icon: <FiDollarSign size={10} /> },
                  { label: "Dealer Discount", icon: <FiTag size={10} /> },
                  { label: "Manual Discount", icon: <FiDollarSign size={10} /> },
                  { label: "Delivery Date", icon: <FiCalendar size={10} /> },
                  { label: "Scheme", icon: <FiCheckSquare size={10} /> },
                  { label: "" },
                ].map((col, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {col.icon && <span className="text-gray-300">{col.icon}</span>}
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* ---- ITEM ROWS ---- */}
              {formData.order_details.map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-50/60 to-white border border-gray-200 rounded-2xl overflow-visible hover:border-violet-200 hover:shadow-sm transition-all duration-200"
                >
                  {/* Mobile header */}
                  <div className="xl:hidden flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                      Item #{index + 1}
                    </span>
                    {formData.order_details.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* ---- DESKTOP ROW ---- */}
                  <div className="hidden xl:grid xl:grid-cols-[minmax(200px,2fr)_76px_108px_154px_148px_140px_68px_38px] gap-3 items-center px-4 py-4">

                    {/* Product custom dropdown */}
                    <ProductDropdown
                      value={item.product_id}
                      options={productOptions}
                      onChange={(e) =>
                        handleItemChange(index, "product_id", e.target.value)
                      }
                      placeholder="Search product…"
                      isLoading={loadingProducts}
                    />

                    {/* Qty */}
                    <StyledInput
                      type="number"
                      min="1"
                      value={item.qty_ordered}
                      onChange={(e) =>
                        handleItemChange(index, "qty_ordered", e.target.value)
                      }
                      className="text-center px-2"
                    />

                    {/* Unit Price — read-only */}
                    <StyledInput
                      type="number"
                      value={item.product_price}
                      readOnly
                      className="text-right bg-gray-50 cursor-default px-2"
                    />

                    {/* Dealer Discount Dropdown */}
                    <DiscountDropdown
                      value={item.dealer_discount_id || ""}
                      onChange={(e) =>
                        handleItemChange(index, "dealer_discount_id", e.target.value)
                      }
                      options={
                        discountOptions[index]?.map((d) => ({
                          value: d.dealer_discount_id,
                          label: d.is_percentage
                            ? `${d.discount_value}%`
                            : `₹ ${d.discount_value}`,
                        })) || []
                      }
                    />

                    {/* Manual Discount — mutually exclusive with dealer discount */}
                    <div className="relative">
                      <StyledInput
                        type="number"
                        value={item.discount_price ?? ""}
                        disabled={!!item.dealer_discount_id}
                        onChange={(e) => {
                          const val = e.target.value;

                          handleItemChange(
                            index,
                            "discount_price",
                            val === "" ? "" : Number(val)
                          );
                        }}
                        className={`text-right pr-8 ${item.dealer_discount_id
                          ? "bg-gray-50 cursor-not-allowed text-gray-300"
                          : ""
                          }`}
                        placeholder={item.dealer_discount_id ? "—" : "₹ 0"}
                      />

                      {/* ✅ Clear button (only when active & editable) */}
                      {!item.dealer_discount_id && item.discount_price > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleItemChange(index, "discount_price", 0)
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 text-sm font-bold transition"
                          title="Clear discount"
                        >
                          ✕
                        </button>
                      )}

                      {/* ✅ Dealer discount overlay */}
                      {item.dealer_discount_id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl bg-gray-50/80">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            Dealer set
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delivery Date */}
                    <StyledInput
                      type="date"
                      min={getMinDeliveryDate()}
                      value={item.delivery_date}
                      onChange={(e) =>
                        handleItemChange(index, "delivery_date", e.target.value)
                      }
                      className="text-sm px-2"
                    />

                    {/* Scheme toggle */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleItemChange(
                            index,
                            "is_product_scheme",
                            !item.is_product_scheme
                          )
                        }
                        title={
                          item.is_product_scheme
                            ? "Remove scheme"
                            : "Mark as Product Scheme"
                        }
                        className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${item.is_product_scheme
                          ? "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200"
                          : "bg-white border-gray-200 text-gray-300 hover:border-violet-300 hover:text-violet-400"
                          }`}
                      >
                        <FiCheckSquare size={15} />
                      </button>
                      <input
                        type="checkbox"
                        checked={item.is_product_scheme || false}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "is_product_scheme",
                            e.target.checked
                          )
                        }
                        className="sr-only"
                      />
                    </div>

                    {/* Remove button */}
                    <div className="flex justify-center">
                      {formData.order_details.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200"
                          title="Remove item"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      ) : (
                        <div className="w-9" />
                      )}
                    </div>
                  </div>

                  {/* ---- MOBILE STACKED LAYOUT ---- */}
                  <div className="xl:hidden px-4 py-4 space-y-4">
                    <Field label="Product" required>
                      <ProductDropdown
                        value={item.product_id}
                        options={productOptions}
                        onChange={(e) =>
                          handleItemChange(index, "product_id", e.target.value)
                        }
                        placeholder="Search product…"
                        isLoading={loadingProducts}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Quantity" required>
                        <StyledInput
                          type="number"
                          min="1"
                          value={item.qty_ordered}
                          onChange={(e) =>
                            handleItemChange(index, "qty_ordered", e.target.value)
                          }
                          className="text-center"
                        />
                      </Field>
                      <Field label="Unit Price">
                        <StyledInput
                          type="number"
                          value={item.product_price}
                          readOnly
                          className="text-right bg-gray-50 cursor-default"
                        />
                      </Field>
                    </div>

                    <Field label="Dealer Discount">
                      {/* Dealer Discount Dropdown */}
                      <DiscountDropdown
                        value={item.dealer_discount_id || ""}
                        onChange={(e) =>
                          handleItemChange(index, "dealer_discount_id", e.target.value)
                        }
                        options={
                          discountOptions[index]?.map((d) => ({
                            value: d.dealer_discount_id,
                            label: d.is_percentage
                              ? `${d.discount_value}%`
                              : `₹ ${d.discount_value}`,
                          })) || []
                        }
                      />
                    </Field>

                    <Field
                      label="Manual Discount"
                      hint={
                        item.dealer_discount_id
                          ? "Disabled — dealer discount active"
                          : undefined
                      }
                    >
                      <div className="relative">

                        <StyledInput
                          type="number"
                          value={item.discount_price ?? ""}
                          disabled={!!item.dealer_discount_id}
                          onChange={(e) => {
                            const val = e.target.value;

                            handleItemChange(
                              index,
                              "discount_price",
                              val === "" ? "" : Number(val)
                            );
                          }}
                          className={`text-right pr-8 ${item.dealer_discount_id
                            ? "bg-gray-50 cursor-not-allowed text-gray-300"
                            : ""
                            }`}
                          placeholder={item.dealer_discount_id ? "—" : "₹ 0"}
                        />

                        {/* ✅ CLEAR BUTTON */}
                        {!item.dealer_discount_id && item.discount_price > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleItemChange(index, "discount_price", 0)
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 text-sm font-bold"
                            title="Clear discount"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </Field>

                    <Field label="Delivery Date" required>
                      <StyledInput
                        type="date"
                        min={getMinDeliveryDate()}
                        value={item.delivery_date}
                        onChange={(e) =>
                          handleItemChange(index, "delivery_date", e.target.value)
                        }
                      />
                    </Field>

                    {/* Scheme toggle mobile */}
                    <button
                      type="button"
                      onClick={() =>
                        handleItemChange(
                          index,
                          "is_product_scheme",
                          !item.is_product_scheme
                        )
                      }
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 w-full ${item.is_product_scheme
                        ? "bg-violet-50 border-violet-300 text-violet-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-violet-200"
                        }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${item.is_product_scheme
                          ? "bg-violet-600 border-violet-600 text-white"
                          : "border-gray-300 text-transparent"
                          }`}
                      >
                        <FiCheckSquare size={11} />
                      </div>
                      Product Scheme
                      <input
                        type="checkbox"
                        checked={item.is_product_scheme || false}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "is_product_scheme",
                            e.target.checked
                          )
                        }
                        className="sr-only"
                      />
                    </button>
                  </div>

                  {item.product_name && (
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">

                        {/* 🔹 LEFT SIDE — PRODUCT INFO */}
                        <div className="flex items-start gap-3">

                          <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                            <FiPackage size={14} className="text-violet-500" />
                          </div>

                          <div className="space-y-1">

                            {/* Product Name */}
                            <div className="text-sm font-bold text-gray-900">
                              {capitalizeFirstLetter(item.product_name)}
                            </div>

                            {/* Meta Info */}
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                              {item.product_brand && (
                                <span>{capitalizeFirstLetter(item.product_brand)}</span>
                              )}
                              {item.product_model && (
                                <>
                                  <span>•</span>
                                  <span>{capitalizeFirstLetter(item.product_model)}</span>
                                </>
                              )}
                            </div>

                            {/* Tags */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap">

                              {item.product_type && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                  {capitalizeFirstLetter(item.product_type)}
                                </span>
                              )}

                              {item.is_product_scheme && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Scheme
                                </span>
                              )}

                            </div>
                          </div>
                        </div>

                        {/* 🔹 RIGHT SIDE — PRICING */}
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">

                          {(() => {
                            const qty = Number(item.qty_ordered) || 0;
                            const price = Number(item.product_price) || 0;
                            const itemTotal = qty * price;

                            const dealerDiscount = discountOptions[index]?.find(
                              (d) => d.dealer_discount_id === item.dealer_discount_id
                            );

                            // 🟢 SCHEME PRODUCT
                            if (item.is_product_scheme) {
                              return (
                                <>
                                  <span className="text-xs text-gray-300 line-through">
                                    ₹ {itemTotal.toFixed(2)}
                                  </span>

                                  <span className="text-[10px] font-semibold text-emerald-600">
                                    Scheme Applied
                                  </span>

                                  <span className="text-lg font-bold text-emerald-600">
                                    FREE
                                  </span>
                                </>
                              );
                            }

                            // 💰 NORMAL PRODUCT
                            let finalAmount = itemTotal;
                            let discountLabel = null;

                            if (dealerDiscount) {
                              if (dealerDiscount.is_percentage) {
                                finalAmount -= (itemTotal * dealerDiscount.discount_value) / 100;
                                discountLabel = `${dealerDiscount.discount_value}% off`;
                              } else {
                                finalAmount -= dealerDiscount.discount_value;
                                discountLabel = `₹ ${dealerDiscount.discount_value} off`;
                              }
                            } else if (item.discount_price > 0) {
                              finalAmount -= item.discount_price;
                              discountLabel = `₹ ${item.discount_price} off`;
                            }

                            return (
                              <>
                                {/* Total */}
                                <span className="text-xs text-gray-400">
                                  ₹ {itemTotal.toFixed(2)}
                                </span>

                                {/* Discount */}
                                {discountLabel && (
                                  <span className="text-[10px] font-semibold text-rose-500">
                                    {discountLabel}
                                  </span>
                                )}

                                {/* Final */}
                                <span className="text-lg font-bold text-gray-900">
                                  ₹ {Math.max(0, finalAmount).toFixed(2)}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* ---- ADD ITEM BUTTON ---- */}
              <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/40 transition-all duration-200 group"
              >
                <div className="p-1 rounded-lg bg-gray-100 group-hover:bg-violet-100 transition-colors duration-200">
                  <FiPlus
                    size={13}
                    className="group-hover:text-violet-600 transition-colors"
                  />
                </div>
                Add Another Item
              </button>
            </div>

            {/* 💰 Financial Summary */}
            <div className="mt-6">
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                {/* 🔹 Top Glow Accent */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

                <div className="p-5 space-y-5">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-50 border border-violet-100">
                        <FiDollarSign className="text-violet-600" size={14} />
                      </div>
                      Order Summary
                    </h3>

                    {/* Balance Pill */}
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${financialSummary.balance > 0
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}>
                      {financialSummary.balance > 0 ? "Pending" : "Paid"}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100" />

                  {/* 💎 Breakdown */}
                  <div className="grid gap-3 text-sm">

                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-700">
                        ₹ {financialSummary.subtotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Discount */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-semibold text-rose-500">
                        − ₹ {financialSummary.totalDiscount.toLocaleString()}
                      </span>
                    </div>

                    {/* Net Amount */}
                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                      <span className="text-gray-600 font-semibold">Net Amount</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₹ {financialSummary.netAmount.toLocaleString()}
                      </span>
                    </div>

                    {/* Paid */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Paid</span>
                      <span className="font-semibold text-blue-600">
                        ₹ {financialSummary.amountPaid.toLocaleString()}
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-gray-700 font-semibold">Balance</span>

                      <div className="flex flex-col items-end">
                        <span className={`text-xl font-extrabold ${financialSummary.balance > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                          }`}>
                          ₹ {financialSummary.balance.toLocaleString()}
                        </span>

                        <span className="text-[10px] text-gray-400 font-medium">
                          {financialSummary.balance > 0
                            ? "Amount due"
                            : "No dues"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 💡 Footer Insight */}
                  {financialSummary.totalDiscount > 0 && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">
                      🎉 You saved ₹ {financialSummary.totalDiscount.toLocaleString()} on this order
                    </div>
                  )}

                </div>
              </div>
            </div>
          </SectionCard>

          {/* ================================================================
              STICKY FOOTER
              ================================================================ */}
          <div className="sticky bottom-6 z-20 flex justify-end pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/80 px-6 py-3.5 ring-1 ring-gray-100">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-sm text-gray-500 font-semibold hidden sm:block">
                {formData.order_details.length}{" "}
                {formData.order_details.length === 1 ? "item" : "items"} added
              </span>
              <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200"
              >
                <FiSend size={13} />
                {loading ? "Creating…" : "Place Order"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateOrder;
