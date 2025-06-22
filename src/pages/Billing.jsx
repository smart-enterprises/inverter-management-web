import React, { useState } from "react";
import {
  FiClock,
  FiCheckCircle,
  FiSend,
  FiEye,
  FiDownload,
  FiFileText,
  FiSearch,
  FiCalendar,
} from "react-icons/fi";

const Billing = () => {
  const [activeTab, setActiveTab] = useState("Pending Bills");
  const tabs = ["Pending Bills", "Sent Bills"];
  const [searchQuery, setSearchQuery] = useState('');


  const pendingBills = [
    {
      billId: "BILL-001",
      orderId: "ORD-001",
      dealer: "ABC Electronics",
      amount: "₹1,500",
      createdDate: "1/2/2025",
      status: "Pending",
    },
  ];

  const sentBills = [
    {
      billId: "BILL-002",
      orderId: "ORD-002",
      dealer: "XYZ Electronics",
      amount: "₹2,800",
      sentDate: "1/3/2025",
      status: "Sent",
    },
  ];

  const renderTable = (bills, isSent = false) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-full ${
              isSent ? "bg-green-50" : "bg-orange-50"
            }`}
          >
            {isSent ? (
              <FiCheckCircle className="text-green-500" size={24} />
            ) : (
              <FiClock className="text-orange-500" size={24} />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isSent ? "Sent Bills" : "Pending Bills"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isSent
                ? "Bills that have been successfully sent to dealers"
                : "Bills that are ready to be sent to dealers"}
            </p>
          </div>
        </div>
      </div>
      <div className="mb-6 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Bill ID, Order ID or Dealer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
          </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Bill ID
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Dealer
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {isSent ? "Sent Date" : "Created Date"}
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bills.map((bill) => (
              <tr key={bill.billId}>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600">
                    {bill.billId}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{bill.orderId}</span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-gray-400" />
                    <span className="text-sm text-gray-800 font-medium">
                      {bill.dealer}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-sm font-medium text-green-600">
                    {bill.amount}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar />
                    <span className="text-sm">
                      {isSent ? bill.sentDate : bill.createdDate}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isSent
                        ? "bg-green-100 text-green-600"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {isSent ? (
                      <FiCheckCircle size={14} />
                    ) : (
                      <FiClock size={14} />
                    )}
                    {bill.status}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {!isSent && (
                      <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        <FiSend size={14} /> Send
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors">
                      <FiEye size={14} /> View
                    </button>
                    <button className="p-2 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors">
                      <FiDownload size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Billing Management
          </h1>
        </div>
      </div>

      <div className="flex justify-start sm:justify-center overflow-x-auto mb-6">
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:bg-white/50"
              }`}
            >
              {tab === "Pending Bills" ? (
                <FiClock className="text-orange-500" />
              ) : (
                <FiCheckCircle className="text-green-500" />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === "Pending Bills" && renderTable(pendingBills)}
        {activeTab === "Sent Bills" && renderTable(sentBills, true)}
      </div>
    </div>
  );
};

export default Billing;
