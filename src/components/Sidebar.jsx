import React, { memo, useMemo, useCallback } from "react";
import {
  FiUsers,
  FiPackage,
  FiTruck,
  FiSettings,
  FiUser,
  FiClipboard,
  FiBox,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiShield,
} from "react-icons/fi";

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTE_PERMISSIONS } from "../routes/routePermissions";

{/* NAV_ITEMS */ }
const NAV_ITEMS = [
  { icon: FiBarChart2, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Users", path: "/users" },
  { icon: FiUser, label: "Dealers", path: "/dealers" },
  { icon: FiBox, label: "Products", path: "/products" },
  { icon: FiShield, label: "Brands", path: "/brands" },
  { icon: FiClipboard, label: "Orders", path: "/orders" },
  { icon: FiTruck, label: "Delivery", path: "/delivery" },
  { icon: FiPackage, label: "Billing", path: "/billing" },
];

{/* isItemVisibleForRole */ }
const isItemVisibleForRole = (path, role) => {
  const allowedRoles = ROUTE_PERMISSIONS[path];

  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!role) return false;

  return allowedRoles.includes(role);
};

{/* isPathActive */ }
const isPathActive = (pathname, path) => {
  if (path === "/dealers" || path === "/orders") {
    return pathname.startsWith(path);
  }
  return pathname === path;
};

{/* Sidebar */ }
const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.role;

  const finalIsCollapsed = isCollapsed && !isMobileMenuOpen;

  {/* navItems */ }
  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) =>
      isItemVisibleForRole(item.path, role)
    );
  }, [role]);

  {/* toggleSidebar */ }
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, [setIsCollapsed]);

  {/* UI */ }
  return (
    <aside
      className={`fixed left-0 top-0 z-20 h-screen bg-white border-r border-gray-100 transition-all duration-300 ease-in-out
        ${finalIsCollapsed ? "w-16" : "w-64"}`}
    >
      <div className="flex flex-col h-full">

        {/* SidebarHeader */}
        <SidebarHeader
          isCollapsed={finalIsCollapsed}
          toggleSidebar={toggleSidebar}
        />

        {/* nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              to={item.path}
              active={isPathActive(location.pathname, item.path)}
              isCollapsed={finalIsCollapsed}
            />
          ))}
        </nav>

        {/* footer nav */}
        <div className="px-3 py-4 border-t border-gray-100">
          <NavItem
            icon={FiSettings}
            label="Settings"
            to="/settings"
            active={isPathActive(location.pathname, "/settings")}
            isCollapsed={finalIsCollapsed}
          />
        </div>
      </div>
    </aside>
  );
};

{/* SidebarHeader */ }
const SidebarHeader = memo(({ isCollapsed, toggleSidebar }) => {
  return (
    <div className="relative flex items-center h-16 px-4 border-b border-gray-100 overflow-hidden">

      <Link
        to="/dashboard"
        className={`flex items-center gap-3 w-full transition-all duration-300 
          ${isCollapsed ?
            "justify-center" : "justify-start"
          }`}
      >
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Smart Enterprises"
          className="w-8 h-8 flex-shrink-0 object-contain"
        />

        {/* Brand Text */}
        <span
          className={`overflow-hidden max-w-[160px] transition-all duration-300 
            ${isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
        >
          <span className="marquee-text text-lg bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
            SMART ENTERPRISES
          </span>
        </span>
      </Link>

      <button
        onClick={toggleSidebar}
        className="absolute right-[-12px] top-1/2 -translate-y-1/2 bg-white rounded-full p-1 shadow border border-gray-200 hover:bg-gray-50 transition hidden lg:flex"
      >
        {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
      </button>
    </div>
  );
});

SidebarHeader.displayName = "SidebarHeader";

{/* NavItem */ }
const NavItem = memo(({ icon: Icon, label, to, active, isCollapsed }) => {
  return (
    <Link
      to={to}
      className={`flex items-center rounded-lg px-3 py-2.5 transition-all duration-200 group
      ${isCollapsed ? "justify-center" : ""}
      ${active
          ? "bg-purple-50 text-purple-600"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
    >
      <Icon
        className={`text-xl transition-colors
        ${active ? "text-purple-600" : "text-gray-500 group-hover:text-gray-700"}`}
      />

      {!isCollapsed && (
        <span className="ml-3 text-sm font-medium whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
});

NavItem.displayName = "NavItem";

export default memo(Sidebar);