import React, { useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiChevronLeft,
  FiChevronRight,
  FiKey,
  FiX,
  FiEye,
  FiEyeOff
} from "react-icons/fi";
import CustomSelect from '../components/CustomSelect';

const UserTable = ({ users, currentPage, totalPages, onPageChange }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#F9FAFB]">
            <th className="text-left p-4 lg:p-6 text-sm font-medium text-gray-600">Name</th>
            <th className="text-left p-4 lg:p-6 text-sm font-medium text-gray-600 hidden sm:table-cell">Email</th>
            <th className="text-left p-4 lg:p-6 text-sm font-medium text-gray-600 hidden md:table-cell">Role</th>
            <th className="text-left p-4 lg:p-6 text-sm font-medium text-gray-600 hidden lg:table-cell">Created On</th>
            <th className="text-right p-4 lg:p-6 text-sm font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user, index) => (
            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500 sm:hidden">{user.email}</span>
                </div>
              </td>
              <td className="p-4 lg:p-6 hidden sm:table-cell">
                <span className="text-sm text-gray-600">{user.email}</span>
              </td>
              <td className="p-4 lg:p-6 hidden md:table-cell">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </td>
              <td className="p-4 lg:p-6 hidden lg:table-cell">
                <span className="text-sm text-gray-600">{user.createdOn}</span>
              </td>
              <td className="p-4 lg:p-6">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors group">
                    <FiEdit2 className="text-gray-400 group-hover:text-blue-600" size={18} />
                  </button>
                  <button className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group">
                    <FiKey className="text-gray-400 group-hover:text-indigo-600" size={18} />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors group">
                    <FiTrash2 className="text-gray-400 group-hover:text-red-600" size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  </div>
);

const FilterTabs = ({ activeTab, onTabChange }) => {
  const tabs = ['All Users', 'Admin', 'Salesman', 'Production', 'Packing', 'Accounts', 'Delivery', 'Dealer'];
  
  return (
    <div className="flex justify-start sm:justify-center overflow-x-auto">
      <div className="inline-flex gap-1 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-[#9333EA] text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

const getRoleColor = (role) => {
  const colors = {
    "Super Admin": "bg-[#9333EA]/10 text-[#9333EA]",
    Admin: "bg-blue-50 text-blue-600",
    Salesman: "bg-green-50 text-green-600",
    Production: "bg-yellow-50 text-yellow-600",
    Packing: "bg-orange-50 text-orange-600",
    Accounts: "bg-pink-50 text-pink-600",
    Delivery: "bg-cyan-50 text-cyan-600",
    Dealer: "bg-indigo-50 text-indigo-600",
  };
  return colors[role] || "bg-gray-50 text-gray-600";
};

const CreateUserModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Salesman',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  if (!isOpen) return null;

  const roleOptions = [
    'Super Admin',
    'Admin',
    'Salesman',
    'Production',
    'Packing',
    'Accounts',
    'Delivery',
    'Dealer'
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter email address"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm pr-10"
                    placeholder="Enter password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <CustomSelect
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={roleOptions}
                  placeholder="Select role"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter address"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const User = () => {
  const [activeTab, setActiveTab] = useState('All Users');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 5;

  const allUsers = [
    {
      name: "John Smith",
      email: "john.smith@example.com",
      role: "Super Admin",
      createdOn: "26 May 2025",
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      role: "Admin",
      createdOn: "25 May 2025",
    },
    {
      name: "Michael Brown",
      email: "michael.b@example.com",
      role: "Salesman",
      createdOn: "24 May 2025",
    },
    {
      name: "Emily Davis",
      email: "emily.d@example.com",
      role: "Production",
      createdOn: "23 May 2025",
    },
    {
      name: "David Wilson",
      email: "david.w@example.com",
      role: "Accounts",
      createdOn: "22 May 2025",
    },
    {
      name: "Lisa Anderson",
      email: "lisa.a@example.com",
      role: "Packing",
      createdOn: "21 May 2025",
    },
    {
      name: "Robert Taylor",
      email: "robert.t@example.com",
      role: "Delivery",
      createdOn: "20 May 2025",
    },
    {
      name: "Jennifer White",
      email: "jennifer.w@example.com",
      role: "Dealer",
      createdOn: "19 May 2025",
    },
  ];

  const filteredUsers =
    activeTab === "All Users"
      ? allUsers
      : allUsers.filter((user) => user.role === activeTab);

  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-[#F9FAFB]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Manage Users</h1>
          <p className="text-sm text-gray-500">Add and manage system users</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Add New User
        </button>
      </div>

      <div className="mb-6 -mx-4 sm:mx-0">
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      <div className="flex-1 min-h-0">
        <UserTable 
          users={currentUsers}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <CreateUserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default User;
