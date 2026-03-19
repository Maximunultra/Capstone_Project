import React, { useState, useEffect } from "react";
import {
  Settings, Plus, Trash2, Pencil, Save, X,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Tag
} from "lucide-react";

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const EMPTY_FORM = {
  category: "",
  min_price: "",
  max_price: "",
  allowed_materials: "",   // comma-separated string in the UI
};

const CategoryRulesPage = () => {
  const adminUser = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId   = adminUser.id;

  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingRule, setEditingRule] = useState(null);   // null = new rule
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Fetch all rules ──────────────────────────────────────
  const fetchRules = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/products/admin/category-rules`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch rules");
      setRules(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  // ── Open modal ───────────────────────────────────────────
  const openAdd = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      category:          rule.category,
      min_price:         rule.min_price ?? "",
      max_price:         rule.max_price ?? "",
      allowed_materials: (rule.allowed_materials || []).join(", "),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingRule(null); };

  // ── Validate ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.category.trim()) e.category = "Category name is required.";
    if (form.min_price !== "" && isNaN(parseFloat(form.min_price)))
      e.min_price = "Must be a number.";
    if (form.max_price !== "" && isNaN(parseFloat(form.max_price)))
      e.max_price = "Must be a number.";
    if (
      form.min_price !== "" &&
      form.max_price !== "" &&
      parseFloat(form.min_price) > parseFloat(form.max_price)
    ) e.max_price = "Max price must be greater than min price.";
    return e;
  };

  // ── Save (create / update) ───────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setFormErrors(e); return; }

    setSaving(true);
    setError(null);
    try {
      const materialsArray = form.allowed_materials
        .split(",")
        .map(m => m.trim())
        .filter(Boolean);

      const body = {
        admin_id:          adminId,
        category:          form.category.trim(),
        min_price:         form.min_price !== "" ? parseFloat(form.min_price) : null,
        max_price:         form.max_price !== "" ? parseFloat(form.max_price) : null,
        allowed_materials: materialsArray,
      };

      const res  = await fetch(`${API_BASE_URL}/products/admin/category-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rule");

      setSuccess(editingRule ? `"${body.category}" rule updated!` : `"${body.category}" rule added!`);
      setTimeout(() => setSuccess(null), 3500);
      closeModal();
      fetchRules();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (category) => {
    try {
      const res  = await fetch(
        `${API_BASE_URL}/products/admin/category-rules/${encodeURIComponent(category)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ admin_id: adminId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete rule");

      setSuccess(`"${category}" rule deleted.`);
      setTimeout(() => setSuccess(null), 3500);
      setDeleteTarget(null);
      fetchRules();
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f0e8] p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#3d2e1e]">Category Rules</h1>
            <p className="text-sm text-[#7a6652]">
              Define price ranges &amp; allowed materials for auto-approval
            </p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Info banner */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>How it works:</strong> When a seller adds a product, the system checks these rules automatically.
        If the product's price is within range and the brand/material is in the allowed list, it gets
        <span className="font-semibold text-green-700"> auto-approved</span>. Otherwise it is
        <span className="font-semibold text-red-600"> auto-rejected</span> with a reason, or sent for
        <span className="font-semibold text-amber-700"> manual review</span> if no rule exists.
      </div>

      {/* Rules table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#7a6652]">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full mr-3" />
          Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 text-[#7a6652]">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No category rules yet.</p>
          <p className="text-sm mt-1">Click "Add Rule" to create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-2xl shadow-sm border border-[#e8e0d0] p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base font-bold text-[#3d2e1e]">{rule.category}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-[#5c5042]">
                    {/* Price range */}
                    <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg px-3 py-1.5">
                      <span className="text-amber-700 font-medium">Price:</span>
                      <span>
                        {rule.min_price != null ? `₱${rule.min_price.toLocaleString()}` : "Any"}
                        {" – "}
                        {rule.max_price != null ? `₱${rule.max_price.toLocaleString()}` : "Any"}
                      </span>
                    </div>

                    {/* Materials */}
                    <div className="flex items-start gap-1.5">
                      <Tag className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                      {rule.allowed_materials && rule.allowed_materials.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.allowed_materials.map((m) => (
                            <span
                              key={m}
                              className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 rounded-full"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No material restriction</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(rule)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(rule.category)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#3d2e1e]">
                {editingRule ? `Edit — ${editingRule.category}` : "Add Category Rule"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  disabled={!!editingRule}
                  placeholder="e.g. Clothing, Bag, Jewelry"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400
                    ${editingRule ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300'}
                    ${formErrors.category ? 'border-red-400' : ''}`}
                />
                {editingRule && (
                  <p className="text-xs text-gray-400 mt-1">Category name cannot be changed. Delete and re-add to rename.</p>
                )}
                {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
              </div>

              {/* Price range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Price (₱)
                  </label>
                  <input
                    type="number"
                    value={form.min_price}
                    onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))}
                    placeholder="No minimum"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400
                      ${formErrors.min_price ? 'border-red-400' : ''}`}
                  />
                  {formErrors.min_price && <p className="text-red-500 text-xs mt-1">{formErrors.min_price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Price (₱)
                  </label>
                  <input
                    type="number"
                    value={form.max_price}
                    onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))}
                    placeholder="No maximum"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400
                      ${formErrors.max_price ? 'border-red-400' : ''}`}
                  />
                  {formErrors.max_price && <p className="text-red-500 text-xs mt-1">{formErrors.max_price}</p>}
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Materials / Brands
                </label>
                <textarea
                  rows={3}
                  value={form.allowed_materials}
                  onChange={e => setForm(f => ({ ...f, allowed_materials: e.target.value }))}
                  placeholder="e.g. cotton, abaca, linen, piña  (comma-separated, leave blank for no restriction)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Separate each material with a comma. Leave empty to allow any material.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving…" : editingRule ? "Update Rule" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Rule?</h3>
            <p className="text-sm text-gray-500 mb-6">
              The rule for <span className="font-semibold text-gray-800">"{deleteTarget}"</span> will be
              permanently deleted. Products in this category will no longer be auto-validated.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryRulesPage;
