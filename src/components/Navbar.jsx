// Navbar.jsx

import React, { useState, useRef, useEffect } from "react";
import { FiBell, FiLogOut, FiChevronDown, FiShield } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { capitalizeFirstLetter } from "../utils/constants";
import { getRoleLabel } from "../utils/roles";

/* ─────────────────────────────────────────────────────────────
   Role → badge accent (all original roles preserved)
   ───────────────────────────────────────────────────────────── */
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

const getRoleBadgeClass = (role) =>
  ROLE_BADGE_COLORS[role] ?? "nb-badge--slate";

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
    await logout();
    navigate("/login");
  };

  const initials = user?.employee_name
    ? user.employee_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <header className="nb-header">
      <div className="nb-bar">

        {/* Left — reserved for search / breadcrumb */}
        <div className="nb-bar__left" />

        {/* Right — actions */}
        <div className="nb-bar__right">

          {/* Notification bell */}
          <button className="nb-icon-btn" aria-label="Notifications">
            <FiBell size={15} />
            <span className="nb-icon-btn__dot" aria-hidden="true" />
          </button>

          <div className="nb-divider" />

          {/* Profile */}
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

            {/* Dropdown */}
            {showProfileMenu && (
              <div className="nb-dropdown" role="menu">

                {/* User card */}
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

                <div className="nb-dropdown__sep" />

                {/* Sign out */}
                <button
                  className="nb-dropdown__signout"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <FiLogOut size={13} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────────────────────
   Avatar
   ───────────────────────────────────────────────────────────── */
const Avatar = ({ initials, size = "sm" }) => (
  <div className={`nb-avatar nb-avatar--${size}`} aria-hidden="true">
    {initials}
  </div>
);

export default Navbar;