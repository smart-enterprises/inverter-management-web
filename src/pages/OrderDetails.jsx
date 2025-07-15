import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const OrderDetails = () => {
  const { id } = useParams();

  // This would normally come from an API
  const order = {
    id: 'ORD-2025-0001',
    dealer: 'Green Energy Solutions',
    orderDate: '06 Jun 2025',
    status: 'In Production',
    priority: 'High',
    deliveryAddress: '123 Green St, Solar City',
    expectedDelivery: '09 Jun 2025',
    totalQuantity: '3 items',
    notes: 'Urgent delivery needed',
    items: [
      {
        id: 1,
        name: 'Solar Inverter 1kW',
        brand: 'PowerMax',
        model: 'X100',
        type: 'AL',
        quantity: 2,
        deliveryDate: '09 Jun 2025',
        status: 'Packed'
      },
      {
        id: 2,
        name: 'Battery Inverter 500W',
        brand: 'Voltron',
        model: 'A50',
        type: 'CO',
        quantity: 1,
        deliveryDate: '09 Jun 2025',
        status: 'New'
      }
    ]
  };

  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'in production':
        return 'bg-blue-50 text-blue-700';
      case 'packed':
        return 'bg-purple-50 text-purple-700';
      case 'new':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority.toLowerCase()) {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/orders"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="text-gray-500" size={20} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order Details</h1>
      </div>

      {/* Order Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Order #{order.id}</h2>
          <p className="text-sm text-gray-500 mb-6">Order details and summary</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Dealer</label>
              <p className="text-sm font-medium text-gray-900">{order.dealer}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Delivery Address</label>
              <p className="text-sm font-medium text-gray-900">{order.deliveryAddress}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Order Date</label>
              <p className="text-sm font-medium text-gray-900">{order.orderDate}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Expected Delivery</label>
              <p className="text-sm font-medium text-gray-900">{order.expectedDelivery}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Total Quantity</label>
              <p className="text-sm font-medium text-gray-900">{order.totalQuantity}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Priority</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                {order.priority}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Notes</label>
              <p className="text-sm font-medium text-gray-900">{order.notes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ordered Items Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Ordered Items</h2>
          <p className="text-sm text-gray-500 mb-6">Products included in this order</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{item.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.brand}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.model}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.type}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.quantity}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{item.deliveryDate}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails; 