// AddItemsModal.jsx — append new line items to an existing order
// Uses the same Brand → Model → Product → Discount cascade as CreateOrder.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdAdd,
  MdCalendarMonth,
  MdClose,
  MdDeleteOutline,
  MdErrorOutline,
  MdExpandMore,
} from "react-icons/md";
import CustomSelect from "./CustomSelect";
import { getBrandsByDealer } from "../api/brands";
import { fetchProductsByBrands } from "../api/products";
import { fetchDealerDiscounts } from "../api/dealer";
import { addItemsToOrder } from "../api/orders";
import { toastSuccess, toastError } from "../utils/toast";
import { capitalizeFirstLetter, formatName } from "../utils/constants";

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyItem = () => ({
  brand: "",
  model: "",
  product_id: "",
  qty_ordered: 1,
  delivery_date: todayISO(),
  discount_price: 0,
  dealer_discount_id: null,
});

// ─── Discount Field ───────────────────────────────────────────────────────────

const DiscountField = ({ item, index, discountOptions, maxPrice, onDealerChange, onManualChange, onClear }) => {
  const [mode, setMode] = useState(() =>
    item.dealer_discount_id ? "dealer" : item.discount_price > 0 ? "manual" : "none"
  );
  const [dropOpen, setDropOpen] = useState(false);

  const options = useMemo(() => discountOptions[index] || [], [discountOptions, index]);
  const selected = options.find((o) => o.dealer_discount_id === item.dealer_discount_id);

  const handleModeSwitch = (m) => {
    setMode(m);
    onClear(index);
  };

  const hasDiscount = item.dealer_discount_id || item.discount_price > 0;

  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex gap-1.5">
        {["none", "dealer", "manual"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
              mode === m
                ? "m3-solid-primary"
                : "m3-surface-container-high-bg m3-on-surface-variant hover:bg-slate-200"
            }`}
          >
            {m === "none" ? "No Discount" : m === "dealer" ? "Dealer" : "Manual"}
          </button>
        ))}
        {hasDiscount && (
          <button
            type="button"
            onClick={() => { onClear(index); setMode("none"); }}
            className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dealer discount dropdown */}
      {mode === "dealer" && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropOpen((p) => !p)}
            className="w-full flex items-center justify-between px-3 py-2 border m3-outline-variant-border rounded-lg m3-surface-bg text-xs font-semibold m3-on-surface hover:border-blue-300 transition-all"
          >
            <span className={selected ? "m3-on-surface" : "m3-on-surface-variant"}>
              {selected
                ? `${selected.is_percentage ? `${selected.discount_value}%` : `₹ ${selected.discount_value}`} off`
                : options.length === 0 ? "No discounts available" : "Pick discount…"}
            </span>
            <MdExpandMore size={12} className={`transition-transform ${dropOpen ? "rotate-180" : ""}`} />
          </button>
          {dropOpen && options.length > 0 && (
            <div className="absolute z-50 mt-1 w-full m3-surface-bg border m3-outline-variant-border rounded-xl shadow-xl overflow-hidden">
              {options.map((opt) => (
                <button
                  key={opt.dealer_discount_id}
                  type="button"
                  onClick={() => { onDealerChange(index, opt.dealer_discount_id); setDropOpen(false); }}
                  className={`w-full px-3 py-2.5 text-left text-xs font-semibold border-b border-slate-50 last:border-0 transition-colors ${
                    item.dealer_discount_id === opt.dealer_discount_id
                      ? "bg-blue-50 text-blue-700"
                      : "hover:m3-surface-container-low-bg m3-on-surface"
                  }`}
                >
                  <span className="font-black">
                    {opt.is_percentage ? `${opt.discount_value}%` : `₹ ${opt.discount_value}`}
                  </span>
                  {opt.description && (
                    <span className="ml-2 m3-on-surface-variant font-medium">{opt.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual discount */}
      {mode === "manual" && (
        <div>
          <input
            type="text"
            inputMode="decimal"
            placeholder={maxPrice ? `Max ₹${Number(maxPrice).toLocaleString("en-IN")}` : "Enter discount amount (₹)"}
            value={item.discount_price || ""}
            onKeyDown={(e) => {
              const nav = ["Backspace","Delete","ArrowLeft","ArrowRight","Home","End","Tab"];
              if (nav.includes(e.key)) return;
              if (/^[0-9]$/.test(e.key)) return;
              if (e.key === "." && !e.target.value.includes(".")) return;
              if ((e.ctrlKey || e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
              e.preventDefault();
            }}
            onChange={(e) => {
              let val = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
              if (maxPrice && val !== "" && parseFloat(val) > Number(maxPrice)) {
                val = String(Number(maxPrice));
              }
              onManualChange(index, val);
            }}
            className="w-full px-3 py-2 text-sm border m3-outline-variant-border rounded-lg m3-surface-bg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
          {maxPrice && (
            <p className="text-[10px] m3-on-surface-variant mt-1">Max discount: ₹{Number(maxPrice).toLocaleString("en-IN")}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const AddItemsModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [items, setItems] = useState([emptyItem()]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [discountOptions, setDiscountOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const dealerId = order?.dealer_id;

  useEffect(() => {
    if (!isOpen || !dealerId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const brandRes = await getBrandsByDealer(dealerId, "active");
        if (!brandRes?.success || !brandRes?.data?.length) {
          setBrands([]); setProducts([]);
          setError("No brands assigned to this dealer.");
          return;
        }
        setBrands(brandRes.data);
        const brandNames = brandRes.data.map((b) => b.brand_name);
        const prodRes = await fetchProductsByBrands(brandNames);
        if (prodRes?.success && Array.isArray(prodRes.data)) {
          setProducts(prodRes.data.filter((p) => p.status === "active"));
        } else {
          setProducts([]);
        }
      } catch {
        setError("Failed to load brands or products.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, dealerId]);

  useEffect(() => {
    if (isOpen) { setItems([emptyItem()]); setDiscountOptions({}); setError(""); setFieldErrors({}); }
  }, [isOpen]);

  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.brand_name, label: b.brand_name })),
    [brands]
  );

  const modelsByBrand = useMemo(() => {
    const m = {};
    brands.forEach((b) => { m[b.brand_name] = b.brand_models || []; });
    return m;
  }, [brands]);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => { m[p.product_id] = p; });
    return m;
  }, [products]);

  const getModelOptions = (brand) =>
    (modelsByBrand[brand] || []).map((m) => ({ value: m, label: m }));

  const getProductOptions = (brand, model) =>
    products
      .filter((p) => (!brand || p.brand === brand) && (!model || p.model === model))
      .map((p) => ({
        value: p.product_id,
        label: capitalizeFirstLetter(p.product_name),
        subLabel: `${p.brand} · ${p.model} · ₹${Number(p.price || 0).toLocaleString("en-IN")}`,
      }));

  const updateRow = useCallback((index, patch) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const handleBrandChange = (index, brand) => {
    updateRow(index, { brand, model: "", product_id: "", discount_price: 0, dealer_discount_id: null });
    setDiscountOptions((prev) => { const n = { ...prev }; delete n[index]; return n; });
  };

  const handleModelChange = (index, model) => {
    updateRow(index, { model, product_id: "", discount_price: 0, dealer_discount_id: null });
    setDiscountOptions((prev) => { const n = { ...prev }; delete n[index]; return n; });
  };

  const handleProductChange = useCallback(async (index, productId) => {
    updateRow(index, { product_id: productId, discount_price: 0, dealer_discount_id: null });
    setDiscountOptions((prev) => { const n = { ...prev }; delete n[index]; return n; });
    if (productId && dealerId) {
      const res = await fetchDealerDiscounts({ dealer_id: dealerId, product_id: productId });
      setDiscountOptions((prev) => ({
        ...prev,
        [index]: res?.success && res?.data?.length ? res.data : [],
      }));
    }
  }, [dealerId, updateRow]);

  const handleDealerDiscount = (index, dealerDiscountId) => {
    updateRow(index, { dealer_discount_id: dealerDiscountId || null, discount_price: 0 });
  };

  const handleManualDiscount = (index, value) => {
    updateRow(index, { discount_price: Number(value) || 0, dealer_discount_id: null });
  };

  const handleClearDiscount = (index) => {
    updateRow(index, { dealer_discount_id: null, discount_price: 0 });
  };

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);

  const removeRow = (index) => {
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
    setDiscountOptions((prev) => {
      const n = { ...prev };
      delete n[index];
      const out = {};
      Object.entries(n).forEach(([k, v]) => {
        const ki = Number(k);
        out[ki > index ? ki - 1 : ki] = v;
      });
      return out;
    });
  };

  const totalPreview = useMemo(() => {
    return items.reduce((sum, it) => {
      const p = productMap[it.product_id];
      const qty = Number(it.qty_ordered) || 0;
      return sum + (Number(p?.price) || 0) * qty;
    }, 0);
  }, [items, productMap]);

  const validate = () => {
    const errs = {};
    items.forEach((it, i) => {
      const row = {};
      if (!it.brand) row.brand = "Select a brand";
      if (!it.model) row.model = "Select a model";
      if (!it.product_id) row.product_id = "Select a product";
      const qty = parseInt(String(it.qty_ordered).replace(/[^0-9]/g, ""), 10);
      if (!qty || qty < 1) row.qty_ordered = "Enter a valid quantity";
      if (!it.delivery_date) row.delivery_date = "Select a delivery date";
      if (Object.keys(row).length) errs[i] = row;
    });
    return errs;
  };

  const clearFieldError = (index, field) => {
    setFieldErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const next = { ...prev, [index]: { ...prev[index] } };
      delete next[index][field];
      if (!Object.keys(next[index]).length) delete next[index];
      return next;
    });
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      toastError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = items.map((it) => {
        const qty = parseInt(String(it.qty_ordered).replace(/[^0-9]/g, ""), 10);
        const p = {
          product_id: it.product_id,
          qty_ordered: qty,
          delivery_date: it.delivery_date,
        };
        if (it.dealer_discount_id) {
          p.dealer_discount_id = it.dealer_discount_id;
        } else {
          const disc = parseFloat(String(it.discount_price).replace(/[^0-9.]/g, ""));
          if (!isNaN(disc) && disc > 0) p.discount_price = disc;
        }
        return p;
      });

      const res = await addItemsToOrder(order.order_number, payload);

      if (res?.success) {
        toastSuccess(`✅ ${items.length} item${items.length === 1 ? "" : "s"} added.`);
        onSuccess?.(res.data?.order);
        onClose();
      } else {
        setError(res?.message || "Failed to add items.");
      }
    } catch (e) {
      const apiErrors = e?.response?.data?.errors;
      if (apiErrors?.length) {
        setError(apiErrors.map((f) => `${f.field}: ${f.message}`).join(" • "));
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to add items.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center m3-scrim backdrop-blur-sm px-4">
      <div className="m3-surface-bg border m3-outline-variant-border rounded-2xl m3-elevation-3 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b m3-outline-variant-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold m3-on-surface flex items-center gap-2">
              <MdAdd size={16} className="text-blue-500" /> Add Items
            </h2>
            <p className="text-xs m3-on-surface-variant mt-0.5">
              Order <span className="font-mono">{order?.order_number}</span> · Dealer {formatName(order?.dealer?.employee_name) || dealerId}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg m3-on-surface-variant hover:m3-surface-container-high-bg hover:m3-on-surface transition-all">
            <MdClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10 m3-on-surface-variant">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading brands & products…</span>
            </div>
          ) : brands.length === 0 ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <MdErrorOutline size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold">No brands available</p>
                <p className="mt-0.5">{error || "This dealer has no assigned brands."}</p>
              </div>
            </div>
          ) : (
            items.map((item, index) => {
              const product = productMap[item.product_id];
              const modelOpts = getModelOptions(item.brand);
              const productOpts = getProductOptions(item.brand, item.model);

              const rowErr = fieldErrors[index] || {};

              return (
                <div key={index} className={`border rounded-xl p-3.5 m3-surface-container-low-bg space-y-2.5 ${Object.keys(rowErr).length ? "border-rose-300" : "m3-outline-variant-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] m3-on-surface-variant">
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeRow(index)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition">
                        <MdDeleteOutline size={12} />
                      </button>
                    )}
                  </div>

                  {/* Brand → Model → Product */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant">Brand</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`brand_${index}`}
                          value={item.brand}
                          onChange={(e) => { handleBrandChange(index, e.target.value); clearFieldError(index, "brand"); }}
                          options={brandOptions}
                          placeholder="Select brand"
                          searchable
                        />
                      </div>
                      {rowErr.brand && <p className="text-xs text-rose-500 font-semibold mt-1">{rowErr.brand}</p>}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant">Model</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`model_${index}`}
                          value={item.model}
                          onChange={(e) => { handleModelChange(index, e.target.value); clearFieldError(index, "model"); }}
                          options={modelOpts}
                          placeholder={item.brand ? "Select model" : "Pick a brand first"}
                          searchable
                          disabled={!item.brand}
                        />
                      </div>
                      {rowErr.model && <p className="text-xs text-rose-500 font-semibold mt-1">{rowErr.model}</p>}
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant">Product</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`product_${index}`}
                          value={item.product_id}
                          onChange={(e) => { handleProductChange(index, e.target.value); clearFieldError(index, "product_id"); }}
                          options={productOpts}
                          placeholder={
                            !item.brand ? "Pick a brand first"
                              : !item.model ? "Pick a model first"
                                : productOpts.length === 0 ? "No products for this brand/model"
                                  : "Select product"
                          }
                          searchable
                          disabled={!item.brand || !item.model || productOpts.length === 0}
                        />
                      </div>
                      {rowErr.product_id && <p className="text-xs text-rose-500 font-semibold mt-1">{rowErr.product_id}</p>}
                    </div>
                  </div>

                  {/* Qty + Delivery Date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant">Qty</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.qty_ordered}
                        onKeyDown={(e) => {
                          const nav = ["Backspace","Delete","ArrowLeft","ArrowRight","Home","End","Tab"];
                          if (nav.includes(e.key)) return;
                          if (/^[0-9]$/.test(e.key)) return;
                          if ((e.ctrlKey || e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
                          e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          updateRow(index, { qty_ordered: val === "" ? "" : Math.max(1, parseInt(val, 10)) });
                          clearFieldError(index, "qty_ordered");
                        }}
                        className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg m3-surface-bg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${rowErr.qty_ordered ? "border-rose-400" : "m3-outline-variant-border"}`}
                      />
                      {rowErr.qty_ordered && <p className="text-xs text-rose-500 font-semibold mt-1">{rowErr.qty_ordered}</p>}
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant">Delivery Date</label>
                      <div className="relative mt-1">
                        <MdCalendarMonth size={12} className="absolute left-3 top-1/2 -translate-y-1/2 m3-on-surface-variant pointer-events-none" />
                        <input
                          type="date"
                          min={todayISO()}
                          value={item.delivery_date}
                          onChange={(e) => { updateRow(index, { delivery_date: e.target.value }); clearFieldError(index, "delivery_date"); }}
                          className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg m3-surface-bg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${rowErr.delivery_date ? "border-rose-400" : "m3-outline-variant-border"}`}
                        />
                      </div>
                      {rowErr.delivery_date && <p className="text-xs text-rose-500 font-semibold mt-1">{rowErr.delivery_date}</p>}
                    </div>
                  </div>

                  {/* Discount */}
                  {item.product_id && (
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] m3-on-surface-variant mb-1.5 block">Discount</label>
                      <DiscountField
                        item={item}
                        index={index}
                        discountOptions={discountOptions}
                        maxPrice={product?.price}
                        onDealerChange={handleDealerDiscount}
                        onManualChange={handleManualDiscount}
                        onClear={handleClearDiscount}
                      />
                    </div>
                  )}

                  {/* Row total */}
                  {product && (
                    <div className="flex items-center justify-between text-[11px] m3-on-surface-variant pt-1 border-t m3-outline-variant-border">
                      <span>{product.product_type || "—"}</span>
                      <span className="font-semibold m3-on-surface">
                        ₹{(Number(product.price) * Number(item.qty_ordered || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {!loading && brands.length > 0 && (
            <button
              onClick={addRow}
              className="w-full py-2.5 border-2 border-dashed m3-outline-variant-border rounded-xl text-xs font-bold m3-on-surface-variant hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-center gap-1.5"
            >
              <MdAdd size={12} /> Add another item
            </button>
          )}

          {Object.keys(fieldErrors).length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              <MdErrorOutline size={13} className="flex-shrink-0 mt-0.5" />
              Fill in all required fields highlighted in red before submitting.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              <MdErrorOutline size={13} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t m3-outline-variant-border flex items-center justify-between m3-surface-container-low-bg">
          <div className="text-xs m3-on-surface-variant">
            <span className="font-semibold">{items.length}</span> {items.length === 1 ? "item" : "items"} · est.{" "}
            <span className="font-bold m3-on-surface">₹{totalPreview.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold m3-on-surface-variant hover:m3-surface-container-high-bg rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loading || brands.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold m3-solid-primary rounded-lg active:scale-95 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Adding…
                </>
              ) : (
                <><MdAdd size={12} /> Add to order</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddItemsModal;
