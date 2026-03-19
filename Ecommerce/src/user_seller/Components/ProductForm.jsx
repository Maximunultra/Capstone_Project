import React, { useState, useEffect } from 'react';
import {
  Upload, DollarSign, Package, Tag, Star,
  AlertCircle, CheckCircle, Weight,
  ChevronDown, Info, XCircle, Clock, Calendar
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const WEIGHT_UNITS = ['g', 'kg', 'lbs'];

const ProductForm = ({ userId, userRole, onSuccess }) => {
  const [formData, setFormData] = useState({
    product_name:         '',
    description:          '',
    price:                '',
    stock_quantity:       '',
    category:             '',
    material:             '',
    discount_percentage:  '',
    discount_start_date:  '',   // ★ NEW
    discount_end_date:    '',   // ★ NEW
    weight:               '',
    weight_unit:          'g',
    is_active:            true,
    is_featured:          false,
    tags:                 ''
  });

  const [mainImage,        setMainImage]        = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [errors,           setErrors]           = useState({});
  const [approvalResult,   setApprovalResult]   = useState(null);

  const [categories,   setCategories]   = useState([]);
  const [categoryRule, setCategoryRule] = useState(null);
  const [loadingCats,  setLoadingCats]  = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/products/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load categories:', e);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!formData.category) { setCategoryRule(null); return; }
    const rule = categories.find(c => c.category === formData.category);
    setCategoryRule(rule || null);
    // Reset material when category changes
    setFormData(prev => ({ ...prev, material: '' }));
  }, [formData.category, categories]);

  if (userRole !== 'seller' && userRole !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
        <p className="text-center text-red-700">Only sellers and admins can create products.</p>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, mainImage: 'Please select a valid image file' }));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, mainImage: 'Image size must be less than 5MB' }));
      e.target.value = '';
      return;
    }
    setMainImage(file);
    setErrors(prev => ({ ...prev, mainImage: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setMainImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Today's date in YYYY-MM-DD format for min attribute on date inputs
  const today = new Date().toISOString().split('T')[0];

  const validateForm = () => {
    const e = {};

    // ── Required fields (except discount & tags) ─────────────
    if (!formData.product_name.trim())
      e.product_name    = 'Product name is required';

    if (!formData.description.trim())
      e.description     = 'Description is required';

    if (!formData.category)
      e.category        = 'Please select a category';

    if (!formData.material)
      e.material        = 'Material is required';

    if (!formData.price || parseFloat(formData.price) <= 0)
      e.price           = 'Valid price is required';

    if (formData.stock_quantity === '' || formData.stock_quantity === null || formData.stock_quantity === undefined)
      e.stock_quantity  = 'Stock quantity is required';
    else if (parseInt(formData.stock_quantity) < 0)
      e.stock_quantity  = 'Stock quantity cannot be negative';

    if (!formData.weight || parseFloat(formData.weight) <= 0)
      e.weight          = 'Weight is required';
    else if (parseFloat(formData.weight) < 0)
      e.weight          = 'Weight cannot be negative';

    if (!mainImage)
      e.mainImage       = 'Product image is required';

    // ── Discount (optional — but if entered, validate fully) ──
    if (formData.discount_percentage) {
      const disc = parseFloat(formData.discount_percentage);
      if (disc < 0 || disc > 100)
        e.discount_percentage = 'Discount must be between 0 and 100';

      if (disc > 0) {
        if (!formData.discount_start_date)
          e.discount_start_date = 'Start date is required when a discount is set';
        if (!formData.discount_end_date)
          e.discount_end_date   = 'End date is required when a discount is set';
      }
    }

    if (formData.discount_start_date && formData.discount_end_date) {
      if (new Date(formData.discount_end_date) <= new Date(formData.discount_start_date))
        e.discount_end_date = 'End date must be after the start date';
    }

    return e;
  };

  const uploadImage = async () => {
    if (!mainImage) return null;
    const fd = new FormData();
    fd.append('images', mainImage);
    const res = await fetch(`${API_BASE_URL}/products/upload`, { method: 'POST', body: fd });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to upload image'); }
    const result = await res.json();
    return result.imageUrls[0] || null;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});
    setApprovalResult(null);

    try {
      const mainImageUrl = await uploadImage();
      const tagsArray    = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const hasDiscount  = formData.discount_percentage && parseFloat(formData.discount_percentage) > 0;

      const productData = {
        user_id:              userId,
        product_name:         formData.product_name,
        description:          formData.description || null,
        price:                parseFloat(formData.price),
        stock_quantity:       parseInt(formData.stock_quantity) || 0,
        category:             formData.category || null,
        material:             formData.material || null,
        brand:                formData.material || null,  // keep brand in sync for auto-approval
        product_image:        mainImageUrl,
        images:               null,
        is_active:            formData.is_active,
        is_featured:          formData.is_featured,
        discount_percentage:  parseFloat(formData.discount_percentage) || 0,
        // Only send dates if a discount is actually set
        discount_start_date:  hasDiscount && formData.discount_start_date
                                ? new Date(formData.discount_start_date).toISOString()
                                : null,
        discount_end_date:    hasDiscount && formData.discount_end_date
                                ? new Date(formData.discount_end_date).toISOString()
                                : null,
        weight:               formData.weight ? parseFloat(formData.weight) : null,
        weight_unit:          formData.weight_unit || 'g',
        tags:                 tagsArray.length > 0 ? tagsArray : null
      };

      const response = await fetch(`${API_BASE_URL}/products`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const createdProduct = await response.json();

      setApprovalResult({
        status:  createdProduct.approval_status,
        message: createdProduct._approval_message || ''
      });

      setFormData({
        product_name:'', description:'', price:'', stock_quantity:'',
        category:'', material:'', discount_percentage:'',
        discount_start_date:'', discount_end_date:'',
        weight:'', weight_unit:'g', is_active:true, is_featured:false, tags:''
      });
      setMainImage(null);
      setMainImagePreview(null);

      if (onSuccess) onSuccess(createdProduct);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('❌ Product creation error:', error);
      setErrors({ submit: error.message });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ── Approval result banner ───────────────────────────────────
  const ApprovalBanner = () => {
    if (!approvalResult) return null;
    const config = {
      approved: { bg:'bg-green-50 border-green-200',  icon:<CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0"/>,  title:'Product Approved!', color:'text-green-700'  },
      rejected: { bg:'bg-red-50 border-red-200',      icon:<XCircle     className="h-5 w-5 text-red-600 flex-shrink-0"/>,    title:'Product Rejected',  color:'text-red-700'    },
      pending:  { bg:'bg-yellow-50 border-yellow-200',icon:<Clock       className="h-5 w-5 text-yellow-600 flex-shrink-0"/>, title:'Under Review',      color:'text-yellow-700' }
    };
    const c = config[approvalResult.status] || config.pending;
    return (
      <div className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${c.bg}`}>
        {c.icon}
        <div>
          <p className={`font-semibold ${c.color}`}>{c.title}</p>
          <p className={`text-sm mt-0.5 ${c.color}`}>{approvalResult.message}</p>
        </div>
      </div>
    );
  };

  // ── Category rule hint ───────────────────────────────────────
  const CategoryHint = () => {
    if (!categoryRule) return null;
    return (
      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          {(categoryRule.min_price || categoryRule.max_price) && (
            <p>
              <span className="font-medium">Price range: </span>
              {categoryRule.min_price != null ? `₱${categoryRule.min_price.toLocaleString()}` : 'Any'}
              {' – '}
              {categoryRule.max_price != null ? `₱${categoryRule.max_price.toLocaleString()}` : 'Any'}
            </p>
          )}
          {categoryRule.allowed_materials?.length > 0 && (
            <p className="text-green-700">
              <span className="font-medium">✓ </span>
              {categoryRule.allowed_materials.length} material{categoryRule.allowed_materials.length !== 1 ? 's' : ''} available for this category
            </p>
          )}
        </div>
      </div>
    );
  };

  // Whether a discount is currently entered
  const hasDiscount = formData.discount_percentage && parseFloat(formData.discount_percentage) > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>

      <ApprovalBanner />

      <div className="space-y-6">

        {/* ── Product Image ──────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Image *</label>
          <div className="flex items-center space-x-4">
            <div className="w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-300">
              {mainImagePreview
                ? <img src={mainImagePreview} alt="Product" className="w-full h-full object-cover" />
                : <div className="text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No image</p>
                  </div>
              }
            </div>
            <div className="flex flex-col space-y-2">
              <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition inline-block text-center font-medium">
                {mainImagePreview ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleMainImageChange} className="hidden" />
              </label>
              {mainImagePreview && (
                <button type="button"
                  onClick={() => { setMainImage(null); setMainImagePreview(null); }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Remove Image
                </button>
              )}
            </div>
          </div>
          {errors.mainImage && <p className="text-red-500 text-sm mt-1">{errors.mainImage}</p>}
          <p className="text-xs text-gray-500 mt-2">Recommended: Square image, at least 500×500px, max 5MB</p>
        </div>

        {/* ── Product Name ───────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input type="text" name="product_name" value={formData.product_name}
            onChange={handleInputChange} placeholder="Enter product name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.product_name ? 'border-red-400' : 'border-gray-300'}`} />
          {errors.product_name && <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>}
        </div>

        {/* ── Description ────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea name="description" value={formData.description} onChange={handleInputChange}
            rows="4" placeholder="Enter product description"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.description ? 'border-red-400' : 'border-gray-300'}`} />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>

        {/* ── Category + Brand ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <div className="relative">
              <select name="category" value={formData.category} onChange={handleInputChange}
                disabled={loadingCats}
                className={`w-full px-3 py-2 pr-9 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
                  ${errors.category ? 'border-red-400' : 'border-gray-300'}
                  ${loadingCats ? 'opacity-60 cursor-wait' : ''}`}>
                <option value="">
                  {loadingCats ? 'Loading categories…' : '— Select category —'}
                </option>
                {categories.map(c => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            <CategoryHint />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
            <div className="relative">
              <select
                name="material"
                value={formData.material}
                onChange={handleInputChange}
                disabled={!formData.category || !categoryRule?.allowed_materials?.length}
                className={`w-full px-3 py-2 pr-9 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
                  ${errors.material ? 'border-red-400' : 'border-gray-300'}
                  ${!formData.category ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {!formData.category
                    ? 'Select a category first'
                    : !categoryRule?.allowed_materials?.length
                    ? 'No material restriction'
                    : '— Select material —'}
                </option>
                {categoryRule?.allowed_materials?.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.material && <p className="text-red-500 text-sm mt-1">{errors.material}</p>}
            {formData.category && !categoryRule?.allowed_materials?.length && (
              <p className="text-xs text-gray-400 mt-1">This category has no material restriction</p>
            )}
          </div>
        </div>

        {/* ── Price + Stock ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price * (₱)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input type="number" name="price" value={formData.price} onChange={handleInputChange}
                step="0.01" min="0" placeholder="0.00"
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.price ? 'border-red-400' : 'border-gray-300'}`} />
            </div>
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            {categoryRule?.min_price != null && categoryRule?.max_price != null && (
              <p className="text-xs text-amber-600 mt-1">
                Accepted range: ₱{categoryRule.min_price.toLocaleString()} – ₱{categoryRule.max_price.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
            <div className="relative">
              <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input type="number" name="stock_quantity" value={formData.stock_quantity}
                onChange={handleInputChange} min="0" placeholder="0"
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.stock_quantity ? 'border-red-400' : 'border-gray-300'}`} />
            </div>
            {errors.stock_quantity && <p className="text-red-500 text-sm mt-1">{errors.stock_quantity}</p>}
          </div>
        </div>

        {/* ── Discount Section ───────────────────────────────── */}
        <div className={`rounded-xl border-2 p-4 transition-colors duration-200
          ${hasDiscount ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>

          <div className="flex items-center gap-2 mb-3">
            <Tag className={`w-4 h-4 ${hasDiscount ? 'text-orange-500' : 'text-gray-400'}`} />
            <span className="text-sm font-semibold text-gray-700">Discount Settings</span>
            {hasDiscount && (
              <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                -{formData.discount_percentage}% OFF
              </span>
            )}
          </div>

          {/* Discount % */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Percentage (%)
            </label>
            <input type="number" name="discount_percentage" value={formData.discount_percentage}
              onChange={handleInputChange} step="0.01" min="0" max="100" placeholder="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.discount_percentage ? 'border-red-400' : 'border-gray-300'} bg-white`} />
            {errors.discount_percentage && <p className="text-red-500 text-sm mt-1">{errors.discount_percentage}</p>}
          </div>

          {/* Date range — only shown when discount > 0 */}
          {hasDiscount && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-orange-500" />
                  Start Date *
                </label>
                <input
                  type="date"
                  name="discount_start_date"
                  value={formData.discount_start_date}
                  onChange={handleInputChange}
                  min={today}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
                    ${errors.discount_start_date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.discount_start_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.discount_start_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-orange-500" />
                  End Date *
                </label>
                <input
                  type="date"
                  name="discount_end_date"
                  value={formData.discount_end_date}
                  onChange={handleInputChange}
                  min={formData.discount_start_date || today}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
                    ${errors.discount_end_date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.discount_end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.discount_end_date}</p>
                )}
              </div>
            </div>
          )}

          {/* Preview of discounted price */}
          {hasDiscount && formData.price && (
            <div className="mt-3 p-2 bg-white border border-orange-200 rounded-lg flex items-center gap-3 text-sm">
              <span className="text-gray-500 line-through">₱{parseFloat(formData.price).toFixed(2)}</span>
              <span className="text-orange-600 font-bold text-base">
                ₱{(parseFloat(formData.price) - (parseFloat(formData.price) * parseFloat(formData.discount_percentage) / 100)).toFixed(2)}
              </span>
              <span className="text-xs text-gray-400">
                {formData.discount_start_date && formData.discount_end_date
                  ? `Valid: ${formData.discount_start_date} → ${formData.discount_end_date}`
                  : 'Set dates above'}
              </span>
            </div>
          )}

          {!hasDiscount && (
            <p className="text-xs text-gray-400">Enter a discount percentage above to set discount dates.</p>
          )}
        </div>

        {/* ── Weight ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
<label className="block text-sm font-medium text-gray-700 mb-1">Weight *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Weight className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input type="number" name="weight" value={formData.weight} onChange={handleInputChange}
                  step="0.01" min="0" placeholder="0.00"
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.weight ? 'border-red-400' : 'border-gray-300'}`} />
              </div>
              <div className="relative">
                <select name="weight_unit" value={formData.weight_unit} onChange={handleInputChange}
                  className="h-full px-3 py-2 pr-7 border border-gray-300 rounded-md appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
            <p className="text-xs text-gray-400 mt-1">Helps calculate accurate shipping rates</p>
          </div>

          {/* ── Tags ──────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input type="text" name="tags" value={formData.tags} onChange={handleInputChange}
                placeholder="e.g., sale, trending, new arrival"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* ── Checkboxes ─────────────────────────────────────── */}
        <div className="flex space-x-6">
          <label className="flex items-center">
            <input type="checkbox" name="is_active" checked={formData.is_active}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" name="is_featured" checked={formData.is_featured}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
            <Star className="w-4 h-4 text-yellow-500 ml-1" />
          </label>
        </div>

        {/* ── Submit error ───────────────────────────────────── */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* ── Submit button ──────────────────────────────────── */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium">
          {loading ? 'Creating Product…' : 'Create Product'}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;
