import React, { useState } from "react";
import {
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiFileText,
  FiCalendar,
  FiBox,
  FiTruck,
  FiMapPin,
  FiPhone,
  FiX
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";

const Delivery = () => {
  const [activeTab, setActiveTab] = useState("Pending");
  const tabs = ["Pending", "Completed"];
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const pendingDeliveries = [
    {
      id: "#3",
      dealerName: "Green Energy Solutions",
      date: "Jun 20, 2025",
      items: "2 items",
      address: "123 Green St, Solar City",
      status: "Pending",
    },
     {
      id: "#4",
      dealerName: "Eco Power Co.",
      date: "Jun 22, 2025",
      items: "5 items",
      address: "456 Renewable Ave, Windmill City",
      status: "Pending",
    },
  ];

  const completedDeliveries = [
    {
      id: "#1",
      dealerName: "SunPower Inc.",
      date: "May 15, 2025",
      items: "3 items",
      address: "789 Solar Blvd, Sun City",
      status: "Completed",
    },
    {
      id: "#2",
      dealerName: "Future Systems",
      date: "May 18, 2025",
      items: "1 item",
      address: "101 Innovation Dr, Tech Park",
      status: "Completed",
    },
  ];

  const renderDeliveryCard = (delivery, isPending = false) => (
    <div
      key={delivery.id}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {delivery.id}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isPending
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isPending ? <FiClock size={14} /> : <FiCheckCircle size={14} />}
            {delivery.status}
          </span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <FiFileText
              className="text-gray-400 flex-shrink-0"
              size={16}
            />
            <span className="font-semibold">
              {delivery.dealerName}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-500 text-sm pr-1">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-400" />
              <span>{delivery.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiBox className="text-gray-400" />
              <span>{delivery.items}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-3 text-gray-600 text-sm mt-1">
            <FiMapPin
              className="text-gray-400 flex-shrink-0 mt-0.5"
              size={15}
            />
            <span>{delivery.address}</span>
          </div>
        </div>
      </div>
      {isPending && (
        <div className="mt-5">
          <button
            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 text-white px-4 py-3 rounded-xl text-md font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30"
            onClick={() => {
              setSelectedDelivery(delivery);
              setModalOpen(true);
            }}
          >
            <FiTruck size={18} />
            Manage Delivery
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Delivery Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage all delivery operations efficiently
            </p>
          </div>
        </div>

        <div className="relative mb-6">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by order ID or dealer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-700 shadow-sm"
                  : "text-gray-500 hover:bg-white/60"
              }`}
            >
              {tab === "Pending" ? <FiClock /> : <FiCheckCircle />}
              <span>{tab}</span>
              {tab === "Pending" && pendingDeliveries.length > 0 && (
                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {pendingDeliveries.length}
                </span>
              )}
              {tab === "Completed" && completedDeliveries.length > 0 && (
                <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {completedDeliveries.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "Pending" && (
            <>
              {pendingDeliveries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {pendingDeliveries.map((delivery) =>
                    renderDeliveryCard(delivery, true)
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={FiClock}
                  title="No pending deliveries"
                  message="Pending deliveries will appear here"
                />
              )}
            </>
          )}
          {activeTab === "Completed" && (
            <>
              {completedDeliveries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {completedDeliveries.map((delivery) =>
                    renderDeliveryCard(delivery, false)
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={FiCheckCircle}
                  title="No completed deliveries"
                  message="Completed deliveries will appear here"
                />
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full m-4">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">
                Delivery Management - Order {selectedDelivery.id}
              </h2>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setModalOpen(false)}
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-8">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <div className="text-blue-700 font-semibold text-sm mb-2 flex items-center gap-2">
                    <FiFileText /> Dealer Information
                  </div>
                  <div className="font-bold text-lg text-gray-800">
                    {selectedDelivery.dealerName}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                    <FiPhone size={14} />
                    <span>1234567890</span>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <div className="text-green-800 font-semibold text-sm mb-2 flex items-center gap-2">
                    <FiCalendar /> Delivery Date
                  </div>
                  <div className="bg-white border-2 border-purple-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-gray-700 font-medium">22-06-2025</span>
                    <FiCalendar className="text-gray-400" />
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                  <div className="text-purple-700 font-semibold text-sm mb-2">
                    Status
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
                    <FiClock size={14} /> Pending
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-xl border border-gray-200 mb-6 p-5">
                <div className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <FiMapPin /> Delivery Address
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-gray-700">
                  {selectedDelivery.address}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <FiBox /> Order Items
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <div className="font-bold text-gray-800">Solar Inverter 1kW</div>
                      <div className="text-xs text-gray-500 mt-1">
                        PowerMax • X100 • Ordered:{" "}
                        <span className="font-bold">1</span> •{" "}
                        <span className="text-green-600 font-semibold">
                          Delivered: 0
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 md:mt-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
                        <FiClock size={14} /> Pending
                      </span>
                      <button className="border border-blue-300 text-blue-600 bg-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50">
                        Update
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <div className="font-bold text-gray-800">Solar Inverter 2kW</div>
                      <div className="text-xs text-gray-500 mt-1">
                        PowerMax • X200 • Ordered:{" "}
                        <span className="font-bold">1</span> •{" "}
                        <span className="text-green-600 font-semibold">
                          Delivered: 0
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 md:mt-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
                        <FiClock size={14} /> Pending
                      </span>
                      <button className="border border-blue-300 text-blue-600 bg-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;
