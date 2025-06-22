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
} from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileMenuOpen }) => {
  const location = useLocation();

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
          <NavItem
            icon={<FiBarChart2 />}
            label="Dashboard"
            to="/dashboard"
            active={isPathActive("/dashboard")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiUsers />}
            label="Users"
            to="/users"
            active={isPathActive("/users")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiUser />}
            label="Dealers"
            to="/dealers"
            active={isPathActive("/dealers")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiBox />}
            label="Products"
            to="/products"
            active={isPathActive("/products")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiClipboard />}
            label="Orders"
            to="/orders"
            active={isPathActive("/orders")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiTruck />}
            label="Delivery"
            to="/delivery"
            active={isPathActive("/delivery")}
            isCollapsed={finalIsCollapsed}
          />
          <NavItem
            icon={<FiPackage />}
            label="Billing"
            to="/billing"
            active={isPathActive("/billing")}
            isCollapsed={finalIsCollapsed}
          />
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
