import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const DealerDetails = () => {
  const { id } = useParams();

  // This would normally come from an API
  const dealer = {
    name: "Green Energy Solutions",
    phone: "1234567890",
    email: "green@example.com",
    address: "123 Green St, Solar City",
    city: "Solar City",
    status: "Active",
    orders: {
      total: 2,
      ongoing: 2,
      completed: 0,
      cancelled: 0
    }
  };

  const orderHistory = [
    {
      id: "ORD-2025-0001",
      date: "06 Jun 2025",
      items: 3,
      priority: "High",
      status: "In Production",
      deliveryDate: "09 Jun 2025"
    },
    {
      id: "#3",
      date: "04 Jun 2025",
      items: 2,
      priority: "Low",
      status: "Billed",
      deliveryDate: "07 Jun 2025"
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/dealers"
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dealer Details</h1>
      </div>

      {/* Dealer Information Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Dealer Information</h2>
          <p className="text-sm text-gray-500 mb-6">Personal and contact details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Name</label>
              <p className="text-sm font-medium text-gray-900">{dealer.name}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Address</label>
              <p className="text-sm font-medium text-gray-900">{dealer.address}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
              <p className="text-sm font-medium text-gray-900">{dealer.phone}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">City & Pincode</label>
              <p className="text-sm font-medium text-gray-900">{dealer.city}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <p className="text-sm font-medium text-gray-900">{dealer.email}</p>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                {dealer.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Orders Summary</h2>
          <p className="text-sm text-gray-500 mb-6">Overview of dealer's orders</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Total Orders</p>
              <p className="text-2xl font-semibold text-blue-600">{dealer.orders.total}</p>
            </div>

            <div className="bg-yellow-50/50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium mb-1">Ongoing Orders</p>
              <p className="text-2xl font-semibold text-yellow-600">{dealer.orders.ongoing}</p>
            </div>

            <div className="bg-green-50/50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium mb-1">Completed Orders</p>
              <p className="text-2xl font-semibold text-green-600">{dealer.orders.completed}</p>
            </div>

            <div className="bg-red-50/50 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium mb-1">Cancelled Orders</p>
              <p className="text-2xl font-semibold text-red-600">{dealer.orders.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Order History</h2>
          <p className="text-sm text-gray-500 mb-6">All orders placed by this dealer</p>

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
                {orderHistory.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{order.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{order.date}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{order.items} Items</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.priority === 'High' 
                          ? 'bg-red-50 text-red-700'
                          : order.priority === 'Medium'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{order.status}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{order.deliveryDate}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-sm font-medium text-[#9333EA] hover:text-[#7928CC]"
                      >
                        Details
                      </Link>
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

export default DealerDetails; 