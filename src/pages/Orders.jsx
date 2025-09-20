import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBox, FiCalendar, FiChevronDown, FiCheck, FiEye, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { fetchOrders } from '../api/orders';

// Pagination Component
const OrdersPagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="border-t border-gray-100">
      <div className="px-4 lg:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
        <div className="flex items-center justify-center sm:justify-start">
          <span className="text-sm text-gray-600">
            Page <span className="font-medium text-gray-900">{currentPage}</span> of{' '}
            <span className="font-medium text-gray-900">{totalPages}</span>
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-400"
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, idx) => {
              const pageNumber = idx + 1;
              const isActive = pageNumber === currentPage;
              const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1 || pageNumber === 1 || pageNumber === totalPages;
              
              if (!isNearCurrent && pageNumber !== 1 && pageNumber !== totalPages) {
                if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={idx} className="inline-flex items-center justify-center w-9 h-9 text-gray-400">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={idx}
                  onClick={() => onPageChange(pageNumber)}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#9333EA] text-white'
                      : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          <button 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dealer: '',
    priority: 'Medium',
    notes: '',
    items: [{ product: '', quantity: 1, deliveryDate: '' }]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, deliveryDate: '' }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Order submitted:', formData);
    navigate('/orders');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="text-gray-500" size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
              <p className="text-sm text-gray-500 mt-1">Enter the basic information for this order</p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Dealer
                </label>
                <select
                  name="dealer"
                  value={formData.dealer}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  required
                >
                  <option value="">Select a dealer</option>
                  <option value="Green Energy Solutions">Green Energy Solutions</option>
                  <option value="Power Tech Distributors">Power Tech Distributors</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter any special instructions or notes..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2">
              <FiBox className="text-[#9333EA]" />
              <h2 className="text-lg font-semibold text-gray-900">Ordered Items</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">Add products to this order</p>

            <div className="mt-6 space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    >
                      <option value="">Select product</option>
                      <option value="SI-1KW">SI-1KW PowerMax X100</option>
                      <option value="SI-2KW">SI-2KW PowerMax X200</option>
                      <option value="BI-500W">BI-500W Voltron A50</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        value={item.deliveryDate}
                        onChange={(e) => handleItemChange(index, 'deliveryDate', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                        required
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="mt-4 inline-flex items-center gap-2 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
              >
                <FiPlus /> Add More Item
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors text-sm font-medium"
          >
            Submit Order
          </button>
        </div>
      </form>
    </div>
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const response = await fetchOrders();
        if (response.success) {
          setOrders(response.data);
        } else {
          setError(response.message || 'Failed to load orders');
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700';
      case 'low':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'in production':
        return 'bg-blue-50 text-blue-700';
      case 'packed':
        return 'bg-purple-50 text-purple-700';
      case 'delivered':
        return 'bg-green-50 text-green-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTotalItems = (orderDetails) => {
    if (!orderDetails || !Array.isArray(orderDetails)) return 0;
    return orderDetails.reduce((total, item) => total + (item.qty_ordered || 0), 0);
  };

  // Filter orders based on search query, status and priority
  const filteredOrders = orders.filter(orderData => {
    const order = orderData.order;
    if (!order) return false;
    
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.dealer?.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.dealer?.shop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All Statuses' || 
                         order.status === selectedStatus;
    
    const matchesPriority = selectedPriority === 'All Priorities' || 
                           order.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPriority]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-sm text-gray-500 mt-1">Total Orders: Loading...</p>
          </div>
          <button 
            onClick={() => navigate('/orders/create')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
          >
            <FiPlus className="text-lg" />
            Create New Order
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Orders List</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and track all orders</p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by Order ID, Dealer Name, or Shop Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  disabled
                />
              </div>
              <div className="flex items-center gap-3">
                <CustomSelect
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={['All Statuses', 'PENDING', 'IN PRODUCTION', 'PACKED', 'DELIVERED', 'CANCELLED']}
                  placeholder="Select status"
                  disabled
                />
                <CustomSelect
                  name="priority"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  options={['All Priorities', 'HIGH', 'MEDIUM', 'LOW']}
                  placeholder="Select priority"
                  disabled
                />
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA]"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Order Number</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Dealer Info</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Created Date</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Total Items</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Priority</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Order Note</th>
                      <th className="text-right py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((orderData) => {
                      const order = orderData.order;
                      if (!order) return null;
                      
                      return (
                        <tr key={order.order_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-gray-900 font-mono">{order.order_number}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{order.dealer?.employee_name || 'N/A'}</p>
                              <p className="text-gray-500">{order.dealer?.shop_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{order.dealer?.town}, {order.dealer?.district}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">
                              {getTotalItems(order.order_details)} items
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                              {order.priority || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                              {order.status || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600 max-w-xs truncate block" title={order.order_note || 'No notes'}>
                              {order.order_note || 'No notes'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => navigate(`/orders/${order.order_number}`)}
                              className="inline-flex items-center gap-1 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium hover:bg-[#9333EA]/5 px-2 py-1 rounded transition-colors"
                            >
                              <FiEye size={16} />
                              
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedOrders.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center">
                          <p className="text-sm text-gray-500">
                            {filteredOrders.length === 0 
                              ? 'No orders found matching your criteria' 
                              : `No orders on page ${currentPage}`
                            }
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Total Orders: {orders.length}</p>
        </div>
        <button 
          onClick={() => navigate('/orders/create')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Create New Order
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Orders List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and track all orders</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Order ID, Dealer Name, or Shop Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <CustomSelect
                name="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={['All Statuses', 'PENDING', 'IN PRODUCTION', 'PACKED', 'DELIVERED', 'CANCELLED']}
                placeholder="Select status"
              />
              <CustomSelect
                name="priority"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                options={['All Priorities', 'HIGH', 'MEDIUM', 'LOW']}
                placeholder="Select priority"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Order Number</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Dealer Info</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Created Date</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Total Items</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Priority</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Order Note</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((orderData) => {
                  const order = orderData.order;
                  if (!order) return null;
                  
                  return (
                    <tr key={order.order_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900 font-mono">{order.order_number}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{order.dealer?.employee_name || 'N/A'}</p>
                          <p className="text-gray-500">{order.dealer?.shop_name || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{order.dealer?.town}, {order.dealer?.district}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {getTotalItems(order.order_details)} items
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                          {order.priority || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                          {order.status || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 max-w-xs truncate block" title={order.order_note || 'No notes'}>
                          {order.order_note || 'No notes'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => navigate(`/orders/${order.order_number}`)}
                          className="inline-flex items-center gap-1 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium hover:bg-[#9333EA]/5 px-2 py-1 rounded transition-colors"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center">
                      <p className="text-sm text-gray-500">
                        {filteredOrders.length === 0 
                          ? 'No orders found matching your criteria' 
                          : `No orders on page ${currentPage}`
                        }
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <OrdersPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default function OrdersPage() {
  const location = useLocation();
  return location.pathname === '/orders/create' ? <CreateOrder /> : <Orders />;
} 