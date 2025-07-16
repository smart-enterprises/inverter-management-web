import React, { useState } from 'react';
import { 
  FiBell, 
  FiSearch,
  FiSettings,
  FiGrid,
  FiGlobe,
  FiLogOut,
  FiUser,
  FiChevronDown
} from "react-icons/fi";
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const ROLE_DISPLAY_NAMES = {
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

const getDisplayRole = (role) => {
  if (!role) return "";
  return ROLE_DISPLAY_NAMES[role] || role.replace("ROLE_", "").replace("_", " ");
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <div className="p-4 bg-[#F9FAFB]">
      <div className="flex items-center justify-between px-6 py-2.5 bg-white rounded-xl shadow-sm max-w-[90%] mx-auto">
        {/* Left Side - Search */}
        <div className="flex items-center gap-4 flex-1 max-w-lg">
          {/* Search Bar */}
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search (Ctrl+/)"
              className="w-full pl-10 pr-4 py-2 bg-white text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-50 rounded-lg">
            <FiBell className="text-base text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="h-7 w-7 rounded-full overflow-hidden">
                <img
                  src={`https://ui-avatars.com/api/?name=${user?.employee_name || 'User'}&background=9333EA&color=fff`}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold text-gray-900">{user?.employee_name || 'User'}</span>
              </div>
              <FiChevronDown className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">{user?.employee_name}</div>
                  <div className="text-xs text-gray-500">{user?.employee_email}</div>
                  <div className="text-xs text-purple-600 font-medium mt-1">
                    {getDisplayRole(user?.role)}
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FiLogOut className="text-gray-400" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {showProfileMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </div>
  );
};

export default Navbar;