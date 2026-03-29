// navbar.jsx code

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
import { capitalizeFirstLetter } from '../utils/constants';
import { getRoleLabel } from '../utils/roles';

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
          {/* ===================== PROFILE MENU ===================== */}
          <div className="relative">

            {/* Profile Button */}
            <button
              onClick={toggleProfileMenu}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >

              {/* Avatar */}
              <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-gray-100 shadow-sm">
                <img
                  src={`https://ui-avatars.com/api/?name=${user?.employee_name || "User"}&background=9333EA&color=fff`}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Welcome Text */}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs text-gray-500">Welcome</span>
                <span className="text-sm font-semibold text-gray-900">
                  {capitalizeFirstLetter(user?.employee_name) || "User"}
                </span>
              </div>

              {/* Dropdown Icon */}
              <FiChevronDown
                className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""
                  }`}
                size={18}
              />

            </button>

            {/* ===================== DROPDOWN ===================== */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">

                {/* Profile Info */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">

                  <div className="flex items-center gap-3">

                    <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                      <img
                        src={`https://ui-avatars.com/api/?name=${user?.employee_name || "User"}&background=9333EA&color=fff`}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {capitalizeFirstLetter(user?.employee_name)}
                      </div>

                      <div className="text-xs text-gray-500">
                        {user?.employee_email}
                      </div>
                    </div>

                  </div>

                  {/* Role Badge */}
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>

                </div>

                {/* Actions */}
                <div className="py-2">

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <FiLogOut size={16} />
                    Sign out
                  </button>

                </div>

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