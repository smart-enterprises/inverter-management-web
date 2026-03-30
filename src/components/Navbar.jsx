// navbar.jsx — Redesigned

import React, { useState, useRef, useEffect } from "react";
import {
  FiBell,
  FiLogOut,
  FiChevronDown,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { capitalizeFirstLetter } from "../utils/constants";
import { getRoleLabel } from "../utils/roles";

/* ─────────────────────────────────────────────
   ROLE → badge accent (all original roles kept)
───────────────────────────────────────────── */
const ROLE_BADGE_COLORS = {
  ROLE_SUPER_ADMIN: "nb-badge--violet",
  ROLE_ADMIN: "nb-badge--blue",
  ROLE_MANAGER: "nb-badge--indigo",
  ROLE_SALESMAN: "nb-badge--emerald",
  ROLE_PRODUCTION: "nb-badge--orange",
  ROLE_PACKING: "nb-badge--pink",
  ROLE_ACCOUNTS: "nb-badge--cyan",
  ROLE_DELIVERY: "nb-badge--teal",
  ROLE_SUPERVISOR: "nb-badge--amber",
};
const getRoleBadgeClass = (role) => ROLE_BADGE_COLORS[role] || "nb-badge--slate";

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.employee_name
    ? user.employee_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <>
      <style>{NAVBAR_STYLES}</style>

      <header className="nb-header">
        <div className="nb-bar">

          {/* ── Left: empty slot (preserved for future search/breadcrumb) ── */}
          <div className="nb-bar__left" />

          {/* ── Right: actions ── */}
          <div className="nb-bar__right">

            {/* Notification bell */}
            <button className="nb-icon-btn" aria-label="Notifications">
              <FiBell size={15} />
              <span className="nb-icon-btn__dot" />
            </button>

            {/* Divider */}
            <div className="nb-divider" />

            {/* Profile trigger */}
            <div className="nb-profile" ref={dropdownRef}>
              <button
                className={`nb-profile__trigger ${showProfileMenu ? "nb-profile__trigger--open" : ""}`}
                onClick={() => setShowProfileMenu((p) => !p)}
                aria-haspopup="true"
                aria-expanded={showProfileMenu}
              >
                <Avatar initials={initials} size="sm" />

                <div className="nb-profile__info">
                  <span className="nb-profile__name">
                    {capitalizeFirstLetter(user?.employee_name) || "User"}
                  </span>
                  <span className="nb-profile__role">{getRoleLabel(user?.role)}</span>
                </div>

                <FiChevronDown
                  size={13}
                  className={`nb-profile__chevron ${showProfileMenu ? "nb-profile__chevron--open" : ""}`}
                />
              </button>

              {/* ── Dropdown ── */}
              {showProfileMenu && (
                <div className="nb-dropdown" role="menu">

                  {/* Top card */}
                  <div className="nb-dropdown__card">
                    <Avatar initials={initials} size="md" />
                    <div className="nb-dropdown__card-info">
                      <p className="nb-dropdown__name">
                        {capitalizeFirstLetter(user?.employee_name)}
                      </p>
                      <p className="nb-dropdown__email">{user?.employee_email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="nb-dropdown__badge-row">
                    <span className={`nb-badge ${getRoleBadgeClass(user?.role)}`}>
                      <FiShield size={9} />
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>

                  {/* Employee ID */}
                  {user?.employee_id && (
                    <div className="nb-dropdown__id-row">
                      <span className="nb-dropdown__id-label">Employee ID</span>
                      <span className="nb-dropdown__id-value">{user.employee_id}</span>
                    </div>
                  )}

                  {/* Separator */}
                  <div className="nb-dropdown__sep" />

                  {/* Sign out */}
                  <button className="nb-dropdown__signout" onClick={handleLogout} role="menuitem">
                    <FiLogOut size={13} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

/* ─────────────────────────────────────────────
   Avatar (reusable sub-component)
───────────────────────────────────────────── */
const Avatar = ({ initials, size = "sm" }) => (
  <div className={`nb-avatar nb-avatar--${size}`}>
    {initials}
  </div>
);

/* ─────────────────────────────────────────────
   Scoped Styles
───────────────────────────────────────────── */
const NAVBAR_STYLES = `
  /* ── Variables ── */
  .nb-header {
    --nb-blue: #2563eb;
    --nb-blue-50: #eff6ff;
    --nb-blue-100: #dbeafe;
    --nb-blue-600: #2563eb;
    --nb-text-main: #0f172a;
    --nb-text-mid: #475569;
    --nb-text-dim: #94a3b8;
    --nb-border: #e2e8f0;
    --nb-bg: #ffffff;
    --nb-ease: 200ms cubic-bezier(0.4,0,0.2,1);
    --nb-radius: 12px;
  }

  /* ── Header shell ── */
  .nb-header {
    padding: 10px 20px;
    background: #f8fafc;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  /* ── Bar ── */
  .nb-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 18px;
    background: var(--nb-bg);
    border-radius: 14px;
    border: 1px solid var(--nb-border);
    box-shadow:
      0 1px 3px rgba(0,0,0,0.04),
      0 4px 16px rgba(0,0,0,0.04);
    max-width: 1800px;
    margin: 0 auto;
  }

  .nb-bar__left { flex: 1; }
  .nb-bar__right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ── Icon button (bell, etc.) ── */
  .nb-icon-btn {
    position: relative;
    width: 36px; height: 36px;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--nb-text-dim);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background var(--nb-ease), color var(--nb-ease);
  }
  .nb-icon-btn:hover {
    background: var(--nb-blue-50);
    color: var(--nb-blue-600);
  }
  .nb-icon-btn__dot {
    position: absolute;
    top: 7px; right: 7px;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #ef4444;
    border: 2px solid #fff;
  }

  /* ── Divider ── */
  .nb-divider {
    width: 1px; height: 22px;
    background: var(--nb-border);
    margin: 0 6px;
  }

  /* ── Profile ── */
  .nb-profile { position: relative; }

  .nb-profile__trigger {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 10px 5px 6px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: background var(--nb-ease), border-color var(--nb-ease);
  }
  .nb-profile__trigger:hover,
  .nb-profile__trigger--open {
    background: var(--nb-blue-50);
    border-color: var(--nb-blue-100);
  }

  .nb-profile__info {
    display: none;
    flex-direction: column;
    align-items: flex-start;
  }
  @media (min-width: 640px) { .nb-profile__info { display: flex; } }

  .nb-profile__name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--nb-text-main);
    line-height: 1;
    white-space: nowrap;
  }
  .nb-profile__role {
    font-size: 10px;
    font-weight: 500;
    color: var(--nb-text-dim);
    margin-top: 2px;
    line-height: 1;
  }

  .nb-profile__chevron {
    color: var(--nb-text-dim);
    transition: transform var(--nb-ease);
    flex-shrink: 0;
  }
  .nb-profile__chevron--open { transform: rotate(180deg); }

  /* ── Avatar ── */
  .nb-avatar {
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(37,99,235,0.3);
    letter-spacing: 0.02em;
  }
  .nb-avatar--sm { width: 30px; height: 30px; font-size: 11px; border-radius: 8px; }
  .nb-avatar--md { width: 38px; height: 38px; font-size: 13px; border-radius: 10px; }

  /* ── Dropdown ── */
  .nb-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 256px;
    background: #fff;
    border: 1px solid var(--nb-border);
    border-radius: 14px;
    box-shadow:
      0 8px 30px rgba(0,0,0,0.1),
      0 2px 8px rgba(0,0,0,0.06);
    overflow: hidden;
    z-index: 50;
    animation: nb-dropdown-in 160ms cubic-bezier(0.4,0,0.2,1) forwards;
  }
  @keyframes nb-dropdown-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  /* Card section */
  .nb-dropdown__card {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 16px 16px 12px;
  }
  .nb-dropdown__card-info { min-width: 0; }
  .nb-dropdown__name {
    font-size: 13px;
    font-weight: 700;
    color: var(--nb-text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nb-dropdown__email {
    font-size: 11px;
    color: var(--nb-text-dim);
    font-weight: 500;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Badge row */
  .nb-dropdown__badge-row {
    padding: 0 16px 12px;
  }

  /* Role badge */
  .nb-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid;
  }
  .nb-badge--violet { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
  .nb-badge--blue   { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
  .nb-badge--indigo { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
  .nb-badge--emerald{ background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
  .nb-badge--orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
  .nb-badge--pink   { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
  .nb-badge--cyan   { background: #ecfeff; color: #0e7490; border-color: #a5f3fc; }
  .nb-badge--teal   { background: #f0fdfa; color: #0f766e; border-color: #99f6e4; }
  .nb-badge--amber  { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .nb-badge--slate  { background: #f8fafc; color: #475569; border-color: #e2e8f0; }

  /* Employee ID row */
  .nb-dropdown__id-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 16px;
    background: #f8fafc;
    border-top: 1px solid var(--nb-border);
    border-bottom: 1px solid var(--nb-border);
  }
  .nb-dropdown__id-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--nb-text-dim);
  }
  .nb-dropdown__id-value {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--nb-text-mid);
  }

  /* Separator */
  .nb-dropdown__sep {
    height: 1px;
    background: var(--nb-border);
  }

  /* Sign out */
  .nb-dropdown__signout {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--nb-text-mid);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background var(--nb-ease), color var(--nb-ease);
    text-align: left;
  }
  .nb-dropdown__signout:hover {
    background: #fff1f2;
    color: #dc2626;
  }
`;

export default Navbar;
