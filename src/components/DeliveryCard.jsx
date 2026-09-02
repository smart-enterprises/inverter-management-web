import React from 'react';
import {
  MdCalendarMonth,
  MdCheckCircle,
  MdDescription,
  MdInventory2,
  MdLocalShipping,
  MdLocationOn,
  MdSchedule,
} from "react-icons/md";

const DeliveryCard = ({ delivery, isPending, onManage }) => {
  return (
    <div className="m3-surface-bg rounded-xl shadow-sm border m3-outline-variant-border p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold m3-on-surface">{delivery.id}</h3>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            delivery.status === 'Pending'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-green-100 text-green-600'
          }`}>
            {delivery.status === 'Pending' 
              ? <MdSchedule size={14} />
              : <MdCheckCircle size={14} />
            }
            {delivery.status}
          </span>
        </div>

        <div className="space-y-3 text-sm m3-on-surface-variant">
          <div className="flex items-center gap-2">
            <MdDescription className="m3-on-surface-variant" />
            <span className="font-medium m3-on-surface">
              {delivery.dealerName}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <MdCalendarMonth className="m3-on-surface-variant" />
              <span>{delivery.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MdInventory2 className="m3-on-surface-variant" />
              <span>{delivery.items}</span>
            </div>
          </div>
          <div className="m3-surface-container-low-bg rounded-lg p-3 flex items-center gap-2 mt-2">
            <MdLocationOn className="m3-on-surface-variant flex-shrink-0" />
            <span>{delivery.address}</span>
          </div>
        </div>
      </div>

      {isPending && (
        <button onClick={onManage} className="w-full flex items-center justify-center gap-2 bg-[#9333EA] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8829DD] transition-colors mt-6">
          <MdLocalShipping size={16} />
          Manage Delivery
        </button>
      )}
    </div>
  );
};

export default DeliveryCard; 