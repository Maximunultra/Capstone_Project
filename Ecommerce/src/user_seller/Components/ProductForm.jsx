import React, { useState } from 'react';
import { Upload, DollarSign, Package, Tag, Star, AlertCircle, CheckCircle, Truck } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const ProductForm = ({ userId, userRole, onSuccess }) => {
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category: '',
    brand: '',
    discount_percentage: '',
    shipping_fee: '50.00',
    is_active: true,
    is_featured: false,
    tags: ''
  });

  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.stock_quantity && parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    }

    if (formData.discount_percentage && (parseFloat(formData.discount_percentage) < 0 || parseFloat(formData.discount_percentage) > 100)) {
      newErrors.discount_percentage = 'Discount must be between 0 and 100';
    }

    if (!formData.shipping_fee || parseFloat(formData.shipping_fee) < 0) {
      newErrors.shipping_fee = 'Valid shipping fee is required (minimum ₱0)';
    }

    if (!mainImage) {
      newErrors.mainImage = 'Main product image is required';
    }

    return newErrors;
  };

  const uploadImage = async () => {
    if (!mainImage) {
      return null;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('images', mainImage);

    try {
      console.log('🚀 Uploading image...');
      
      const response = await fetch(`${API_BASE_URL}/products/upload`, {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);

      return result.imageUrls[0] || null;
    } catch (error) {
      console.error('❌ Image upload error:', error);
      throw new Error('Failed to upload image: ' + error.message);
    }
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

    try {
      // Upload main image
      const mainImageUrl = await uploadImage();

      // Prepare tags array
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Create product
      const productData = {
        user_id: userId,
        product_name: formData.product_name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category: formData.category || null,
        brand: formData.brand || null,
        product_image: mainImageUrl,
        images: null, // No additional images
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        shipping_fee: parseFloat(formData.shipping_fee) || 50.00,
        tags: tagsArray.length > 0 ? tagsArray : null
      };

      console.log('Creating product:', productData);

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const createdProduct = await response.json();
      console.log('✅ Product created:', createdProduct);

      setSuccess(true);
      
      // Reset form
      setFormData({
        product_name: '',
        description: '',
        price: '',
        stock_quantity: '',
        category: '',
        brand: '',
        discount_percentage: '',
        shipping_fee: '50.00',
        is_active: true,
        is_featured: false,
        tags: ''
      });
      setMainImage(null);
      setMainImagePreview(null);

      if (onSuccess) {
        onSuccess(createdProduct);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      console.error('❌ Product creation error:', error);
      setErrors({ submit: error.message });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
          <div>
            <p className="text-green-700 font-medium">Product created successfully!</p>
            {userRole === 'seller' && (
              <p className="text-green-600 text-sm mt-1">
                Your product is pending admin approval. You'll be notified once it's reviewed.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Main Product Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Image *
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-300">
              {mainImagePreview ? (
                <img src={mainImagePreview} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No image</p>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <label className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition inline-block text-center font-medium">
                {mainImagePreview ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageChange}
                  className="hidden"
                />
              </label>
              {mainImagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setMainImage(null);
                    setMainImagePreview(null);
                    setErrors(prev => ({ ...prev, mainImage: '' }));
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Remove Image
                </button>
              )}
            </div>
          </div>
          {errors.mainImage && (
            <p className="text-red-500 text-sm mt-1">{errors.mainImage}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Recommended: Square image, at least 500x500px, max 5MB
          </p>
        </div>

        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            name="product_name"
            value={formData.product_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product name"
          />
          {errors.product_name && (
            <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product description"
          />
        </div>

        {/* Price and Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price * (₱)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                min="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            {errors.stock_quantity && (
              <p className="text-red-500 text-sm mt-1">{errors.stock_quantity}</p>
            )}
          </div>
        </div>

        {/* Category and Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Home Decor, Clothing, Bag, Foods"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter brand name"
            />
          </div>
        </div>

        {/* Discount and Shipping Fee */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Percentage (%)
            </label>
            <input
              type="number"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {errors.discount_percentage && (
              <p className="text-red-500 text-sm mt-1">{errors.discount_percentage}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping Fee * (₱)
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="shipping_fee"
                value={formData.shipping_fee}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50.00"
              />
            </div>
            {errors.shipping_fee && (
              <p className="text-red-500 text-sm mt-1">{errors.shipping_fee}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Default: ₱50.00 per item</p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma separated)
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., sale, trending, new arrival"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Featured</span>
            <Star className="w-4 h-4 text-yellow-500 ml-1" />
          </label>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Creating Product...' : 'Create Product'}
        </button>
      </div>
    </div>
  );
};

export default ProductForm;