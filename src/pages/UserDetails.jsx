// user-details.jsx code

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiShield,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { fetchUserById } from "../api/user";
import { getRoleLabel } from "../utils/roles";
import { capitalizeFirstLetter } from "../utils/constants";

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchUserById(id);
        if (!res?.success) throw new Error(res.message);
        setUserData(res.data);
      } catch (err) {
        Swal.fire("Error", err.message, "error");
        navigate("/users");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-10 w-10 border-b-2 border-[#9333EA] rounded-full"></div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">

      {/* ===================== Header ===================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

        {/* Left Section */}
        <div className="flex items-start gap-4">

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
            aria-label="Go Back"
          >
            <FiArrowLeft className="text-gray-600" size={18} />
          </button>

          {/* Title Section */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              User Profile
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Detailed overview of user account
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-5 py-2 rounded-full text-xs font-semibold border shadow-sm
          ${userData?.status?.toLowerCase() === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
            }
        `}
        >
          {capitalizeFirstLetter(userData?.status)}
        </div>
      </div>

      {/* ===================== Profile Card ===================== */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">

        {/* Card Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Personal Information
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Core account and contact details
          </p>
        </div>

        {/* Card Body */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

            <Info
              icon={<FiUser />}
              label="Full Name"
              value={capitalizeFirstLetter(userData?.employee_name)}
            />

            <Info
              icon={<FiMail />}
              label="Email Address"
              value={userData?.employee_email || "N/A"}
            />

            <Info
              icon={<FiPhone />}
              label="Phone Number"
              value={userData?.employee_phone || "N/A"}
            />

            <Info
              icon={<FiShield />}
              label="Role"
              value={getRoleLabel(userData?.role)}
            />

            <Info
              icon={<FiMapPin />}
              label="District"
              value={userData?.district || "N/A"}
            />

            <Info
              icon={<FiMapPin />}
              label="Town"
              value={userData?.town || "N/A"}
            />

            <Info
              icon={<FiMapPin />}
              label="Address"
              value={userData?.address || "N/A"}
            />

            <Info
              icon={<FiCalendar />}
              label="Created On"
              value={
                userData?.created_at
                  ? new Date(userData.created_at).toLocaleString()
                  : "N/A"
              }
            />

          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="text-[#9333EA] mt-1">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

export default UserDetails;