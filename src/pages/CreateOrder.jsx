import React, { useState, useEffect } from 'react';
import { FiPlus, FiArrowLeft, FiTrash2, FiPackage, FiChevronDown, FiSend } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { fetchDealers, getDealerDiscountByProduct } from '../api/dealer';
import { fetchProductsByBrands } from '../api/products';
import { createOrder } from '../api/orders';
import { fetchSalespersons } from '../api/user';
import { getBrandsByDealer } from '../api/brands';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dealer_id: '',
    priority: 'MEDIUM',
    order_note: '',
    salesman_id: '',
    amount_paid: '',
    payment_method: 'CASH',
    order_details: [{ 
      product_id: '', 
      product_brand: '', 
      product_name: '', 
      product_model: '', 
      product_type: '',
      product_price: 0,
      discount_price: 0,
      qty_ordered: 1, 
      delivery_date: '',
      dealer_discount_id: '',
      is_product_sceme: false
    }]
  });

  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Fetch dealers and salespersons on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const promises = [fetchDealers()];
        
        // Only fetch salespersons if user can select salesman
        if (['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER'].includes(user?.role)) {
          promises.push(fetchSalespersons());
        }

        const responses = await Promise.all(promises);
        const [dealersResponse, salespersonsResponse] = responses;

        if (dealersResponse && dealersResponse.success && dealersResponse.data && dealersResponse.data.employees) {
          // Filter only dealers (ROLE_DEALER) from the employees array
          const dealerEmployees = dealersResponse.data.employees.filter(employee => employee.role === 'ROLE_DEALER');
          setDealers(dealerEmployees);
        } else {
          setDealers([]);
        }

        if (salespersonsResponse && salespersonsResponse.success && salespersonsResponse.data && salespersonsResponse.data.employees) {
          setSalespersons(salespersonsResponse.data.employees);
        } else {
          setSalespersons([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
        setDealers([]);
        setSalespersons([]);
      }
    };

    loadData();
  }, [user]);

  // Fetch brands and products when dealer is selected
  useEffect(() => {
    const loadProductsByDealer = async () => {
      if (!formData.dealer_id) {
        setProducts([]);
        setGroupedProducts([]);
        // Clear product selections when dealer is cleared
        setFormData(prev => ({
          ...prev,
          order_details: prev.order_details.map(item => ({
            ...item,
            product_id: '',
            product_brand: '',
            product_name: '',
            product_model: '',
            product_type: '',
            product_price: 0,
            discount_price: 0
          }))
        }));
        return;
      }

      setLoadingProducts(true);
      try {
        // First, fetch brands for the selected dealer
        const brandsResponse = await getBrandsByDealer(formData.dealer_id, 'active');
        
        if (brandsResponse && brandsResponse.success && Array.isArray(brandsResponse.data) && brandsResponse.data.length > 0) {
          // Extract brand names
          const brandNames = brandsResponse.data.map(brand => brand.brand_name);
          
          // Then, fetch products by brands
          const productsResponse = await fetchProductsByBrands(brandNames);
          
          if (productsResponse && productsResponse.success && Array.isArray(productsResponse.data)) {
            setProducts(productsResponse.data);
            
            // Group products by brand
            const grouped = brandNames.map(brandName => {
              const brandProducts = productsResponse.data.filter(product => product.brand === brandName);
              return {
                group: brandName,
                options: brandProducts.map(product => ({
                  value: product.product_id,
                  label: `${product.product_name} - ${product.model} (${product.product_type})`
                }))
              };
            }).filter(group => group.options.length > 0); // Only include brands with products
            
            setGroupedProducts(grouped);
            
            // Clear product selections when dealer changes (products list changes)
            setFormData(prev => ({
              ...prev,
              order_details: prev.order_details.map(item => ({
                ...item,
                product_id: '',
                product_brand: '',
                product_name: '',
                product_model: '',
                product_type: '',
                product_price: 0,
                discount_price: 0
              }))
            }));
          } else {
            setProducts([]);
            setGroupedProducts([]);
          }
        } else {
          setProducts([]);
          setGroupedProducts([]);
        }
      } catch (err) {
        console.error('Error loading products by dealer:', err);
        setProducts([]);
        setGroupedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProductsByDealer();
  }, [formData.dealer_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = async (index, field, value) => {
    const newOrderDetails = [...formData.order_details];
    newOrderDetails[index] = { ...newOrderDetails[index], [field]: value };
    
    // If product_id changed, update other product fields and fetch discount
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.product_id === value);
      if (selectedProduct) {
        newOrderDetails[index] = {
          ...newOrderDetails[index],
          product_brand: selectedProduct.brand || '',
          product_name: selectedProduct.product_name || '',
          product_model: selectedProduct.model || '',
          product_type: selectedProduct.product_type || '',
          product_price: selectedProduct.price || 0,
          discount_price: 0,
          dealer_discount_id: ''
        };

        // Fetch discount if dealer is selected
        if (formData.dealer_id && value) {
          try {
            const discountResponse = await getDealerDiscountByProduct(formData.dealer_id, value);
            if (discountResponse && discountResponse.success && discountResponse.data && discountResponse.data.length > 0) {
              // Get the first active discount (or first one if no active filter)
              const discount = discountResponse.data.find(d => d.status === 'active') || discountResponse.data[0];
              
              if (discount) {
                const basePrice = selectedProduct.price || 0;
                let calculatedDiscount = 0;
                
                if (discount.is_percentage) {
                  // Percentage discount
                  calculatedDiscount = (basePrice * discount.discount_value) / 100;
                } else {
                  // Fixed amount discount
                  calculatedDiscount = discount.discount_value;
                }
                
                newOrderDetails[index] = {
                  ...newOrderDetails[index],
                  discount_price: calculatedDiscount,
                  dealer_discount_id: discount.dealer_discount_id
                };
              }
            }
          } catch (err) {
            console.error('Error fetching discount:', err);
            // Continue without discount if fetch fails
          }
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      order_details: newOrderDetails
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      order_details: [...prev.order_details, { 
        product_id: '', 
        product_brand: '', 
        product_name: '', 
        product_model: '', 
        product_type: '',
        product_price: 0,
        discount_price: 0,
        qty_ordered: 1, 
        delivery_date: '',
        dealer_discount_id: '',
        is_product_sceme: false
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.order_details.length > 1) {
      setFormData(prev => ({
        ...prev,
        order_details: prev.order_details.filter((_, i) => i !== index)
      }));
    }
  };

  // Get minimum delivery date (tomorrow)
  const getMinDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Clear form after successful submission
  const clearForm = () => {
    setFormData({
      dealer_id: '',
      priority: 'MEDIUM',
      order_note: '',
      salesman_id: '',
      amount_paid: '',
      payment_method: 'CASH',
      order_details: [{ 
        product_id: '', 
        product_brand: '', 
        product_name: '', 
        product_model: '', 
        product_type: '',
        product_price: 0,
        discount_price: 0,
        qty_ordered: 1, 
        delivery_date: '',
        dealer_discount_id: '',
        is_product_sceme: false
      }]
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.dealer_id) {
        setError('Please select a dealer');
        return;
      }

      if (!formData.priority) {
        setError('Please select priority');
        return;
      }

      if (!formData.amount_paid || formData.amount_paid <= 0) {
        setError('Please enter a valid amount paid');
        return;
      }

      if (!formData.payment_method) {
        setError('Please select a payment method');
        return;
      }

      // Validate salesman_id based on user role
      if (canSelectSalesman && !formData.salesman_id) {
        setError('Please select a salesman');
        return;
      }

      // Validate order details
      for (let i = 0; i < formData.order_details.length; i++) {
        const item = formData.order_details[i];
        if (!item.product_id || !item.qty_ordered || !item.delivery_date) {
          setError(`Please fill all required fields for item ${i + 1}`);
          return;
        }
        if (item.qty_ordered <= 0) {
          setError(`Quantity must be greater than 0 for item ${i + 1}`);
          return;
        }
        
        // Validate delivery date
        const deliveryDate = new Date(item.delivery_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (deliveryDate < today) {
          setError(`Delivery date for item ${i + 1} cannot be in the past`);
          return;
        }
      }

      // Check if at least one item has valid data
      const validItems = formData.order_details.filter(item => 
        item.product_id && item.qty_ordered > 0 && item.delivery_date
      );
      
      if (validItems.length === 0) {
        setError('Please add at least one product to the order');
        return;
      }

      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Order Submission',
        text: `Are you sure you want to create this order with ${validItems.length} item(s)?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#9333EA',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Yes, Create Order',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        setLoading(false);
        return;
      }

      // Prepare API payload
      const payload = {
        dealer_id: formData.dealer_id,
        priority: formData.priority,
        order_note: formData.order_note,
        salesman_id: canSelectSalesman ? formData.salesman_id : user.employee_id,
        amount_paid: parseInt(formData.amount_paid),
        payment_method: formData.payment_method,
        order_details: validItems.map(item => ({
          product_id: item.product_id,
          product_brand: item.product_brand,
          product_name: item.product_name,
          product_model: item.product_model,
          product_type: item.product_type,
          product_price: item.product_price || 0,
          discount_price: item.discount_price || 0,
          qty_ordered: parseInt(item.qty_ordered),
          delivery_date: item.delivery_date,
          dealer_discount_id: item.dealer_discount_id || '',
          is_product_sceme: item.is_product_sceme || false
        }))
      };


      const response = await createOrder(payload);
      
      if (response && response.success) {
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Order Created Successfully! 🎉',
          text: response.message || 'Order has been created successfully!',
          confirmButtonText: 'OK',
        });
        
        // Navigate to orders page
        navigate('/orders');
        clearForm(); // Clear form after successful submission
      } else {
        setError(response.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = ['HIGH', 'MEDIUM', 'LOW'];
  const paymentMethodOptions = ['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER'];

  // Check if current user can select salesman (superadmin, admin, manager)
  const canSelectSalesman = ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER'].includes(user?.role);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Create New Order</h1>
            </div>
            <button
              type="submit"
              disabled={loading || !Array.isArray(dealers) || loadingProducts}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#7928CC] transition-colors text-sm font-medium inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend className="w-4 h-4" />
              {loading ? 'Creating Order...' : 'Submit Order'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              Loading dealers and products...
            </div>
          )}

          {/* Data Loading Error */}
          {!loading && !Array.isArray(dealers) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              Dealers failed to load. Please refresh the page or try again later.
            </div>
          )}

          {/* Products Loading State */}
          {loadingProducts && formData.dealer_id && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              Loading products for selected dealer...
            </div>
          )}

          {/* Products Loading Error */}
          {!loadingProducts && formData.dealer_id && groupedProducts.length === 0 && products.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              No products available for the selected dealer.
            </div>
          )}

          {/* Order Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-[#9333EA]/10 rounded-lg">
                  <FiPackage className="w-5 h-5 text-[#9333EA]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Enter the basic information for this order</p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Select Dealer <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="dealer_id"
                      value={formData.dealer_id}
                      onChange={handleChange}
                      options={['', ...(Array.isArray(dealers) ? dealers.map(dealer => ({
                        value: dealer.employee_id,
                        label: `${dealer.employee_name} - ${dealer.shop_name}`
                      })) : [])]}
                      placeholder={loading ? "Loading dealers..." : "Select a dealer"}
                      searchable={true}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      options={priorityOptions}
                      placeholder="Select priority"
                      disabled={loading}
                    />
                  </div>

                  {canSelectSalesman && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Select Salesman <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        name="salesman_id"
                        value={formData.salesman_id}
                        onChange={handleChange}
                        options={['', ...(Array.isArray(salespersons) ? salespersons.map(salesperson => ({
                          value: salesperson.employee_id,
                          label: salesperson.employee_name
                        })) : [])]}
                        placeholder={loading ? "Loading salesmen..." : "Select a salesman"}
                        searchable={true}
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Amount Paid <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount_paid"
                      value={formData.amount_paid}
                      onChange={handleChange}
                      placeholder="Enter amount"
                      min="0"
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      options={paymentMethodOptions}
                      placeholder="Select payment method"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="order_note"
                    value={formData.order_note}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter any special instructions or notes..."
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-[#9333EA]/10 rounded-lg">
                  <svg className="w-5 h-5 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Ordered Items</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Add products to this order</p>

              <div className="space-y-4">
                <div className="hidden lg:flex items-center gap-6 px-3">
                  <div className="flex-1 text-sm font-medium text-gray-700">Product</div>
                  <div className="w-20 text-sm font-medium text-gray-700">Quantity</div>
                  <div className="w-28 text-sm font-medium text-gray-700">Price</div>
                  <div className="w-28 text-sm font-medium text-gray-700">Discount</div>
                  <div className="w-32 text-sm font-medium text-gray-700">Delivery Date</div>
                  <div className="w-10"></div>
                </div>

                {formData.order_details.map((item, index) => (
                  <div key={index} className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex-1">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Product <span className="text-red-500">*</span></label>
                      <CustomSelect
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        options={formData.dealer_id && groupedProducts.length > 0 
                          ? groupedProducts 
                          : ['', ...(Array.isArray(products) ? products.map(product => ({
                              value: product.product_id,
                              label: `${product.product_name} - ${product.brand} (${product.model})`
                            })) : [])]}
                        placeholder={
                          !formData.dealer_id 
                            ? "Select dealer first" 
                            : loadingProducts 
                            ? "Loading products..." 
                            : "Select product"
                        }
                        searchable={true}
                        disabled={loading || loadingProducts || !formData.dealer_id}
                        grouped={formData.dealer_id && groupedProducts.length > 0}
                      />
                    </div>

                    <div className="w-full lg:w-20">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Quantity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={item.qty_ordered}
                        onChange={(e) => handleItemChange(index, 'qty_ordered', e.target.value)}
                        min="1"
                        placeholder="1"
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="w-full lg:w-28">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Price</label>
                      <input
                        type="number"
                        value={item.product_price}
                        onChange={(e) => handleItemChange(index, 'product_price', e.target.value)}
                        min="0"
                        placeholder="0"
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="w-full lg:w-28">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Discount Price</label>
                      <input
                        type="number"
                        value={item.discount_price}
                        onChange={(e) => handleItemChange(index, 'discount_price', e.target.value)}
                        min="0"
                        placeholder="0"
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="w-full lg:w-32">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Delivery Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={item.delivery_date}
                        onChange={(e) => handleItemChange(index, 'delivery_date', e.target.value)}
                        min={getMinDeliveryDate()}
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={formData.order_details.length === 1 || loading}
                      className="self-start lg:self-center text-red-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#9333EA] hover:bg-[#9333EA]/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiPlus className="w-4 h-4" />
                  Add More Item
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder; 