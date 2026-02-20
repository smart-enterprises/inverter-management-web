import React, { useState, useEffect, useMemo } from 'react';
import {
  FiPlus,
  FiArrowLeft,
  FiTrash2,
  FiPackage,
  FiSend
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { fetchDealers, getDealerDiscountByProduct } from '../api/dealer';
import { fetchProductsByBrands } from '../api/products';
import { createOrder } from '../api/orders';
import { fetchSalespersons } from '../api/user';
import { getBrandsByDealer } from '../api/brands';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { PAYMENT_METHOD_OPTIONS, PRIORITY_OPTIONS } from '../utils/status';
import { INITIAL_FORM_STATE, INITIAL_ORDER_ITEM } from '../utils/constants';
import { canSelectSalesman } from '../utils/roles';

const CreateOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [dealers, setDealers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');

  const canSelectSalesmanPermission = useMemo(
    () => canSelectSalesman(user?.role),
    [user]
  );

  /* ============================= LOAD INITIAL DATA ============================= */
  
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const requests = [fetchDealers()];

        if (canSelectSalesmanPermission) {
          requests.push(fetchSalespersons());
        }

        const [dealerRes, salesRes] = await Promise.all(requests);

        if (dealerRes?.success && dealerRes?.data?.employees) {
          setDealers(
            dealerRes.data.employees.filter(
              (emp) => emp.role === 'ROLE_DEALER'
            )
          );
        }

        if (salesRes?.success && salesRes?.data?.employees) {
          setSalespersons(salesRes.data.employees);
        }
      } catch {
        setError('Failed to load initial data');
      }
    };

    loadInitialData();
  }, [canSelectSalesmanPermission]);

  /* ============================= LOAD PRODUCTS ============================= */

  useEffect(() => {
    const loadProducts = async () => {
      if (!formData.dealer_id) {
        setProducts([]);
        setGroupedProducts([]);
        return;
      }

      setLoadingProducts(true);

      try {
        const brandRes = await getBrandsByDealer(
          formData.dealer_id,
          'active'
        );

        if (!brandRes?.success || !brandRes?.data?.length) {
          setProducts([]);
          setGroupedProducts([]);
          return;
        }

        const brandNames = brandRes.data.map((b) => b.brand_name);
        const productRes = await fetchProductsByBrands(brandNames);

        if (productRes?.success && Array.isArray(productRes.data)) {
          setProducts(productRes.data);

          const grouped = brandNames
            .map((brand) => ({
              group: brand,
              options: productRes.data
                .filter((p) => p.brand === brand)
                .map((p) => ({
                  value: p.product_id,
                  label: `${p.product_name} - ${p.model} (${p.product_type})`
                }))
            }))
            .filter((g) => g.options.length > 0);

          setGroupedProducts(grouped);
        }
      } catch {
        setProducts([]);
        setGroupedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [formData.dealer_id]);

  /* ============================= HANDLERS ============================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...formData.order_details];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    if (field === 'product_id') {
      const selectedProduct = products.find(
        (p) => p.product_id === value
      );

      if (selectedProduct) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_brand: selectedProduct.brand,
          product_name: selectedProduct.product_name,
          product_model: selectedProduct.model,
          product_type: selectedProduct.product_type,
          product_price: selectedProduct.price,
          discount_price: 0
        };

        try {
          const discountRes = await getDealerDiscountByProduct(
            formData.dealer_id,
            value
          );

          if (discountRes?.success && discountRes.data?.length) {
            const discount = discountRes.data[0];

            const discountAmount = discount.is_percentage
              ? (selectedProduct.price * discount.discount_value) / 100
              : discount.discount_value;

            updatedItems[index].discount_price = discountAmount;
            updatedItems[index].dealer_discount_id =
              discount.dealer_discount_id;
          }
        } catch {
          setError('Failed to load discount data');
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      order_details: updatedItems
    }));
  };

  const addItem = () =>
    setFormData((prev) => ({
      ...prev,
      order_details: [...prev.order_details, { ...INITIAL_ORDER_ITEM }]
    }));

  const removeItem = (index) => {
    if (formData.order_details.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      order_details: prev.order_details.filter((_, i) => i !== index)
    }));
  };

  const getMinDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  /* ============================= SUBMIT ============================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const validItems = formData.order_details.filter(
        (i) =>
          i.product_id &&
          i.qty_ordered > 0 &&
          i.delivery_date
      );

      if (!validItems.length) {
        setError('Please add at least one valid product');
        return;
      }

      const confirm = await Swal.fire({
        title: 'Confirm Order Submission',
        text: `Create order with ${validItems.length} item(s)?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#9333EA'
      });

      if (!confirm.isConfirmed) return;

      const payload = {
        dealer_id: formData.dealer_id,
        priority: formData.priority,
        order_note: formData.order_note,
        delivered_date: formData.delivered_date || undefined,
        salesman_id: canSelectSalesmanPermission
          ? formData.salesman_id
          : user.employee_id,
        amount_paid: parseInt(formData.amount_paid) || 0,
        payment_method: formData.payment_method,
        order_details: validItems.map((item) => ({
          product_id: item.product_id,
          product_brand: item.product_brand,
          product_name: item.product_name,
          product_model: item.product_model,
          product_type: item.product_type,
          product_price: Number(item.product_price) || 0,
          discount_price: Number(item.discount_price) || 0,
          qty_ordered: parseInt(item.qty_ordered),
          delivery_date: item.delivery_date,
          is_product_scheme: item.is_product_scheme || false
        }))
      };

      const response = await createOrder(payload);

      if (response?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Order Created Successfully 🎉'
        });
        navigate('/orders');
      } else {
        setError(response?.message || 'Failed to create order');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ============================= UI ============================= */

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiArrowLeft />
              </button>
              <h1 className="text-2xl font-semibold">
                Create Order
              </h1>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#9333EA] text-white rounded-lg flex items-center gap-2"
            >
              <FiSend />
              {loading ? 'Creating...' : 'Submit Order'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
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
                  label: `${d.employee_name} - ${d.shop_name}`
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
                    label: s.employee_name
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
                className="border rounded-lg px-4 py-2.5"
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
              className="w-full border rounded-lg px-4 py-2.5"
            />
          </div>

          {/* ============================= ORDER ITEMS ============================= */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">

            <h2 className="text-lg font-semibold text-gray-800">
              Ordered Items
            </h2>

            {loadingProducts && (
              <div className="text-sm text-blue-600">
                Loading products...
              </div>
            )}

            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-7 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Discount</span>
              <span>Delivery Date</span>
              <span className="text-center">Scheme</span>
              <span></span>
            </div>

            {/* Order Items */}
            {formData.order_details.map((item, index) => (
              <div
                key={index}
                className="grid md:grid-cols-7 gap-4 items-center bg-gray-50/40 p-3 rounded-lg"
              >
                {/* Product */}
                <CustomSelect
                  value={item.product_id}
                  onChange={(e) =>
                    handleItemChange(index, 'product_id', e.target.value)
                  }
                  options={
                    groupedProducts.length
                      ? groupedProducts
                      : products.map((p) => ({
                          value: p.product_id,
                          label: `${p.product_name} (${p.brand})`
                        }))
                  }
                  placeholder="Select Product"
                  disabled={loadingProducts}
                />

                {/* Quantity */}
                <input
                  type="number"
                  min="1"
                  value={item.qty_ordered}
                  onChange={(e) =>
                    handleItemChange(index, 'qty_ordered', e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm"
                />

                {/* Unit Price */}
                <input
                  type="number"
                  min="0"
                  value={item.product_price}
                  onChange={(e) =>
                    handleItemChange(index, 'product_price', e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm"
                />

                {/* Discount */}
                <input
                  type="number"
                  min="0"
                  value={item.discount_price}
                  onChange={(e) =>
                    handleItemChange(index, 'discount_price', e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm"
                />

                {/* Delivery Date */}
                <input
                  type="date"
                  value={item.delivery_date}
                  min={getMinDeliveryDate()}
                  onChange={(e) =>
                    handleItemChange(index, 'delivery_date', e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm"
                />

                {/* Scheme Checkbox */}
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={item.is_product_scheme || false}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        'is_product_scheme',
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-[#9333EA] border-gray-300 rounded focus:ring-[#9333EA]"
                  />
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItem}
              className="text-[#9333EA] flex items-center gap-2 text-sm font-medium hover:opacity-80"
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