import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FiPlus, FiArrowLeft, FiTrash2, FiSend } from "react-icons/fi";
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
import { capitalizeFirstLetter, INITIAL_FORM_STATE, INITIAL_ORDER_ITEM } from "../utils/constants";

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

  /* ================= DELIVERY DATE ================= */

  const getMinDeliveryDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  /* ================= LOAD INITIAL DATA ================= */

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const requests = [
          fetchDealers(),
          ...(canSelectSalesmanPermission
            ? [fetchUserByRole(ROLES.SALESMAN)]
            : []),
        ];

        const [dealerRes, salesRes] = await Promise.all(requests);

        if (dealerRes?.success && dealerRes?.data?.employees) {
          setDealers(
            dealerRes.data.employees.filter(
              (emp) => emp.role === ROLES.DEALER
            )
          );
        }

        if (
          canSelectSalesmanPermission &&
          salesRes?.success &&
          salesRes?.data
        ) {
          setSalespersons(salesRes.data);
        }
      } catch {
        setError("Failed to load initial data");
      }
    };

    loadInitialData();
  }, [canSelectSalesmanPermission]);

  /* ================= LOAD PRODUCTS WHEN DEALER CHANGES ================= */

  useEffect(() => {
    const loadProducts = async () => {
      if (!formData.dealer_id) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        const brandRes = await getBrandsByDealer(
          formData.dealer_id,
          "active"
        );

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

  /* ================= HANDLE BASIC CHANGE ================= */

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  /* ================= HANDLE ITEM CHANGE ================= */

  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index][field] = value;

    /* PRODUCT SELECTED */
    if (field === "product_id") {
      const selectedProduct = products.find(
        (p) => p.product_id === value
      );

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

    /* DEALER DISCOUNT SELECTED */
    if (field === "dealer_discount_id") {
      updatedItems[index].dealer_discount_id = value || null;
      if (value) updatedItems[index].discount_price = 0;
    }

    /* MANUAL DISCOUNT OVERRIDES DEALER DISCOUNT */
    if (field === "discount_price") {
      updatedItems[index].discount_price = Number(value) || 0;
      updatedItems[index].dealer_discount_id = null;
    }

    setFormData((prev) => ({
      ...prev,
      order_details: updatedItems,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      order_details: [
        ...prev.order_details,
        { ...INITIAL_ORDER_ITEM },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.order_details.length === 1) return;

    setFormData((prev) => ({
      ...prev,
      order_details: prev.order_details.filter(
        (_, i) => i !== index
      ),
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const validItems = formData.order_details
        .filter(
          (i) =>
            i.product_id &&
            Number(i.qty_ordered) > 0 &&
            i.delivery_date
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
            payloadItem.dealer_discount_id =
              item.dealer_discount_id;
          } else if (item.discount_price > 0) {
            payloadItem.discount_price =
              Number(item.discount_price);
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
        await Swal.fire({
          icon: "success",
          title: "Order Created Successfully 🎉",
        });
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

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FiArrowLeft />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">
                Create Order
              </h1>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#9333EA] hover:bg-[#7E22CE] transition text-white rounded-lg flex items-center gap-2 shadow-sm"
            >
              <FiSend />
              {loading ? "Creating..." : "Submit Order"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* ORDER DETAILS */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold">
              Order Details
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <CustomSelect
                name="dealer_id"
                value={formData.dealer_id}
                onChange={handleChange}
                options={dealers.map((d) => ({
                  value: d.employee_id,
                  label: `${capitalizeFirstLetter(d.employee_name)} - ${capitalizeFirstLetter(d.shop_name)}`,
                }))}
                placeholder="Select Dealer"
              />

              <CustomSelect
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                options={PRIORITY_OPTIONS}
              />

              {canSelectSalesmanPermission && (
                <CustomSelect
                  name="salesman_id"
                  value={formData.salesman_id}
                  onChange={handleChange}
                  options={salespersons.map((s) => ({
                    value: s.employee_id,
                    label: capitalizeFirstLetter(s.employee_name),
                  }))}
                  placeholder="Select Salesman"
                />
              )}

              <input
                type="number"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                placeholder="Amount Paid"
                className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-200 outline-none"
              />

              <CustomSelect
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                options={PAYMENT_METHOD_OPTIONS}
              />
            </div>

            <textarea
              name="order_note"
              value={formData.order_note}
              onChange={handleChange}
              rows={3}
              placeholder="Order Notes"
              className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-200 outline-none"
            />
          </div>

          {/* ORDER ITEMS */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">
              Ordered Items
            </h2>

            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-8 gap-6 text-sm font-semibold text-gray-600 border-b pb-3">
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit Price</span>
              <span>Dealer Discount</span>
              <span className="text-right">Manual Discount</span>
              <span>Delivery Date</span>
              <span className="text-center">Scheme</span>
              <span></span>
            </div>

            {formData.order_details.map((item, index) => (
              <div
                key={index}
                className="grid md:grid-cols-8 gap-4 items-center bg-gray-50 p-3 rounded-lg mt-3"
              >
                <CustomSelect
                  value={item.product_id}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "product_id",
                      e.target.value
                    )
                  }
                  options={products.map((p) => ({
                    value: p.product_id,
                    label: p.product_name,
                  }))}
                  placeholder="Search Product..."
                  isSearchable
                  isLoading={loadingProducts}
                />

                <input
                  type="number"
                  min="1"
                  value={item.qty_ordered}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "qty_ordered",
                      e.target.value
                    )
                  }
                  className="border rounded px-3 py-2 text-center"
                />

                <input
                  type="number"
                  value={item.product_price}
                  readOnly
                  className="border rounded px-3 py-2 bg-gray-100 text-right"
                />

                <CustomSelect
                  value={item.dealer_discount_id || ""}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "dealer_discount_id",
                      e.target.value
                    )
                  }
                  options={
                    discountOptions[index]?.map((d) => ({
                      value: d.dealer_discount_id,
                      label: d.is_percentage
                        ? `${d.discount_value}%`
                        : `₹  ${d.discount_value}`,
                    })) || []
                  }
                  placeholder="Select Discount"
                  isSearchable
                />

                <input
                  type="number"
                  value={item.discount_price}
                  disabled={!!item.dealer_discount_id}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "discount_price",
                      e.target.value
                    )
                  }
                  className={`border rounded-lg px-3 py-2 text-right ${item.dealer_discount_id
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                    }`}
                />

                <input
                  type="date"
                  min={getMinDeliveryDate()}
                  value={item.delivery_date}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "delivery_date",
                      e.target.value
                    )
                  }
                  className="border rounded-lg px-3 py-2"
                />

                <div className="flex justify-center">
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
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-600 transition"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="text-[#9333EA] hover:text-[#7E22CE] flex items-center gap-2 text-sm mt-4 transition"
            >
              <FiPlus />
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder;