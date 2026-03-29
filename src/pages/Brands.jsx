// brands.jsx code

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBox, FiX, FiChevronLeft, FiChevronRight, FiTrash2, FiEdit2 } from 'react-icons/fi';
import CustomSelect from '../components/CustomSelect';
import { getAllBrands, updateBrand, createBrands } from '../api/brands';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/roles';

const CreateBrandModal = ({ isOpen, onClose, onBrandCreated }) => {
  const [brands, setBrands] = useState([
    { brand_name: '', brand_models: [''], description: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addBrand = () => {
    setBrands([...brands, { brand_name: '', brand_models: [''], description: '' }]);
  };

  const removeBrand = (index) => {
    if (brands.length > 1) {
      setBrands(brands.filter((_, i) => i !== index));
    }
  };

  const updateBrand = (index, field, value) => {
    const updatedBrands = [...brands];
    updatedBrands[index][field] = value;
    setBrands(updatedBrands);
  };

  const addModel = (brandIndex) => {
    const updatedBrands = [...brands];
    updatedBrands[brandIndex].brand_models.push('');
    setBrands(updatedBrands);
  };

  const removeModel = (brandIndex, modelIndex) => {
    const updatedBrands = [...brands];
    if (updatedBrands[brandIndex].brand_models.length > 1) {
      updatedBrands[brandIndex].brand_models.splice(modelIndex, 1);
      setBrands(updatedBrands);
    }
  };

  const updateModel = (brandIndex, modelIndex, value) => {
    const updatedBrands = [...brands];
    updatedBrands[brandIndex].brand_models[modelIndex] = value;
    setBrands(updatedBrands);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Filter out empty models and validate data
      const validBrands = brands.map(brand => ({
        ...brand,
        brand_models: brand.brand_models.filter(model => model.trim() !== '')
      })).filter(brand =>
        brand.brand_name.trim() !== '' &&
        brand.brand_models.length > 0 &&
        brand.description.trim() !== ''
      );

      if (validBrands.length === 0) {
        setError('Please fill in at least one complete brand with name, models, and description.');
        return;
      }

      const response = await createBrands(validBrands);

      if (response.success) {
        setBrands([{ brand_name: '', brand_models: [''], description: '' }]);
        onClose();

        // Show success alert after closing modal
        setTimeout(async () => {
          await Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: response.message || 'Brands created successfully!',
            confirmButtonText: 'OK',
          });
          if (onBrandCreated) {
            onBrandCreated();
          }
        }, 100);
      } else {
        setError(response.message || 'Failed to create brands');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Brands</h2>
              <p className="text-sm text-gray-500 mt-1">Add new brands to your inventory</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} id="brand-form">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-6">
                {brands.map((brand, brandIndex) => (
                  <div key={brandIndex} className="bg-gray-50 rounded-lg p-4 relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                        <FiBox className="text-[#9333EA]" />
                        Brand {brandIndex + 1}
                      </h3>
                      {brands.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBrand(brandIndex)}
                          className="p-1 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Brand Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={brand.brand_name}
                          onChange={(e) => updateBrand(brandIndex, 'brand_name', e.target.value)}
                          placeholder="e.g. AJMI, MILMA"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={brand.description}
                          onChange={(e) => updateBrand(brandIndex, 'description', e.target.value)}
                          placeholder="e.g. High quality ajmal series"
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Models <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => addModel(brandIndex)}
                          className="text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
                        >
                          + Add Model
                        </button>
                      </div>
                      <div className="space-y-2">
                        {brand.brand_models.map((model, modelIndex) => (
                          <div key={modelIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={model}
                              onChange={(e) => updateModel(brandIndex, modelIndex, e.target.value)}
                              placeholder="e.g. BC 1145, WL 1456"
                              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                              required
                            />
                            {brand.brand_models.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeModel(brandIndex, modelIndex)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBrand}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#9333EA] hover:text-[#9333EA] transition-colors"
                >
                  + Add Another Brand
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="brand-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Brands'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const EditBrandModal = ({ isOpen, onClose, onBrandUpdated, brandData }) => {
  const [formData, setFormData] = useState({
    brand_name: '',
    status: 'active',
    description: '',
    brand_models: ['']
  });
  const [originalModels, setOriginalModels] = useState([]);
  const [modelsToDelete, setModelsToDelete] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize form data when brand data changes
  useEffect(() => {
    if (brandData && isOpen) {
      console.log('Initializing form with brand data:', brandData);
      console.log('Brand status from API:', brandData.status);
      console.log('Brand models from API:', brandData.brand_models);

      const models = brandData.brand_models && brandData.brand_models.length > 0
        ? [...brandData.brand_models]
        : [''];

      setFormData({
        brand_name: brandData.brand_name || '',
        status: brandData.status || 'active',
        description: brandData.description || '',
        brand_models: models
      });

      // Store original models for comparison
      setOriginalModels([...brandData.brand_models || []]);
      setModelsToDelete([]);
    }
  }, [brandData, isOpen]);

  const addModel = () => {
    setFormData(prev => ({
      ...prev,
      brand_models: [...prev.brand_models, '']
    }));
  };

  const removeModel = (index) => {
    if (formData.brand_models.length > 1) {
      const modelToRemove = formData.brand_models[index];

      // If this model existed in the original data, mark it for deletion
      if (modelToRemove && originalModels.includes(modelToRemove)) {
        setModelsToDelete(prev => [...prev, modelToRemove]);
      }

      setFormData(prev => ({
        ...prev,
        brand_models: prev.brand_models.filter((_, i) => i !== index)
      }));
    }
  };

  const updateModel = (index, value) => {
    setFormData(prev => ({
      ...prev,
      brand_models: prev.brand_models.map((model, i) => i === index ? value : model)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentFormModels = formData.brand_models.filter(model => model && model.trim() !== '');

      // Validate at least one model
      if (currentFormModels.length === 0) {
        setError('Please add at least one model.');
        return;
      }

      // Detect changes
      const brandNameChanged = formData.brand_name !== brandData.brand_name;
      const statusChanged = formData.status !== brandData.status;
      const descriptionChanged = formData.description !== (brandData.description || '');

      // Detect model changes (updates and additions)
      const modelUpdates = {};
      const newModels = [];

      originalModels.forEach((originalModel, index) => {
        if (index < currentFormModels.length) {
          const currentModel = currentFormModels[index];
          if (currentModel !== originalModel) {
            // Model was renamed
            modelUpdates[originalModel] = currentModel;
          }
        }
      });

      // Check for new models (models added beyond original count)
      if (currentFormModels.length > originalModels.length) {
        newModels.push(...currentFormModels.slice(originalModels.length));
      }

      // Build update payload
      const updateData = {};

      if (brandNameChanged) {
        updateData.brand_name = formData.brand_name;
      }

      if (statusChanged) {
        updateData.status = formData.status;
      }

      if (descriptionChanged) {
        updateData.description = formData.description;
      }

      // Handle model changes
      const hasModelUpdates = Object.keys(modelUpdates).length > 0;
      const hasModelDeletions = modelsToDelete.length > 0;
      const hasNewModels = newModels.length > 0;

      if (hasModelUpdates) {
        updateData.brand_models_update = modelUpdates;
      }

      if (hasModelDeletions) {
        updateData.delete_models = modelsToDelete;
      }

      // If only new models were added (no updates/deletions), send as brand_models
      if (hasNewModels && !hasModelUpdates && !hasModelDeletions) {
        updateData.brand_models = currentFormModels;
      } else if (hasNewModels) {
        // If there are updates/deletions AND new models, we need to handle this differently
        // For now, let's include new models in the current models array
        updateData.brand_models = currentFormModels;
      }

      // Check if any changes were made
      if (Object.keys(updateData).length === 0) {
        setError('No changes detected.');
        return;
      }

      console.log('=== UPDATE PAYLOAD ===');
      console.log('Brand:', brandData.brand_name);
      console.log('Changes detected:', {
        brandName: brandNameChanged,
        status: statusChanged,
        description: descriptionChanged,
        modelUpdates: hasModelUpdates,
        modelDeletions: hasModelDeletions,
        newModels: hasNewModels
      });
      console.log('Sending to API:', updateData);

      const response = await updateBrand(brandData.brand_name, updateData);
      console.log('Update response:', response);

      if (response.success) {
        // Close modal first
        onClose();

        // Refresh the brands list immediately to show updated data
        if (onBrandUpdated) {
          onBrandUpdated();
        }

        // Show success alert after closing modal and refreshing data
        setTimeout(async () => {
          await Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: response.message || 'Brand updated successfully!',
            confirmButtonText: 'OK',
          });
        }, 100);
      } else {
        setError(response.message || 'Failed to update brand');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !brandData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Brand</h2>
              <p className="text-sm text-gray-500 mt-1">Update brand: {brandData.brand_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} id="edit-brand-form">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                  {success}
                </div>
              )}

              <div className="space-y-6">
                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="brand_name"
                    value={formData.brand_name}
                    onChange={handleInputChange}
                    placeholder="e.g. AJMI, MILMA, NOTHING"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the brand..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm resize-none"
                  />
                </div>

                {/* Status Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Brand Status
                  </label>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${formData.status === 'inactive' ? 'text-gray-900' : 'text-gray-500'}`}>
                      Inactive
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = formData.status === 'active' ? 'inactive' : 'active';
                        setFormData(prev => ({ ...prev, status: newStatus }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:ring-offset-2 ${formData.status === 'active' ? 'bg-[#9333EA]' : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <span className={`text-sm font-medium ${formData.status === 'active' ? 'text-gray-900' : 'text-gray-500'}`}>
                      Active
                    </span>
                  </div>
                </div>

                {/* Models */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Models <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addModel}
                      className="text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
                    >
                      + Add Model
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.brand_models.map((model, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => updateModel(index, e.target.value)}
                          placeholder="e.g. BC 1145, WL 1456"
                          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                          required
                        />
                        {formData.brand_models.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeModel(index)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Show models marked for deletion */}
                  {modelsToDelete.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-700 mb-2">Models to be deleted:</p>
                      <div className="flex flex-wrap gap-2">
                        {modelsToDelete.map((model, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            {model}
                            <button
                              type="button"
                              onClick={() => {
                                // Remove from deletion list and add back to models
                                setModelsToDelete(prev => prev.filter(m => m !== model));
                                setFormData(prev => ({
                                  ...prev,
                                  brand_models: [...prev.brand_models, model]
                                }));
                              }}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-brand-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Brand'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const BrandsPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  return (
    <div className="flex justify-end mt-4">

      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow-sm">

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronLeft size={18} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">

          {visiblePages.map((page, index) => {

            const showDots =
              index > 0 &&
              page - visiblePages[index - 1] > 1;

            return (
              <div key={page} className="flex items-center">

                {showDots && (
                  <span className="px-2 text-gray-400 select-none">
                    ...
                  </span>
                )}

                <button
                  onClick={() => onPageChange(page)}
                  className={`min-w-[36px] h-9 px-3 flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 ${page === currentPage
                    ? "bg-gradient-to-r from-[#9333EA] to-[#7e22ce] text-white shadow-md scale-[1.05]"
                    : "text-gray-600 hover:bg-gray-100 hover:scale-[1.03]"
                    }`}
                >
                  {page}
                </button>

              </div>
            );
          })}

        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FiChevronRight size={18} />
        </button>

      </div>

    </div>
  );
};

const Brands = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { user } = useAuth();
  const isSalesman = user?.role === ROLES.SALESMAN;

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await getAllBrands();
        if (response.success) {
          setBrands(response.data);
        } else {
          setError(response.message || 'Failed to fetch brands');
        }
      } catch (err) {
        setError('Failed to fetch brands');
        console.error('Error fetching brands:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const filteredBrands = brands.filter(brand => {
    const matchesSearch =
      brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.brand_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.brand_models.some(model => model.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'All Status' ||
      brand.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const currentBrands = filteredBrands.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / itemsPerPage));

  const handleBrandCreated = () => {
    // Refresh the brands list
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await getAllBrands();
        if (response.success) {
          setBrands(response.data);
        } else {
          setError(response.message || 'Failed to fetch brands');
        }
      } catch (err) {
        setError('Failed to fetch brands');
        console.error('Error fetching brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  };

  const handleEditBrand = (brand) => {
    if (isSalesman) return;
    setSelectedBrand(brand);
    setIsEditModalOpen(true);
  };

  const handleBrandUpdated = () => {
    // Refresh the brands list after update
    const fetchBrands = async () => {
      try {
        setLoading(true);
        const response = await getAllBrands();
        if (response.success) {
          setBrands(response.data);
        } else {
          setError(response.message || 'Failed to fetch brands');
        }
      } catch (err) {
        setError('Failed to fetch brands');
        console.error('Error fetching brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
    setSelectedBrand(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands Management</h1>
        </div>
        {!isSalesman && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
          >
            <FiPlus className="text-lg" />
            Create New Brand
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Brands List</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and track all brands inventory</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Brand Name, Brand ID or Models..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40">
                <CustomSelect
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={['All Status', 'Active', 'Inactive']}
                  placeholder="Select status"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9333EA]"></div>
            </div>
          ) : error ? (
            <div className="mt-6 text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="mt-6">

              {/* TABLE CARD */}
              <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    {/* Header */}
                    <thead className="bg-gray-50/70 backdrop-blur text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-7 py-4 text-left font-medium">Brand</th>
                        <th className="px-7 py-4 text-left font-medium">Models</th>
                        <th className="px-7 py-4 text-left font-medium">Created</th>
                        <th className="px-7 py-4 text-left font-medium">Status</th>
                        {!isSalesman && (
                          <th className="px-7 py-4 text-right font-medium">Actions</th>
                        )}
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-gray-100">

                      {currentBrands.map((brand) => (

                        <tr
                          key={brand.brand_id}
                          className="hover:bg-gray-50/70 transition-colors duration-200"
                        >

                          {/* Brand */}
                          <td className="px-7 py-5">

                            <div className="flex items-center gap-3">

                              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#9333EA]/10 text-[#9333EA] font-semibold">
                                {brand.brand_name?.charAt(0)}
                              </div>

                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                  {brand.brand_name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {brand.brand_id}
                                </span>
                              </div>

                            </div>

                          </td>

                          {/* Models */}
                          <td className="px-7 py-5">

                            <div className="flex flex-wrap gap-2 max-w-[320px] max-h-[70px] overflow-y-auto pr-1">

                              {brand.brand_models.map((model, index) => (

                                <span
                                  key={index}
                                  className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                                >
                                  {model}
                                </span>

                              ))}

                            </div>

                          </td>

                          {/* Created */}
                          <td className="px-7 py-5 text-gray-500">
                            {new Date(brand.created_at).toLocaleDateString()}
                          </td>

                          {/* Status */}
                          <td className="px-7 py-5">

                            <span
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full ${brand.status === "active"
                                ? "bg-green-50 text-green-600"
                                : "bg-gray-100 text-gray-500"
                                }`}
                            >
                              {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
                            </span>

                          </td>

                          {/* Actions */}
                          {!isSalesman && (

                            <td className="px-7 py-5 text-right">

                              <button
                                onClick={() => handleEditBrand(brand)}
                                className="p-2 rounded-lg text-gray-500 hover:text-[#9333EA] hover:bg-purple-50 transition"
                              >
                                <FiEdit2 size={16} />
                              </button>

                            </td>

                          )}

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* PAGINATION OUTSIDE CARD */}
              <BrandsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />

            </div>
          )}
        </div>
      </div>

      {!isSalesman && (
        <>
          <CreateBrandModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onBrandCreated={handleBrandCreated}
          />

          <EditBrandModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedBrand(null);
            }}
            onBrandUpdated={handleBrandUpdated}
            brandData={selectedBrand}
          />
        </>
      )}
    </div>
  );
};

export default Brands; 