// src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MdLogout,
  MdExpandMore,
  MdShield,
  MdSettings,
  MdPersonOutline,
  MdTag,
  MdCloudUpload,
  MdLockOutline,
  MdMenu,
} from "react-icons/md";
import { T, CHIP_TONES } from "./m3/tokens";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { getRoleLabel, ROLES } from "../utils/roles";
import ChangePasswordModal from "./Changepasswordmodal";
import NotificationBell from "./NotificationBell";

/* Same role→tone mapping the Users page uses, so a person's colour is
   the same wherever they appear. */
const ROLE_TONE = {
  [ROLES.SUPER_ADMIN]: "warning",
  [ROLES.ADMIN]: "primary",
  [ROLES.MANAGER]: "secondary",
  [ROLES.SALESMAN]: "success",
  [ROLES.PRODUCTION]: "tertiary",
  [ROLES.PACKING]: "neutral",
  [ROLES.ACCOUNTS]: "primary",
  [ROLES.DELIVERY]: "secondary",
};

const getAccent = (role) => CHIP_TONES[ROLE_TONE[role] ?? "neutral"];

const Avatar = ({ initials, role, size = "sm" }) => {
  const accent = getAccent(role);
  const dims = { sm: 32, md: 40, lg: 48 };
  const fonts = { sm: "11px", md: "13px", lg: "15px" };
  const d = dims[size];

  return (
    <div
      style={{
        width: d, height: d, minWidth: d,
        backgroundColor: accent.bg,
        color: accent.fg,
        borderRadius: "var(--md-sys-shape-corner-full)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 500, fontSize: fonts[size], letterSpacing: "0.1px",
        flexShrink: 0, userSelect: "none",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

const Navbar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => { setShowMenu(false); }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    setShowMenu(false);
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleNavigate = useCallback((path) => { setShowMenu(false); navigate(path); }, [navigate]);

  const handleBrandClick = useCallback(() => {
    const el = document.getElementById("nb-brand-el");
    if (!el || el.classList.contains("swiped")) return;
    el.classList.add("swiped");
    setTimeout(() => el.classList.remove("swiped"), 700);
  }, []);

  // Normalize underscores → spaces so backend names like "muhammed_shahul"
  // render as "Muhammed Shahul" and produce two-letter initials.
  const displayName = (user?.employee_name || "")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
  const initials = displayName
    ? displayName.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const accent = getAccent(user?.role);
  const canAccessSettings = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role);
  const canAccessDataUpload = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role);

  return (
    <>
      <header className="nb-header">
        <div className="nb-bar">
          <div className="nb-bar__left">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen?.((prev) => !prev)}
              aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isMobileMenuOpen}
              className="m3-icon-button m3-state-layer m3-focus lg:hidden flex-shrink-0 mr-1"
            >
              <MdMenu size={22} />
            </button>
            <span className="nb-brand" id="nb-brand-el" onClick={handleBrandClick}>
              <span className="nb-brand__text">Smart Enterprises</span>
              <span className="nb-brand__tiger" />
              <span className="nb-brand__stripes">
                <span className="nb-brand__stripe" style={{ width: "3px" }} />
                <span className="nb-brand__stripe" style={{ width: "2px" }} />
                <span className="nb-brand__stripe" style={{ width: "5px" }} />
                <span className="nb-brand__stripe" style={{ width: "2px" }} />
              </span>
            </span>
          </div>

          <div className="nb-bar__right">
            {canAccessDataUpload && (
              <button type="button" onClick={() => navigate("/data-upload")} className="nb-quick-btn" title="Data Upload" aria-label="Go to Data Upload">
                <MdCloudUpload size={18} />
                <span className="hidden sm:inline-block m3-label-large">Data Upload</span>
              </button>
            )}

            <NotificationBell />

            <div className="w-px h-5 mx-1.5" style={{ backgroundColor: T.outlineVariant }} aria-hidden="true" />

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowMenu((p) => !p)}
                aria-haspopup="true"
                aria-expanded={showMenu}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 m3-state-layer m3-focus cursor-pointer"
                style={{
                  borderRadius: "var(--md-sys-shape-corner-full)",
                  backgroundColor: showMenu ? T.surfaceContainerHigh : "transparent",
                  color: T.onSurface,
                }}
              >
                <Avatar initials={initials} role={user?.role} size="sm" />
                <div className="hidden sm:flex flex-col items-start">
                  <span className="m3-label-large whitespace-nowrap" style={{ color: T.onSurface }}>{displayName || "User"}</span>
                  <span className="m3-body-small" style={{ color: T.onSurfaceVariant }}>{getRoleLabel(user?.role)}</span>
                </div>
                <MdExpandMore size={18} className={`flex-shrink-0 transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`} style={{ color: T.onSurfaceVariant }} aria-hidden="true" />
              </button>

              {showMenu && (
                <div role="menu" aria-label="Profile menu" className="absolute right-0 top-[calc(100%+8px)] w-[272px] z-50 overflow-hidden" style={{ backgroundColor: "var(--md-sys-color-surface-container)", borderRadius: T.cornerLarge, boxShadow: T.elevation2, animation: "nb-dropdown-in 160ms cubic-bezier(0.2,0,0,1) forwards" }}>
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials} role={user?.role} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="m3-title-small truncate" style={{ color: T.onSurface }}>{displayName}</p>
                        <p className="m3-body-small truncate mt-0.5" style={{ color: T.onSurfaceVariant }}>{user?.employee_email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span className="m3-chip" style={{ backgroundColor: accent.bg, color: accent.fg }}>
                        <MdShield size={14} aria-hidden="true" />
                        {getRoleLabel(user?.role)}
                      </span>
                      {user?.employee_id && (
                        <span className="m3-chip font-mono" style={{ backgroundColor: T.surfaceContainerHighest, color: T.onSurfaceVariant }}>
                          <MdTag size={14} aria-hidden="true" />
                          {user.employee_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-px mx-3" style={{ backgroundColor: T.outlineVariant }} />

                  <div className="p-2 space-y-0.5">
                    <button type="button" onClick={() => handleNavigate(`/users/${user?.employee_id}`)} role="menuitem" className="w-full flex items-center gap-3 px-3 h-12 m3-body-large m3-state-layer cursor-pointer" style={{ borderRadius: T.cornerFull, color: T.onSurface }}>
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--md-sys-shape-corner-full)", backgroundColor: "var(--md-sys-color-surface-container-highest)", color: "var(--md-sys-color-on-surface-variant)" }}><MdPersonOutline size={18} /></div>
                      My Profile
                    </button>

                    <button type="button" onClick={() => { setShowMenu(false); setShowChangePassword(true); }} role="menuitem" className="w-full flex items-center gap-3 px-3 h-12 m3-body-large m3-state-layer cursor-pointer" style={{ borderRadius: T.cornerFull, color: T.onSurface }}>
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--md-sys-shape-corner-full)", backgroundColor: "var(--md-sys-color-surface-container-highest)", color: "var(--md-sys-color-on-surface-variant)" }}><MdLockOutline size={18} /></div>
                      Change Password
                    </button>

                    {canAccessDataUpload && (
                      <button type="button" onClick={() => handleNavigate("/data-upload")} role="menuitem" className="w-full flex items-center gap-3 px-3 h-12 m3-body-large m3-state-layer cursor-pointer" style={{ borderRadius: T.cornerFull, color: T.onSurface }}>
                        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--md-sys-shape-corner-full)", backgroundColor: "var(--md-sys-color-surface-container-highest)", color: "var(--md-sys-color-on-surface-variant)" }}><MdCloudUpload size={18} /></div>
                        Data Upload
                      </button>
                    )}

                    {canAccessSettings && (
                      <button type="button" onClick={() => handleNavigate("/company-details")} role="menuitem" className="w-full flex items-center gap-3 px-3 h-12 m3-body-large m3-state-layer cursor-pointer" style={{ borderRadius: T.cornerFull, color: T.onSurface }}>
                        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--md-sys-shape-corner-full)", backgroundColor: "var(--md-sys-color-surface-container-highest)", color: "var(--md-sys-color-on-surface-variant)" }}><MdSettings size={18} /></div>
                        Company Settings
                      </button>
                    )}
                  </div>

                  <div className="h-px mx-3" style={{ backgroundColor: T.outlineVariant }} />

                  <div className="p-2">
                    <button type="button" onClick={handleLogout} role="menuitem" className="w-full flex items-center gap-3 px-3 h-12 m3-body-large m3-state-layer cursor-pointer" style={{ borderRadius: T.cornerFull, color: T.error }}>
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--md-sys-shape-corner-full)", backgroundColor: T.errorContainer, color: T.onErrorContainer }}><MdLogout size={18} /></div>
                      Sign Out
                    </button>
                  </div>

                  <div className="px-4 py-2" style={{ borderTop: `1px solid ${T.outlineVariant}` }}>
                    <p className="m3-body-small text-center" style={{ color: T.onSurfaceVariant }}>Smart Enterprises · v1.0</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </>
  );
};

export default Navbar;