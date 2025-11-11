import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiMail, FiBox, FiCalendar, FiPackage, FiTruck, FiPercent, FiPlus, FiTrash2 } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { fetchDealerById, fetchDealerDiscounts, createDealerDiscounts } from '../api/dealer';
import { getAllBrands } from '../api/brands';
import { fetchOrders } from '../api/orders';
import { fetchProducts } from '../api/products';
import CustomSelect from '../components/CustomSelect';

const DealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [dealerOrders, setDealerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [discountsError, setDiscountsError] = useState('');
  const [discountsPage, setDiscountsPage] = useState(1);
  const [discountsLimit] = useState(30);
  const [discountsTotal, setDiscountsTotal] = useState(0);
  const [brandIdToName, setBrandIdToName] = useState({});
  const [brandToModels, setBrandToModels] = useState({});
  const [allBrands, setAllBrands] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([
    { brand_name: '', model_name: '', discount_value: '', is_percentage: true, description: '' }
  ]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const resetBulkModal = () => {
    setBulkRows([{ brand_name: '', model_name: '', discount_value: '', is_percentage: true, description: '' }]);
    setBulkError('');
    setBulkSubmitting(false);
  };

  const handleOpenBulkModal = () => {
    resetBulkModal();
    setBulkModalOpen(true);
  };

  const handleCloseBulkModal = () => {
    setBulkModalOpen(false);
    resetBulkModal();
  };



  const loadDiscounts = useCallback(async (page = 1) => {
    if (!id) return;
    try {
      setDiscountsLoading(true);
      setDiscountsError('');
      const res = await fetchDealerDiscounts({ page, limit: discountsLimit, dealer_id: id });
      if (res?.success) {
        setDiscounts(res.data || []);
        setDiscountsTotal(res.pagination?.total || (res.data?.length || 0));
        setDiscountsPage(res.pagination?.page || page);
      } else {
        setDiscounts([]);
        setDiscountsTotal(0);
        setDiscountsError(res?.message || 'Failed to load discounts');
      }
    } catch (err) {
      setDiscounts([]);
      setDiscountsTotal(0);
      setDiscountsError(err?.message || 'Network error while loading discounts');
    } finally {
      setDiscountsLoading(false);
    }
  }, [id, discountsLimit]);

  useEffect(() => {
    const loadDealerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dealer details and orders concurrently
        const [dealerResponse, ordersResponse] = await Promise.all([
          fetchDealerById(id),
          fetchOrders()
        ]);

        if (dealerResponse.success) {
          setDealer(dealerResponse.data);
        } else {
          setError(dealerResponse.message || 'Failed to load dealer details');
          return;
        }

        if (ordersResponse.success) {
          // Filter orders for this specific dealer
          const filteredOrders = ordersResponse.data.filter(orderData => {
            const order = orderData.order;
            return order && order.dealer_id === id;
          });
          setDealerOrders(filteredOrders);
        } else {
          console.warn('Failed to load orders:', ordersResponse.message);
          setDealerOrders([]);
        }
      } catch (err) {
        console.error('Error loading dealer data:', err);
        setError('Failed to load dealer data');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadDealerData();
      loadDiscounts(1);
    }
  }, [id, loadDiscounts]);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await getAllBrands();
        if (res?.success && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((b) => {
            // Accept both id/code and name
            const key = b.brand_id || b.brand_code || b.brand_name;
            if (key) map[key] = b.brand_name || b.name || key;
          });
          setBrandIdToName(map);
          setAllBrands(res.data);
        }
      } catch (err) {
        console.error('Failed to load brands', err);
      }
    };
    loadBrands();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchProducts();
        const map = {};
        if (res?.success && Array.isArray(res.data)) {
          res.data.forEach((p) => {
            const brandNameRaw = p.brand_name || p.brand || (typeof p.brand === 'object' ? p.brand?.name : undefined);
            const modelName = p.model_name || p.model || p.modelNo || p.model;
            const brandName = typeof brandNameRaw === 'string' ? brandNameRaw.trim() : brandNameRaw;
            if (!brandName || !modelName) return;
            const key = String(brandName).toLowerCase();
            if (!map[key]) map[key] = new Set();
            map[key].add(String(modelName));
          });
        }
        // convert sets to arrays
        const normalized = Object.keys(map).reduce((acc, k) => {
          acc[k] = Array.from(map[k]).sort();
          return acc;
        }, {});
        setBrandToModels(normalized);
      } catch (err) {
        console.error('Failed to load products for models', err);
      }
    };
    loadProducts();
  }, []);


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700';
      case 'low':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'in production':
        return 'bg-blue-50 text-blue-700';
      case 'packed':
        return 'bg-purple-50 text-purple-700';
      case 'delivered':
        return 'bg-green-50 text-green-700';
      case 'cancelled':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTotalItems = (orderDetails) => {
    if (!orderDetails || !Array.isArray(orderDetails)) return 0;
    return orderDetails.reduce((total, item) => total + (item.qty_ordered || 0), 0);
  };

  // Calculate order statistics
  const orderStats = {
    total: dealerOrders.length,
    pending: dealerOrders.filter(orderData => orderData.order?.status === 'PENDING').length,
    inProduction: dealerOrders.filter(orderData => orderData.order?.status === 'IN PRODUCTION').length,
    packed: dealerOrders.filter(orderData => orderData.order?.status === 'PACKED').length,
    delivered: dealerOrders.filter(orderData => orderData.order?.status === 'DELIVERED').length,
    cancelled: dealerOrders.filter(orderData => orderData.order?.status === 'CANCELLED').length
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9333EA] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dealer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/dealers')} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-600 mb-4">Dealer not found</p>
          <button 
            onClick={() => navigate('/dealers')} 
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Dealers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
          onClick={() => navigate('/dealers')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dealer Details</h1>
            <p className="text-sm text-gray-500 mt-1">{dealer.employee_name}</p>
          </div>
        </div>
      </div>

      {/* Dealer Information Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Dealer Information</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Personal and contact details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <FiUser className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiBox className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Shop Name</label>
                <p className="text-sm font-medium text-gray-900">{dealer.shop_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiPhone className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone Number</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMail className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <p className="text-sm font-medium text-gray-900">{dealer.employee_email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMapPin className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Location</label>
                <p className="text-sm font-medium text-gray-900">
                  {dealer.town}, {dealer.district}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiMapPin className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Address</label>
                <p className="text-sm font-medium text-gray-900">{dealer.address || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiUser className="text-gray-400" size={16} />
              <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dealer.status === 'active' 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {dealer.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {dealer.brand && dealer.brand.length > 0 && (
              <div className="flex items-center gap-3">
                <FiBox className="text-gray-400" size={16} />
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Brands</label>
                  <div className="flex flex-wrap gap-1">
                    {dealer.brand.map((brandId, index) => {
                      const display = brandIdToName[brandId] || brandId;
                      return (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        {display}
                      </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dealer Discounts Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#9333EA]/10 text-[#9333EA]">
                  <FiPercent size={16} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Dealer Discounts</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Create and manage discounts for this dealer</p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#9333EA] text-white hover:bg-[#8829DD] shadow-sm text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Add Discounts
              </button>
            </div>
          </div>


          {/* Discounts List */}
          <div className="pt-2">
            {discountsLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">Loading discounts...</div>
            ) : discountsError ? (
              <div className="py-6 text-center text-sm text-red-600">{discountsError}</div>
            ) : discounts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">No discounts found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map((d) => (
                      <tr key={d.dealer_discount_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">{d.brand_name}</span></td>
                        <td className="py-3 px-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">{d.model_name}</span></td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">
                            {d.discount_value}{d.is_percentage ? '%' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (d.status || '').toLowerCase() === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {d.status || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4"><span className="text-sm text-gray-600">{d.created_at ? new Date(d.created_at).toISOString().slice(0,10) : ''}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Simple Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {discountsPage} • Total {discountsTotal}</span>
            <div className="flex gap-2">
              <button
                onClick={() => loadDiscounts(Math.max(1, discountsPage - 1))}
                disabled={discountsPage <= 1 || discountsLoading}
                className="px-3 py-1.5 rounded border text-sm text-gray-600 border-gray-200 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => loadDiscounts(discountsPage + 1)}
                disabled={discountsLoading || (discountsPage * discountsLimit >= discountsTotal)}
                className="px-3 py-1.5 rounded border text-sm text-gray-600 border-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Discounts Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCloseBulkModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Add Discounts</h3>
                <p className="text-sm text-gray-500 mt-1">Create multiple discounts for this dealer</p>
              </div>
              <button 
                onClick={handleCloseBulkModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {bulkError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {bulkError}
                </div>
              )}

              {/* Discounts Table */}
              <div className="space-y-4">
                {bulkRows.map((row, idx) => {
                  const modelOpts = row.brand_name
                    ? (allBrands.find(b => (b.brand_name || b.name) === row.brand_name)?.brand_models || brandToModels[String(row.brand_name).toLowerCase()] || [])
                    : [];
                  
                  return (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Discount #{idx + 1}</span>
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBulkRows(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            aria-label="Remove discount"
                            title="Remove"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Brand */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                          <CustomSelect
                            name="brand_name"
                            value={row.brand_name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, brand_name: v, model_name: '' } : r));
                            }}
                            options={Array.from(new Set((dealer?.brand || []).map((id) => brandIdToName[id] || id))).filter(Boolean).sort()}
                            placeholder="Select brand"
                            searchable
                          />
                        </div>

                        {/* Model */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                          <CustomSelect
                            name="model_name"
                            value={row.model_name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, model_name: v } : r));
                            }}
                            disabled={!row.brand_name}
                            options={modelOpts}
                            placeholder="Select model"
                            searchable
                          />
                        </div>

                        {/* Discount Value */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={row.discount_value}
                              onChange={(e) => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, discount_value: e.target.value } : r))}
                              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 text-sm"
                              placeholder={row.is_percentage ? '15' : '500'}
                              min="0"
                              step="0.01"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                              {row.is_percentage ? '%' : '₹'}
                            </span>
                          </div>
                        </div>

                        {/* Type Toggle */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <button
                            type="button"
                            onClick={() => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, is_percentage: !r.is_percentage } : r))}
                            className={`relative inline-flex h-9 w-16 items-center rounded-full px-1 border transition-colors ${row.is_percentage ? 'bg-purple-600 border-purple-600' : 'bg-gray-200 border-gray-300'}`}
                            title="Toggle percentage or fixed amount"
                          >
                            <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${row.is_percentage ? 'translate-x-7' : 'translate-x-0'}`}></span>
                            <span className={`absolute left-2 text-[10px] font-medium ${row.is_percentage ? 'text-white/70' : 'text-gray-700'}`}>₹</span>
                            <span className={`absolute right-2 text-[10px] font-medium ${row.is_percentage ? 'text-white' : 'text-gray-600/70'}`}>%</span>
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description (Optional)</label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/20 text-sm"
                          placeholder="Enter description..."
                          maxLength={200}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Row Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setBulkRows(prev => ([...prev, { brand_name: '', model_name: '', discount_value: '', is_percentage: true, description: '' }]))}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#9333EA] hover:text-[#8829DD] border border-[#9333EA] hover:border-[#8829DD] rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Another Discount
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={async () => {
                  try {
                    setBulkError('');
                    setBulkSubmitting(true);
                    const payload = bulkRows
                      .filter(r => r.brand_name && r.model_name && r.discount_value)
                      .map(r => ({
                        brand_name: r.brand_name,
                        model_name: r.model_name,
                        dealer_id: id,
                        discount_value: Number(r.discount_value),
                        is_percentage: Boolean(r.is_percentage),
                        description: r.description?.trim() || ''
                      }));
                    if (payload.length === 0) {
                      setBulkError('Please add at least one complete discount.');
                      setBulkSubmitting(false);
                      return;
                    }
                    const res = await createDealerDiscounts(payload);
                    if (res?.success) {
                      setBulkModalOpen(false);
                      setBulkRows([{ brand_name: '', model_name: '', discount_value: '', is_percentage: true, description: '' }]);
                      await Swal.fire({ icon: 'success', title: 'Discounts Added', text: res.message || 'Dealer discounts created successfully', confirmButtonText: 'OK' });
                      await loadDiscounts(discountsPage);
                    } else {
                      setBulkError(res?.message || 'Failed to create discounts');
                    }
                  } catch (err) {
                    setBulkError(err?.message || 'Network error. Please try again.');
                  } finally {
                    setBulkSubmitting(false);
                  }
                }}
                className="px-6 py-2 bg-[#9333EA] text-white hover:bg-[#8829DD] rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {bulkSubmitting ? 'Saving...' : 'Save Discounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Summary Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPackage className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Orders Summary</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">Overview of dealer's orders</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50/50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Total Orders</p>
              <p className="text-2xl font-semibold text-blue-600">{orderStats.total}</p>
            </div>

            <div className="bg-yellow-50/50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium mb-1">Pending Orders</p>
              <p className="text-2xl font-semibold text-yellow-600">{orderStats.pending}</p>
            </div>

            <div className="bg-purple-50/50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium mb-1">In Production</p>
              <p className="text-2xl font-semibold text-purple-600">{orderStats.inProduction}</p>
            </div>

            <div className="bg-green-50/50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium mb-1">Delivered</p>
              <p className="text-2xl font-semibold text-green-600">{orderStats.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order History Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiTruck className="text-[#9333EA]" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">All orders placed by this dealer</p>

          {dealerOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No orders found for this dealer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dealerOrders.map((orderData) => {
                    const order = orderData.order;
                    if (!order) return null;

                    return (
                      <tr key={order.order_number} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900 font-mono">{order.order_number}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {getTotalItems(order.order_details)} Items
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityStyle(order.priority)}`}>
                            {order.priority || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(order.status)}`}>
                            {order.status || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {order.order_details?.[0]?.delivery_date 
                              ? formatDate(order.order_details[0].delivery_date)
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => navigate(`/orders/${order.order_number}`)}
                            className="text-sm font-medium text-[#9333EA] hover:text-[#7928CC] hover:bg-[#9333EA]/5 px-2 py-1 rounded transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealerDetails; 