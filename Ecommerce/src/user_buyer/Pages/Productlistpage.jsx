import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';
// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const Productlistpage = ({ userId, userRole }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [pagination, setPagination] = useState({
    limit: 12,
    offset: 0,
    total: 0
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [modalAction, setModalAction] = useState('');

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'Accessories', label: 'Accessories' },
    { id: 'Home Decor', label: 'Home Decor' },
    { id: 'Kitchen', label: 'Kitchen' },
    { id: 'Clothing', label: 'Clothing' },
  ];

  const priceRanges = [
    { id: 'all', label: 'All Prices', min: 0, max: Infinity },
    { id: 'under1000', label: 'Under ₱1,000', min: 0, max: 1000 },
    { id: '1000-1500', label: '₱1,000 - ₱1,500', min: 1000, max: 1500 },
    { id: '1500-2000', label: '₱1,500 - ₱2,000', min: 1500, max: 2000 },
    { id: 'over2000', label: 'Over ₱2,000', min: 2000, max: Infinity },
  ];

  const sortOptions = [
    { id: 'featured', label: 'Featured' },
    { id: 'newest', label: 'Newest First' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'popular', label: 'Most Popular' },
  ];
// UPDATED: Productlistpage.jsx - Add buyer_view parameter to API call

// Find the fetchProducts function and update it like this:

const fetchProducts = async () => {
  setLoading(true);
  setError(null);
  try {
    const params = new URLSearchParams();
    params.append('limit', pagination.limit);
    params.append('offset', pagination.offset);
    
    // ✅ NEW: Add buyer_view flag to only show approved products
    params.append('buyer_view', 'true');
    
    if (searchQuery) params.append('search', searchQuery);
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    
    const priceRange = priceRanges.find(r => r.id === selectedPriceRange);
    if (priceRange && priceRange.id !== 'all') {
      if (priceRange.min > 0) params.append('min_price', priceRange.min);
      if (priceRange.max !== Infinity) params.append('max_price', priceRange.max);
    }

    const response = await fetch(`${API_BASE_URL}/products?${params}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    
    let sortedProducts = data.products || [];
    
    // Apply sorting
    switch(sortBy) {
      case 'newest':
        sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'price-low':
        sortedProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sortedProducts.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        sortedProducts.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
        break;
      case 'featured':
      default:
        sortedProducts.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        break;
    }
    
    setProducts(sortedProducts);
    setPagination(prev => ({ ...prev, total: data.total || 0 }));
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchProducts();
  }, [pagination.offset, pagination.limit, selectedCategory, selectedPriceRange, sortBy, searchQuery]);

  const openModal = (product, action, e) => {
    e.stopPropagation();
    if (!currentUserId) {
      alert(action === 'cart' ? 'Please login to add items to cart' : 'Please login to make a purchase');
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setModalAction(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setQuantity(1);
    setModalAction('');
  };

  const increaseQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: currentUserId, 
          product_id: selectedProduct.id, 
          quantity: quantity 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process request');
      }

      closeModal();

      if (modalAction === 'cart') {
        alert('Product added to cart successfully!');
      } else if (modalAction === 'buynow') {
        navigate('/buyer/checkout');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/buyer/products/${productId}`);
  };

  const nextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount || discount === 0) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  const getProductPrice = (product) => {
    if (product.discount_percentage > 0) {
      return calculateDiscountedPrice(product.price, product.discount_percentage);
    }
    return product.price;
  };

  const getTotalPrice = () => {
    if (!selectedProduct) return '0.00';
    const price = parseFloat(getProductPrice(selectedProduct));
    return (price * quantity).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      {/* Header Section - Responsive */}
      <div className="bg-[#f5f2ed] py-8 sm:py-10 md:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Main Title - Responsive typography */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#4a4238] mb-3 sm:mb-4">
            Our Products
          </h1>
          
          {/* Subtitle - Responsive text */}
          <p className="text-sm sm:text-base text-[#8b7d6b] max-w-3xl mx-auto px-4">
            Discover our collection of handcrafted treasures, each piece telling a unique story of tradition, skill, and cultural heritage.
          </p>
        </div>
      </div>

      {/* Search and Sort Bar - Responsive */}
      <div className="bg-[#f5f2ed] pb-4 sm:pb-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search Input - Full width on mobile */}
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] placeholder-[#a69c8e] text-sm sm:text-base"
            />

            {/* Sort Dropdown - Full width on mobile */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base"
            >
              {sortOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Filter Toggle Button */}
      <div className="bg-[#f5f2ed] pb-4 px-4 sm:px-6 md:hidden">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#e8e3db] hover:bg-[#d8d3cb] text-[#4a4238] rounded-lg transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Filters
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Section - Responsive with mobile toggle */}
      <div className={`bg-[#f5f2ed] pb-6 sm:pb-8 px-4 sm:px-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#e8e3db] rounded-lg p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Categories Dropdown - Responsive */}
              <div>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <label className="text-xs sm:text-sm font-semibold text-[#4a4238] uppercase tracking-wider">
                    Categories
                  </label>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Range Dropdown - Responsive */}
              <div>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <label className="text-xs sm:text-sm font-semibold text-[#4a4238] uppercase tracking-wider">
                    Price Range
                  </label>
                </div>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base"
                >
                  {priceRanges.map(range => (
                    <option key={range.id} value={range.id}>{range.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid - Fully Responsive */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#d4cdc3] border-t-[#8b7355] rounded-full animate-spin"></div>
            <p className="text-[#8b7d6b] mt-4 text-sm sm:text-base">Loading products...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 sm:p-8 text-center">
            <p className="text-red-700 text-sm sm:text-base">Error: {error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg p-12 sm:p-16 text-center">
            <p className="text-[#8b7d6b] text-base sm:text-lg">No products found</p>
            <p className="text-[#a69c8e] mt-2 text-sm sm:text-base">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Responsive Grid: 2 cols mobile, 3 cols tablet, 4 cols laptop, 5 cols desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
                >
                  {/* Product Image - Responsive height */}
                  <div className="relative h-36 sm:h-40 md:h-48 bg-gray-100 overflow-hidden">
                    {product.product_image ? (
                      <img
                        src={product.product_image}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}

                    {/* Badges - Responsive sizing */}
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-col gap-1">
                      {product.is_featured && (
                        <span className="bg-yellow-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium">
                          Featured
                        </span>
                      )}
                      {product.discount_percentage > 0 && (
                        <span className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium">
                          -{product.discount_percentage}%
                        </span>
                      )}
                    </div>

                    {product.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold text-[10px] sm:text-sm">
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info - Responsive padding and text */}
                  <div className="p-2.5 sm:p-3 md:p-4">
                    <h3 className="font-semibold text-[#a48a6d] mb-1.5 sm:mb-2 text-xs sm:text-sm line-clamp-2 min-h-[32px] sm:min-h-[40px]" title={product.product_name}>
                      {product.product_name}
                    </h3>

                    {product.category && (
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2 truncate">{product.category}</p>
                    )}

                    <div className="mb-2 sm:mb-3">
                      {product.discount_percentage > 0 ? (
                        <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                          <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                            ₱{calculateDiscountedPrice(product.price, product.discount_percentage)}
                          </span>
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-400 line-through">
                            ₱{product.price}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                          ₱{product.price}
                        </span>
                      )}
                    </div>

                    {product.rating_average > 0 && (
                      <div className="flex items-center mb-2 sm:mb-3">
                        <span className="text-yellow-500 text-xs sm:text-sm mr-0.5 sm:mr-1">★</span>
                        <span className="text-xs sm:text-sm font-medium">{product.rating_average}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500 ml-0.5 sm:ml-1">
                          ({product.rating_count})
                        </span>
                      </div>
                    )}

                    {/* Buyer Action Buttons - Responsive */}
                    {currentUserRole === 'buyer' && product.stock_quantity > 0 && (
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={(e) => openModal(product, 'cart', e)}
                          className="flex-shrink-0 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-600 p-1.5 sm:p-2 md:p-2.5 rounded-lg transition-all duration-200 touch-manipulation"
                          title="Add to Cart"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => openModal(product, 'buynow', e)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 sm:py-2 md:py-2.5 px-2 sm:px-3 md:px-4 rounded-lg transition-all duration-200 text-[10px] sm:text-xs md:text-sm font-medium touch-manipulation"
                        >
                          Buy Now
                        </button>
                      </div>
                    )}

                    {currentUserRole === 'buyer' && product.stock_quantity === 0 && (
                      <div className="text-center py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-500">
                        Currently unavailable
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination - Fully Responsive */}
            {products.length > 0 && (
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} products
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={prevPage}
                    disabled={pagination.offset === 0}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium touch-manipulation"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium touch-manipulation"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quantity Selection Modal - Fully Responsive */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header - Responsive */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {modalAction === 'cart' ? 'Add to Cart' : 'Buy Now'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Responsive */}
            <div className="p-4 sm:p-6">
              {/* Product Preview - Responsive */}
              <div className="flex gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.product_image ? (
                    <img src={selectedProduct.product_image} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{selectedProduct.product_name}</h3>
                  {selectedProduct.category && <p className="text-xs sm:text-sm text-gray-500 mb-2">{selectedProduct.category}</p>}
                  <div>
                    {selectedProduct.discount_percentage > 0 ? (
                      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold text-green-600">
                          ₱{calculateDiscountedPrice(selectedProduct.price, selectedProduct.discount_percentage)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-400 line-through">₱{selectedProduct.price}</span>
                      </div>
                    ) : (
                      <span className="text-lg sm:text-xl font-bold text-gray-900">₱{selectedProduct.price}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Selector - Responsive */}
              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quantity</label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <button 
                    onClick={decreaseQuantity} 
                    disabled={quantity <= 1} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">{quantity}</span>
                    <p className="text-xs text-gray-500 mt-1">{selectedProduct.stock_quantity} available</p>
                  </div>
                  <button 
                    onClick={increaseQuantity} 
                    disabled={quantity >= selectedProduct.stock_quantity} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Price - Responsive */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Total Price:</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">₱{getTotalPrice()}</span>
                </div>
              </div>

              {/* Action Buttons - Responsive stacking */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button 
                  onClick={closeModal} 
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm} 
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation"
                >
                  {modalAction === 'cart' ? 'Add to Cart' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productlistpage;