import React from 'react';

const EmptyState = ({ icon: Icon, title, message }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-dashed">
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="bg-gray-100 rounded-full p-4">
          <Icon className="text-gray-400" size={32} />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mt-4">
          {title}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {message}
        </p>
      </div>
    </div>
  );
};

export default EmptyState; 