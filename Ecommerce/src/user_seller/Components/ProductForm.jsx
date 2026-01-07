import React, { useState } from 'react';
import { Upload, X, Plus, DollarSign, Package, Tag, Star, AlertCircle, CheckCircle } from 'lucide-react';

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
    is_active: true,
    is_featured: false,
    tags: ''
  });

  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Verify user is seller or admin
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
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, mainImage: 'Image size must be less than 5MB' }));
        return;
      }

      setMainImage(file);
      setErrors(prev => ({ ...prev, mainImage: '' }));

      const reader = new FileReader();
      reader.onload = (e) => setMainImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + additionalImages.length > 4) {
      setErrors(prev => ({ ...prev, additionalImages: 'Maximum 4 additional images allowed' }));
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 5 * 1024 * 1024) return false;
      return true;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({ ...prev, additionalImages: 'Some files were invalid (only images under 5MB)' }));
    } else {
      setErrors(prev => ({ ...prev, additionalImages: '' }));
    }

    setAdditionalImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAdditionalImagePreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
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

    return newErrors;
  };

  const uploadImages = async () => {
    const allImages = [];
    if (mainImage) allImages.push(mainImage);
    allImages.push(...additionalImages);

    if (allImages.length === 0) return { mainImageUrl: null, additionalImageUrls: [] };

    const formData = new FormData();
    allImages.forEach(image => {
      formData.append('images', image);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/products/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const result = await response.json();
      return {
        mainImageUrl: result.imageUrls[0] || null,
        additionalImageUrls: result.imageUrls.slice(1) || []
      };
    } catch (error) {
      throw new Error('Failed to upload images');
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Upload images
      const { mainImageUrl, additionalImageUrls } = await uploadImages();

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
        images: additionalImageUrls.length > 0 ? additionalImageUrls : null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        tags: tagsArray.length > 0 ? tagsArray : null
      };

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
      console.log('Product created successfully:', createdProduct);

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
        is_active: true,
        is_featured: false,
        tags: ''
      });
      setMainImage(null);
      setMainImagePreview(null);
      setAdditionalImages([]);
      setAdditionalImagePreviews([]);

      if (onSuccess) {
        onSuccess(createdProduct);
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error('Product creation error:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
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
            Main Product Image *
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {mainImagePreview ? (
                <img src={mainImagePreview} alt="Main product" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
              Upload Main Image
              <input
                type="file"
                accept="image/*"
                onChange={handleMainImageChange}
                className="hidden"
              />
            </label>
          </div>
          {errors.mainImage && (
            <p className="text-red-500 text-sm mt-1">{errors.mainImage}</p>
          )}
        </div>

        {/* Additional Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Images (Max 4)
          </label>
          <div className="grid grid-cols-4 gap-4 mb-3">
            {additionalImagePreviews.map((preview, index) => (
              <div key={index} className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden">
                <img src={preview} alt={`Additional ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeAdditionalImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {additionalImages.length < 4 && (
              <label className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 transition">
                <Plus className="w-6 h-6 text-gray-500" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {errors.additionalImages && (
            <p className="text-red-500 text-sm">{errors.additionalImages}</p>
          )}
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
              Price * ($)
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
              placeholder="e.g., Electronics, Clothing"
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

        {/* Discount */}
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
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
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