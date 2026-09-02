// Brands.jsx — Material Design 3
import { useState, useEffect, useCallback } from "react";
import {
  MdAdd, MdSearch, MdInventory2, MdClose, MdChevronLeft, MdChevronRight,
  MdDeleteOutline, MdEdit, MdRefresh, MdFilterList, MdSell, MdErrorOutline,
} from "react-icons/md";
import CustomSelect from "../components/CustomSelect";
import { getAllBrands, updateBrand, createBrands } from "../api/brands";
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";
import { ROLES } from "../utils/roles";
import {
  Surface, Button, IconButton, Chip, Banner, EmptyState,
  Table, Thead, Th, Tr, Td,
} from "../components/m3";
import { T } from "../components/m3/tokens";

//  SHARED INPUT
const BrandInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full m3-body-medium px-3.5 h-11 focus:outline-none ${className}`}
    style={{
      border: `1px solid ${T.outline}`,
      borderRadius: T.cornerExtraSmall,
      backgroundColor: T.surface,
      color: T.onSurface,
    }}
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
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="w-full max-w-3xl flex flex-col"
          style={{
            maxHeight: "90vh",
            backgroundColor: "var(--md-sys-color-surface-container-high)",
            borderRadius: T.cornerExtraLarge,
            boxShadow: T.elevation3,
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-5 flex-shrink-0"
            style={{ borderBottom: `1px solid ${T.outlineVariant}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2.5"
                style={{
                  borderRadius: T.cornerFull,
                  backgroundColor: T.primaryContainer,
                  color: T.onPrimaryContainer,
                }}
              >
                <MdSell size={20} />
              </div>

              <div>
                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>Create Brands</h2>
                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>Add inverter & solar brands to inventory</p>
              </div>

            </div>
            <IconButton icon={MdClose} onClick={onClose} aria-label="Close dialog" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} id="brand-form" className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <Banner tone="error">{error}</Banner>
            )}

            {brands.map((brand, brandIndex) => (
              <div key={brandIndex} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                      {brandIndex + 1}
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Brand {brandIndex + 1}</p>
                  </div>
                  {brands.length > 1 && (
                    <button type="button" onClick={() => removeBrand(brandIndex)} className="m3-icon-button m3-state-layer m3-focus flex-shrink-0" style={{ color: T.error, width: 32, height: 32 }}><MdDeleteOutline size={18} /></button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Brand Name <span className="text-rose-400">*</span>
                    </label>
                    <BrandInput type="text"
                      value={brand.brand_name}
                      onChange={(e) => updateBrandField(brandIndex, "brand_name", e.target.value)}
                      placeholder="e.g. WARRIOR, M-TECH" required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Description <span className="text-rose-400">*</span>
                    </label>
                    <BrandInput type="text"
                      value={brand.description}
                      onChange={(e) => updateBrandField(brandIndex, "description", e.target.value)}
                      placeholder="e.g. High quality series"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Models <span className="text-rose-400">*</span>
                    </label>
                    <button type="button" onClick={() => addModel(brandIndex)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wide transition-colors">
                      + Add Model
                    </button>
                  </div>
                  <div className="space-y-2">
                    {brand.brand_models.map((model, modelIndex) => (
                      <div key={modelIndex} className="flex gap-2">
                        <BrandInput type="text" value={model} onChange={(e) => updateModel(brandIndex, modelIndex, e.target.value)} placeholder="e.g. BC 1145, WL 1456" required />
                        {brand.brand_models.length > 1 && (
                          <button type="button" onClick={() => removeModel(brandIndex, modelIndex)} className="m3-icon-button m3-state-layer m3-focus flex-shrink-0" style={{ color: T.error, width: 32, height: 32 }}><MdDeleteOutline size={18} /></button>
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
              className="w-full py-3.5 m3-label-large m3-state-layer flex items-center justify-center gap-2"
              style={{
                border: `1px dashed ${T.outline}`,
                borderRadius: T.cornerMedium,
                color: T.primary,
              }}
            >
              <MdAdd size={18} />Add Another Brand
            </button>
          </form>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: `1px solid ${T.outlineVariant}` }}
          >
            <Button variant="text" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="filled" type="submit" form="brand-form" disabled={loading}>
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Creating…</> : <><MdAdd size={18} />Create Brands</>}
            </Button>
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
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "color-mix(in srgb, var(--md-sys-color-scrim) 32%, transparent)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 flex flex-col" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100"><MdEdit size={20} /></div>
              <div>
                <h2 className="m3-title-medium" style={{ color: T.onSurface }}>Edit Brand</h2>
                <p className="m3-body-small mt-0.5" style={{ color: T.onSurfaceVariant }}>Update: {brandData.brand_name}</p>
              </div>
            </div>
            <IconButton icon={MdClose} onClick={onClose} aria-label="Close dialog" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} id="edit-brand-form" className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <Banner tone="error">{error}</Banner>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Brand Name <span className="text-rose-400">*</span></label>
              <BrandInput type="text" name="brand_name" value={formData.brand_name} onChange={handleInputChange} placeholder="e.g. AJMI, MILMA" required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Description</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Brief description of the brand…"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${formData.status === "active" ? "bg-blue-600" : "bg-slate-200"}`}
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
                <button type="button" onClick={addModel} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wide transition-colors">+ Add Model</button>
              </div>
              <div className="space-y-2">
                {formData.brand_models.map((model, index) => (
                  <div key={index} className="flex gap-2">
                    <BrandInput type="text" value={model} onChange={(e) => updateModel(index, e.target.value)} placeholder="e.g. BC 1145, WL 1456" required />
                    {formData.brand_models.length > 1 && (
                      <button type="button" onClick={() => removeModel(index)} className="m3-icon-button m3-state-layer m3-focus flex-shrink-0" style={{ color: T.error, width: 32, height: 32 }}><MdDeleteOutline size={18} /></button>
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
            <button type="submit" form="edit-brand-form" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-sm font-bold transition-all disabled:opacity-60 shadow-sm shadow-blue-200">
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
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderTop: `1px solid ${T.outlineVariant}` }}
    >
      <p className="m3-body-small hidden sm:block" style={{ color: T.onSurfaceVariant }}>
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5 ml-auto">
        <IconButton
          icon={MdChevronLeft}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
        {visiblePages.map((page, index) => {
          const showDots = index > 0 && page - visiblePages[index - 1] > 1;
          const current = page === currentPage;
          return (
            <div key={page} className="flex items-center">
              {showDots && <span className="px-1.5 m3-body-small" style={{ color: T.onSurfaceVariant }}>…</span>}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={current ? "page" : undefined}
                className="m3-label-large m3-state-layer m3-focus min-w-[32px] h-8 px-2.5 flex items-center justify-center"
                style={{
                  borderRadius: T.cornerFull,
                  backgroundColor: current ? T.secondaryContainer : "transparent",
                  color: current ? T.onSecondaryContainer : T.onSurfaceVariant,
                }}
              >
                {page}
              </button>
            </div>
          );
        })}
        <IconButton
          icon={MdChevronRight}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32 }}
        />
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: T.surface }}>
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
            <IconButton
              icon={MdRefresh}
              onClick={fetchBrandsList}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
              className={`disabled:opacity-50 ${loading ? "[&>svg]:animate-spin" : ""}`}
            />
            {canManageBrands && (
              <Button variant="filled" icon={MdAdd} onClick={() => setIsModalOpen(true)}>
                Create Brand
              </Button>
            )}
          </div>
        </div>

        {/* Main Card */}
        <Surface className="overflow-hidden">
          {/* Filters */}
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.outlineVariant}` }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <MdSearch size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.onSurfaceVariant }} />
                <input
                  type="text"
                  placeholder="Search by name, ID or models…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="m3-body-medium w-full pl-11 pr-4 h-10 focus:outline-none"
                  style={{
                    backgroundColor: T.surfaceContainerHigh,
                    borderRadius: T.cornerFull,
                    color: T.onSurface,
                  }}
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 m3-label-medium" style={{ color: T.onSurfaceVariant }}>
                  <MdFilterList size={16} />Filter
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
                <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: T.surfaceContainerHighest }} />
                <div
                  className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderLeftColor: T.primary, borderRightColor: T.primary, borderBottomColor: T.primary }}
                />
              </div>
              <p className="m3-body-medium" style={{ color: T.onSurfaceVariant }}>Loading brands…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4" style={{ backgroundColor: T.errorContainer, borderRadius: T.cornerFull }}>
                <MdErrorOutline size={24} style={{ color: T.onErrorContainer }} />
              </div>
              <p className="m3-body-medium" style={{ color: T.error }}>{error}</p>
              <Button variant="text" icon={MdRefresh} iconSize={16} onClick={fetchBrandsList}>Try Again</Button>
            </div>
          ) : (
            <Table>
                <Thead>
                  {["Brand", "Models", "Created", "Status", ...(!canManageBrands ? [""] : [])].map((h, i, arr) => (
                    <Th key={i} align={!canManageBrands && i === arr.length - 1 ? "right" : "left"}>{h}</Th>
                  ))}
                </Thead>
                <tbody>
                  {currentBrands.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={MdSell}
                          label={brands.length === 0 ? "No brands available" : "No brands match your criteria"}
                        />
                      </td>
                    </tr>
                  ) : currentBrands.map((brand) => (
                    <Tr key={brand.brand_id}>
                      {/* Brand */}
                      <Td>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 flex items-center justify-center m3-label-large flex-shrink-0"
                            style={{
                              borderRadius: T.cornerFull,
                              backgroundColor: T.primaryContainer,
                              color: T.onPrimaryContainer,
                            }}
                          >
                            {brand.brand_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="m3-body-medium" style={{ color: T.onSurface }}>{brand.brand_name}</p>
                            <span className="m3-body-small font-mono" style={{ color: T.onSurfaceVariant }}>{brand.brand_id}</span>
                          </div>
                        </div>
                      </Td>

                      {/* Models */}
                      <Td>
                        <div className="flex flex-wrap gap-1.5 max-w-[320px] max-h-[64px] overflow-y-auto pr-1">
                          {brand.brand_models.map((model, index) => (
                            <Chip key={index} tone="neutral" className="whitespace-nowrap">{model}</Chip>
                          ))}
                        </div>
                      </Td>

                      {/* Created */}
                      <Td muted className="whitespace-nowrap">
                        {new Date(brand.created_at).toLocaleDateString()}
                      </Td>

                      {/* Status */}
                      <Td>
                        <Chip tone={brand.status === "active" ? "success" : "neutral"}>
                          <span
                            className="w-1.5 h-1.5 flex-shrink-0"
                            style={{
                              borderRadius: T.cornerFull,
                              backgroundColor: brand.status === "active" ? T.success : T.outline,
                            }}
                          />
                          {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
                        </Chip>
                      </Td>

                      {/* Actions */}
                      {canManageBrands && (
                        <Td align="right">
                          <IconButton icon={MdEdit} onClick={() => handleEditBrand(brand)} title="Edit Brand" aria-label="Edit brand" />
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
            </Table>
          )}

          {!loading && !error && filteredBrands.length > 0 && (
            <BrandsPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </Surface>
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
