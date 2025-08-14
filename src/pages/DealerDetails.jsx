import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox, FiCalendar, FiPackage, FiTruck } from 'react-icons/fi';
import { fetchDealerById } from '../api/dealer';
import { fetchOrders } from '../api/orders';

const DealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDealerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dealer details and orders concurrently
        const [dealerResponse, ordersResponse] = await Promise.all([
          fetchDealerById(id),
          fetchOrders()
        ]);

        if (dealerResponse.success) {
          setDealer(dealerResponse.data);
        } else {
          setError(dealerResponse.message || 'Failed to load dealer details');
          return;
        }

        if (ordersResponse.success) {
          // Filter orders for this specific dealer
          const filteredOrders = ordersResponse.data.filter(orderData => {
            const order = orderData.order;
            return order && order.dealer_id === id;
          });
          setDealerOrders(filteredOrders);
        } else {
          console.warn('Failed to load orders:', ordersResponse.message);
          setDealerOrders([]);
        }
      } catch (err) {
        console.error('Error loading dealer data:', err);
        setError('Failed to load dealer data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadDealerData();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

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

  const getTotalItems = (orderDetails) => {
    if (!orderDetails || !Array.isArray(orderDetails)) return 0;
    return orderDetails.reduce((total, item) => total + (item.qty_ordered || 0), 0);
  };

  // Calculate order statistics
  const orderStats = {
    total: dealerOrders.length,
    pending: dealerOrders.filter(orderData => orderData.order?.status === 'PENDING').length,
    inProduction: dealerOrders.filter(orderData => orderData.order?.status === 'IN PRODUCTION').length,
    packed: dealerOrders.filter(orderData => orderData.order?.status === 'PACKED').length,
    delivered: dealerOrders.filter(orderData => orderData.order?.status === 'DELIVERED').length,
    cancelled: dealerOrders.filter(orderData => orderData.order?.status === 'CANCELLED').length
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9333EA] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dealer details...</p>
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
            onClick={() => navigate('/dealers')} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-600 mb-4">Dealer not found</p>
          <button 
            onClick={() => navigate('/dealers')} 
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dealers')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dealer Details</h1>
          <p className="text-sm text-gray-500 mt-1">{dealer.employee_name}</p>
        </div>
      </div>

      {/* Dealer Information Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Dealer Information</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Personal and contact details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <FiUser className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiBox className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Shop Name</label>
                <p className="text-sm font-medium text-gray-900">{dealer.shop_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiPhone className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMail className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMapPin className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Location</label>
                <p className="text-sm font-medium text-gray-900">
                  {dealer.town}, {dealer.district}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMapPin className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Address</label>
                <p className="text-sm font-medium text-gray-900">{dealer.address || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiUser className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dealer.status === 'active' 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {dealer.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {dealer.brand && dealer.brand.length > 0 && (
              <div className="flex items-center gap-3">
                <FiBox className="text-gray-400" size={16} />
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Brands</label>
                  <div className="flex flex-wrap gap-1">
                    {dealer.brand.map((brand, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPackage className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Orders Summary</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Overview of dealer's orders</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Total Orders</p>
              <p className="text-2xl font-semibold text-blue-600">{orderStats.total}</p>
            </div>

            <div className="bg-yellow-50/50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium mb-1">Pending Orders</p>
              <p className="text-2xl font-semibold text-yellow-600">{orderStats.pending}</p>
            </div>

            <div className="bg-purple-50/50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium mb-1">In Production</p>
              <p className="text-2xl font-semibold text-purple-600">{orderStats.inProduction}</p>
            </div>

            <div className="bg-green-50/50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium mb-1">Delivered</p>
              <p className="text-2xl font-semibold text-green-600">{orderStats.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiTruck className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">All orders placed by this dealer</p>

          {dealerOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No orders found for this dealer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerOrders.map((orderData) => {
                    const order = orderData.order;
                    if (!order) return null;

                    return (
                      <tr key={order.order_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900 font-mono">{order.order_number}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {getTotalItems(order.order_details)} Items
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
                          <span className="text-sm text-gray-600">
                            {order.order_details?.[0]?.delivery_date 
                              ? formatDate(order.order_details[0].delivery_date)
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => navigate(`/orders/${order.order_number}`)}
                            className="text-sm font-medium text-[#9333EA] hover:text-[#7928CC] hover:bg-[#9333EA]/5 px-2 py-1 rounded transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealerDetails; 