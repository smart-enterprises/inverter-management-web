import React, { memo, useMemo, useCallback } from "react";
import {
  FiUsers,
  FiUser,
  FiClipboard,
  FiBox,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiShield,
  FiActivity,
  FiTruck,
  FiHome,
  FiZap,
} from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTE_PERMISSIONS } from "../routes/routePermissions";

/* ─────────────────────────────────────────────────────────────
   NAV GROUPS  — Kredi-style grouped sidebar
   ───────────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { icon: FiHome, label: "Dashboard", path: "/dashboard" },
      { icon: FiBarChart2, label: "Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: FiClipboard, label: "Orders", path: "/orders" },
      { icon: FiActivity, label: "Production", path: "/production-summary" },
      { icon: FiTruck, label: "Delivery", path: "/delivery" },
    ],
  },
  {
    label: "Masters",
    items: [
      { icon: FiUser, label: "Dealers", path: "/dealers" },
      { icon: FiBox, label: "Products", path: "/products" },
      { icon: FiShield, label: "Brands", path: "/brands" },
      { icon: FiUsers, label: "Users", path: "/users" },
    ],
  },
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

  const collapsed = isCollapsed && !isMobileMenuOpen;
  const widthClass = collapsed ? "w-16" : "w-64";

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => isItemVisibleForRole(item.path, role)),
        }))
        .filter((g) => g.items.length > 0),
    [role]
  );

  const toggleSidebar = useCallback(
    () => setIsCollapsed((prev) => !prev),
    [setIsCollapsed]
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-20 h-screen bg-[#F8FAFC] border-r border-blue-100/60 flex flex-col transition-[width] duration-300 ${widthClass}`}
    >
      {/* Header */}
      <div className="relative flex items-center h-16 px-4 flex-shrink-0">
        <Link to="/dashboard" className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center w-full" : ""}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
            <FiZap size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[15px] font-extrabold text-slate-900 tracking-tight truncate">Smart</span>
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-400 truncate">Enterprises</span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-colors"
        >
          {collapsed ? <FiChevronRight size={12} /> : <FiChevronLeft size={12} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-5 scrollbar-hide">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  to={item.path}
                  active={isPathActive(location.pathname, item.path)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer user chip */}
      {user && !collapsed && (() => {
        const displayName = (user.employee_name || "")
          .replace(/_/g, " ")
          .trim()
          .split(/\s+/)
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
          .join(" ");
        const initial = displayName ? displayName[0] : "?";
        return (
          <div className="m-3 p-3 rounded-xl bg-white/60 border border-blue-100/80 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{displayName || "User"}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {(user.role || "").replace("ROLE_", "").replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
          </div>
        );
      })()}
    </aside>
  );
};

/* ─────────────────────────────────────────────────────────────
   NavItem
   ───────────────────────────────────────────────────────────── */
const NavItem = memo(({ icon: Icon, label, to, active, collapsed }) => {
  const base = "flex items-center rounded-xl text-sm font-medium transition-colors";
  const layout = collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5";
  const state = active
    ? "bg-blue-500 text-white shadow-sm shadow-blue-500/30"
    : "text-slate-600 hover:bg-blue-50 hover:text-slate-900";

  return (
    <Link to={to} className={`${base} ${layout} ${state}`} title={collapsed ? label : undefined}>
      <Icon size={17} className={active ? "text-white" : "text-slate-500"} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
});

NavItem.displayName = "NavItem";

export default memo(Sidebar);
