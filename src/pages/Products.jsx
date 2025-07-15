import React, { useState } from 'react';
import { FiPlus, FiSearch, FiBox, FiX } from 'react-icons/fi';
import CustomSelect from '../components/CustomSelect';

const CreateProductModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    brandName: '',
    modelName: '',
    materialType: 'Aluminum (AL)',
    unit: '',
    unpackedStock: 0,
    packedStock: 0,
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  if (!isOpen) return null;

  const materialOptions = [
    'Aluminum (AL)',
    'Copper',
    'Steel',
    'Plastic'
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Product</h2>
              <p className="text-sm text-gray-500 mt-1">Add a new product to inventory</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <FiBox className="text-[#9333EA]" />
                  Product Information
                </h3>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleChange}
                      placeholder="e.g. Finolex, Polycab"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="modelName"
                      value={formData.modelName}
                      onChange={handleChange}
                      placeholder="e.g. 1.5 Sqmm, 2.5 Sqmm"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Type <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="materialType"
                      value={formData.materialType}
                      onChange={handleChange}
                      options={materialOptions}
                      placeholder="Select material type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit (Optional)
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="e.g. meter, roll, piece"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">The unit of measurement for this product</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unpacked Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="unpackedStock"
                      value={formData.unpackedStock}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Number of items available in unpacked stock</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Packed Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="packedStock"
                      value={formData.packedStock}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Number of items available in packed stock</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter product description"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium"
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const Products = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const products = [
    {
      id: 'SI-1KW',
      brandName: 'PowerMax',
      modelName: 'X100',
      materialType: 'Aluminum',
      unpackedStock: 15,
      packedStock: 5,
      status: 'Active'
    },
    {
      id: 'SI-2KW',
      brandName: 'PowerMax',
      modelName: 'X200',
      materialType: 'Aluminum',
      unpackedStock: 10,
      packedStock: 3,
      status: 'Active'
    },
    {
      id: 'BI-500W',
      brandName: 'Voltron',
      modelName: 'A50',
      materialType: 'Copper',
      unpackedStock: 20,
      packedStock: 8,
      status: 'Active'
    }
  ];

  // Filter products based on search query, type and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'All Types' || 
                       product.materialType === selectedType;
    
    const matchesStatus = selectedStatus === 'All Status' || 
                         product.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
        >
          <FiPlus className="text-lg" />
          Create New Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Products List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and track all products inventory</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Product Name, Code or Brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <CustomSelect
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={['All Types', 'Aluminum', 'Copper', 'Steel', 'Plastic']}
                placeholder="Select type"
              />
              <CustomSelect
                name="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={['All Status', 'Active', 'Inactive']}
                placeholder="Select status"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Product ID</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Brand Name</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Model Name</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Material Type</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Stock (Unpacked)</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Stock (Packed)</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{product.id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{product.brandName}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{product.modelName}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{product.materialType}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{product.unpackedStock}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{product.packedStock}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'Active' 
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button className="text-sm text-[#9333EA] hover:text-[#8829DD] font-medium">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center">
                      <p className="text-sm text-gray-500">No products found matching your criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Products; 