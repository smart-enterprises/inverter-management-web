import React from 'react';
import { FiClock, FiFileText, FiCalendar, FiBox, FiMapPin, FiTruck } from 'react-icons/fi';

const DeliveryCard = ({ delivery, isPending, onManage }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">{delivery.id}</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
            <FiClock size={14} />
            {delivery.status}
          </span>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FiFileText className="text-gray-400" />
            <span className="font-medium text-gray-800">
              {delivery.dealerName}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-400" />
              <span>{delivery.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiBox className="text-gray-400" />
              <span>{delivery.items}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2 mt-2">
            <FiMapPin className="text-gray-400 flex-shrink-0" />
            <span>{delivery.address}</span>
          </div>
        </div>
      </div>

      {isPending && (
        <button onClick={onManage} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mt-6">
          <FiTruck size={16} />
          Manage Delivery
        </button>
      )}
    </div>
  );
};

export default DeliveryCard; 