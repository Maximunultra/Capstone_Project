import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const AdminProductDetail = ({ userId, userRole }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  useEffect(() => {
    if (currentUserRole !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }
    fetchProductDetails();
  }, [id, currentUserId, currentUserRole, navigate]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!response.ok) throw new Error('Failed to fetch product details');
      const data = await response.json();
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this product?')) return;

    setProcessingAction(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve product');
      }

      alert('Product approved successfully!');
      fetchProductDetails();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessingAction(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          admin_id: currentUserId,
          rejection_reason: rejectionReason 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject product');
      }

      alert('Product rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchProductDetails();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    const labels = {
      pending: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected'
    };

    return (
      <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border-2 ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#d4cdc3] border-t-[#8b7355] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#8b7d6b] mt-4 text-sm sm:text-base">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center p-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 sm:p-8 max-w-md w-full">
          <p className="text-red-700 text-center text-sm sm:text-base">{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/admin/products')}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition text-sm sm:text-base"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      {/* Header */}
      <div className="bg-white border-b border-[#d4cdc3] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/admin/products')}
                className="text-[#8b7355] hover:text-[#6b5845] transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-serif text-[#4a4238]">Product Review</h1>
            </div>
            {getStatusBadge(product.approval_status)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Product Images */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main Image */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
              {product.product_image ? (
                <img
                  src={product.product_image}
                  alt={product.product_name}
                  className="w-full h-64 sm:h-80 lg:h-[500px] object-cover"
                />
              ) : (
                <div className="w-full h-64 sm:h-80 lg:h-[500px] bg-gray-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 sm:h-28 sm:w-28 lg:h-32 lg:w-32 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Additional Images */}
            {product.images && product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {product.images.map((image, index) => (
                  <div key={index} className="bg-white rounded-lg overflow-hidden shadow">
                    <img
                      src={image}
                      alt={`${product.product_name} ${index + 1}`}
                      className="w-full h-16 sm:h-20 lg:h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-4 sm:space-y-6">
            {/* Product Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#4a4238] mb-3 sm:mb-4">{product.product_name}</h2>

              {/* Price */}
              <div className="mb-4 sm:mb-6">
                {product.discount_percentage > 0 ? (
                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">
                      ₱{(product.price - (product.price * product.discount_percentage / 100)).toFixed(2)}
                    </span>
                    <span className="text-lg sm:text-xl lg:text-2xl text-gray-400 line-through">
                      ₱{product.price}
                    </span>
                    <span className="bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                      -{product.discount_percentage}%
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4a4238]">₱{product.price}</span>
                )}
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {product.category && (
                  <div>
                    <p className="text-xs sm:text-sm text-[#8b7d6b] mb-1">Category</p>
                    <p className="text-sm sm:text-base font-semibold text-[#4a4238]">{product.category}</p>
                  </div>
                )}
                {product.brand && (
                  <div>
                    <p className="text-xs sm:text-sm text-[#8b7d6b] mb-1">Brand</p>
                    <p className="text-sm sm:text-base font-semibold text-[#4a4238]">{product.brand}</p>
                  </div>
                )}
              </div>

              {/* Stock & Shipping */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs sm:text-sm text-[#8b7d6b] mb-1">Stock Quantity</p>
                  <p className="text-base sm:text-lg font-semibold text-[#4a4238]">{product.stock_quantity} units</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[#8b7d6b] mb-1">Shipping Fee</p>
                  <p className="text-base sm:text-lg font-semibold text-[#4a4238]">₱{product.shipping_fee || '50.00'}</p>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-2">Description</h3>
                  <p className="text-sm sm:text-base text-[#6b5d52] leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span key={index} className="bg-[#e8e3db] text-[#6b5d52] px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Flags */}
              <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  <span className="font-medium">
                    {product.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
                {product.is_featured && (
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-yellow-100 text-yellow-700 text-xs sm:text-sm">
                    <span className="font-medium">★ Featured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Info Card */}
            {product.users && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-3 sm:mb-4">Seller Information</h3>
                <div className="flex items-center gap-3 sm:gap-4">
                  {product.users.profile_image ? (
                    <img
                      src={product.users.profile_image}
                      alt={product.users.full_name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#e8e3db] flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-2xl text-[#8b7355]">
                        {product.users.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[#4a4238] text-sm sm:text-base truncate">{product.users.full_name}</p>
                    <p className="text-xs sm:text-sm text-[#8b7d6b] truncate">{product.users.email}</p>
                    {product.users.phone && (
                      <p className="text-xs sm:text-sm text-[#8b7d6b]">{product.users.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Approval Info */}
            {(product.approval_status === 'approved' || product.approval_status === 'rejected') && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-3 sm:mb-4">
                  {product.approval_status === 'approved' ? 'Approval' : 'Rejection'} Details
                </h3>
                {product.approver && (
                  <p className="text-[#6b5d52] mb-2 text-xs sm:text-sm">
                    <span className="font-medium">Reviewed by:</span> {product.approver.full_name}
                  </p>
                )}
                {product.approved_at && (
                  <p className="text-[#6b5d52] mb-2 text-xs sm:text-sm">
                    <span className="font-medium">Date:</span> {new Date(product.approved_at).toLocaleString()}
                  </p>
                )}
                {product.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-xs sm:text-sm text-red-700">{product.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {product.approval_status === 'pending' && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-3 sm:mb-4">Admin Actions</h3>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={handleApprove}
                    disabled={processingAction}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {processingAction ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve Product
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processingAction}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Product
                  </button>
                </div>
              </div>
            )}

            {/* Product Metadata */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-[#4a4238] mb-3 sm:mb-4">Product Metadata</h3>
              <div className="space-y-2 text-xs sm:text-sm text-[#6b5d52]">
                <p><span className="font-medium">Product ID:</span> {product.id}</p>
                <p><span className="font-medium">Created:</span> {new Date(product.created_at).toLocaleString()}</p>
                <p><span className="font-medium">Last Updated:</span> {new Date(product.updated_at).toLocaleString()}</p>
                {product.rating_average > 0 && (
                  <>
                    <p><span className="font-medium">Average Rating:</span> {product.rating_average} ★</p>
                    <p><span className="font-medium">Total Ratings:</span> {product.rating_count}</p>
                  </>
                )}
                {product.sold_count > 0 && (
                  <p><span className="font-medium">Total Sold:</span> {product.sold_count} units</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Reject Product</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={processingAction}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Please provide a reason for rejecting this product. This will be visible to the seller.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 resize-none text-sm sm:text-base"
                rows="5"
                disabled={processingAction}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={processingAction}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingAction || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {processingAction ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Rejecting...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductDetail;