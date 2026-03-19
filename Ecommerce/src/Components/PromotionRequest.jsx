import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const PromotionRequestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [activePromotion, setActivePromotion] = useState(null);
  const [checkingActive, setCheckingActive] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const userRole = currentUser.role;

  const [formData, setFormData] = useState({
    product_id: '',
    promotion_title: '',
    promotion_description: '',
    start_date: '',
    end_date: '',
    banner_image: '',
    target_audience: 'all'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUserProducts();
    checkActivePromotion();
  }, []);

  // ✅ Check on page load if seller already has a live active promotion
  const checkActivePromotion = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/promotions?user_id=${userId}&status=approved`);
      if (!response.ok) throw new Error('Failed to check promotions');
      const data = await response.json();
      const now = new Date();
      const active = (data.promotions || []).find(p =>
        new Date(p.start_date) <= now && new Date(p.end_date) >= now
      );
      setActivePromotion(active || null);
    } catch (error) {
      console.error('Error checking active promotion:', error);
    } finally {
      setCheckingActive(false);
    }
  };

  const fetchUserProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products?user_id=${userId}&is_active=true`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    setUploadSuccess('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, JPEG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const response = await fetch(`${API_BASE_URL}/products/upload`, { method: 'POST', body: fd });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      if (data.imageUrls && data.imageUrls.length > 0) {
        setFormData(prev => ({ ...prev, banner_image: data.imageUrls[0] }));
        setUploadSuccess('Banner image uploaded successfully!');
      }
    } catch (error) {
      setUploadError('Failed to upload image. Please try again.');
      setImagePreview('');
      setFormData(prev => ({ ...prev, banner_image: '' }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, banner_image: '' }));
    setImagePreview('');
    setUploadSuccess('');
    setUploadError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.product_id) newErrors.product_id = 'Please select a product';
    if (!formData.promotion_title.trim()) newErrors.promotion_title = 'Promotion title is required';
    if (!formData.promotion_description.trim()) newErrors.promotion_description = 'Promotion description is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date))
      newErrors.end_date = 'End date must be after start date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    setSubmitSuccess('');
    try {
      const submitData = {
        user_id:               userId,
        product_id:            parseInt(formData.product_id),
        promotion_type:        'banner',
        promotion_title:       formData.promotion_title.trim(),
        promotion_description: formData.promotion_description.trim(),
        start_date:            new Date(formData.start_date).toISOString(),
        end_date:              new Date(formData.end_date).toISOString(),
        banner_image:          formData.banner_image.trim(),
        target_audience:       formData.target_audience,
      };

      const response = await fetch(`${API_BASE_URL}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ submit: responseData.message });
          return;
        }
        throw new Error(responseData.message || 'Failed to submit promotion');
      }

      setSubmitSuccess('Promotion submitted! Your banner will go live on the start date.');
      setTimeout(() => {
        if (userRole === 'seller') navigate('/seller/promotions');
        else navigate('/admin/promotions');
      }, 2000);

    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  const formatDate = (ds) => new Date(ds).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (checkingActive || loadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 transition mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Request Banner Advertisement</h1>
          <p className="text-gray-600 mt-2">Submit a banner promotion — it goes live automatically on your start date</p>
        </div>

        {/* ✅ If seller already has active promotion — block the form and show info */}
        {activePromotion ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You already have an active promotion</h2>
              <p className="text-gray-600 mb-2">
                Your promotion <span className="font-semibold text-blue-600">"{activePromotion.promotion_title}"</span> is currently live.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                You can only have 1 active promotion at a time. Wait for it to expire before creating a new one.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
                <p className="text-sm text-amber-900 font-semibold mb-1">Current promotion ends:</p>
                <p className="text-sm text-amber-800">{formatDate(activePromotion.end_date)}</p>
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => navigate(-1)}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition">
                  Go Back
                </button>
                <button onClick={() => userRole === 'seller' ? navigate('/seller/promotions') : navigate('/admin/promotions')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                  View My Promotions
                </button>
              </div>
            </div>
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">You don't have any active products to promote.</p>
                <button onClick={() => navigate('/seller/products')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  Go to Products
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Submit success banner */}
                {submitSuccess && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-800 font-semibold text-sm">{submitSuccess}</p>
                  </div>
                )}

                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Product to Promote <span className="text-red-500">*</span>
                  </label>
                  <select name="product_id" value={formData.product_id} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.product_id ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">-- Select a product --</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.product_name} - ₱{product.price} (Stock: {product.stock_quantity})
                      </option>
                    ))}
                  </select>
                  {errors.product_id && <p className="mt-1 text-sm text-red-500">{errors.product_id}</p>}
                  {selectedProduct && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4">
                        {selectedProduct.product_image && (
                          <img src={selectedProduct.product_image} alt={selectedProduct.product_name} className="w-20 h-20 object-cover rounded-lg" />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedProduct.product_name}</h3>
                          <p className="text-sm text-gray-600">{selectedProduct.category}</p>
                          <p className="text-lg font-bold text-blue-600 mt-1">₱{selectedProduct.price}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Promotion Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Promotion Title <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="promotion_title" value={formData.promotion_title} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.promotion_title ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="e.g., Summer Sale - 50% OFF!" />
                  {errors.promotion_title && <p className="mt-1 text-sm text-red-500">{errors.promotion_title}</p>}
                </div>

                {/* Promotion Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Promotion Description <span className="text-red-500">*</span>
                  </label>
                  <textarea name="promotion_description" value={formData.promotion_description} onChange={handleChange} rows="4"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.promotion_description ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Describe your promotion campaign..." />
                  {errors.promotion_description && <p className="mt-1 text-sm text-red-500">{errors.promotion_description}</p>}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input type="datetime-local" name="start_date" value={formData.start_date} onChange={handleChange}
                      min={getMinDateTime()}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.start_date && <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input type="datetime-local" name="end_date" value={formData.end_date} onChange={handleChange}
                      min={formData.start_date || getMinDateTime()}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`} />
                    {errors.end_date && <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>}
                  </div>
                </div>

                {/* Banner Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Banner/Advertisement Image
                    {formData.banner_image && <span className="ml-2 text-green-600 font-normal text-xs">✓ Uploaded</span>}
                  </label>

                  {!formData.banner_image && !uploadingImage && (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG — max 5MB</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}

                  {/* Uploading state */}
                  {uploadingImage && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <svg className="animate-spin h-5 w-5 text-blue-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-blue-700 text-sm font-medium">Uploading image, please wait...</span>
                    </div>
                  )}

                  {/* Upload success */}
                  {uploadSuccess && !uploadingImage && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 text-sm font-medium">{uploadSuccess}</span>
                    </div>
                  )}

                  {/* Upload error */}
                  {uploadError && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-700 text-sm">{uploadError}</span>
                    </div>
                  )}

                  {/* Preview */}
                  {formData.banner_image && !uploadingImage && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Banner Preview:</p>
                      <div className="relative">
                        <img src={imagePreview || formData.banner_image} alt="Banner preview" className="w-full max-h-64 object-cover rounded-lg border-2 border-gray-200" />
                        <button type="button" onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition"
                          title="Remove image">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-400">Optional but recommended for better engagement</p>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                  <select name="target_audience" value={formData.target_audience} onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Users</option>
                  </select>
                </div>

                {/* Guidelines */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">How it works</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Your banner goes live automatically on the start date</li>
                        <li>• It will automatically stop showing after the end date</li>
                        <li>• Buyers will see it as a pop-up advertisement</li>
                        <li>• You can only have 1 active promotion at a time</li>
                        <li>• Ensure your product has sufficient stock for the promotion period</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit error */}
                {errors.submit && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-red-800 font-semibold text-sm">Cannot create promotion</p>
                      <p className="text-red-700 text-sm mt-0.5">{errors.submit}</p>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-6 border-t">
                  <button type="button" onClick={() => navigate(-1)} disabled={loading || uploadingImage}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading || uploadingImage}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : 'Submit Promotion'}
                  </button>
                </div>

              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionRequestPage;