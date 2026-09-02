// src/layouts/Layout.jsx
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import NotificationToastStack from "../components/NotificationToast";
import NotificationBanner from "../components/NotificationBanner";

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsCollapsed(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--md-sys-color-surface)" }}>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`fixed lg:relative ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform duration-300 ease-in-out z-30`}>
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </div>

      <div className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed && !isMobileMenuOpen ? "lg:ml-20" : "lg:ml-64"} ${isMobileMenuOpen ? "ml-64" : ""} lg:min-h-screen`}>
        <Navbar
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <NotificationBanner />

        <main className="flex-1 overflow-auto" style={{ backgroundColor: "var(--md-sys-color-surface)" }}>
          <div className="p-4">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationToastStack />
    </div>
  );
}