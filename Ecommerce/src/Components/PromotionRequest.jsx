import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const PromotionRequestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Get user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const userRole = currentUser.role;

  // Form state
  const [formData, setFormData] = useState({
    product_id: '',
    promotion_type: 'discount',
    promotion_title: '',
    promotion_description: '',
    discount_percentage: '',
    commission_increase: '',
    start_date: '',
    end_date: '',
    banner_image: '',
    target_audience: 'all'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUserProducts();
  }, []);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Please select a product';
    }

    if (!formData.promotion_title.trim()) {
      newErrors.promotion_title = 'Promotion title is required';
    }

    if (!formData.promotion_description.trim()) {
      newErrors.promotion_description = 'Promotion description is required';
    }

    if (formData.promotion_type === 'discount' && (!formData.discount_percentage || formData.discount_percentage <= 0 || formData.discount_percentage > 100)) {
      newErrors.discount_percentage = 'Valid discount percentage (1-100) is required';
    }

    if (!formData.commission_increase || formData.commission_increase < 0 || formData.commission_increase > 50) {
      newErrors.commission_increase = 'Commission increase must be between 0-50%';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fix all errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        user_id: userId,
        product_id: parseInt(formData.product_id),
        promotion_type: formData.promotion_type,
        promotion_title: formData.promotion_title.trim(),
        promotion_description: formData.promotion_description.trim(),
        discount_percentage: formData.promotion_type === 'discount' ? parseFloat(formData.discount_percentage) : 0,
        commission_increase: parseFloat(formData.commission_increase),
        start_date: formData.start_date,
        end_date: formData.end_date,
        banner_image: formData.banner_image.trim(),
        target_audience: formData.target_audience,
        status: 'pending' // Will be approved by admin
      };

      const response = await fetch(`${API_BASE_URL}/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit promotion request');
      }

      alert('Promotion request submitted successfully! Waiting for admin approval.');
      
      // Navigate back based on role
      if (userRole === 'seller') {
        navigate('/seller/promotions');
      } else if (userRole === 'admin') {
        navigate('/admin/promotions');
      }
    } catch (error) {
      console.error('Error submitting promotion:', error);
      alert('Error submitting promotion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Request Product Promotion</h1>
          <p className="text-gray-600 mt-2">Submit a promotion request for admin approval</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {loadingProducts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">You don't have any active products to promote.</p>
              <button
                onClick={() => navigate('/seller/products')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Go to Products
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Product to Promote <span className="text-red-500">*</span>
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.product_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select a product --</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.product_name} - ${product.price} (Stock: {product.stock_quantity})
                    </option>
                  ))}
                </select>
                {errors.product_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.product_id}</p>
                )}

                {/* Product Preview */}
                {selectedProduct && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4">
                      {selectedProduct.product_image && (
                        <img
                          src={selectedProduct.product_image}
                          alt={selectedProduct.product_name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedProduct.product_name}</h3>
                        <p className="text-sm text-gray-600">{selectedProduct.category}</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">${selectedProduct.price}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Promotion Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Promotion Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="promotion_type"
                  value={formData.promotion_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="discount">Flash Sale / Discount</option>
                  <option value="featured">Featured Product</option>
                  <option value="banner">Banner Advertisement</option>
                  <option value="seasonal">Seasonal Promotion</option>
                </select>
              </div>

              {/* Promotion Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Promotion Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="promotion_title"
                  value={formData.promotion_title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.promotion_title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Summer Sale - 50% OFF!"
                />
                {errors.promotion_title && (
                  <p className="mt-1 text-sm text-red-500">{errors.promotion_title}</p>
                )}
              </div>

              {/* Promotion Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Promotion Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="promotion_description"
                  value={formData.promotion_description}
                  onChange={handleChange}
                  rows="4"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.promotion_description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe your promotion campaign..."
                />
                {errors.promotion_description && (
                  <p className="mt-1 text-sm text-red-500">{errors.promotion_description}</p>
                )}
              </div>

              {/* Discount and Commission Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discount Percentage */}
                {formData.promotion_type === 'discount' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount Percentage (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.discount_percentage ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 25"
                    />
                    {errors.discount_percentage && (
                      <p className="mt-1 text-sm text-red-500">{errors.discount_percentage}</p>
                    )}
                  </div>
                )}

                {/* Commission Increase */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Increase (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="commission_increase"
                    value={formData.commission_increase}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    step="0.01"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.commission_increase ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 5"
                  />
                  {errors.commission_increase && (
                    <p className="mt-1 text-sm text-red-500">{errors.commission_increase}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Platform commission will increase by this percentage during promotion
                  </p>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
                  )}
                </div>
              </div>

              {/* Banner Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Banner/Advertisement Image URL
                </label>
                <input
                  type="url"
                  name="banner_image"
                  value={formData.banner_image}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/banner.jpg"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Upload a custom banner image for your promotion (optional)
                </p>
                {formData.banner_image && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Banner Preview:</p>
                    <img
                      src={formData.banner_image}
                      alt="Banner preview"
                      className="w-full max-h-48 object-cover rounded-lg border-2 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="new">New Customers Only</option>
                  <option value="returning">Returning Customers Only</option>
                  <option value="premium">Premium Members</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Promotion Guidelines</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your promotion request will be reviewed by an administrator</li>
                      <li>• Approved promotions will appear as pop-up advertisements to buyers</li>
                      <li>• Commission increase is mandatory for platform promotion</li>
                      <li>• Ensure your product has sufficient stock for the promotion period</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Promotion Request'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionRequestPage;