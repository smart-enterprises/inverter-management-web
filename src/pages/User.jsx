import React, { useState, useEffect } from "react";
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
import Swal from 'sweetalert2';
import { apiRequest } from '../utils/api';

const ROLE_LABELS = {
  ROLE_SUPER_ADMIN: 'Super Admin',
  ROLE_ADMIN: 'Admin',
  ROLE_MANAGER: 'Manager',
  ROLE_SUPERVISOR: 'Supervisor',
  ROLE_SALESMAN: 'Salesman',
  ROLE_PRODUCTION: 'Production',
  ROLE_PACKING: 'Packing',
  ROLE_ACCOUNTS: 'Accounts',
  ROLE_DELIVERY: 'Delivery',
};

const ALL_TABS = [
  'All Users',
  'Super Admin',
  'Admin',
  'Manager',
  'Supervisor',
  'Salesman',
  'Production',
  'Packing',
  'Accounts',
  'Delivery',
];

const getRoleLabel = (role) => ROLE_LABELS[role] || role;

const FilterTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex justify-start sm:justify-center overflow-x-auto">
      <div className="inline-flex gap-1 p-1">
        {ALL_TABS.map((tab) => (
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

const UserTable = ({ users, onEdit, currentPage, totalPages, onPageChange }) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#F9FAFB]">
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Name</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Email</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Phone</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Role</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Status</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Created On</th>
            <th className="text-center p-4 lg:p-6 text-sm font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user, index) => user && (
            <tr key={user.employee_id || index} className="hover:bg-gray-50/50 transition-colors">
              <td className="p-4 lg:p-6 text-center">
                <span className="text-sm font-medium text-gray-900">{user.employee_name}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <span className="text-sm text-gray-600">{user.employee_email}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <span className="text-sm text-gray-600">{user.employee_phone}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <span className="text-sm text-gray-600">{user.status}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <span className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</span>
              </td>
              <td className="p-4 lg:p-6 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors group" onClick={() => onEdit && onEdit(user.employee_id)}>
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
    {/* Pagination inside the table */}
    <UserPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  </div>
);

const CreateUserModal = ({ isOpen, onClose, onUserChanged, editingEmployeeId, editingEmployeeData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Populate form when editingEmployeeData changes
  useEffect(() => {
    if (editingEmployeeId && editingEmployeeData) {
      setFormData({
        name: editingEmployeeData.employee_name || '',
        email: editingEmployeeData.employee_email || '',
        phone: editingEmployeeData.employee_phone || '',
        password: '', // Don't prefill password
        role: editingEmployeeData.role || '',
        address: editingEmployeeData.address || ''
      });
    } else if (!editingEmployeeId) {
      setFormData({ name: '', email: '', phone: '', password: '', role: '', address: '' });
    }
  }, [editingEmployeeId, editingEmployeeData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setFieldErrors({});
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess('');
    try {
      let res;
      if (editingEmployeeId) {
        // Update user
        const payload = {
          employee_name: formData.name,
          employee_email: formData.email,
          employee_phone: String(formData.phone),
          role: formData.role,
          address: formData.address
        };
        res = await apiRequest(`/employees/${editingEmployeeId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create user
        const payload = {
          employee_name: formData.name,
          employee_email: formData.email,
          employee_phone: String(formData.phone),
          password: formData.password,
          role: formData.role,
          address: formData.address
        };
        res = await apiRequest('/employees/signup', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      if (res && res.success) {
        onClose();
        await Swal.fire({
          icon: 'success',
          title: editingEmployeeId ? 'User Updated' : 'User Created',
          text: res.message || (editingEmployeeId ? 'User updated successfully!' : 'User created successfully!'),
          confirmButtonText: 'OK',
        });
        setFormData({ name: '', email: '', phone: '', password: '', role: '', address: '' });
        if (onUserChanged) {
          onUserChanged();
        }
      } else if (Array.isArray(res?.errors) && res.errors.length > 0) {
        const errorMap = {};
        res.errors.forEach(e => {
          if (!errorMap[e.field]) errorMap[e.field] = [];
          errorMap[e.field].push(e.message);
        });
        setFieldErrors(errorMap);
        setError('');
      } else {
        setError(res?.message || 'Failed to save user');
        setFieldErrors({});
      }
    } catch (err) {
      if (err && err.message) {
        setError(err.message);
        setFieldErrors({});
      } else {
        setError('Network error. Please try again.');
        setFieldErrors({});
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  if (!isOpen) return null;

  const roleOptions = [
    { label: 'Super Admin', value: 'ROLE_SUPER_ADMIN' },
    { label: 'Admin', value: 'ROLE_ADMIN' },
    { label: 'Manager', value: 'ROLE_MANAGER' },
    { label: 'Supervisor', value: 'ROLE_SUPERVISOR' },
    { label: 'Salesman', value: 'ROLE_SALESMAN' },
    { label: 'Production', value: 'ROLE_PRODUCTION' },
    { label: 'Packing', value: 'ROLE_PACKING' },
    { label: 'Accounts', value: 'ROLE_ACCOUNTS' },
    { label: 'Delivery', value: 'ROLE_DELIVERY' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">{editingEmployeeId ? 'Edit User' : 'Add New User'}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && !Object.keys(fieldErrors).length && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{success}</div>
            )}
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
                />
                {fieldErrors['employee_name'] && (
                  <div className="text-red-600 text-xs mt-1">
                    {fieldErrors['employee_name'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                  </div>
                )}
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
                />
                {fieldErrors['employee_email'] && (
                  <div className="text-red-600 text-xs mt-1">
                    {fieldErrors['employee_email'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  placeholder="Enter phone number"
                  autoComplete="phone"
                />
                {fieldErrors['employee_phone'] && (
                  <div className="text-red-600 text-xs mt-1">
                    {fieldErrors['employee_phone'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                  </div>
                )}
              </div>

              {/* Only show password field when creating a new user */}
              {!editingEmployeeId && (
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
                  {fieldErrors['password'] && (
                    <div className="text-red-600 text-xs mt-1">
                      {fieldErrors['password'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <CustomSelect
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={roleOptions}
                  placeholder="Select Role"
                />
                {fieldErrors['role'] && (
                  <div className="text-red-600 text-xs mt-1">
                    {fieldErrors['role'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                  </div>
                )}
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
                disabled={loading}
              >
                {loading ? (editingEmployeeId ? 'Updating...' : 'Creating...') : (editingEmployeeId ? 'Update User' : 'Create User')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const getRoleColor = (role) => {
  const colors = {
    "ROLE_SUPER_ADMIN": "bg-[#9333EA]/10 text-[#9333EA]",
    "ROLE_ADMIN": "bg-blue-50 text-blue-600",
    "ROLE_MANAGER": "bg-purple-50 text-purple-600",
    "ROLE_SUPERVISOR": "bg-indigo-50 text-indigo-600",
    "ROLE_SALESMAN": "bg-green-50 text-green-600",
    "ROLE_PRODUCTION": "bg-yellow-50 text-yellow-600",
    "ROLE_PACKING": "bg-orange-50 text-orange-600",
    "ROLE_ACCOUNTS": "bg-pink-50 text-pink-600",
    "ROLE_DELIVERY": "bg-cyan-50 text-cyan-600",
  };
  return colors[role] || "bg-gray-50 text-gray-600";
};

function UserPagination({ currentPage, totalPages, onPageChange }) {
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
}

const User = () => {
  const [activeTab, setActiveTab] = useState('All Users');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployeeData, setEditingEmployeeData] = useState(null);
  const itemsPerPage = 5;

  const fetchEmployees = async () => {
    try {
      const res = await apiRequest('/employees/?page=1&limit=100');
      if (res && res.success && res.data && res.data.employees) {
        setEmployees(res.data.employees);
      }
    } catch {
      // Optionally handle error
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // When a user is created or updated, re-fetch the user list from the backend
  const handleUserChanged = () => {
    fetchEmployees();
    setEditingEmployeeId(null);
    setEditingEmployeeData(null);
  };

  // Edit button handler
  const handleEditUser = async (employeeId) => {
    setEditingEmployeeId(employeeId);
    setIsModalOpen(true);
    // Fetch employee details
    try {
      const res = await apiRequest(`/employees/${employeeId}`);
      if (res && res.success && res.data) {
        setEditingEmployeeData(res.data);
      }
    } catch {
      // Optionally handle error
    }
  };

  // Filter employees based on active tab, but exclude ROLE_DEALER
  const filteredEmployees = activeTab === 'All Users'
    ? employees.filter(emp => emp && emp.role !== 'ROLE_DEALER')
    : employees.filter(emp => emp && getRoleLabel(emp.role) === activeTab && emp.role !== 'ROLE_DEALER');

  const currentUsers = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-[#F9FAFB]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Manage Users</h1>
          <p className="text-sm text-gray-500">Add and manage system users</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingEmployeeId(null); setEditingEmployeeData(null); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Add New User
        </button>
      </div>

      <div className="mb-6 -mx-4 sm:mx-0">
        <FilterTabs activeTab={activeTab} onTabChange={tab => { setActiveTab(tab); setCurrentPage(1); }} />
      </div>
      
      <div className="flex-1 min-h-0">
        <UserTable 
          users={currentUsers}
          onEdit={handleEditUser}
          currentPage={currentPage}
          totalPages={Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))}
          onPageChange={page => setCurrentPage(page)}
        />
      </div>

      <CreateUserModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEmployeeId(null); setEditingEmployeeData(null); }}
        onUserChanged={handleUserChanged}
        editingEmployeeId={editingEmployeeId}
        editingEmployeeData={editingEmployeeData}
      />
    </div>
  );
};

export default User;
