import React, { useState } from 'react';
import { 
  FiPlus, FiSearch, FiMoreHorizontal, FiX, FiCheck, FiChevronDown, 
  FiEdit2, FiTrash2, FiEye, FiEyeOff, FiChevronLeft, FiChevronRight 
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { apiRequest } from '../utils/api';
import { fetchDealers, fetchDealerById, createDealer, updateDealer, deleteDealerById } from '../api/dealer';
import PortalDropdown from '../components/PortalDropdown';

const CreateDealerModal = ({ isOpen, onClose, onDealerChanged, editingDealerId, editingDealerData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shop_name: '',
    district: '',
    town: '',
    brand: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  // Populate form when editingDealerData changes
  React.useEffect(() => {
    if (editingDealerId && editingDealerData) {
      setFormData({
        name: editingDealerData.employee_name || '',
        email: editingDealerData.employee_email || '',
        phone: editingDealerData.employee_phone || '',
        password: '', // Don't prefill password
        shop_name: editingDealerData.shop_name || '',
        district: editingDealerData.district || '',
        town: editingDealerData.town || '',
        brand: editingDealerData.brand || '',
        address: editingDealerData.address || ''
      });
    } else if (!editingDealerId) {
      setFormData({ name: '', email: '', phone: '', password: '', shop_name: '', district: '', town: '', brand: '', address: '' });
    }
  }, [editingDealerId, editingDealerData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      let res;
      if (editingDealerId) {
        // Update dealer
        const payload = {
          employee_name: formData.name,
          employee_email: formData.email,
          employee_phone: String(formData.phone),
          shop_name: formData.shop_name,
          district: formData.district,
          town: formData.town,
          brand: formData.brand,
          address: formData.address,
          role: 'ROLE_DEALER'
        };
        res = await updateDealer(editingDealerId, payload);
      } else {
        // Create dealer
        const payload = {
          employee_name: formData.name,
          employee_email: formData.email,
          employee_phone: String(formData.phone),
          password: formData.password,
          role: 'ROLE_DEALER',
          shop_name: formData.shop_name,
          district: formData.district,
          town: formData.town,
          brand: formData.brand,
          address: formData.address
        };
        res = await createDealer(payload);
      }
      if (res && res.success) {
        setFormData({ name: '', email: '', phone: '', password: '', shop_name: '', district: '', town: '', brand: '', address: '' });
        if (onDealerChanged) onDealerChanged();
        onClose();
        setTimeout(() => {
          Swal.fire({
            icon: 'success',
            title: editingDealerId ? 'Dealer Updated' : 'Dealer Created',
            text: res.message || (editingDealerId ? 'Dealer updated successfully!' : 'Dealer created successfully!'),
            confirmButtonText: 'OK',
          });
        }, 300);
      } else if (Array.isArray(res?.errors) && res.errors.length > 0) {
        const errorMap = {};
        res.errors.forEach(e => {
          if (!errorMap[e.field]) errorMap[e.field] = [];
          errorMap[e.field].push(e.message);
        });
        setFieldErrors(errorMap);
        setError('');
      } else {
        setError(res?.message || 'Failed to save dealer');
        setFieldErrors({});
      }
    } catch (err) {
      setError(err?.message || 'Network error. Please try again.');
      setFieldErrors({});
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        {/* Modern, comfortable, creative modal design */}
        {/* Add this to your global CSS if not present:
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98);} to { opacity: 1; transform: scale(1);} }
        .animate-fade-in { animation: fade-in 0.2s ease; }
        */}
        <div
          className="bg-white rounded-3xl shadow-2xl border w-full max-w-lg sm:max-w-xl mx-auto relative flex flex-col animate-fade-in"
          style={{ minHeight: 0, maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 bg-white rounded-t-3xl flex items-center justify-between px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center w-full">
              {editingDealerId ? 'Edit Dealer' : 'Add New Dealer'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4"
            >
              <FiX className="text-gray-500" size={22} />
            </button>
          </div>
          {/* Scrollable Form Fields */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
            <form className="space-y-6" onSubmit={handleSubmit} id="dealer-form">
              {error && !Object.keys(fieldErrors).length && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
              {/* Field-level errors will be shown under each input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dealer Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter dealer name"
                    autoComplete='name'
                  />
                  {fieldErrors['employee_name'] && (
                    <div className="text-red-600 text-xs mt-1">
                      {fieldErrors['employee_name'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter email"
                    autoComplete='email'
                  />
                  {fieldErrors['employee_email'] && (
                    <div className="text-red-600 text-xs mt-1">
                      {fieldErrors['employee_email'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter phone number"
                    autoComplete='phone'
                  />
                  {fieldErrors['employee_phone'] && (
                    <div className="text-red-600 text-xs mt-1">
                      {fieldErrors['employee_phone'].map((msg, idx) => <div key={idx}>{msg}</div>)}
                    </div>
                  )}
                </div>

                {/* Password input after phone number (only show when creating) */}
                {!editingDealerId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm pr-10"
                        placeholder="Enter password"
                        autoComplete='password'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    name="shop_name"
                    value={formData.shop_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter shop name"
                    autoComplete='shop_name'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter district"
                    autoComplete='district'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Town
                  </label>
                  <input
                    type="text"
                    name="town"
                    value={formData.town}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter town"
                    autoComplete='town'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter brand"
                    autoComplete='brand'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    placeholder="Enter complete address"
                    autoComplete='address'
                  />
                </div>
              </div>
            </form>
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 z-20 bg-white rounded-b-3xl flex items-center justify-end gap-3 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="dealer-form"
              className="px-8 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] shadow-md transition-colors text-base font-semibold"
              disabled={loading}
            >
              {loading ? (editingDealerId ? 'Updating...' : 'Adding...') : (editingDealerId ? 'Update Dealer' : 'Add Dealer')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const ActionMenu = ({ dealerId, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef();

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <FiMoreHorizontal className="text-gray-400" size={18} />
      </button>
      <PortalDropdown anchorRef={buttonRef} open={isOpen} onClose={() => setIsOpen(false)}>
        <Link
          to={`/dealers/${dealerId}`}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <FiEye size={16} />
          View Details
        </Link>
        <button
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => {
            setIsOpen(false);
            onEdit();
          }}
        >
          <FiEdit2 size={16} />
          Edit
        </button>
        <button
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => {
            setIsOpen(false);
            onDelete();
          }}
        >
          <FiTrash2 size={16} />
          Delete
        </button>
      </PortalDropdown>
    </div>
  );
};

// Pagination component (copy of UserPagination)
function DealersPagination({ currentPage, totalPages, onPageChange }) {
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

const Dealers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [dealers, setDealers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [editingDealerId, setEditingDealerId] = useState(null);
  const [editingDealerData, setEditingDealerData] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchDealersList = async () => {
    try {
      const res = await fetchDealers();
      if (res && res.success && res.data && res.data.employees) {
        setDealers(res.data.employees);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all users for mapping created_by ID to name
  const fetchUsers = async () => {
    try {
      const res = await apiRequest('/employees/?page=1&limit=100'); // This can be refactored to use fetchUsers from user.js if needed
      if (res && res.success && res.data && res.data.employees) {
        const map = {};
        res.data.employees.forEach(user => {
          map[user.employee_id] = user.employee_name;
        });
        setUserMap(map);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchDealersList();
    fetchUsers();
  }, []);

  // When a dealer is created or updated, re-fetch the dealer list and reset edit state
  const handleDealerChanged = () => {
    fetchDealersList();
    setEditingDealerId(null);
    setEditingDealerData(null);
  };

  // Edit button handler
  const handleEditDealer = async (dealerId) => {
    setEditingDealerId(dealerId);
    setIsModalOpen(true);
    // Fetch dealer details
    try {
      const res = await fetchDealerById(dealerId);
      if (res && res.success && res.data) {
        setEditingDealerData(res.data);
      }
    } catch {
      // Optionally handle error
    }
  };

  const handleOpenDeleteModal = (dealerId) => {
    setSelectedDealerId(dealerId);
    setDeleteReason('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteDealer = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await deleteDealerById(selectedDealerId, deleteReason);
      if (res && res.success) {
        setShowDeleteModal(false);
        await Swal.fire({ icon: 'success', title: 'Dealer Deleted', text: res.message || 'Dealer deleted successfully!', confirmButtonText: 'OK' });
        fetchDealersList();
      } else {
        setDeleteError(res?.message || 'Failed to delete dealer');
      }
    } catch (err) {
      setDeleteError(err?.message || 'Network error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter dealers based on search query and selected status
  const filteredDealers = dealers.filter(
    dealer => dealer.role === 'ROLE_DEALER' &&
      (
        (dealer.employee_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (dealer.employee_phone || '').toString().includes(searchQuery)
      ) &&
      (selectedStatus === 'All Statuses' || (dealer.status || '').toLowerCase() === selectedStatus.toLowerCase())
  );

  const paginatedDealers = filteredDealers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Dealers</h1>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingDealerId(null); setEditingDealerData(null); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Add New Dealer
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Dealers List</h2>
            <p className="text-sm text-gray-500 mt-1">View and manage all dealers in the system</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <CustomSelect
                name="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={['All Statuses', 'Active', 'Inactive']}
                placeholder="Select status"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto" style={{ maxHeight: '60vh' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Dealer Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Shop Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone Number</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">District</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDealers.map((dealer) => (
                  <tr key={dealer.employee_id || dealer.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{dealer.employee_name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{dealer.shop_name}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{dealer.employee_phone}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{dealer.district}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (dealer.status || '').toLowerCase() === 'active' 
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {dealer.status || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{userMap[dealer.created_by] || dealer.created_by}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">
                        {dealer.created_at ? new Date(dealer.created_at).toISOString().slice(0, 10) : ''}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right relative">
                      <ActionMenu
                        dealerId={dealer.employee_id || dealer.id}
                        onEdit={() => handleEditDealer(dealer.employee_id || dealer.id)}
                        onDelete={() => handleOpenDeleteModal(dealer.employee_id || dealer.id)}
                      />
                    </td>
                  </tr>
                ))}
                {paginatedDealers.length === 0 && (
                  <tr key="no-dealers">
                    <td colSpan="8" className="py-8 text-center">
                      <p className="text-sm text-gray-500">No dealers found matching your criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Add extra space at the bottom for action menu */}
            <div className="h-8" />
            <DealersPagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(filteredDealers.length / itemsPerPage))}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      <CreateDealerModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDealerId(null); setEditingDealerData(null); }}
        onDealerChanged={handleDealerChanged}
        editingDealerId={editingDealerId}
        editingDealerData={editingDealerData}
      />
      {/* Delete Dealer Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition" onClick={() => setShowDeleteModal(false)} aria-label="Close">
              <FiX size={22} />
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-[#fde5e5] text-[#fd2c2c] rounded-full p-3 mb-2">
                <FiTrash2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete Dealer</h2>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to delete this dealer?</p>
            </div>
            <textarea
              className="w-full px-4 py-2 rounded-lg border border-gray-200 mb-3"
              placeholder="Reason for deletion (optional)"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={2}
            />
            {deleteError && <div className="text-red-600 text-sm mb-2">{deleteError}</div>}
            <button
              className="w-full bg-[#fd2c2c] hover:bg-[#ff4747] text-white py-2.5 rounded-lg font-semibold transition-all duration-200 mt-2 shadow-md hover:shadow-lg hover:scale-105"
              onClick={handleDeleteDealer}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Dealer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers; 