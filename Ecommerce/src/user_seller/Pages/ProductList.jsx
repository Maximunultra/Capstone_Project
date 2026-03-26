import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../Components/ProductForm';
import { BookOpen } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

const ProductListPage = ({ userId, userRole }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRulesTooltip, setShowRulesTooltip] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filters, setFilters] = useState({
    category: '',
    priceRange: 'all',
    minPrice: '',
    maxPrice: '',
    approvalStatus: 'all',
    sortBy: 'newest'
  });

  const [pagination, setPagination] = useState({ limit: 12, offset: 0, total: 0 });

  const currentUserId   = userId   || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination(prev => ({ ...prev, offset: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);

      if (currentUserRole === 'seller' && currentUserId) params.append('seller_id', currentUserId);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (filters.category)       params.append('category', filters.category);
      if (filters.minPrice)       params.append('min_price', filters.minPrice);
      if (filters.maxPrice)       params.append('max_price', filters.maxPrice);
      if (filters.approvalStatus !== 'all') params.append('approval_status', filters.approvalStatus);

      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      let fetched = [...(data.products || [])];

      switch (filters.sortBy) {
        case 'newest':     fetched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
        case 'oldest':     fetched.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
        case 'price-low':  fetched.sort((a, b) => a.price - b.price); break;
        case 'price-high': fetched.sort((a, b) => b.price - a.price); break;
        case 'name-az':    fetched.sort((a, b) => a.product_name.localeCompare(b.product_name)); break;
        case 'stock-high': fetched.sort((a, b) => b.stock_quantity - a.stock_quantity); break;
        default: break;
      }

      setProducts(fetched);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.offset, pagination.limit, debouncedSearch, filters, currentUserId, currentUserRole]);

  useEffect(() => {
    if (!showAddForm) fetchProducts();
  }, [fetchProducts, showAddForm]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePriceRangeChange = (value) => {
    let minPrice = '', maxPrice = '';
    if      (value === 'under1000')  { maxPrice = '1000'; }
    else if (value === '1000-1500')  { minPrice = '1000'; maxPrice = '1500'; }
    else if (value === '1500-2000')  { minPrice = '1500'; maxPrice = '2000'; }
    else if (value === 'over2000')   { minPrice = '2000'; }
    setFilters(prev => ({ ...prev, priceRange: value, minPrice, maxPrice }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setFilters({ category:'', priceRange:'all', minPrice:'', maxPrice:'', approvalStatus:'all', sortBy:'newest' });
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleApprove = async (productId) => {
    if (currentUserRole !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUserId })
      });
      if (!res.ok) throw new Error('Failed to approve product');
      fetchProducts();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleReject = async (productId) => {
    if (currentUserRole !== 'admin') return;
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUserId, rejection_reason: reason })
      });
      if (!res.ok) throw new Error('Failed to reject product');
      fetchProducts();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDelete = async (productId) => {
    if (currentUserRole === 'seller') {
      const product = products.find(p => p.id === productId);
      if (product?.users?.id !== currentUserId) { alert('You can only delete your own products!'); return; }
    }
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId })
      });
      if (!res.ok) throw new Error('Failed to delete product');
      fetchProducts();
    } catch (err) { alert('Error deleting product: ' + err.message); }
  };

  const nextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total)
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };
  const prevPage = () => {
    if (pagination.offset > 0)
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };

  const isDiscountActive = (product) => product.discount_active === true;
  const getEffectivePrice = (product) =>
    parseFloat(product.effective_price ?? product.price).toLocaleString('en-PH', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });

  const canModifyProduct = (product) => {
    if (currentUserRole === 'admin') return false;
    if (currentUserRole === 'seller') return product.users?.id === currentUserId;
    return false;
  };

  const hasActiveFilters = filters.category || filters.priceRange !== 'all' || filters.approvalStatus !== 'all' || debouncedSearch;

  if (showAddForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setShowAddForm(false)} className="mb-4 flex items-center text-amber-700 hover:text-amber-900 transition-colors font-medium">
            <span className="mr-2">←</span> Back to Products
          </button>
          <ProductForm
            userId={currentUserId}
            userRole={currentUserRole}
            onSuccess={() => { setShowAddForm(false); fetchProducts(); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
      <div className="max-w-[1920px] mx-auto w-full">

        {/* Header */}
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-1">
              {currentUserRole === 'seller' ? 'My Products' : 'Product Management'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {currentUserRole === 'seller'
                ? 'Manage your product listings'
                : 'Review and approve product listings'}
            </p>
          </div>

          {currentUserRole === 'seller' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <button
                  onMouseEnter={() => setShowRulesTooltip(true)}
                  onMouseLeave={() => setShowRulesTooltip(false)}
                  onClick={() => navigate('/seller/category-rules')}
                  className="w-11 h-11 flex items-center justify-center bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 hover:border-amber-600 text-amber-700 hover:text-amber-900 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
                  title="View Category Rules"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                {showRulesTooltip && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[#3d2e1e] text-white text-xs rounded-xl shadow-2xl p-3.5 pointer-events-none">
                    <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#3d2e1e] rotate-45 rounded-sm" />
                    <p className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                      📋 Must Read Before Adding a Product
                    </p>
                    <ul className="space-y-1 text-amber-100 leading-relaxed">
                      <li>• Each category has a <span className="text-white font-semibold">price range</span> — your product price must be within it.</li>
                      <li>• Your <span className="text-white font-semibold">brand/material</span> must match the allowed materials for your category.</li>
                      <li>• Products that fail rules are <span className="text-red-300 font-semibold">auto-rejected</span>.</li>
                    </ul>
                    <p className="mt-2 text-amber-400 font-medium">👆 Click to view all rules</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex-1 sm:flex-none bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span className="text-xl">+</span> Add New Product
              </button>
            </div>
          )}

          {currentUserRole === 'admin' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 w-full sm:w-auto">
              <p className="text-xs sm:text-sm text-blue-800 font-medium text-center sm:text-left whitespace-nowrap">
                👁️ View Only Mode — Approve / Reject Products
              </p>
            </div>
          )}
        </div>

        {/* Search + Sort */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 pr-10 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm sm:text-base text-gray-900 placeholder-gray-400 transition-all duration-300"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searchInput !== debouncedSearch ? (
                  <svg className="w-4 h-4 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                )}
              </div>
            </div>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full sm:w-auto sm:min-w-[180px] lg:min-w-[200px] px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm sm:text-base text-gray-900 cursor-pointer transition-all duration-300"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-az">Name: A-Z</option>
              <option value="stock-high">Stock: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${currentUserRole === 'admin' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 sm:gap-6`}>

              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Category</label>
                  </div>
                  {filters.category && (
                    <button onClick={() => handleFilterChange('category', '')} className="text-xs text-amber-600 hover:text-amber-800 underline">Clear</button>
                  )}
                </div>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm sm:text-base text-gray-900 cursor-pointer transition-all duration-300"
                >
                  <option value="">All Categories</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Home Decor">Home Decor</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Clothing">Clothing</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Price Range</label>
                  </div>
                  {filters.priceRange !== 'all' && (
                    <button onClick={() => handlePriceRangeChange('all')} className="text-xs text-amber-600 hover:text-amber-800 underline">Clear</button>
                  )}
                </div>
                <select
                  value={filters.priceRange}
                  onChange={(e) => handlePriceRangeChange(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm sm:text-base text-gray-900 cursor-pointer transition-all duration-300"
                >
                  <option value="all">All Prices</option>
                  <option value="under1000">Under ₱1,000</option>
                  <option value="1000-1500">₱1,000 – ₱1,500</option>
                  <option value="1500-2000">₱1,500 – ₱2,000</option>
                  <option value="over2000">Over ₱2,000</option>
                </select>
              </div>

              {currentUserRole === 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Approval</label>
                    </div>
                    {filters.approvalStatus !== 'all' && (
                      <button onClick={() => handleFilterChange('approvalStatus', 'all')} className="text-xs text-amber-600 hover:text-amber-800 underline">Clear</button>
                    )}
                  </div>
                  <select
                    value={filters.approvalStatus}
                    onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm sm:text-base text-gray-900 cursor-pointer transition-all duration-300"
                  >
                    <option value="all">All Approvals</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="approved">✓ Approved</option>
                    <option value="rejected">✗ Rejected</option>
                  </select>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Active:</span>
                {debouncedSearch && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    Search: "{debouncedSearch}"
                    <button onClick={() => setSearchInput('')} className="hover:text-red-500 font-bold">×</button>
                  </span>
                )}
                {filters.category && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    {filters.category}
                    <button onClick={() => handleFilterChange('category', '')} className="hover:text-red-500 font-bold">×</button>
                  </span>
                )}
                {filters.priceRange !== 'all' && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    {{under1000:'Under ₱1,000','1000-1500':'₱1,000–₱1,500','1500-2000':'₱1,500–₱2,000',over2000:'Over ₱2,000'}[filters.priceRange]}
                    <button onClick={() => handlePriceRangeChange('all')} className="hover:text-red-500 font-bold">×</button>
                  </span>
                )}
                {filters.approvalStatus !== 'all' && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    {filters.approvalStatus.charAt(0).toUpperCase() + filters.approvalStatus.slice(1)}
                    <button onClick={() => handleFilterChange('approvalStatus', 'all')} className="hover:text-red-500 font-bold">×</button>
                  </span>
                )}
                <button onClick={clearFilters} className="ml-auto flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-xl transition-all duration-200 font-medium text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {products.length > 0 && (
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                Showing {pagination.total} result{pagination.total !== 1 ? 's' : ''}
                {debouncedSearch ? ` for "${debouncedSearch}"` : ''}
                {filters.category ? ` in ${filters.category}` : ''}
                {filters.approvalStatus !== 'all' ? ` · ${filters.approvalStatus}` : ''}
              </p>
            )}

            {products.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 text-lg font-medium">
                  {currentUserRole === 'seller' ? 'No products found. Start by adding your first product!' : 'No products found'}
                </p>
                <p className="text-gray-500 mt-2">Try adjusting your filters or search query</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition">
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                {products.map((product) => (
                  // ✅ FIX: Added flex flex-col so the card stretches and button pins to bottom
                  <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col">

                    {/* Image — fixed height, never shrinks */}
                    <div className="relative h-40 bg-gray-200 overflow-hidden group flex-shrink-0">
                      {product.product_image ? (
                        <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}

                      {canModifyProduct(product) && (
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/seller/products/${product.id}/edit`); }}
                            className="bg-white/95 backdrop-blur-sm hover:bg-blue-500 text-blue-600 hover:text-white p-2 rounded-lg shadow-lg transition-all duration-200" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                            className="bg-white/95 backdrop-blur-sm hover:bg-red-500 text-red-600 hover:text-white p-2 rounded-lg shadow-lg transition-all duration-200" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.is_featured && <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded">⭐ Featured</span>}
                        {isDiscountActive(product) && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">-{product.discount_percentage}%</span>}
                        {!product.is_active && <span className="bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded">Inactive</span>}
                        {product.approval_status === 'pending'  && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded">⏳ Pending</span>}
                        {product.approval_status === 'rejected' && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">❌ Rejected</span>}
                        {product.approval_status === 'approved' && <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">✓ Approved</span>}
                      </div>

                      {product.stock_quantity === 0 && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <span className="bg-red-600 text-white px-2 py-1 rounded-lg font-semibold text-xs">OUT OF STOCK</span>
                        </div>
                      )}
                    </div>

                    {/* ✅ FIX: Content area uses flex-1 to fill remaining space, pushing button to bottom */}
                    <div className="p-3 flex flex-col flex-1">

                      {/* ✅ FIX: This wrapper grows to fill space, keeping button at bottom */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm truncate">{product.product_name}</h3>
                        {product.category && <p className="text-[10px] text-gray-500 mb-1">{product.category}</p>}

                        <div className="mb-2">
                          {isDiscountActive(product) ? (
                            <div>
                              <span className="text-base font-bold text-green-600">₱{getEffectivePrice(product)}</span>
                              <span className="text-xs text-gray-500 line-through ml-1">
                                ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-bold text-gray-900">
                              ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 mb-2">
                          <span>Stock: {product.stock_quantity}</span>
                          {product.sold_count > 0 && <span className="ml-1">• {product.sold_count} sold</span>}
                        </div>

                        {/* Rating + Seller grouped together, no random border lines */}
                        <div className="flex items-center justify-between mb-2 min-h-[18px]">
                          {product.rating_average > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500 text-xs">★</span>
                              <span className="text-xs font-medium text-gray-800">{product.rating_average}</span>
                              <span className="text-xs text-gray-400">({product.rating_count})</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 italic">No ratings yet</span>
                          )}
                        </div>

                        {product.users && currentUserRole === 'admin' && (
                          <div className="flex items-center gap-1 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-[10px] text-gray-500 truncate">{product.users.full_name}</span>
                          </div>
                        )}

                        {currentUserRole === 'admin' && product.approval_status === 'pending' && (
                          <div className="mb-2 flex gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(product.id); }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-200">
                              ✓ Approve
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleReject(product.id); }}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-200">
                              ✗ Reject
                            </button>
                          </div>
                        )}

                        {product.approval_status === 'rejected' && product.rejection_reason && (
                          <div className="mb-2 p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                            <strong>Reason:</strong> {product.rejection_reason}
                          </div>
                        )}
                      </div>

                      {/* ✅ FIX: Button is now always at the very bottom of every card */}
                      <button
                        onClick={() => {
                          if (currentUserRole === 'admin') navigate(`/admin/products/${product.id}`);
                          else if (currentUserRole === 'seller') navigate(`/seller/products/${product.id}`);
                          else navigate(`/buyer/products/${product.id}`);
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 px-3 rounded-xl transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
                      >
                        View Details
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {pagination.total > pagination.limit && (
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 gap-4 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} products
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={prevPage} disabled={pagination.offset === 0}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base">
                    Previous
                  </button>
                  <button onClick={nextPage} disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;