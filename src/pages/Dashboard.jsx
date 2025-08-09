import React from 'react';
import { FiUsers, FiPackage, FiShoppingBag, FiTruck, FiTrendingUp, FiBox, FiAlertCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchUsers } from '../api/user';

const StatCard = ({ icon, title, value }) => (
  <div className="bg-white rounded-xl p-4 transition-transform hover:scale-[1.02] cursor-pointer shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold mt-2 text-gray-900">{value}</h3>
      </div>
      <div className="text-gray-900 text-xl sm:text-2xl bg-gray-50 p-2 rounded-xl">
        {icon}
      </div>
    </div>
  </div>
);

const MetricCard = ({ title, value, subValue, icon }) => (
  <div className="bg-white rounded-xl p-4 transition-transform hover:scale-[1.02] cursor-pointer shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <div className="text-gray-900 text-xl bg-gray-50 p-2 rounded-lg">
        {icon}
      </div>
    </div>
    <div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
    </div>
  </div>
);

const OrderCard = ({ number, dealer, priority, status }) => {
  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'in-production':
        return 'text-blue-600 bg-blue-50 border border-blue-100';
      case 'packed':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-100';
      case 'billed':
        return 'text-green-600 bg-green-50 border border-green-100';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 hover:shadow-lg transition-all border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-lg text-gray-900">#{number}</h4>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(priority)}`}>
                {priority}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{dealer}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [adminCount, setAdminCount] = React.useState(0);
  const [salesmanCount, setSalesmanCount] = React.useState(0);
  const [dealerCount, setDealerCount] = React.useState(0);

  React.useEffect(() => {
    const getCounts = async () => {
      const res = await fetchUsers();
      if (res && res.success && res.data && res.data.employees) {
        const employees = res.data.employees;
        setAdminCount(employees.filter(e => e.role === 'ROLE_ADMIN').length);
        setSalesmanCount(employees.filter(e => e.role === 'ROLE_SALESMAN').length);
        setDealerCount(employees.filter(e => e.role === 'ROLE_DEALER').length);
      }
    };
    getCounts();
  }, []);

  const orders = [
    { id: 1, number: "1", dealer: "Green Energy Solutions", priority: "High", status: "in-production" },
    { id: 2, number: "2", dealer: "Green Energy Solutions", priority: "Medium", status: "packed" },
    { id: 3, number: "6", dealer: "Green Energy Solutions", priority: "Low", status: "billed" },
    { id: 4, number: "209", dealer: "Green Energy Solutions", priority: "High", status: "in-production" }
  ];

  return (
    <div className="h-[calc(100vh-80px)] p-4 overflow-y-auto bg-[#F9FAFB]">
      <div className="grid grid-rows-[auto_auto_1fr] gap-4 h-full max-h-full">
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FiUsers />} title="Total Admins" value={adminCount} />
          <StatCard icon={<FiUsers />} title="Total Salesmen" value={salesmanCount} />
          <StatCard icon={<FiUsers />} title="Total Dealers" value={dealerCount} />
          <StatCard icon={<FiShoppingBag />} title="Total Orders" value="3" />
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            icon={<FiTrendingUp />}
            title="This Month's Sales Goal"
            value="₹75,000 / ₹100,000"
            subValue="75% achieved"
          />
          <MetricCard 
            icon={<FiShoppingBag />}
            title="Orders This Month"
            value="3"
          />
          <MetricCard 
            icon={<FiTruck />}
            title="Ongoing Orders"
            value="3"
          />
          <MetricCard 
            icon={<FiAlertCircle />}
            title="Low Stock Products"
            value="0"
          />
        </div>

        {/* Pending Orders Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#9333EA]/10 text-[#9333EA] p-2 rounded-xl">
                <FiClock className="text-xl" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Pending Orders</h2>
                <p className="text-sm text-gray-500">Track your pending order status</p>
              </div>
            </div>
            <button
            onClick={() => navigate('/orders')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#9333EA] text-white rounded-xl text-sm font-medium hover:bg-[#8829DD] transition-colors inline-flex items-center justify-center gap-2">
              View All Orders
              <FiArrowRight />
            </button>
          </div>
          <div className="grid gap-3 overflow-y-auto max-h-[calc(100vh-400px)]">
            {orders.map(order => (
              <OrderCard 
                key={order.id}
                number={order.number}
                dealer={order.dealer}
                priority={order.priority}
                status={order.status}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
