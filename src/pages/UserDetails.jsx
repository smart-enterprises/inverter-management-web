// UserDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiShield,
  FiLink,
  FiPlus,
  FiTag,
  FiUserCheck,
  FiPackage,
  FiTrendingUp,
  FiGrid,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { TbBuildingStore, TbUsersGroup } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi2";
import Swal from "sweetalert2";
import { fetchUserById, fetchUsers } from "../api/user";
import { getRoleLabel, ROLES } from "../utils/roles";
import { capitalizeFirstLetter } from "../utils/constants";
import { useAuth } from "../hooks/useAuth";
import ManageDealersModal from "../components/ManageDealersModal";

const DEALER_MANAGER_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

// ─── Info Card ────────────────────────────────────────────────────────────────

const Info = ({ icon, label, value }) => (
  <div className="group flex items-start gap-3 p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all duration-200">
    <div className="text-[#9333EA] mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{value}</p>
    </div>
  </div>
);

// ─── Color Palette for avatars ────────────────────────────────────────────────

const COLOR_PALETTE = [
  ["#6366f1", "#a5b4fc"],
  ["#0891b2", "#67e8f9"],
  ["#059669", "#6ee7b7"],
  ["#d97706", "#fcd34d"],
  ["#dc2626", "#fca5a5"],
  ["#7c3aed", "#c4b5fd"],
  ["#0284c7", "#7dd3fc"],
  ["#be185d", "#f9a8d4"],
];

const getAvatarColors = (letter) =>
  COLOR_PALETTE[(letter?.charCodeAt(0) ?? 0) % COLOR_PALETTE.length];

// ─── Dealer Card ──────────────────────────────────────────────────────────────

const DealerCard = ({ dealer, userMap }) => {
  const dealerDetails = userMap[dealer];
  const createdByRecord = userMap[dealerDetails?.created_by];

  const name = dealerDetails?.employee_name ?? dealerDetails?.dealer_id ?? dealerDetails;

  const shopName = dealerDetails?.shop_name ?? null;
  const dealerId = dealerDetails?.employee_id ?? dealer;
  const createdBy = createdByRecord?.employee_name ?? dealerDetails?.created_by;

  const letter = (name || "?")[0]?.toUpperCase();
  const [from, to] = getAvatarColors(letter);

  return (
    <div className="group relative flex items-start gap-3.5 px-4 py-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/60 transition-all duration-200 overflow-hidden">
      {/* Subtle bg glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/30 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-2xl" />

      {/* Left accent bar */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 to-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0 mt-0.5 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 3px 8px ${from}44` }}
      >
        {letter}
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-sm font-bold text-slate-800 leading-tight truncate">
          {capitalizeFirstLetter(name)}
        </span>

        {shopName && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 leading-tight">
            <TbBuildingStore size={11} className="flex-shrink-0" />
            <span className="truncate">{shopName}</span>
          </span>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {dealerId && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
              <FiTag size={8} />
              {dealerId}
            </span>
          )}
          {createdBy && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <FiUserCheck size={9} />
              {createdBy}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Assigned Dealers Section ─────────────────────────────────────────────────

const AssignedDealersSection = ({ userData, canManage, onManageDealers, userMap }) => {
  const dealers = Array.isArray(userData?.dealers) ? userData.dealers : [];
  const dealerCount = dealers.length;
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDealers = dealers.filter((dealer) => {
    if (!searchTerm.trim()) return true;
    const details = userMap[dealer];
    const name =
      typeof details === "string"
        ? details
        : details?.dealer_name || details?.dealer_id || dealer;
    const shop = typeof details === "object" ? details?.shop_name || "" : "";
    const q = searchTerm.toLowerCase();
    return (
      name?.toLowerCase().includes(q) ||
      shop?.toLowerCase().includes(q) ||
      String(dealer).toLowerCase().includes(q)
    );
  });

  return (
    <div className="border-t border-gray-100">
      {/* ── Section Header ── */}
      <div className="px-8 py-5 bg-gradient-to-r from-emerald-50/70 via-white to-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-200">
            <TbUsersGroup size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">
              Dealer Network
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              All dealers assigned to this salesperson
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Count badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-extrabold text-emerald-700">{dealerCount}</span>
            <span className="text-xs text-gray-400 font-medium">
              {dealerCount === 1 ? "dealer" : "dealers"}
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={onManageDealers}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all shadow-md shadow-emerald-200"
            >
              <FiPlus size={12} />
              Manage
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 pb-8 pt-1">
        {dealerCount === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50">
            <div className="w-14 h-14 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-3">
              <FiTrendingUp size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500">No dealers assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {canManage ? "Click Manage to add dealers" : "Contact your manager to assign dealers"}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={onManageDealers}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
              >
                <FiPlus size={12} />
                Assign Dealers
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Search bar — only visible when there are multiple dealers */}
            {dealerCount > 4 && (
              <div className="relative mb-4">
                <FiSearch
                  size={13}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search dealers…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 text-[13px] border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors"
                  >
                    <FiX size={10} />
                  </button>
                )}
              </div>
            )}

            {/* Summary strip */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                  style={{ width: `${Math.min((filteredDealers.length / Math.max(dealerCount, 1)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                {searchTerm
                  ? `${filteredDealers.length} of ${dealerCount}`
                  : `${dealerCount} total`}
              </span>
            </div>

            {/* Dealer Grid */}
            {filteredDealers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredDealers.map((dealer, idx) => (
                  <DealerCard key={idx} dealer={dealer} userMap={userMap} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 rounded-2xl bg-slate-50 border border-slate-100">
                <FiSearch size={20} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-500">No dealers match your search</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewerUser } = useAuth();
  const viewerRole = (viewerUser?.role || "").toUpperCase();

  const [userData, setUserData] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [dealersModalOpen, setDealersModalOpen] = useState(false);

  const canManageDealers = DEALER_MANAGER_ROLES.has(viewerRole);
  const isSalesmanProfile = (userData?.role || "").toUpperCase() === ROLES.SALESMAN;

  const loadUserMap = useCallback(async () => {
    try {
      const res = await fetchUsers({
        page: 1,
        limit: 5000,
        status: "active",
        includePassword: false,
        includeDealers: true,
      });

      const employees = res?.data?.employees;
      if (!res?.success || !Array.isArray(employees)) return;

      const map = Object.fromEntries(
        employees
          .filter((u) => u?.employee_id != null)
          .map((u) => [u.employee_id, u])
      );

      setUserMap(map);
    } catch {
      // silent
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchUserById(id);
      if (!res?.success) throw new Error(res.message);
      setUserData(res.data);
    } catch (err) {
      Swal.fire("Error", err.message, "error");
      navigate("/users");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadUser();
    loadUserMap();
  }, [loadUser, loadUserMap]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#9333EA] rounded-full" />
      </div>
    );
  }

  if (!userData) return null;

  const isActive = userData?.status?.toLowerCase() === "active";

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
            aria-label="Go Back"
          >
            <FiArrowLeft className="text-gray-600" size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Detailed overview of{" "}
              <span className="font-semibold text-gray-700">
                {capitalizeFirstLetter(userData?.employee_name)}
              </span>
              's account
            </p>
          </div>
        </div>

        <div
          className={`self-start lg:self-auto px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm tracking-wide ${isActive
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
            }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${isActive ? "bg-emerald-500" : "bg-red-500"
              }`}
          />
          {capitalizeFirstLetter(userData?.status)}
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Card header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9333EA] to-blue-400 flex items-center justify-center shadow-sm shadow-blue-200">
              <FiUser size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Core account and contact details</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Info icon={<FiUser size={14} />} label="Full Name" value={capitalizeFirstLetter(userData?.employee_name)} />
            <Info icon={<FiMail size={14} />} label="Email Address" value={userData?.employee_email || "N/A"} />
            <Info icon={<FiPhone size={14} />} label="Phone Number" value={userData?.employee_phone || "N/A"} />
            <Info icon={<FiShield size={14} />} label="Role" value={getRoleLabel(userData?.role)} />
            <Info icon={<FiMapPin size={14} />} label="District" value={userData?.district || "N/A"} />
            <Info icon={<FiMapPin size={14} />} label="Town" value={userData?.town || "N/A"} />
            <Info icon={<FiMapPin size={14} />} label="Address" value={userData?.address || "N/A"} />
            <Info
              icon={<FiUserCheck size={14} />}
              label="Created By"
              value={
                userMap[userData?.created_by]?.employee_name
                ?? userData?.created_by
                ?? "N/A"
              }
            />
            <Info
              icon={<FiCalendar size={14} />}
              label="Created On"
              value={
                userData?.created_at
                  ? new Date(userData.created_at).toLocaleString()
                  : "N/A"
              }
            />
          </div>
        </div>

        {/* Dealer Network — only for salesman profiles */}
        {isSalesmanProfile && (
          <AssignedDealersSection
            userData={userData}
            canManage={canManageDealers}
            onManageDealers={() => setDealersModalOpen(true)}
            userMap={userMap}
          />
        )}
      </div>

      {dealersModalOpen && canManageDealers && (
        <ManageDealersModal
          salesman={userData}
          onClose={() => setDealersModalOpen(false)}
          onSaved={loadUser}
          userMap={userMap}
        />
      )}
    </div>
  );
};

export default UserDetails;