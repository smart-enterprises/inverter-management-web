// brands.jsx — Redesigned

import { useState, useEffect, useCallback } from "react";
import {
  FiPlus, FiSearch, FiBox, FiX, FiChevronLeft, FiChevronRight,
  FiTrash2, FiEdit2, FiAlertCircle, FiRefreshCw, FiFilter, FiTag,
} from "react-icons/fi";
import CustomSelect from "../components/CustomSelect";
import { getAllBrands, updateBrand, createBrands } from "../api/brands";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";

//  SHARED INPUT
const BrandInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all ${className}`}
  />
);

//  CREATE BRAND MODAL  (logic unchanged)
const CreateBrandModal = ({ isOpen, onClose, onBrandCreated }) => {
  const [brands, setBrands] = useState([{ brand_name: "", brand_models: [""], description: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addBrand = () => setBrands([...brands, { brand_name: "", brand_models: [""], description: "" }]);
  const removeBrand = (index) => { if (brands.length > 1) setBrands(brands.filter((_, i) => i !== index)); };
  const updateBrandField = (index, field, value) => { const u = [...brands]; u[index][field] = value; setBrands(u); };
  const addModel = (bi) => { const u = [...brands]; u[bi].brand_models.push(""); setBrands(u); };
  const removeModel = (bi, mi) => { const u = [...brands]; if (u[bi].brand_models.length > 1) { u[bi].brand_models.splice(mi, 1); setBrands(u); } };
  const updateModel = (bi, mi, value) => { const u = [...brands]; u[bi].brand_models[mi] = value; setBrands(u); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const validBrands = brands
        .map((b) => ({ ...b, brand_models: b.brand_models.filter((m) => m.trim() !== "") }))
        .filter((b) => b.brand_name.trim() !== "" && b.brand_models.length > 0 && b.description.trim() !== "");
      if (!validBrands.length) { setError("Please fill in at least one complete brand with name, models, and description."); return; }
      const response = await createBrands(validBrands);
      if (response.success) {
        setBrands([{ brand_name: "", brand_models: [""], description: "" }]);
        onClose();
        setTimeout(async () => {
          await Swal.fire({ icon: "success", title: "Brands Created!", text: response.message || "Brands created successfully!" });
          if (onBrandCreated) onBrandCreated();
        }, 100);
      } else { setError(response.message || "Failed to create brands"); }
    } catch (err) { setError(err.message || "Network error. Please try again."); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><FiTag size={14} /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Create Brands</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">Add brands to inventory</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><FiX size={16} /></button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} id="brand-form" className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                <FiAlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}

            {brands.map((brand, brandIndex) => (
              <div key={brandIndex} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                      {brandIndex + 1}
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Brand {brandIndex + 1}</p>
                  </div>
                  {brands.length > 1 && (
                    <button type="button" onClick={() => removeBrand(brandIndex)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><FiTrash2 size={13} /></button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Brand Name <span className="text-rose-400">*</span>
                    </label>
                    <BrandInput type="text" value={brand.brand_name} onChange={(e) => updateBrandField(brandIndex, "brand_name", e.target.value)} placeholder="e.g. AJMI, MILMA" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <BrandInput type="text" value={brand.description} onChange={(e) => updateBrandField(brandIndex, "description", e.target.value)} placeholder="e.g. High quality series" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Models <span className="text-rose-400">*</span>
                    </label>
                    <button type="button" onClick={() => addModel(brandIndex)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wide transition-colors">
                      + Add Model
                    </button>
                  </div>
                  <div className="space-y-2">
                    {brand.brand_models.map((model, modelIndex) => (
                      <div key={modelIndex} className="flex gap-2">
                        <BrandInput type="text" value={model} onChange={(e) => updateModel(brandIndex, modelIndex, e.target.value)} placeholder="e.g. BC 1145, WL 1456" required />
                        {brand.brand_models.length > 1 && (
                          <button type="button" onClick={() => removeModel(brandIndex, modelIndex)} className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 transition-all"><FiTrash2 size={13} /></button>
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
              className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
            >
              <FiPlus size={14} />Add Another Brand
            </button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" form="brand-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
              {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</> : <><FiPlus size={13} />Create Brands</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

//  EDIT BRAND MODAL  (logic unchanged)
const EditBrandModal = ({ isOpen, onClose, onBrandUpdated, brandData }) => {
  const [formData, setFormData] = useState({ brand_name: "", status: "active", description: "", brand_models: [""] });
  const [originalModels, setOriginalModels] = useState([]);
  const [modelsToDelete, setModelsToDelete] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (brandData && isOpen) {
      const models = brandData.brand_models?.length > 0 ? [...brandData.brand_models] : [""];
      setFormData({ brand_name: brandData.brand_name || "", status: brandData.status || "active", description: brandData.description || "", brand_models: models });
      setOriginalModels([...brandData.brand_models || []]);
      setModelsToDelete([]);
      setError("");
    }
  }, [brandData, isOpen]);

  const addModel = () => setFormData((prev) => ({ ...prev, brand_models: [...prev.brand_models, ""] }));
  const removeModel = (index) => {
    if (formData.brand_models.length <= 1) return;
    const modelToRemove = formData.brand_models[index];
    if (modelToRemove && originalModels.includes(modelToRemove)) setModelsToDelete((prev) => [...prev, modelToRemove]);
    setFormData((prev) => ({ ...prev, brand_models: prev.brand_models.filter((_, i) => i !== index) }));
  };
  const updateModel = (index, value) => setFormData((prev) => ({ ...prev, brand_models: prev.brand_models.map((m, i) => i === index ? value : m) }));
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const currentFormModels = formData.brand_models.filter((m) => m?.trim() !== "");
      if (!currentFormModels.length) { setError("Please add at least one model."); return; }

      const modelUpdates = {};
      const newModels = [];
      originalModels.forEach((om, i) => { if (i < currentFormModels.length && currentFormModels[i] !== om) modelUpdates[om] = currentFormModels[i]; });
      if (currentFormModels.length > originalModels.length) newModels.push(...currentFormModels.slice(originalModels.length));

      const updateData = {};
      if (formData.brand_name !== brandData.brand_name) updateData.brand_name = formData.brand_name;
      if (formData.status !== brandData.status) updateData.status = formData.status;
      if (formData.description !== (brandData.description || "")) updateData.description = formData.description;

      const hasModelUpdates = Object.keys(modelUpdates).length > 0;
      const hasModelDeletions = modelsToDelete.length > 0;
      const hasNewModels = newModels.length > 0;

      if (hasModelUpdates) updateData.brand_models_update = modelUpdates;
      if (hasModelDeletions) updateData.delete_models = modelsToDelete;
      if (hasNewModels && !hasModelUpdates && !hasModelDeletions) updateData.brand_models = currentFormModels;
      else if (hasNewModels) updateData.brand_models = currentFormModels;

      if (!Object.keys(updateData).length) { setError("No changes detected."); return; }

      const response = await updateBrand(brandData.brand_name, updateData);
      if (response.success) {
        onClose();
        if (onBrandUpdated) onBrandUpdated();
        setTimeout(async () => await Swal.fire({ icon: "success", title: "Brand Updated!", text: response.message || "Brand updated successfully!" }), 100);
      } else { setError(response.message || "Failed to update brand"); }
    } catch (err) { setError(err.message || "Network error. Please try again."); }
    finally { setLoading(false); }
  };

  if (!isOpen || !brandData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100"><FiEdit2 size={14} /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Edit Brand</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-0.5">Update: {brandData.brand_name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><FiX size={16} /></button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} id="edit-brand-form" className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                <FiAlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Brand Name <span className="text-rose-400">*</span></label>
              <BrandInput type="text" name="brand_name" value={formData.brand_name} onChange={handleInputChange} placeholder="e.g. AJMI, MILMA" required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Brief description of the brand…"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
              />
            </div>

            {/* Status toggle */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Brand Status</label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${formData.status === "inactive" ? "text-slate-700" : "text-slate-400"}`}>Inactive</span>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, status: prev.status === "active" ? "inactive" : "active" }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${formData.status === "active" ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.status === "active" ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className={`text-sm font-semibold ${formData.status === "active" ? "text-slate-700" : "text-slate-400"}`}>Active</span>
              </div>
            </div>

            {/* Models */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Models <span className="text-rose-400">*</span></label>
                <button type="button" onClick={addModel} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wide transition-colors">+ Add Model</button>
              </div>
              <div className="space-y-2">
                {formData.brand_models.map((model, index) => (
                  <div key={index} className="flex gap-2">
                    <BrandInput type="text" value={model} onChange={(e) => updateModel(index, e.target.value)} placeholder="e.g. BC 1145, WL 1456" required />
                    {formData.brand_models.length > 1 && (
                      <button type="button" onClick={() => removeModel(index)} className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex-shrink-0"><FiTrash2 size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
              {modelsToDelete.length > 0 && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-600 mb-2">Models to be deleted:</p>
                  <div className="flex flex-wrap gap-2">
                    {modelsToDelete.map((model, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full border border-rose-200">
                        {model}
                        <button type="button" onClick={() => { setModelsToDelete((prev) => prev.filter((m) => m !== model)); setFormData((prev) => ({ ...prev, brand_models: [...prev.brand_models, model] })); }} className="text-rose-400 hover:text-rose-700 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" form="edit-brand-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-indigo-200">
              {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Updating…</> : "Update Brand"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

//  PAGINATION
const BrandsPagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
      <p className="text-xs text-slate-400 font-medium hidden sm:block">
        Page <span className="font-bold text-slate-600">{currentPage}</span> of{" "}
        <span className="font-bold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronLeft size={13} />
        </button>
        {visiblePages.map((page, index) => {
          const showDots = index > 0 && page - visiblePages[index - 1] > 1;
          return (
            <div key={page} className="flex items-center">
              {showDots && <span className="px-1.5 text-slate-300 text-xs">…</span>}
              <button onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2.5 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === currentPage ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"}`}>
                {page}
              </button>
            </div>
          );
        })}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          <FiChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};

//  MAIN — Brands
const Brands = () => {
  const { user } = useAuth();

  const canManageBrands = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchBrandsList = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await getAllBrands();
      if (response.success) setBrands(response.data);
      else setError(response.message || "Failed to fetch brands");
    } catch { setError("Failed to fetch brands"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBrandsList(); }, [fetchBrandsList]);

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.brand_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.brand_models.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === "All Status" || brand.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const currentBrands = filteredBrands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / itemsPerPage));

  const handleEditBrand = (brand) => { if (!canManageBrands) return; setSelectedBrand(brand); setIsEditModalOpen(true); };
  const handleBrandUpdated = () => { fetchBrandsList(); setSelectedBrand(null); };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Brands</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {loading ? "Loading…" : `${filteredBrands.length} brand${filteredBrands.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={fetchBrandsList} disabled={loading} title="Refresh"
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50">
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            {canManageBrands && (
              <button onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200">
                <FiPlus size={14} />Create Brand
              </button>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <FiSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, ID or models…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <FiFilter size={10} />Filter
                </span>
                <div className="w-36">
                  <CustomSelect name="status" value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }} options={["All Status", "Active", "Inactive"]} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Loading brands…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100"><FiAlertCircle size={22} className="text-rose-500" /></div>
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button onClick={fetchBrandsList} className="flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                <FiRefreshCw size={12} />Try Again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Brand", "Models", "Created", "Status", ...(!canManageBrands ? [""] : [])].map((h, i, arr) => (
                      <th key={i}
                        className={`px-5 py-3.5 text-[10px] font-black uppercase 
                          tracking-[0.1em] text-slate-400 whitespace-nowrap 
                          ${!canManageBrands && i === arr.length - 1 ? "text-right" : "text-left"}`
                        }
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentBrands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-5 bg-slate-100 rounded-2xl"><FiTag size={24} className="text-slate-400" /></div>
                          <p className="text-sm font-semibold text-slate-500">{brands.length === 0 ? "No brands available" : "No brands match your criteria"}</p>
                        </div>
                      </td>
                    </tr>
                  ) : currentBrands.map((brand) => (
                    <tr key={brand.brand_id} className="hover:bg-slate-50/60 transition-colors duration-100">
                      {/* Brand */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm border border-indigo-100 flex-shrink-0">
                            {brand.brand_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{brand.brand_name}</p>
                            <span className="text-[9px] font-mono text-slate-400">{brand.brand_id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Models */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[320px] max-h-[64px] overflow-y-auto pr-1">
                          {brand.brand_models.map((model, index) => (
                            <span key={index} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap">
                              {model}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(brand.created_at).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wide ${brand.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${brand.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
                        </span>
                      </td>

                      {/* Actions */}
                      {canManageBrands && (
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handleEditBrand(brand)} title="Edit Brand"
                            className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all">
                            <FiEdit2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredBrands.length > 0 && (
            <BrandsPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </div>
      </div>

      {canManageBrands && (
        <>
          <CreateBrandModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onBrandCreated={fetchBrandsList}
          />
          <EditBrandModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setSelectedBrand(null); }}
            onBrandUpdated={handleBrandUpdated}
            brandData={selectedBrand}
          />
        </>
      )}
    </div>
  );
};

export default Brands;
