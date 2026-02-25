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
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/users")}
          className="p-2 hover:bg-gray-200 rounded-lg"
        >
          <FiArrowLeft />
        </button>
        <div>
          <h1 className="text-xl font-semibold">User Details</h1>
          <p className="text-sm text-gray-500">
            {userData.employee_name?.charAt(0).toUpperCase() + userData.employee_name?.slice(1)}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid md:grid-cols-2 gap-6">

          <Info icon={<FiUser />} label="Name" value={userData.employee_name?.charAt(0).toUpperCase() + userData.employee_name?.slice(1)} />
          <Info icon={<FiMail />} label="Email" value={userData.employee_email} />
          <Info icon={<FiPhone />} label="Phone" value={userData.employee_phone} />
          <Info icon={<FiShield />} label="Role" value={getRoleLabel(userData.role)} />
          <Info icon={<FiMapPin />} label="District" value={userData.district || "N/A"} />
          <Info icon={<FiMapPin />} label="Town" value={userData.town || "N/A"} />
          <Info icon={<FiMapPin />} label="Address" value={userData.address || "N/A"} />
          <Info
            icon={<FiCalendar />}
            label="Created At"
            value={new Date(userData.created_at).toLocaleString()}
          />

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