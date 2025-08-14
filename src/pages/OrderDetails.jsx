import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox, FiCalendar, FiPackage, FiTruck } from 'react-icons/fi';
import { fetchOrderById } from '../api/orders';

const OrderDetails = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await fetchOrderById(orderId);
        if (response.success) {
          setOrder(response.data.order);
        } else {
          setError(response.message || 'Failed to load order details');
        }
      } catch (err) {
        console.error('Error loading order details:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'in production':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'packed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getItemStatusStyle = (status) => {
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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9333EA] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
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
            onClick={() => navigate('/orders')} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-600 mb-4">Order not found</p>
          <button 
            onClick={() => navigate('/orders')} 
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="text-gray-500" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-500 mt-1">Order #{order.order_number}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityStyle(order.priority)}`}>
                  {order.priority || 'N/A'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(order.status)}`}>
                  {order.status || 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiCalendar className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Created Date</p>
                  <p className="text-sm text-gray-900">{formatDate(order.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiPackage className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Items</p>
                  <p className="text-sm text-gray-900">
                    {order.order_details?.reduce((total, item) => total + (item.qty_ordered || 0), 0) || 0} items
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiTruck className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Note</p>
                  <p className="text-sm text-gray-900">{order.order_note || 'No notes'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dealer Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiUser className="text-[#9333EA]" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Dealer Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FiUser className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-sm text-gray-900">{order.dealer?.employee_name || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiMail className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{order.dealer?.employee_email || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiPhone className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-sm text-gray-900">{order.dealer?.employee_phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FiBox className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Shop Name</p>
                    <p className="text-sm text-gray-900">{order.dealer?.shop_name || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiMapPin className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-sm text-gray-900">
                      {order.dealer?.town}, {order.dealer?.district}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <FiMapPin className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-sm text-gray-900">{order.dealer?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiBox className="text-[#9333EA]" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Brand</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Delivered</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Delivery Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_details?.map((item) => (
                    <tr key={item.order_details_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{item.product_brand}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{item.product_model}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{item.product_type}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900">{item.qty_ordered}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{item.qty_delivered}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{formatDate(item.delivery_date)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getItemStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!order.order_details || order.order_details.length === 0) && (
                    <tr>
                      <td colSpan="8" className="py-8 text-center">
                        <p className="text-sm text-gray-500">No order items found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails; 