import React, { useState } from 'react';
import { FiPlus, FiArrowLeft, FiTrash2, FiPackage, FiChevronDown, FiSend } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    dealer: '',
    priority: 'Medium',
    notes: '',
    items: [{ product: '', quantity: 0, deliveryDate: '' }]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 0, deliveryDate: '' }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Order submitted:', formData);
    navigate('/orders');
  };

  const dealerOptions = ['Green Energy Solutions', 'Power Tech Distributors'];
  const priorityOptions = ['High', 'Medium', 'Low'];
  const productOptions = ['SI-1KW PowerMax X100', 'SI-2KW PowerMax X200', 'BI-500W Voltron A50'];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Create New Order</h1>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#7928CC] transition-colors text-sm font-medium inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <FiSend className="w-4 h-4" />
              Submit Order
            </button>
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-[#9333EA]/10 rounded-lg">
                  <FiPackage className="w-5 h-5 text-[#9333EA]" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Enter the basic information for this order</p>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Select Dealer
                    </label>
                    <CustomSelect
                      name="dealer"
                      value={formData.dealer}
                      onChange={handleChange}
                      options={dealerOptions}
                      placeholder="Select a dealer"
                      searchable={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Priority
                    </label>
                    <CustomSelect
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      options={priorityOptions}
                      placeholder="Select priority"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter any special instructions or notes..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Items Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-[#9333EA]/10 rounded-lg">
                  <svg className="w-5 h-5 text-[#9333EA]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Ordered Items</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">Add products to this order</p>

              <div className="space-y-4">
                <div className="hidden lg:flex items-center gap-6 px-3">
                  <div className="flex-1 text-sm font-medium text-gray-700">Product</div>
                  <div className="w-32 text-sm font-medium text-gray-700">Quantity</div>
                  <div className="w-40 text-sm font-medium text-gray-700">Delivery Date</div>
                  <div className="w-10"></div>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex-1">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Product</label>
                      <CustomSelect
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        options={productOptions}
                        placeholder="Select product"
                        searchable={true}
                      />
                    </div>

                    <div className="w-full lg:w-32">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 transition-all placeholder:text-gray-400"
                      />
                    </div>

                    <div className="w-full lg:w-40">
                      <label className="block lg:hidden text-sm font-medium text-gray-700 mb-1.5">Delivery Date</label>
                      <input
                        type="date"
                        value={item.deliveryDate}
                        onChange={(e) => handleItemChange(index, 'deliveryDate', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="self-start lg:self-center text-red-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50"
                    >
                       <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#9333EA] hover:bg-[#9333EA]/5 rounded-lg transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Add More Item
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder; 