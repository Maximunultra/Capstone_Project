import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, Upload, X, Image as ImageIcon } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const ProductEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Get user info from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const userRole = currentUser.role;

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    price: '',
    category: '',
    brand: '',
    stock_quantity: '',
    discount_percentage: '',
    shipping_fee: '',
    product_image: '',
    is_active: true,
    is_featured: false,
    tags: ''
  });

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      
      const data = await response.json();
      
      // Populate form with existing data
      setFormData({
        product_name: data.product_name || '',
        description: data.description || '',
        price: data.price || '',
        category: data.category || '',
        brand: data.brand || '',
        stock_quantity: data.stock_quantity || '',
        discount_percentage: data.discount_percentage || '',
        shipping_fee: data.shipping_fee || '50.00',
        product_image: data.product_image || '',
        is_active: data.is_active ?? true,
        is_featured: data.is_featured || false,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : ''
      });

      // Set existing image as preview
      if (data.product_image) {
        setImagePreview(data.product_image);
      }

      // Check if user has permission to edit
      if (userRole !== 'admin' && data.users && data.users.id !== userId) {
        alert('You do not have permission to edit this product');
        handleBackClick();
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product');
      handleBackClick();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Clear any previous image errors
      if (errors.product_image) {
        setErrors(prev => ({ ...prev, product_image: '' }));
      }
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, product_image: '' }));
    
    // Clear the file input
    const fileInput = document.getElementById('image-upload');
    if (fileInput) fileInput.value = '';
  };

  // Upload image to server
  const uploadImage = async () => {
    if (!imageFile) return formData.product_image; // Return existing URL if no new file

    setUploadingImage(true);
    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('images', imageFile);

      const response = await fetch(`${API_BASE_URL}/products/upload`, {
        method: 'POST',
        body: formDataToUpload
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.imageUrls[0]; // Return the first uploaded image URL
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.stock_quantity || formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Valid stock quantity is required';
    }

    if (formData.discount_percentage && (formData.discount_percentage < 0 || formData.discount_percentage > 100)) {
      newErrors.discount_percentage = 'Discount must be between 0 and 100';
    }

    if (!formData.shipping_fee || parseFloat(formData.shipping_fee) < 0) {
      newErrors.shipping_fee = 'Valid shipping fee is required (minimum ₱0)';
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

    setSubmitting(true);

    try {
      // Upload image if a new one is selected
      let imageUrl = formData.product_image;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      // Prepare data for API
      const updateData = {
        user_id: userId,
        product_name: formData.product_name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        stock_quantity: parseInt(formData.stock_quantity),
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        shipping_fee: parseFloat(formData.shipping_fee) || 50.00,
        product_image: imageUrl,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      alert('Product updated successfully!');
      
      // Navigate back to product detail page
      if (userRole === 'admin') {
        navigate(`/admin/products/${id}`);
      } else if (userRole === 'seller') {
        navigate(`/seller/products/${id}`);
      } else {
        navigate(`/buyer/products/${id}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackClick = () => {
    // Navigate back to product detail page
    if (userRole === 'admin') {
      navigate(`/admin/products/${id}`);
    } else if (userRole === 'seller') {
      navigate(`/seller/products/${id}`);
    } else {
      navigate(`/buyer/products/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Product
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Product</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.product_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {errors.product_name && (
                <p className="mt-1 text-sm text-red-500">{errors.product_name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product description"
              />
            </div>

            {/* Price and Stock - Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                )}
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.stock_quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.stock_quantity && (
                  <p className="mt-1 text-sm text-red-500">{errors.stock_quantity}</p>
                )}
              </div>
            </div>

            {/* Category and Brand - Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Electronics, Clothing"
                />
                {errors.category && (
                  <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Nike, Apple"
                />
              </div>
            </div>

            {/* Discount and Shipping Fee - Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  name="discount_percentage"
                  value={formData.discount_percentage}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.discount_percentage ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.discount_percentage && (
                  <p className="mt-1 text-sm text-red-500">{errors.discount_percentage}</p>
                )}
              </div>

              {/* Shipping Fee */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shipping Fee (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    name="shipping_fee"
                    value={formData.shipping_fee}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.shipping_fee ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="50.00"
                  />
                </div>
                {errors.shipping_fee && (
                  <p className="mt-1 text-sm text-red-500">{errors.shipping_fee}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Cost to ship this product per unit</p>
              </div>
            </div>

            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Image
              </label>
              
              {/* Upload Area */}
              <div className="space-y-4">
                {/* File Input */}
                <div className="flex items-center gap-4">
                  <label 
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer transition"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">Choose Image</span>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <span className="text-sm text-gray-500">
                    {imageFile ? imageFile.name : 'No file chosen'}
                  </span>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Upload Info */}
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <ImageIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>Accepted formats: JPG, PNG, GIF, WEBP</p>
                    <p>Maximum file size: 5MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., electronics, gadget, premium"
              />
              <p className="mt-1 text-sm text-gray-500">Separate tags with commas</p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Active (Product is visible and available for purchase)
                </label>
              </div>

              {/* Featured Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Featured (Highlight this product on homepage)
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleBackClick}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition"
                disabled={submitting || uploadingImage}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || uploadingImage}
              >
                {uploadingImage ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Image...
                  </span>
                ) : submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductEditPage;