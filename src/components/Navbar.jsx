// Navbar.jsx — Professional Redesign

import React, { useState, useRef, useEffect } from "react";
import {
  FiBell,
  FiLogOut,
  FiChevronDown,
  FiShield,
  FiSettings,
  FiUser,
  FiHash,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { capitalizeFirstLetter } from "../utils/constants";
import { getRoleLabel } from "../utils/roles";
import { ROLES } from "../utils/roles";

/* ─────────────────────────────────────────────────────────────
   Role → accent color config
   ───────────────────────────────────────────────────────────── */
const ROLE_ACCENTS = {
  ROLE_SUPER_ADMIN: {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    avatarFrom: "#8b5cf6",
    avatarTo: "#7c3aed",
    glow: "rgba(139,92,246,0.35)",
  },
  ROLE_ADMIN: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    avatarFrom: "#3b82f6",
    avatarTo: "#4f46e5",
    glow: "rgba(59,130,246,0.35)",
  },
  ROLE_MANAGER: {
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    avatarFrom: "#6366f1",
    avatarTo: "#4f46e5",
    glow: "rgba(99,102,241,0.35)",
  },
  ROLE_SALESMAN: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    avatarFrom: "#10b981",
    avatarTo: "#059669",
    glow: "rgba(16,185,129,0.35)",
  },
  ROLE_PRODUCTION: {
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    avatarFrom: "#f97316",
    avatarTo: "#ea580c",
    glow: "rgba(249,115,22,0.35)",
  },
  ROLE_PACKING: {
    badge: "bg-pink-50 text-pink-700 border-pink-200",
    dot: "bg-pink-500",
    avatarFrom: "#ec4899",
    avatarTo: "#db2777",
    glow: "rgba(236,72,153,0.35)",
  },
  ROLE_ACCOUNTS: {
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
    avatarFrom: "#06b6d4",
    avatarTo: "#0891b2",
    glow: "rgba(6,182,212,0.35)",
  },
  ROLE_DELIVERY: {
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
    avatarFrom: "#14b8a6",
    avatarTo: "#0d9488",
    glow: "rgba(20,184,166,0.35)",
  },
};

const getAccent = (role) =>
  ROLE_ACCENTS[role] ?? {
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    avatarFrom: "#64748b",
    avatarTo: "#475569",
    glow: "rgba(100,116,139,0.25)",
  };

/* ─────────────────────────────────────────────────────────────
   Avatar
   ───────────────────────────────────────────────────────────── */
const Avatar = ({ initials, role, size = "sm" }) => {
  const accent = getAccent(role);
  const dims = { sm: 32, md: 40, lg: 48 };
  const font = { sm: "11px", md: "13px", lg: "15px" };
  const d = dims[size];

  return (
    <div
      style={{
        width: d,
        height: d,
        minWidth: d,
        background: `linear-gradient(135deg, ${accent.avatarFrom}, ${accent.avatarTo})`,
        boxShadow: `0 3px 10px ${accent.glow}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 900,
        fontSize: font[size],
        letterSpacing: "0.02em",
        flexShrink: 0,
        outline: "2px solid rgba(255,255,255,0.9)",
        outlineOffset: "-1px",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Navbar
   ───────────────────────────────────────────────────────────── */
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    setShowProfileMenu(false);
    navigate(path);
  };

  const initials = user?.employee_name
    ? user.employee_name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  const accent = getAccent(user?.role);
  const canAccessCompanyDetails = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role);

  return (
    <header className="nb-header">
      <div className="nb-bar">

        {/* ── Left ── */}
        <div className="nb-bar__left">
          <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 tracking-[0.12em] uppercase select-none">
            Smart Enterprises
          </span>
        </div>

        {/* ── Right ── */}
        <div className="nb-bar__right">

          {/* Bell */}
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            aria-label="Notifications"
          >
            <FiBell size={15} />
            <span
              className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-rose-500 ring-[1.5px] ring-white"
              aria-hidden="true"
            />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 mx-1.5" />

          {/* Profile */}
          <div className="relative" ref={dropdownRef}>

            {/* Trigger */}
            <button
              onClick={() => setShowProfileMenu((p) => !p)}
              aria-haspopup="true"
              aria-expanded={showProfileMenu}
              className={`
                flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300
                ${showProfileMenu
                  ? "bg-slate-100 border-slate-300"
                  : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer"
                }
              `}
            >
              <Avatar initials={initials} role={user?.role} size="sm" />

              <div className="hidden sm:flex flex-col items-start">
                <span className="text-[13px] font-bold text-slate-800 leading-tight whitespace-nowrap">
                  {capitalizeFirstLetter(user?.employee_name) || "User"}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 leading-tight mt-[1px]">
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              <FiChevronDown
                size={12}
                className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`}
              />
            </button>

            {/* ── Dropdown ── */}
            {showProfileMenu && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-[272px] bg-white rounded-2xl border border-slate-200/80 z-50 overflow-hidden"
                style={{
                  boxShadow: "0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                  animation: "nb-dropdown-in 160ms cubic-bezier(0.4,0,0.2,1) forwards",
                }}
              >
                {/* ── Hero ── */}
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials} role={user?.role} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {capitalizeFirstLetter(user?.employee_name)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                        {user?.employee_email}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-[0.07em] ${accent.badge}`}>
                      <FiShield size={9} />
                      {getRoleLabel(user?.role)}
                    </span>

                    {user?.employee_id && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-mono font-semibold text-slate-500">
                        <FiHash size={8} />
                        {user.employee_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Separator ── */}
                <div className="h-px bg-slate-100 mx-3" />

                {/* ── Menu Items ── */}
                <div className="p-2 space-y-0.5">

                  <button
                    onClick={() => handleNavigate(`/users/${user?.employee_id}`)}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
                      <FiUser size={13} />
                    </div>
                    My Profile
                  </button>

                  {canAccessCompanyDetails && (
                    <button
                      onClick={() => handleNavigate("/company-details")}
                      role="menuitem"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                    >
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
                        <FiSettings size={13} />
                      </div>
                      Company Settings
                    </button>
                  )}
                </div>

                {/* ── Separator ── */}
                <div className="h-px bg-slate-100 mx-3" />

                {/* ── Sign Out ── */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all duration-150 cursor-pointer"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 flex-shrink-0">
                      <FiLogOut size={13} />
                    </div>
                    Sign Out
                  </button>
                </div>

                {/* ── Footer ── */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium text-center tracking-wide">
                    Smart Enterprises · v1.0
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;