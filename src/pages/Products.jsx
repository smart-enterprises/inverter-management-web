import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiBox, FiX, FiTrash2, FiChevronLeft, FiChevronRight, FiEdit3, FiPackage } from 'react-icons/fi';
import CustomSelect from '../components/CustomSelect';
import { fetchProducts, createProduct, updateProduct, updateProductStock, fetchProductById } from '../api/products';
import { getAllBrands } from '../api/brands';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/roles';

const CreateProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const initialFormState = {
    brand: '',
    product_name: '',
    model: '',
    product_type: '',
    product_price: '',
    unpackedStock: 0,
    packedStock: 0,
    unpackedNotes: '',
    packedNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [brands, setBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  // ✅ MUST be with other hooks
  const [productTypeOptions, setProductTypeOptions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch brands when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetchBrands();
    resetForm();
  }, [isOpen]);

  const resetForm = () => {
    setFormData(initialFormState);
    setAvailableModels([]);
    setError('');
    setSuccess('');
  };

  const fetchBrands = async () => {
    try {
      const response = await getAllBrands("active");

      if (response?.success && response?.data) {
        setBrands(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch brands:", err);
    }
  };

  const updateFormField = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    updateFormField(name, value);

    if (name === 'brand') {
      const selectedBrand = brands.find(b => b.brand_name === value);

      if (selectedBrand?.brand_models) {
        setAvailableModels(selectedBrand.brand_models);
      } else {
        setAvailableModels([]);
      }

      updateFormField('model', '');
    }
  };

  const handleProductTypeChange = (e) => {
    updateFormField('product_type', e.target.value);
  };

  const handleProductTypeBlur = () => {
    const value = formData.product_type?.trim();

    if (!value) return;

    setProductTypeOptions(prev => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.brand || !formData.product_name || !formData.model || !formData.product_price) {
        setError('Please fill in all required fields.');
        return;
      }

      const stocks = [];

      if (formData.unpackedStock > 0) {
        stocks.push({
          stock: parseInt(formData.unpackedStock),
          stock_type: "UNPACKED",
          type: "ADD",
          stock_notes: formData.unpackedNotes || `added stock ${formData.unpackedStock} - unpacked`
        });
      }

      if (formData.packedStock > 0) {
        stocks.push({
          stock: parseInt(formData.packedStock),
          stock_type: "PACKED",
          type: "ADD",
          stock_notes: formData.packedNotes || `added stock ${formData.packedStock} - packed`
        });
      }

      // Prepare API payload
      const payload = {
        brand: formData.brand,
        product_name: formData.product_name,
        model: formData.model,
        product_type: formData.product_type,
        product_price: parseFloat(formData.product_price),
        stocks: stocks
      };

      console.log('Creating product with payload:', payload);

      const response = await createProduct(payload);

      if (response?.success) {
        onClose();
        onProductCreated?.();

        setTimeout(async () => {
          await Swal.fire({
            icon: "success",
            title: "Success",
            text: response.message || "Product created successfully",
            confirmButtonText: "OK"
          });
        }, 100);
      } else {
        setError(response?.message || "Failed to create product");
      }

    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-2xl" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Product
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add a new product to inventory
              </p>
            </div>

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                {success}
              </div>
            )}

            {/* PRODUCT INFORMATION */}
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <FiBox className="text-[#9333EA]" />
                  Product Information
                </h3>

                {/* BRAND SELECTION */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      options={['', ...brands.map(brand => brand.brand_name)]}
                      placeholder="Select brand"
                      required
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleChange}
                      placeholder="e.g. ONE PLUS Super Save"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      options={['', ...availableModels]}
                      placeholder={formData.brand ? "Select model" : "Select brand first"}
                      disabled={!formData.brand || availableModels.length === 0}
                      required
                    />
                    {formData.brand && availableModels.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">No models available for this brand</p>
                    )}
                  </div>

                  {/* Product Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type <span className="text-red-500">*</span>
                    </label>

                    <input
                      list="product-type-options"
                      name="product_type"
                      value={formData.product_type}
                      onChange={handleProductTypeChange}
                      onBlur={handleProductTypeBlur}
                      placeholder="Select or type product type"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />

                    <datalist id="product-type-options">
                      {productTypeOptions.map((type, index) => (
                        <option key={index} value={type} />
                      ))}
                    </datalist>
                  </div>

                  {/* Price */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹ ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="product_price"
                      value={formData.product_price}
                      onChange={handleChange}
                      placeholder="e.g. 17500"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div>
                <h3 className="text-base font-medium text-gray-900">Stock Information</h3>
                <p className="text-sm text-gray-500 mt-1">Add initial stock quantities for this product</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Unpacked Stock */}
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
                  </div>

                  {/* Packed Stock */}
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
                  </div>

                  {/* Stock Notes */}
                  {formData.unpackedStock > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unpacked Stock Notes (Optional)
                      </label>
                      <input
                        type="text"
                        name="unpackedNotes"
                        value={formData.unpackedNotes}
                        onChange={handleChange}
                        placeholder="e.g. Initial stock addition"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      />
                    </div>
                  )}

                  {formData.packedStock > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Packed Stock Notes (Optional)
                      </label>
                      <input
                        type="text"
                        name="packedNotes"
                        value={formData.packedNotes}
                        onChange={handleChange}
                        placeholder="e.g. Initial stock addition"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const EditProductModal = ({ isOpen, onClose, onProductUpdated, productId }) => {
  const initialFormState = {
    product_name: '',
    model: '',
    product_type: '',
    brand: '',
    product_price: '',
    status: 'active',
    status_reason: ''
  };

  const baseProductTypes = [];

  const [formData, setFormData] = useState(initialFormState);
  const [brands, setBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [productTypeOptions, setProductTypeOptions] = useState(baseProductTypes);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch product data and brands when modal opens
  useEffect(() => {
    if (!isOpen || !productId) return;

    loadProductData();
  }, [isOpen, productId]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData(initialFormState);
    setAvailableModels([]);
    setError('');
    setSuccess('');
  };

  const updateFormField = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadProductData = async () => {
    try {

      setError('');
      setSuccess('');

      const brandsResponse = await getAllBrands("active");

      if (brandsResponse?.success && brandsResponse?.data) {
        setBrands(brandsResponse.data);
      }

      const productResponse = await fetchProductById(productId);

      if (productResponse?.success && productResponse?.data) {

        const product = productResponse.data;

        const productType = product.product_type || '';

        setFormData({
          product_name: product.product_name || '',
          model: product.model || '',
          product_type: productType,
          brand: product.brand || '',
          product_price: product.product_price || product.price || '',
          status: product.status || 'active',
          status_reason: ''
        });

        // Add product type dynamically if not in default list
        setProductTypeOptions(prev => {
          if (!productType || prev.includes(productType)) return prev;
          return [...prev, productType];
        });

        // Load brand models
        if (product.brand) {
          const selectedBrand = brandsResponse.data.find(
            b => b.brand_name === product.brand
          );

          if (selectedBrand?.brand_models) {
            setAvailableModels(selectedBrand.brand_models);
          }
        }
      }

    } catch (err) {
      console.error("Error loading product:", err);
      setError("Failed to load product data");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    updateFormField(name, value);

    if (name === "brand") {
      const selectedBrand = brands.find(b => b.brand_name === value);

      if (selectedBrand?.brand_models) {
        setAvailableModels(selectedBrand.brand_models);
      } else {
        setAvailableModels([]);
      }
    }
  };

  const handleProductTypeChange = (e) => {
    const value = e.target.value;

    updateFormField("product_type", value);
  };

  const handleProductTypeBlur = () => {
    const value = formData.product_type?.trim();

    if (!value) return;

    setProductTypeOptions(prev => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {

      if (
        !formData.product_name ||
        !formData.model ||
        !formData.product_type ||
        !formData.brand ||
        !formData.product_price
      ) {
        setError("Please fill in all required fields.");
        return;
      }

      const payload = {
        product_name: formData.product_name,
        model: formData.model,
        product_type: formData.product_type,
        brand: formData.brand,
        product_price: parseFloat(formData.product_price),
        status: formData.status
      };

      if (formData.status === "inactive" && formData.status_reason) {
        payload.status_reason = formData.status_reason;
      }

      const response = await updateProduct(productId, payload);

      if (response?.success) {

        onClose();
        onProductUpdated?.();

        setTimeout(async () => {
          await Swal.fire({
            icon: "success",
            title: "Success",
            text: response.message || "Product updated successfully",
            confirmButtonText: "OK"
          });
        }, 100);

      } else {
        setError(response?.message || "Failed to update product");
      }

    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-sm w-full max-w-2xl" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Product
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Update product information
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
                {success}
              </div>
            )}

            {/* Product Information Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <FiBox className="text-[#9333EA]" />
                  Product Information
                </h3>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Brand Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      options={['', ...brands.map(brand => brand.brand_name)]}
                      placeholder="Select brand"
                      required
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleChange}
                      placeholder="e.g. ONE PLUS Super Save"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      options={['', ...availableModels]}
                      placeholder={formData.brand ? "Select model" : "Select brand first"}
                      disabled={!formData.brand || availableModels.length === 0}
                      required
                    />
                  </div>

                  {/* Product Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type <span className="text-red-500">*</span>
                    </label>

                    <input
                      list="edit-product-type-options"
                      name="product_type"
                      value={formData.product_type}
                      onChange={handleProductTypeChange}
                      placeholder="Select or type product type"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />

                    <datalist id="edit-product-type-options">
                      {productTypeOptions.map((type, index) => (
                        <option key={index} value={type} />
                      ))}
                    </datalist>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹ ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="product_price"
                      value={formData.product_price}
                      onChange={handleChange}
                      placeholder="e.g. 17500"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      required
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={['active', 'inactive']}
                      placeholder="Select status"
                      required
                    />
                  </div>

                  {/* Status Reason */}
                  {formData.status === 'inactive' && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status Reason
                      </label>
                      <input
                        type="text"
                        name="status_reason"
                        value={formData.status_reason}
                        onChange={handleChange}
                        placeholder="e.g. Product discontinued"
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const StockUpdateModal = ({ isOpen, onClose, onStockUpdated, productId, productName }) => {
  const [formData, setFormData] = useState({
    unpackedStock: 0,
    packedStock: 0,
    unpackedNotes: '',
    packedNotes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        unpackedStock: 0,
        packedStock: 0,
        unpackedNotes: '',
        packedNotes: ''
      });
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
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
      // Validate that at least one stock type has quantity
      if (formData.unpackedStock <= 0 && formData.packedStock <= 0) {
        setError('Please add stock quantity for at least one type.');
        return;
      }

      // Prepare stocks array
      const stocks = [];

      if (formData.unpackedStock > 0) {
        stocks.push({
          stock: parseInt(formData.unpackedStock),
          stock_type: "UNPACKED",
          type: "ADD",
          stock_notes: formData.unpackedNotes || `Added stock ${formData.unpackedStock} - unpacked`
        });
      }

      if (formData.packedStock > 0) {
        stocks.push({
          stock: parseInt(formData.packedStock),
          stock_type: "PACKED",
          type: "ADD",
          stock_notes: formData.packedNotes || `Added stock ${formData.packedStock} - packed`
        });
      }

      // Prepare API payload
      const payload = {
        stock_map: {
          [productId]: stocks
        }
      };

      const response = await updateProductStock(payload);

      if (response && response.success) {
        // Close modal immediately
        onClose();

        // Refresh products list
        if (onStockUpdated) {
          onStockUpdated();
        }

        // Show SweetAlert success message immediately
        Swal.fire({
          icon: 'success',
          title: 'Stock Updated Successfully! 🎉',
          text: response.message || 'Product stock has been updated successfully!',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        setError(response.message || 'Failed to update stock');
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
        <div className="bg-white rounded-xl shadow-sm w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Update Stock</h2>
              <p className="text-sm text-gray-500 mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <FiX className="text-gray-500" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
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

            <div className="space-y-4">
              {/* Unpacked Stock */}
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
              </div>

              {/* Unpacked Stock Notes */}
              {formData.unpackedStock > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unpacked Stock Notes (Optional)
                  </label>
                  <input
                    type="text"
                    name="unpackedNotes"
                    value={formData.unpackedNotes}
                    onChange={handleChange}
                    placeholder="e.g. New stock addition"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  />
                </div>
              )}

              {/* Packed Stock */}
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
              </div>

              {/* Packed Stock Notes */}
              {formData.packedStock > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packed Stock Notes (Optional)
                  </label>
                  <input
                    type="text"
                    name="packedNotes"
                    value={formData.packedNotes}
                    onChange={handleChange}
                    placeholder="e.g. New stock addition"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const ProductsPagination = ({ currentPage, totalPages, onPageChange }) => {
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
    <div className="flex justify-end mt-6">

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

const Products = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const isSalesman = user?.role === ROLES.SALESMAN;

  // Fetch products on component mount
  useEffect(() => {
    fetchProductsList();
  }, []);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchProductsList = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchProducts();

      if (response && response.success && response.data) {
        setProducts(response.data);
      } else {
        setError('Failed to fetch products.');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query, type and status
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'All Types' ||
      product.product_type === selectedType;

    const matchesStatus = selectedStatus === 'All Status' ||
      product.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Paginate filtered products
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  // When a product is created, refresh the products list
  const handleProductCreated = () => {
    fetchProductsList();
  };

  // When a product is updated, refresh the products list
  const handleProductUpdated = () => {
    fetchProductsList();
    setSuccess('Product updated successfully! 🎉');
  };

  // When stock is updated, refresh the products list
  const handleStockUpdated = () => {
    fetchProductsList();
    setSuccess('Stock updated successfully! 📦');
  };

  // Open edit modal
  const openEditModal = (productId, productName) => {
    if (isSalesman) return;
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setIsEditModalOpen(true);
  };

  // Open stock update modal
  const openStockModal = (productId, productName) => {
    if (isSalesman) return;
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setIsStockModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Success Notification Banner */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
        </div>
        {!isSalesman && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-lg hover:bg-[#8829DD] transition-colors w-full sm:w-auto text-sm font-medium"
          >
            <FiPlus className="text-lg" />
            Create New Product
          </button>
        )}
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48">
                <CustomSelect
                  name="type"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={['All Types', 'Smart Phone', 'Tablet', 'Laptop', 'Accessory', 'Cable', 'Wire']}
                  placeholder="Select type"
                />
              </div>
              <div className="w-40">
                <CustomSelect
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={['All Status', 'active', 'inactive']}
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
                onClick={fetchProductsList}
                className="mt-2 text-sm text-[#9333EA] hover:text-[#8829DD] font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Product ID</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Name</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Brand</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Model</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Type</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Price</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Available Stock</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Stock Details</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                    {!isSalesman && (
                      <th className="text-right py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map((product) => {
                    const {
                      product_id,
                      product_name,
                      brand,
                      model,
                      product_type,
                      price,
                      available_stock,
                      status,
                      stocks = []
                    } = product;

                    /* -------------------- Stock Calculations -------------------- */

                    const unpackedStock = stocks.find((s) => s.stock_type === "UNPACKED")?.stock ??
                      stocks[0]?.unpacked_stock ??
                      0;

                    const packedStock = stocks.find((s) => s.stock_type === "PACKED")?.stock ??
                      stocks[0]?.packed_stock ??
                      0;

                    const formattedPrice = price ? `₹  ${price.toLocaleString("en-IN")}` : "N/A";

                    const isActive = status === "active";

                    return (
                      <tr
                        key={product.product_id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >

                        {/* Product ID */}
                        <td className="py-4 px-4 text-sm text-gray-500">
                          {product_id}
                        </td>

                        {/* Product Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                              <FiBox className="text-gray-500 text-sm" />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {product_name}
                            </span>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700 font-medium">{brand}</span>
                        </td>

                        {/* Model */}
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {model}
                        </td>

                        {/* Product Type */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold">
                            {product_type}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {formattedPrice}
                          </span>
                        </td>

                        {/* Available Stock */}
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-indigo-600">
                            {available_stock ?? 0}
                          </span>
                        </td>

                        {/* Stock Details */}
                        <td className="py-4 px-4">
                          <div className="flex gap-2">

                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              U:{unpackedStock}
                            </div>

                            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-semibold">
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                              P:{packedStock}
                            </div>

                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"
                                }`}
                            />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        {!isSalesman && (
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">

                              {/* Edit */}
                              <button
                                onClick={() => openEditModal(product_id, product_name)}
                                className="inline-flex items-center justify-center p-2 text-[#9333EA] hover:text-[#8829DD] hover:bg-[#9333EA]/5 rounded-lg transition-colors"
                                title="Edit Product"
                              >
                                <FiEdit3 size={16} />
                              </button>

                              {/* Update Stock */}
                              {isActive && (
                                <button
                                  onClick={() => openStockModal(product_id, product_name)}
                                  className="inline-flex items-center justify-center p-2 text-[#059669] hover:text-[#047857] hover:bg-[#059669]/5 rounded-lg transition-colors"
                                  title="Update Stock"
                                >
                                  <FiPackage size={16} />
                                </button>
                              )}

                            </div>
                          </td>
                        )}

                      </tr>
                    );
                  })}

                  {/* Empty State */}
                  {!loading && currentProducts.length === 0 && (
                    <tr>
                      <td colSpan="10" className="py-8 text-center">
                        <p className="text-sm text-gray-500">
                          {products.length === 0
                            ? "No products available"
                            : filteredProducts.length === 0
                              ? "No products found matching your criteria"
                              : `No products on page ${currentPage}`}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {!loading && !error && filteredProducts.length > 0 && (
                <ProductsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {!isSalesman && (
        <>
          <CreateProductModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onProductCreated={handleProductCreated}
          />

          <EditProductModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onProductUpdated={handleProductUpdated}
            productId={selectedProductId}
          />

          <StockUpdateModal
            isOpen={isStockModalOpen}
            onClose={() => setIsStockModalOpen(false)}
            onStockUpdated={handleStockUpdated}
            productId={selectedProductId}
            productName={selectedProductName}
          />
        </>
      )}
    </div>
  );
};

export default Products; 