import React from "react";
import { FiX } from "react-icons/fi";

const CreateUserModal = ({
  isOpen,
  onClose,
  onUserChanged,
  editingUserId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <FiX />
        </button>

        <h2 className="text-lg font-bold mb-4">
          {editingUserId ? "Edit User" : "Create User"}
        </h2>

        <p className="text-gray-500 text-sm">
          Add your full form implementation here.
        </p>

        <button
          onClick={() => {
            if (onUserChanged) onUserChanged();
          }}
          className="mt-4 w-full bg-[#9333EA] text-white py-2 rounded-lg"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CreateUserModal;