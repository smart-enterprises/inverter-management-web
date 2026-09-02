import React, { memo, useMemo, useCallback } from "react";
import {
  MdBolt,
  MdMenuOpen,
  MdMenu,
  MdDashboard,
  MdOutlineDashboard,
  MdBarChart,
  MdOutlineBarChart,
  MdReceiptLong,
  MdOutlineReceiptLong,
  MdPrecisionManufacturing,
  MdOutlinePrecisionManufacturing,
  MdLocalShipping,
  MdOutlineLocalShipping,
  MdStorefront,
  MdOutlineStorefront,
  MdInventory2,
  MdOutlineInventory2,
  MdSell,
  MdOutlineSell,
  MdGroup,
  MdOutlineGroup,
} from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTE_PERMISSIONS } from "../routes/routePermissions";

/* ─────────────────────────────────────────────────────────────
   NAV GROUPS — Material 3 navigation drawer
   Each item carries both an outlined (inactive) and a filled
   (active) icon, which is how M3 signals selection alongside
   the secondary-container indicator.
   ───────────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { icon: MdOutlineDashboard, iconActive: MdDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: MdOutlineBarChart, iconActive: MdBarChart, label: "Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: MdOutlineReceiptLong, iconActive: MdReceiptLong, label: "Orders", path: "/orders" },
      { icon: MdOutlinePrecisionManufacturing, iconActive: MdPrecisionManufacturing, label: "Production", path: "/production-summary" },
      { icon: MdOutlineLocalShipping, iconActive: MdLocalShipping, label: "Delivery", path: "/delivery" },
    ],
  },
  {
    label: "Masters",
    items: [
      { icon: MdOutlineStorefront, iconActive: MdStorefront, label: "Dealers", path: "/dealers" },
      { icon: MdOutlineInventory2, iconActive: MdInventory2, label: "Products", path: "/products" },
      { icon: MdOutlineSell, iconActive: MdSell, label: "Brands", path: "/brands" },
      { icon: MdOutlineGroup, iconActive: MdGroup, label: "Users", path: "/users" },
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

const toDisplayName = (raw) =>
  (raw || "")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");

/* ─────────────────────────────────────────────────────────────
   Sidebar — drawer when expanded, navigation rail when collapsed
   ───────────────────────────────────────────────────────────── */
const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  const collapsed = isCollapsed && !isMobileMenuOpen;
  const widthClass = collapsed ? "w-20" : "w-64";

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

  const displayName = toDisplayName(user?.employee_name);
  const initial = displayName ? displayName[0] : "?";

  return (
    <aside
      className={`fixed left-0 top-0 z-20 h-screen flex flex-col transition-[width] duration-300 ${widthClass}`}
      style={{
        backgroundColor: "var(--md-sys-color-surface-container-low)",
        transitionTimingFunction: "var(--md-sys-motion-easing-emphasized)",
      }}
    >
      {/* ── Header: brand + menu toggle ─────────────────────── */}
      <div className={`flex items-center h-16 flex-shrink-0 ${collapsed ? "justify-center px-2" : "gap-2 px-4"}`}>
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            aria-label="Expand navigation"
            className="m3-icon-button m3-state-layer m3-focus"
          >
            <MdMenu size={24} />
          </button>
        ) : (
          <>
            <Link to="/dashboard" className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{
                  borderRadius: "var(--md-sys-shape-corner-medium)",
                  backgroundColor: "var(--md-sys-color-primary)",
                  color: "var(--md-sys-color-on-primary)",
                }}
              >
                <MdBolt size={22} />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="m3-title-medium truncate"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  Smart
                </span>
                <span
                  className="m3-label-small truncate"
                  style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                >
                  ENTERPRISES
                </span>
              </div>
            </Link>

            <button
              onClick={toggleSidebar}
              aria-label="Collapse navigation"
              className="m3-icon-button m3-state-layer m3-focus hidden lg:inline-flex flex-shrink-0"
            >
              <MdMenuOpen size={24} />
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto scrollbar-hide pb-2 ${collapsed ? "px-2 space-y-2" : "px-3 space-y-4"}`}>
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {collapsed ? (
              groupIndex > 0 && <hr className="m3-divider mx-2 mb-2" />
            ) : (
              <p
                className="m3-label-medium px-4 h-9 flex items-center uppercase"
                style={{ color: "var(--md-sys-color-on-surface-variant)", letterSpacing: "0.8px" }}
              >
                {group.label}
              </p>
            )}

            <div className={collapsed ? "flex flex-col gap-1" : "flex flex-col"}>
              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  iconActive={item.iconActive}
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

      {/* ── Account ─────────────────────────────────────────── */}
      {user && (
        <div className={`flex-shrink-0 ${collapsed ? "px-2 pb-3" : "px-3 pb-3"}`}>
          <hr className="m3-divider mb-3 mx-1" />
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2"}`}
            title={collapsed ? displayName : undefined}
          >
            <div
              className="w-10 h-10 flex items-center justify-center flex-shrink-0 m3-label-large"
              style={{
                borderRadius: "var(--md-sys-shape-corner-full)",
                backgroundColor: "var(--md-sys-color-primary-container)",
                color: "var(--md-sys-color-on-primary-container)",
              }}
            >
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p
                  className="m3-label-large truncate"
                  style={{ color: "var(--md-sys-color-on-surface)" }}
                >
                  {displayName || "User"}
                </p>
                <p
                  className="m3-body-small truncate capitalize"
                  style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                >
                  {(user.role || "").replace("ROLE_", "").replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

/* ─────────────────────────────────────────────────────────────
   NavItem
   Expanded → 56dp drawer item with a full-corner active pill.
   Collapsed → navigation rail: 56x32 indicator above the label.
   ───────────────────────────────────────────────────────────── */
const NavItem = memo(({ icon: Icon, iconActive: IconActive, label, to, active, collapsed }) => {
  const ActiveIcon = active ? (IconActive ?? Icon) : Icon;

  if (collapsed) {
    return (
      <Link
        to={to}
        title={label}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center gap-1 py-1 m3-focus"
        style={{ color: active ? "var(--md-sys-color-on-surface)" : "var(--md-sys-color-on-surface-variant)" }}
      >
        <span
          className="m3-rail-indicator m3-state-layer"
          style={{
            backgroundColor: active ? "var(--md-sys-color-secondary-container)" : "transparent",
            color: active ? "var(--md-sys-color-on-secondary-container)" : "var(--md-sys-color-on-surface-variant)",
          }}
        >
          <ActiveIcon size={24} />
        </span>
        {/* Rail labels get the full word rather than an ellipsis: at 64px of
            usable width every nav label fits at 10px without truncating. */}
        <span
          className="text-center px-0.5"
          style={{ fontSize: "10px", lineHeight: "14px", fontWeight: 500, letterSpacing: "0.4px" }}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`m3-nav-item m3-state-layer m3-focus gap-3 px-4 ${active ? "m3-nav-item-active" : ""}`}
    >
      <ActiveIcon size={24} className="flex-shrink-0" />
      <span className="m3-label-large truncate">{label}</span>
    </Link>
  );
});

NavItem.displayName = "NavItem";

export default memo(Sidebar);
