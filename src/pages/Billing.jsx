import React, { useState } from "react";
import {
  MdCalendarMonth,
  MdCheckCircle,
  MdDescription,
  MdDownload,
  MdSchedule,
  MdSearch,
  MdSend,
  MdVisibility,
} from "react-icons/md";

const Billing = () => {
  const [activeTab, setActiveTab] = useState("Pending Bills");
  const tabs = ["Pending Bills", "Sent Bills"];
  const [searchQuery, setSearchQuery] = useState('');


  const pendingBills = [
    {
      billId: "BILL-001",
      orderId: "ORD-001",
      dealer: "ABC Electronics",
      amount: "₹ 1,500",
      createdDate: "1/2/2025",
      status: "Pending",
    },
  ];

  const sentBills = [
    {
      billId: "BILL-002",
      orderId: "ORD-002",
      dealer: "XYZ Electronics",
      amount: "₹ 2,800",
      sentDate: "1/3/2025",
      status: "Sent",
    },
  ];

  const renderTable = (bills, isSent = false) => (
    <div className="m3-surface-bg rounded-xl shadow-sm border m3-outline-variant-border overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-2.5 rounded-full ${isSent ? "bg-green-50" : "bg-blue-50"
                }`}
            >
              {isSent ? (
                <MdCheckCircle className="text-green-500" size={24} />
              ) : (
                <MdSchedule className="text-blue-500" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold m3-on-surface">
                {isSent ? "Sent Bills" : "Pending Bills"}
              </h2>
              <p className="text-sm m3-on-surface-variant mt-1">
                {isSent
                  ? "Bills that have been successfully sent to dealers"
                  : "Bills that are ready to be sent to dealers"}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto mt-4 sm:mt-0">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 m3-on-surface-variant" size={20} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-lg border m3-outline-variant-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y m3-outline-variant-border m3-surface-container-low-bg">
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Bill ID
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Order ID
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Dealer
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                {isSent ? "Sent Date" : "Created Date"}
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold m3-on-surface-variant uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bills.map((bill) => (
              <tr key={bill.billId}>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-sm font-medium text-[#9333EA]">
                    {bill.billId}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-sm m3-on-surface-variant">{bill.orderId}</span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <MdDescription className="m3-on-surface-variant" />
                    <span className="text-sm m3-on-surface font-medium">
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
                  <div className="flex items-center gap-2 m3-on-surface-variant">
                    <MdCalendarMonth />
                    <span className="text-sm">
                      {isSent ? bill.sentDate : bill.createdDate}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isSent
                      ? "bg-green-100 text-green-600"
                      : "bg-blue-100 text-blue-600"
                      }`}
                  >
                    {isSent ? (
                      <MdCheckCircle size={14} />
                    ) : (
                      <MdSchedule size={14} />
                    )}
                    {bill.status}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {!isSent && (
                      <button className="flex items-center gap-1.5 bg-[#9333EA] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#8829DD] transition-colors">
                        <MdSend size={14} /> Send
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 text-[#9333EA] m3-surface-bg px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-300 hover:bg-blue-50 transition-colors">
                      <MdVisibility size={14} /> View
                    </button>
                    <button className="p-2 m3-surface-bg m3-on-surface rounded-lg text-sm font-medium border border-gray-300 hover:m3-surface-container-low-bg transition-colors">
                      <MdDownload size={16} />
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
    <div className="p-4 sm:p-6 lg:p-8 m3-surface-container-low-bg min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold m3-on-surface">
              Billing Management
            </h1>
          </div>
        </div>

        <div className="flex justify-start sm:justify-center overflow-x-auto mb-6">
          <div className="inline-flex items-center p-1 m3-surface-container-high-bg rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                  ? "m3-surface-bg m3-on-surface shadow-sm"
                  : "m3-on-surface-variant hover:m3-surface-bg/60"
                  }`}
              >
                {tab === "Pending Bills" ? (
                  <MdSchedule className="text-blue-500" />
                ) : (
                  <MdCheckCircle className="text-green-500" />
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
    </div>
  );
};

export default Billing;
