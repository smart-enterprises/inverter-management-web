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

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuth();

  const isPathActive = (path) => {
    if (path === '/dealers') {
      return location.pathname.startsWith('/dealers');
    }
    if (path === '/orders') {
      return location.pathname.startsWith('/orders');
    }
    return location.pathname === path;
  };

  const finalIsCollapsed = isCollapsed && !isMobileMenuOpen;
  const role = user?.role;

  const NAV_ITEMS = [
    {
      icon: <FiBarChart2 />,
      label: "Dashboard",
      to: "/dashboard",
    },
    {
      icon: <FiUsers />,
      label: "Users",
      to: "/users",
    },
    {
      icon: <FiUser />,
      label: "Dealers",
      to: "/dealers",
    },
    {
      icon: <FiBox />,
      label: "Products",
      to: "/products",
    },
    {
      icon: <FiShield />,
      label: "Brands",
      to: "/brands",
    },
    {
      icon: <FiClipboard />,
      label: "Orders",
      to: "/orders",
    },
    {
      icon: <FiTruck />,
      label: "Delivery",
      to: "/delivery",
    },
    {
      icon: <FiPackage />,
      label: "Billing",
      to: "/billing",
    },
  ];

  const isItemVisibleForRole = (item, currentRole) => {
    const allowedRoles = ROUTE_PERMISSIONS[item.to];
    if (!allowedRoles || allowedRoles.length === 0) return true; // public / default
    if (!currentRole) return false;
    return allowedRoles.includes(currentRole);
  };

  const navItems = NAV_ITEMS.filter((item) => isItemVisibleForRole(item, role));

  return (
    <aside
      className={`bg-white h-screen border-r border-gray-100 fixed left-0 top-0 transition-all duration-300 z-20 ${
        finalIsCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-8 relative">
          <div className="flex justify-center mb-6">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 ${
                finalIsCollapsed ? "justify-center" : ""
              }`}
            >
              <span className="text-2xl">🌀</span>
              <span
                className={`text-lg font-semibold transition-opacity duration-200 ${
                  finalIsCollapsed ? "opacity-0 absolute" : "opacity-100"
                }`}
              >
                Inverter MS
              </span>
            </Link>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-9 bg-white rounded-full p-1 shadow-sm border border-gray-100 hover:border-gray-200 transition-all hidden lg:block"
          >
            {finalIsCollapsed ? (
              <FiChevronRight size={16} />
            ) : (
              <FiChevronLeft size={16} />
            )}
          </button>
          <div className="border-b border-gray-100"></div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              active={isPathActive(item.to)}
              isCollapsed={finalIsCollapsed}
            />
          ))}
        </nav>

        <div className="px-3 py-4 space-y-1">
          <NavItem
            icon={<FiSettings />}
            label="Settings"
            to="/settings"
            active={isPathActive("/settings")}
            isCollapsed={finalIsCollapsed}
          />
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, to, active, isCollapsed }) => (
  <Link
    to={to}
    className={`relative flex items-center ${
      isCollapsed ? "justify-center" : ""
    } px-3 py-2.5 rounded-lg transition-all group ${
      active ? "bg-[#9333EA]/10 text-[#9333EA]" : "text-gray-600 hover:bg-gray-50"
    }`}
  >
    <span className={`text-xl ${active ? "text-[#9333EA]" : "text-gray-500"}`}>{icon}</span>
    {!isCollapsed && (
      <span className={`ml-3 text-sm font-medium ${active ? "text-[#9333EA]" : "text-gray-600"}`}>{label}</span>
    )}
  </Link>
);

export default Sidebar;
