import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload, X, Image as ImageIcon, ArrowLeft, Save,
  RefreshCw, CheckCircle, AlertCircle, Tag, Package,
  Scale, Percent, Calendar, Info, ShieldCheck, ShieldX, Clock
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const WEIGHT_UNITS = ['g', 'kg', 'lbs'];

const ProductEditPage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId      = currentUser.id;
  const userRole    = currentUser.role;

  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]      = useState(false);
  const [uploadingImage, setUploadingImage]  = useState(false);
  const [success,        setSuccess]         = useState('');
  const [error,          setError]           = useState('');
  const [categories,     setCategories]      = useState([]);
  const [imageFile,      setImageFile]       = useState(null);
  const [imagePreview,   setImagePreview]    = useState(null);
  const [formErrors,     setFormErrors]      = useState({});

  const [categoryRule,   setCategoryRule]    = useState(null);
  const [rulePreview,    setRulePreview]     = useState(null);

  const [form, setForm] = useState({
    product_name:        '',
    description:         '',
    price:               '',
    category:            '',
    material:            '',
    stock_quantity:      '',
    weight:              '',
    weight_unit:         'g',
    discount_percentage: '',
    discount_start_date: '',
    discount_end_date:   '',
    product_image:       '',
    is_active:           true,
    is_featured:         false,
    tags:                '',
  });

  const [allowedMaterials, setAllowedMaterials] = useState([]);
  const [showCancelModal,  setShowCancelModal]  = useState(false);
  const originalFormRef = React.useRef(null);

  // ── Fetch categories ──────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/products/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };
    fetchCategories();
  }, []);

  // ── Update allowed materials + rule when category changes ─
  useEffect(() => {
    const rule = categories.find(
      c => c.category.toLowerCase() === form.category.toLowerCase()
    );
    if (rule) {
      setCategoryRule(rule);
      setAllowedMaterials(rule.allowed_materials?.length > 0 ? rule.allowed_materials : []);
    } else {
      setCategoryRule(null);
      setAllowedMaterials([]);
    }
  }, [form.category, categories]);

  // ── Live rule preview ─────────────────────────────────────
  useEffect(() => {
    if (!form.category) { setRulePreview(null); return; }

    const rule = categories.find(
      c => c.category.toLowerCase() === form.category.toLowerCase()
    );

    if (!rule) {
      setRulePreview({ status: 'approved', reason: 'No restrictions for this category — will be auto-approved.' });
      return;
    }

    const price = parseFloat(form.price);

    if (rule.min_price !== null && !isNaN(price) && price < rule.min_price) {
      setRulePreview({
        status: 'rejected',
        reason: `Price ₱${price} is below the minimum of ₱${rule.min_price} for "${form.category}".`
      });
      return;
    }
    if (rule.max_price !== null && !isNaN(price) && price > rule.max_price) {
      setRulePreview({
        status: 'rejected',
        reason: `Price ₱${price} exceeds the maximum of ₱${rule.max_price} for "${form.category}".`
      });
      return;
    }

    if (rule.allowed_materials?.length > 0 && form.material) {
      const allowed   = rule.allowed_materials.map(m => m.toLowerCase());
      const isAllowed = allowed.some(m => form.material.toLowerCase().includes(m));
      if (!isAllowed) {
        setRulePreview({
          status: 'rejected',
          reason: `Material "${form.material}" is not allowed for "${form.category}". Allowed: ${rule.allowed_materials.join(', ')}.`
        });
        return;
      }
    }

    if (!form.price || (!form.material && rule.allowed_materials?.length > 0)) {
      setRulePreview({ status: 'pending', reason: 'Fill in all required fields to see approval status.' });
      return;
    }

    setRulePreview({ status: 'approved', reason: 'This product meets all category requirements and will be auto-approved.' });
  }, [form.category, form.price, form.material, categories]);

  // ── Helpers ───────────────────────────────────────────────
  const isDirty = () => {
    if (!originalFormRef.current) return false;
    const orig = originalFormRef.current;
    return Object.keys(orig).some(k => String(form[k]) !== String(orig[k])) || imageFile !== null;
  };

  const doGoBack = () => {
    if (userRole === 'admin')       navigate(`/admin/products/${id}`);
    else if (userRole === 'seller') navigate(`/seller/products/${id}`);
    else                            navigate(`/buyer/products/${id}`);
  };

  const goBack = () => {
    if (isDirty()) { setShowCancelModal(true); return; }
    doGoBack();
  };

  // ── Fetch product ─────────────────────────────────────────
  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      const data = await res.json();

      if (userRole !== 'admin' && data.users && data.users.id !== userId) {
        alert('You do not have permission to edit this product');
        doGoBack();
        return;
      }

      const loaded = {
        product_name:        data.product_name        || '',
        description:         data.description         || '',
        price:               data.price               || '',
        category:            data.category            || '',
        material:            data.material || data.brand || '',
        stock_quantity:      data.stock_quantity       || '',
        weight:              data.weight               || '',
        weight_unit:         data.weight_unit          || 'g',
        discount_percentage: data.discount_percentage  || '',
        discount_start_date: data.discount_start_date
          ? data.discount_start_date.split('T')[0] : '',
        discount_end_date:   data.discount_end_date
          ? data.discount_end_date.split('T')[0] : '',
        product_image:       data.product_image        || '',
        is_active:           data.is_active  ?? true,
        is_featured:         data.is_featured || false,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
      };

      setForm(loaded);
      if (data.product_image) setImagePreview(data.product_image);
      originalFormRef.current = { ...loaded };
    } catch (err) {
      setError('Failed to load product.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: undefined }));

    if (field === 'category') {
      setForm(f => ({ ...f, category: value, material: '' }));
      return;
    }
    if (field === 'discount_percentage' && (!value || parseFloat(value) === 0)) {
      setForm(f => ({ ...f, discount_percentage: value, discount_start_date: '', discount_end_date: '' }));
      return;
    }

    setForm(f => ({ ...f, [field]: value }));
  };

  // ── Image ─────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { alert('Image must be under 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    if (formErrors.product_image) setFormErrors(e => ({ ...e, product_image: undefined }));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm(f => ({ ...f, product_image: '' }));
    const fi = document.getElementById('image-upload');
    if (fi) fi.value = '';
  };

  const uploadImage = async () => {
    if (!imageFile) return form.product_image;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('images', imageFile);
      const res  = await fetch(`${API_BASE_URL}/products/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.imageUrls[0];
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!form.product_name.trim())                     e.product_name   = 'Product name is required.';
    if (!form.description.trim())                      e.description    = 'Description is required.';
    if (!form.category.trim())                         e.category       = 'Category is required.';
    if (!form.stock_quantity || parseInt(form.stock_quantity) < 0)
                                                       e.stock_quantity = 'Valid stock quantity is required.';
    if (!form.weight || parseFloat(form.weight) <= 0)  e.weight         = 'Weight is required.';

    if (allowedMaterials.length > 0 && !form.material)
      e.material = 'Material is required for this category.';

    // ✅ Price validation — required + category range check
    if (!form.price || parseFloat(form.price) <= 0) {
      e.price = 'Valid price is required.';
    } else if (categoryRule) {
      const price = parseFloat(form.price);
      if (categoryRule.min_price !== null && price < categoryRule.min_price)
        e.price = `Price must be at least ₱${categoryRule.min_price.toLocaleString()} for "${form.category}".`;
      else if (categoryRule.max_price !== null && price > categoryRule.max_price)
        e.price = `Price must not exceed ₱${categoryRule.max_price.toLocaleString()} for "${form.category}".`;
    }

    // ✅ Material rule validation
    if (categoryRule?.allowed_materials?.length > 0 && form.material) {
      const allowed   = categoryRule.allowed_materials.map(m => m.toLowerCase());
      const isAllowed = allowed.some(m => form.material.toLowerCase().includes(m));
      if (!isAllowed)
        e.material = `"${form.material}" is not allowed for "${form.category}". Choose: ${categoryRule.allowed_materials.join(', ')}.`;
    }

    if (form.discount_percentage) {
      const d = parseFloat(form.discount_percentage);
      if (d < 0 || d > 100) e.discount_percentage = 'Discount must be 0–100.';
      if (d > 0) {
        if (!form.discount_start_date) e.discount_start_date = 'Start date is required.';
        if (!form.discount_end_date)   e.discount_end_date   = 'End date is required.';
        if (form.discount_start_date && form.discount_end_date &&
            new Date(form.discount_end_date) <= new Date(form.discount_start_date))
          e.discount_end_date = 'End date must be after start date.';
      }
    }

    return e;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(''); setSuccess('');

    const e = validate();
    if (Object.keys(e).length) {
      setFormErrors(e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormErrors({});
    setSubmitting(true);

    // ✅ Async duplicate name check — same seller, same category, different product
    // Do this before uploading image so we don't waste the upload if it fails
    try {
      const checkRes = await fetch(
        `${API_BASE_URL}/products?user_id=${userId}&category=${encodeURIComponent(form.category)}&limit=100`
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const duplicate = (checkData.products || []).find(p =>
          p.id !== parseInt(id) &&
          p.product_name.trim().toLowerCase() === form.product_name.trim().toLowerCase()
        );
        if (duplicate) {
          setFormErrors({ product_name: `You already have a product named "${duplicate.product_name}" in the "${form.category}" category. Please use a different name.` });
          setSubmitting(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    } catch (checkErr) {
      // If the check fails, let the backend handle it via 409
      console.warn('Duplicate check failed, proceeding:', checkErr);
    }

    try {
      let imageUrl = form.product_image;
      if (imageFile) imageUrl = await uploadImage();

      const discountPct = form.discount_percentage ? parseFloat(form.discount_percentage) : 0;

      const payload = {
        user_id:             userId,
        product_name:        form.product_name.trim(),
        description:         form.description.trim(),
        price:               parseFloat(form.price),
        category:            form.category.trim(),
        brand:               form.material.trim(),
        material:            form.material.trim(),
        stock_quantity:      parseInt(form.stock_quantity),
        weight:              parseFloat(form.weight),
        weight_unit:         form.weight_unit,
        discount_percentage: discountPct,
        discount_start_date: discountPct > 0 ? form.discount_start_date || null : null,
        discount_end_date:   discountPct > 0 ? form.discount_end_date   || null : null,
        product_image:       imageUrl,
        is_active:           form.is_active,
        is_featured:         form.is_featured,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const responseData = await res.json();

      // ✅ 409 = duplicate product name in same category
      if (res.status === 409) {
        setError(responseData.error || 'A product with this name already exists in this category.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!res.ok) throw new Error(responseData.error || responseData.message || 'Failed to update product');

      // ✅ Show approval result based on what backend returned
      const newStatus = responseData.approval_status;
      if (newStatus === 'approved') {
        setSuccess("✅ Product updated and auto-approved — it's now live!");
      } else if (newStatus === 'rejected') {
        setSuccess(`Product updated. ❌ Auto-rejected: ${responseData.rejection_reason}`);
      } else {
        setSuccess('Product updated successfully!');
      }

      setTimeout(() => doGoBack(), 2000);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────
  const discountedPrice = form.price && form.discount_percentage
    ? (parseFloat(form.price) * (1 - parseFloat(form.discount_percentage) / 100)).toFixed(2)
    : null;

  const today = new Date().toISOString().split('T')[0];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-orange-500 mx-auto mb-4" />
        <p className="text-orange-800 font-medium">Loading product…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack}
            className="p-2 rounded-xl bg-white shadow hover:shadow-md hover:bg-orange-50 transition text-orange-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-900">Edit Product</h1>
            <p className="text-orange-600 text-sm mt-0.5">Update product details and save changes</p>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Live Approval Preview Banner */}
        {rulePreview && userRole !== 'admin' && (
          <div className={`flex items-start gap-3 mb-5 p-4 rounded-xl border text-sm font-medium
            ${rulePreview.status === 'approved'
              ? 'bg-green-50 border-green-200 text-green-800'
              : rulePreview.status === 'rejected'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
            {rulePreview.status === 'approved'
              ? <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
              : rulePreview.status === 'rejected'
              ? <ShieldX className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              : <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" />
            }
            <div>
              <p className="font-semibold mb-0.5">
                {rulePreview.status === 'approved' ? '✅ Will be auto-approved'
                  : rulePreview.status === 'rejected' ? '❌ Will be auto-rejected'
                  : '⏳ Will go to pending review'}
              </p>
              <p className="font-normal opacity-90">{rulePreview.reason}</p>
            </div>
          </div>
        )}

        {/* Section 1: Product Image */}
        <Section title="Product Image" icon={<ImageIcon className="w-4 h-4 text-orange-500" />}>
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview"
                  className="w-48 h-48 object-cover rounded-2xl border-2 border-orange-100 shadow" />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-orange-300 rounded-2xl bg-orange-50 hover:bg-orange-100 cursor-pointer transition">
                <Upload className="w-8 h-8 text-orange-400 mb-2" />
                <span className="text-sm text-orange-600 font-medium">Upload Image</span>
                <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · max 5MB</span>
              </label>
            )}
            <label htmlFor="image-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 hover:bg-amber-100 cursor-pointer transition text-sm font-medium">
              <Upload className="w-4 h-4" />
              {imagePreview ? 'Change Image' : 'Choose Image'}
            </label>
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imageFile && <p className="text-xs text-gray-500">{imageFile.name}</p>}
          </div>
        </Section>

        {/* Section 2: Basic Info */}
        <Section title="Basic Information" icon={<Package className="w-4 h-4 text-orange-500" />}>
          <div className="space-y-4">

            <Field label="Product Name" required error={formErrors.product_name}>
              <input type="text" value={form.product_name}
                onChange={e => handleChange('product_name', e.target.value)}
                placeholder="Enter product name"
                className={inputCls(formErrors.product_name)} />
            </Field>

            <Field label="Description" required error={formErrors.description}>
              <textarea rows={3} value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Describe your product…"
                className={`${inputCls(formErrors.description)} resize-none`} />
            </Field>

            {/* Category + Material */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" required error={formErrors.category}>
                <select value={form.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className={inputCls(formErrors.category)}>
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
              </Field>

              <Field label="Material" required={allowedMaterials.length > 0} error={formErrors.material}>
                {allowedMaterials.length > 0 ? (
                  <select value={form.material}
                    onChange={e => handleChange('material', e.target.value)}
                    className={inputCls(formErrors.material)}>
                    <option value="">Select material</option>
                    {allowedMaterials.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={form.material}
                    onChange={e => handleChange('material', e.target.value)}
                    placeholder={form.category ? 'No material restriction' : 'Select category first'}
                    disabled={!form.category}
                    className={`${inputCls(formErrors.material)} disabled:opacity-50 disabled:cursor-not-allowed`} />
                )}
              </Field>
            </div>

            <Field label="Tags" hint="Separate tags with commas" icon={<Tag className="w-4 h-4 text-orange-400" />}>
              <input type="text" value={form.tags}
                onChange={e => handleChange('tags', e.target.value)}
                placeholder="e.g. handmade, woven, natural"
                className={inputCls(false)} />
            </Field>

          </div>
        </Section>

        {/* Section 3: Pricing & Stock */}
        <Section title="Pricing & Stock" icon={<Percent className="w-4 h-4 text-orange-500" />}>
          <div className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Price (₱)" required error={formErrors.price}>
                <input type="number" value={form.price} min="0" step="0.01"
                  onChange={e => handleChange('price', e.target.value)}
                  placeholder="0.00"
                  className={inputCls(formErrors.price)} />
                {/* ✅ Price range hint — turns red when there's a price error */}
                {categoryRule && (categoryRule.min_price !== null || categoryRule.max_price !== null) && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${formErrors.price ? 'text-red-500 font-medium' : 'text-orange-600'}`}>
                    <Info className="w-3 h-3 flex-shrink-0" />
                    Allowed: {categoryRule.min_price !== null ? `₱${categoryRule.min_price.toLocaleString()}` : '₱0'}
                    {' – '}
                    {categoryRule.max_price !== null ? `₱${categoryRule.max_price.toLocaleString()}` : 'no limit'}
                  </p>
                )}
              </Field>

              <Field label="Stock Quantity" required error={formErrors.stock_quantity}>
                <input type="number" value={form.stock_quantity} min="0"
                  onChange={e => handleChange('stock_quantity', e.target.value)}
                  placeholder="0"
                  className={inputCls(formErrors.stock_quantity)} />
              </Field>
            </div>

            {/* Weight */}
            <Field label="Weight" required error={formErrors.weight}
              icon={<Scale className="w-4 h-4 text-orange-400" />}>
              <div className="flex gap-2">
                <input type="number" value={form.weight} min="0" step="0.001"
                  onChange={e => handleChange('weight', e.target.value)}
                  placeholder="0"
                  className={`flex-1 ${inputCls(formErrors.weight)}`} />
                <select value={form.weight_unit}
                  onChange={e => handleChange('weight_unit', e.target.value)}
                  className="w-20 px-2 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50">
                  {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </Field>

            {/* Discount */}
            <Field label="Discount (%)" error={formErrors.discount_percentage}>
              <input type="number" value={form.discount_percentage} min="0" max="100" step="0.01"
                onChange={e => handleChange('discount_percentage', e.target.value)}
                placeholder="0"
                className={inputCls(formErrors.discount_percentage)} />
            </Field>

            {parseFloat(form.discount_percentage) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Discount Period
                </p>
                {discountedPrice && (
                  <div className="text-sm text-amber-800 bg-white rounded-lg px-3 py-2 border border-amber-100">
                    ₱{parseFloat(form.price).toLocaleString()} →{' '}
                    <span className="font-bold text-green-700">₱{parseFloat(discountedPrice).toLocaleString()}</span>
                    {' '}({form.discount_percentage}% off)
                    {form.discount_start_date && form.discount_end_date && (
                      <span className="text-gray-500 ml-2 text-xs">
                        · {form.discount_start_date} to {form.discount_end_date}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Start Date" required error={formErrors.discount_start_date}>
                    <input type="date" value={form.discount_start_date} min={today}
                      onChange={e => handleChange('discount_start_date', e.target.value)}
                      className={inputCls(formErrors.discount_start_date)} />
                  </Field>
                  <Field label="End Date" required error={formErrors.discount_end_date}>
                    <input type="date" value={form.discount_end_date}
                      min={form.discount_start_date || today}
                      onChange={e => handleChange('discount_end_date', e.target.value)}
                      className={inputCls(formErrors.discount_end_date)} />
                  </Field>
                </div>
              </div>
            )}

          </div>
        </Section>

        {/* Section 4: Visibility */}
        <Section title="Visibility" icon={<CheckCircle className="w-4 h-4 text-orange-500" />}>
          <div className="space-y-3">
            <Toggle
              checked={form.is_active}
              onChange={() => handleChange('is_active', !form.is_active)}
              color="green"
              label="Active"
              hint="Product is visible and available for purchase"
            />
            <Toggle
              checked={form.is_featured}
              onChange={() => handleChange('is_featured', !form.is_featured)}
              color="amber"
              label="Featured"
              hint="Highlight this product on the homepage"
            />
          </div>
        </Section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pb-10">
          <button onClick={goBack}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition font-medium shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || uploadingImage}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
            {uploadingImage
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</>
              : submitting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>

      </div>

      {/* Unsaved Changes Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Discard changes?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              You have unsaved changes. If you leave now, all your changes will be lost.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Keep Editing
              </button>
              <button onClick={() => { setShowCancelModal(false); doGoBack(); }}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition">
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-6 mb-5">
    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
      {icon} {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, required, error, hint, icon, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
      {icon}{label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint  && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Toggle = ({ checked, onChange, color, label, hint }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer
        ${checked
          ? color === 'green' ? 'bg-green-500' : 'bg-amber-500'
          : 'bg-gray-300'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
        ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  </label>
);

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 transition
  ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

export default ProductEditPage;