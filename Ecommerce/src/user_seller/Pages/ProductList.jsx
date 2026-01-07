import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import ProductForm from '../Components/ProductForm';

const API_BASE_URL = 'http://localhost:5000/api';

const ProductListPage = ({ userId, userRole }) => {
  const navigate = useNavigate(); // Add this hook
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    isActive: 'all',
    isFeatured: 'all',
    approvalStatus: 'all'
  });
  const [pagination, setPagination] = useState({
    limit: 12,
    offset: 0,
    total: 0
  });

  // Get userId from localStorage if not passed as prop
  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  // ... (rest of your existing functions: fetchProducts, handleSearch, etc.)

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.isActive !== 'all') params.append('is_active', filters.isActive);
      if (filters.isFeatured !== 'all') params.append('is_featured', filters.isFeatured);
      if (filters.approvalStatus !== 'all') params.append('approval_status', filters.approvalStatus);

      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showAddForm) {
      fetchProducts();
    }
  }, [pagination.offset, pagination.limit, showAddForm]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchProducts();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: currentUserId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      alert('Product deleted successfully!');
      fetchProducts();
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleApprove = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: currentUserId })
      });

      if (!response.ok) {
        throw new Error('Failed to approve product');
      }

      alert('Product approved successfully!');
      fetchProducts();
    } catch (err) {
      alert('Error approving product: ' + err.message);
    }
  };

  const handleReject = async (productId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          admin_id: currentUserId,
          rejection_reason: reason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject product');
      }

      alert('Product rejected successfully!');
      fetchProducts();
    } catch (err) {
      alert('Error rejecting product: ' + err.message);
    }
  };

  const nextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const prevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
    }
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount || discount === 0) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  // If showing add form, display that instead
  if (showAddForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowAddForm(false)}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <span className="mr-2">←</span> Back to Products
          </button>
          <ProductForm 
            userId={currentUserId} 
            userRole={currentUserRole}
            onSuccess={() => {
              setShowAddForm(false);
              fetchProducts();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
            <p className="text-gray-600">Manage product listings</p>
          </div>
          
          {(currentUserRole === 'seller' || currentUserRole === 'admin') && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Add New Product
            </button>
          )}
        </div>

        {/* Filters Section - keeping your existing filter code */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search products..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                placeholder="Category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                name="minPrice"
                value={filters.minPrice}
                onChange={handleFilterChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="isActive"
                value={filters.isActive}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {currentUserRole === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval</label>
                <select
                  name="approvalStatus"
                  value={filters.approvalStatus}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  search: '',
                  category: '',
                  minPrice: '',
                  maxPrice: '',
                  isActive: 'all',
                  isFeatured: 'all',
                  approvalStatus: 'all'
                });
                setPagination(prev => ({ ...prev, offset: 0 }));
                setTimeout(fetchProducts, 100);
              }}
              className="ml-2 bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg">No products found</p>
                <p className="text-gray-500 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    {/* Product Image with badges and hover actions */}
                    <div className="relative h-40 bg-gray-200 overflow-hidden group">
                      {product.product_image ? (
                        <img
                          src={product.product_image}
                          alt={product.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}

                      {/* Quick Action Icons */}
                      {(currentUserRole === 'admin' || (product.users && product.users.id === currentUserId)) && (
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to edit page based on user role
                              if (currentUserRole === 'admin') {
                                navigate(`/admin/products/${product.id}/edit`);
                              } else if (currentUserRole === 'seller') {
                                navigate(`/seller/products/${product.id}/edit`);
                              } else {
                                navigate(`/buyer/products/${product.id}/edit`);
                              }
                            }}
                            className="bg-white/95 backdrop-blur-sm hover:bg-blue-500 text-blue-600 hover:text-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                            title="Edit Product"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            className="bg-white/95 backdrop-blur-sm hover:bg-red-500 text-red-600 hover:text-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
                            title="Delete Product"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.is_featured && (
                          <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            ⭐ Featured
                          </span>
                        )}
                        {product.discount_percentage > 0 && (
                          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            -{product.discount_percentage}%
                          </span>
                        )}
                        {!product.is_active && (
                          <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            Inactive
                          </span>
                        )}
                        {product.approval_status === 'pending' && (
                          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            ⏳ Pending
                          </span>
                        )}
                        {product.approval_status === 'rejected' && (
                          <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            ❌ Rejected
                          </span>
                        )}
                        {product.approval_status === 'approved' && currentUserRole === 'admin' && (
                          <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                            ✓ Approved
                          </span>
                        )}
                      </div>

                      {product.stock_quantity === 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="bg-red-600 text-white px-2 py-1 rounded-lg font-semibold text-xs">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 mb-1 text-sm truncate" title={product.product_name}>
                        {product.product_name}
                      </h3>
                      
                      {product.category && (
                        <p className="text-[10px] text-gray-500 mb-1">{product.category}</p>
                      )}

                      <div className="mb-2">
                        {product.discount_percentage > 0 ? (
                          <div>
                            <span className="text-base font-bold text-green-600">
                              ${calculateDiscountedPrice(product.price, product.discount_percentage)}
                            </span>
                            <span className="text-xs text-gray-500 line-through ml-1">
                              ${product.price}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-bold text-gray-900">
                            ${product.price}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-600 mb-2">
                        <span>Stock: {product.stock_quantity}</span>
                        {product.sold_count > 0 && (
                          <span className="ml-1">• {product.sold_count} sold</span>
                        )}
                      </div>

                      {product.rating_average > 0 && (
                        <div className="flex items-center mb-2">
                          <span className="text-yellow-500 text-xs mr-1">★</span>
                          <span className="text-xs font-medium">{product.rating_average}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({product.rating_count})
                          </span>
                        </div>
                      )}

                      {product.users && (
                        <div className="text-[10px] text-gray-500 mb-2 border-t pt-1 hidden sm:block">
                          Seller: {product.users.full_name}
                        </div>
                      )}

                      {currentUserRole === 'admin' && product.approval_status === 'pending' && (
                        <div className="mb-2">
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(product.id);
                              }}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-2 rounded-lg transition-all duration-200 text-xs font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(product.id);
                              }}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-2 rounded-lg transition-all duration-200 text-xs font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* FIXED: View Details Button - Navigate within layout */}
                      <button
                        onClick={() => {
                          // Navigate based on user role to keep sidebar
                          if (currentUserRole === 'admin') {
                            navigate(`/admin/products/${product.id}`);
                          } else if (currentUserRole === 'seller') {
                            navigate(`/seller/products/${product.id}`);
                          } else {
                            navigate(`/buyer/products/${product.id}`);
                          }
                        }}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 px-3 rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        View Details
                      </button>

                      {product.approval_status === 'rejected' && product.rejection_reason && (
                        <div className="mt-2 p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                          <strong>Reason:</strong> {product.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {products.length > 0 && (
              <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} products
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={prevPage}
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
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