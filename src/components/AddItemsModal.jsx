// AddItemsModal.jsx — append new line items to an existing order
// Uses the same Brand → Model → Product cascade as CreateOrder.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiX, FiPlus, FiTrash2, FiAlertCircle, FiCalendar } from "react-icons/fi";
import CustomSelect from "./CustomSelect";
import { getBrandsByDealer } from "../api/brands";
import { fetchProductsByBrands } from "../api/products";
import { addItemsToOrder } from "../api/orders";
import { toastSuccess } from "../utils/toast";
import { capitalizeFirstLetter, formatName } from "../utils/constants";

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyItem = () => ({
  brand: "",
  model: "",
  product_id: "",
  qty_ordered: 1,
  delivery_date: todayISO(),
});

const AddItemsModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [items, setItems] = useState([emptyItem()]);
  const [brands, setBrands] = useState([]);   // [{brand_name, brand_models: [..]}]
  const [products, setProducts] = useState([]); // [{product_id, brand, model, ...}]
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    if (isOpen) { setItems([emptyItem()]); setError(""); }
  }, [isOpen]);

  /* Lookups */
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

  /* Mutators */
  const updateRow = useCallback((index, patch) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const handleBrandChange = (index, brand) => {
    updateRow(index, { brand, model: "", product_id: "" });
  };

  const handleModelChange = (index, model) => {
    updateRow(index, { model, product_id: "" });
  };

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (index) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const totalPreview = useMemo(() => {
    return items.reduce((sum, it) => {
      const p = productMap[it.product_id];
      const qty = Number(it.qty_ordered) || 0;
      return sum + (Number(p?.price) || 0) * qty;
    }, 0);
  }, [items, productMap]);

  const validate = () => {
    if (!items.length) return "Add at least one item.";
    for (const [i, it] of items.entries()) {
      if (!it.brand) return `Row ${i + 1}: pick a brand.`;
      if (!it.model) return `Row ${i + 1}: pick a model.`;
      if (!it.product_id) return `Row ${i + 1}: pick a product.`;
      const qty = Number(it.qty_ordered);
      if (!Number.isInteger(qty) || qty < 1) return `Row ${i + 1}: qty must be a positive integer.`;
      if (!it.delivery_date) return `Row ${i + 1}: delivery date is required.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await addItemsToOrder(
        order.order_number,
        items.map((it) => ({
          product_id: it.product_id,
          qty_ordered: Number(it.qty_ordered),
          delivery_date: it.delivery_date,
        }))
      );

      if (res?.success) {
        toastSuccess(`✅ ${items.length} item${items.length === 1 ? "" : "s"} added.`);
        onSuccess?.(res.data?.order);
        onClose();
      } else {
        setError(res?.message || "Failed to add items.");
      }
    } catch (e) {
      const fieldErrors = e?.response?.data?.errors;
      if (fieldErrors?.length) {
        setError(fieldErrors.map((f) => `${f.field}: ${f.message}`).join(" • "));
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to add items.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiPlus size={16} className="text-blue-500" /> Add Items
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Order <span className="font-mono">{order?.order_number}</span> · Dealer {formatName(order?.dealer?.employee_name) || dealerId}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading brands & products…</span>
            </div>
          ) : brands.length === 0 ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <FiAlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
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

              return (
                <div key={index} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Item {index + 1}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeRow(index)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition">
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Brand → Model → Product cascade */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Brand</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`brand_${index}`}
                          value={item.brand}
                          onChange={(e) => handleBrandChange(index, e.target.value)}
                          options={brandOptions}
                          placeholder="Select brand"
                          searchable
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Model</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`model_${index}`}
                          value={item.model}
                          onChange={(e) => handleModelChange(index, e.target.value)}
                          options={modelOpts}
                          placeholder={item.brand ? "Select model" : "Pick a brand first"}
                          searchable
                          disabled={!item.brand}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Product</label>
                      <div className="mt-1">
                        <CustomSelect
                          name={`product_${index}`}
                          value={item.product_id}
                          onChange={(e) => updateRow(index, { product_id: e.target.value })}
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
                    </div>
                  </div>

                  {/* Qty + delivery */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Qty</label>
                      <input
                        type="number" min={1} step={1}
                        value={item.qty_ordered}
                        onChange={(e) => updateRow(index, { qty_ordered: e.target.value })}
                        className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Delivery Date</label>
                      <div className="relative mt-1">
                        <FiCalendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          min={todayISO()}
                          value={item.delivery_date}
                          onChange={(e) => updateRow(index, { delivery_date: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>

                  {product && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{product.product_type || "—"}</span>
                      <span className="font-semibold text-slate-700">
                        ₹{(Number(product.price) * Number(item.qty_ordered || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {!loading && brands.length > 0 && (
            <button onClick={addRow} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-center gap-1.5">
              <FiPlus size={12} /> Add another item
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              <FiAlertCircle size={13} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs text-slate-500">
            <span className="font-semibold">{items.length}</span> {items.length === 1 ? "item" : "items"} · est.{" "}
            <span className="font-bold text-slate-700">₹{totalPreview.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loading || brands.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Adding…
                </>
              ) : (
                <><FiPlus size={12} /> Add to order</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddItemsModal;
