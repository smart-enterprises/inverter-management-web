import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { fetchOrders } from '../api/orders';
import { ORDER_STATUS_LIST } from '../utils/status';

/* ============================= */
/* Pagination Component */
/* ============================= */

const OrdersPagination = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-between items-center">
      <span className="text-sm text-gray-600">
        Page <span className="font-medium">{currentPage}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50"
        >
          <FiChevronLeft />
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-9 h-9 rounded-lg border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50"
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

/* ============================= */
/* Orders Page */
/* ============================= */

const Orders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  /* ============================= */
  /* Fetch Orders (Backend Pagination) */
  /* ============================= */

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);

        const response = await fetchOrders({
          page: pagination.page,
          limit: pagination.limit,
          status:
            selectedStatus !== 'ALL'
              ? selectedStatus
              : undefined,
        });

        if (response.success) {
          setOrders(response.data || []);
          setPagination((prev) => ({
            ...prev,
            totalPages: response.pagination?.totalPages || 1,
            total: response.pagination?.total || 0,
          }));
        } else {
          setError(response.message || 'Failed to load orders');
        }
      } catch {
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [pagination.limit, pagination.page, selectedStatus]);

  /* ============================= */
  /* Utility Functions */
  /* ============================= */

  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-50 text-red-700';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700';
      case 'LOW':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700';
      case 'CONFIRMED':
        return 'bg-blue-50 text-blue-700';
      case 'PRODUCTION':
        return 'bg-indigo-50 text-indigo-700';
      case 'PACKED':
        return 'bg-purple-50 text-purple-700';
      case 'INVOICE':
        return 'bg-cyan-50 text-cyan-700';
      case 'SHIPPED':
        return 'bg-orange-50 text-orange-700';
      case 'DELIVERED':
        return 'bg-green-50 text-green-700';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-IN')
      : 'N/A';

  const getTotalItems = (details) =>
    details?.reduce(
      (sum, item) => sum + (item.qty_ordered || 0),
      0
    ) || 0;

  /* ============================= */
  /* Local Filtering (Search + Priority) */
  /* ============================= */

  const filteredOrders = orders.filter((orderData) => {
    const order = orderData.order;
    if (!order) return false;

    const searchMatch =
      order.order_number
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      order.dealer?.shop_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const priorityMatch =
      selectedPriority === 'ALL' ||
      order.priority?.toUpperCase() === selectedPriority;

    return searchMatch && priorityMatch;
  });

  /* ============================= */
  /* UI States */
  /* ============================= */

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA] mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  /* ============================= */
  /* UI */
  /* ============================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Orders Overview
        </h1>

        <button
          onClick={() => navigate('/orders/create')}
          className="bg-[#9333EA] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
        >
          <FiPlus /> Create Order
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Filters */}
        <div className="p-6 flex gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
            />
          </div>

          <CustomSelect
            name="status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((prev) => ({
                ...prev,
                page: 1,
              }));
            }}
            options={ORDER_STATUS_LIST}
          />

          <CustomSelect
            name="priority"
            value={selectedPriority}
            onChange={(e) =>
              setSelectedPriority(e.target.value)
            }
            options={['ALL', 'HIGH', 'MEDIUM', 'LOW']}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="text-left py-4 px-4">
                  Order Number
                </th>
                <th className="text-left py-4 px-4">
                  Dealer
                </th>
                <th className="text-left py-4 px-4">
                  Created
                </th>
                <th className="text-left py-4 px-4">
                  Items
                </th>
                <th className="text-left py-4 px-4">
                  Priority
                </th>
                <th className="text-left py-4 px-4">
                  Status
                </th>
                <th className="text-right py-4 px-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((orderData) => {
                const order = orderData.order;
                if (!order) return null;

                return (
                  <tr
                    key={order.order_number}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="py-4 px-4 font-mono">
                      {order.order_number}
                    </td>
                    <td className="py-4 px-4">
                      {order.dealer?.shop_name}
                    </td>
                    <td className="py-4 px-4">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      {getTotalItems(
                        order.order_details
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getPriorityStyle(
                          order.priority
                        )}`}
                      >
                        {order.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() =>
                            navigate(
                              `/orders/${order.order_number}`
                            )
                          }
                          className="text-[#9333EA]"
                          title="View Order"
                        >
                          <FiEye />
                        </button>

                        <button
                          onClick={() =>
                            navigate(
                              `/orders/update/${order.order_number}`
                            )
                          }
                          className="text-blue-600 hover:text-blue-700 transition"
                          title="Edit Order"
                        >
                          <FiEdit2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Backend Pagination */}
        <OrdersPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) =>
            setPagination((prev) => ({
              ...prev,
              page,
            }))
          }
        />
      </div>
    </div>
  );
};

export default Orders;