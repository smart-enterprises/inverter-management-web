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

/* ─────────────────────────────────────────────────────────────
   NAV_ITEMS
   ───────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: FiBarChart2, label: "Dashboard", path: "/dashboard" },
  { icon: FiUsers, label: "Users", path: "/users" },
  { icon: FiUser, label: "Dealers", path: "/dealers" },
  { icon: FiBox, label: "Products", path: "/products" },
  { icon: FiShield, label: "Brands", path: "/brands" },
  { icon: FiClipboard, label: "Orders", path: "/orders" },
  { icon: FiTruck, label: "Delivery", path: "/delivery" },
  // { icon: FiPackage, label: "Billing", path: "/billing" },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
const isItemVisibleForRole = (path, role) => {
  const allowedRoles = ROUTE_PERMISSIONS[path];
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!role) return false;
  return allowedRoles.includes(role);
};

const isPathActive = (pathname, path) => {
  if (path === "/dealers" || path === "/orders") {
    return pathname.startsWith(path);
  }
  return pathname === path;
};

/* ─────────────────────────────────────────────────────────────
   Sidebar
   ───────────────────────────────────────────────────────────── */
const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  const finalIsCollapsed = isCollapsed && !isMobileMenuOpen;

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => isItemVisibleForRole(item.path, role)),
    [role]
  );

  const toggleSidebar = useCallback(
    () => setIsCollapsed((prev) => !prev),
    [setIsCollapsed]
  );

  return (
    <aside className={`sidebar ${finalIsCollapsed ? "sidebar--collapsed" : "sidebar--expanded"}`}>
      <div className="flex flex-col h-full">

        <SidebarHeader
          isCollapsed={finalIsCollapsed}
          toggleSidebar={toggleSidebar}
        />

        <nav className="sidebar-nav">
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

        {/* <div className="sidebar-footer">
          <NavItem
            icon={FiSettings}
            label="Settings"
            to="/settings"
            active={isPathActive(location.pathname, "/settings")}
            isCollapsed={finalIsCollapsed}
          />
        </div> */}
      </div>
    </aside>
  );
};

/* ─────────────────────────────────────────────────────────────
   SidebarHeader
   ───────────────────────────────────────────────────────────── */
const SidebarHeader = memo(({ isCollapsed, toggleSidebar }) => (
  <div className="sidebar-header">
    <Link
      to="/dashboard"
      className={`sidebar-header__link ${isCollapsed ? "sidebar-header__link--centered" : ""}`}
    >
      <img
        src="/logo.png"
        alt="Smart Enterprises"
        className="sidebar-logo"
      />

      <div className={`sidebar-brand ${isCollapsed ? "sidebar-brand--hidden" : "sidebar-brand--visible"}`}>
        <span className="sidebar-brand__smart">SMART</span>
        <span className="sidebar-brand__sub">Enterprises</span>
      </div>
    </Link>

    <button
      onClick={toggleSidebar}
      className="sidebar-toggle"
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
    </button>
  </div>
));

SidebarHeader.displayName = "SidebarHeader";

/* ─────────────────────────────────────────────────────────────
   NavItem
   ───────────────────────────────────────────────────────────── */
const NavItem = memo(({ icon: Icon, label, to, active, isCollapsed }) => (
  <Link
    to={to}
    className={[
      "nav-item",
      active ? "nav-item--active" : "",
      isCollapsed ? "nav-item--centered" : "",
    ].filter(Boolean).join(" ")}
  >
    <Icon className="nav-item__icon" />

    {!isCollapsed && (
      <span className="nav-item__label">{label}</span>
    )}
  </Link>
));

NavItem.displayName = "NavItem";

export default memo(Sidebar);