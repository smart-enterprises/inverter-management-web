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

      {/* Sidebar owns its own position:fixed + translate-x — it used to be
          wrapped in a second fixed/transformed div here, and the two fought
          over where it actually sat, leaving it stuck on-screen on mobile
          with no way to dismiss it. */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* The sidebar is always an overlay on mobile (never part of the flex
          flow), so only the lg+ margin should ever apply. */}
      {/* min-w-0 overrides flexbox's default min-width:auto — without it,
          this flex-1 column refuses to shrink below its content's natural
          width (any unwrapped row inside, like a filter bar or table),
          which forced the whole column — and the sticky navbar inside it —
          wider than the viewport on mobile, clipped invisibly by the root's
          overflow-hidden. The bell and profile menu were unreachable. */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${isCollapsed && !isMobileMenuOpen ? "lg:ml-20" : "lg:ml-64"} lg:min-h-screen`}>
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