import React, { useState, useEffect } from 'react';
import { FiPlus, FiArrowLeft, FiTrash2, FiPackage, FiChevronDown, FiSend } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { fetchDealers } from '../api/dealer';
import { fetchProducts } from '../api/products';
import { createOrder } from '../api/orders';
import Swal from 'sweetalert2';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dealer_id: '',
    priority: 'MEDIUM',
    order_note: '',
    salesperson_id: '',
    order_details: [{ 
      product_id: '', 
      product_brand: '', 
      product_name: '', 
      product_model: '', 
      product_type: '', 
      qty_ordered: 0, 
      delivery_date: '' 
    }]
  });

  const [dealers, setDealers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch dealers and products on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dealersResponse, productsResponse] = await Promise.all([
          fetchDealers(),
          fetchProducts()
        ]);

        if (dealersResponse && dealersResponse.success && dealersResponse.data && dealersResponse.data.employees) {
          // Filter only dealers (ROLE_DEALER) from the employees array
          const dealerEmployees = dealersResponse.data.employees.filter(employee => employee.role === 'ROLE_DEALER');
          setDealers(dealerEmployees);
        } else {
          setDealers([]);
        }

        if (productsResponse && productsResponse.success && Array.isArray(productsResponse.data)) {
          setProducts(productsResponse.data);
        } else {
          console.warn('Products response structure:', productsResponse);
          setProducts([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load dealers and products');
        setDealers([]);
        setProducts([]);
      }
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newOrderDetails = [...formData.order_details];
    newOrderDetails[index] = { ...newOrderDetails[index], [field]: value };
    
    // If product_id changed, update other product fields
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.product_id === value);
      if (selectedProduct) {
        newOrderDetails[index] = {
          ...newOrderDetails[index],
          product_brand: selectedProduct.brand || '',
          product_name: selectedProduct.product_name || '',
          product_model: selectedProduct.model || '',
          product_type: selectedProduct.product_type || ''
        };
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
        qty_ordered: 0, 
        delivery_date: '' 
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
      salesperson_id: '',
      order_details: [{ 
        product_id: '', 
        product_brand: '', 
        product_name: '', 
        product_model: '', 
        product_type: '', 
        qty_ordered: 0, 
        delivery_date: '' 
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
        salesperson_id: formData.salesperson_id || 'N/A', // You might want to get this from user context
        order_details: validItems.map(item => ({
          product_id: item.product_id,
          product_brand: item.product_brand,
          product_name: item.product_name,
          product_model: item.product_model,
          product_type: item.product_type,
          qty_ordered: parseInt(item.qty_ordered),
          delivery_date: item.delivery_date
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
              disabled={loading || !Array.isArray(dealers) || !Array.isArray(products)}
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
          {!loading && (!Array.isArray(dealers) || !Array.isArray(products)) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              Some data failed to load. Please refresh the page or try again later.
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
                  <div className="w-32 text-sm font-medium text-gray-700">Quantity</div>
                  <div className="w-40 text-sm font-medium text-gray-700">Delivery Date</div>
                  <div className="w-10"></div>
                </div>

                {formData.order_details.map((item, index) => (
                  <div key={index} className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex-1">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Product <span className="text-red-500">*</span></label>
                      <CustomSelect
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        options={['', ...(Array.isArray(products) ? products.map(product => ({
                          value: product.product_id,
                          label: `${product.product_name} - ${product.brand} (${product.model})`
                        })) : [])]}
                        placeholder={loading ? "Loading products..." : "Select product"}
                        searchable={true}
                        disabled={loading}
                      />
                    </div>

                    <div className="w-full lg:w-32">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Quantity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={item.qty_ordered}
                        onChange={(e) => handleItemChange(index, 'qty_ordered', e.target.value)}
                        min="1"
                        placeholder="0"
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-1 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="w-full lg:w-40">
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