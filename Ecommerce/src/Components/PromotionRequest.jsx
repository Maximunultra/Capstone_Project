import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const PromotionManagementPage = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, expired

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const userRole = currentUser.role;

  useEffect(() => {
    fetchPromotions();
  }, [filter]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      // If seller, only show their promotions
      if (userRole === 'seller') {
        params.append('user_id', userId);
      }

      const response = await fetch(`${API_BASE_URL}/promotions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch promotions');
      
      const data = await response.json();
      setPromotions(data.promotions || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (promotionId) => {
    if (!window.confirm('Approve this promotion request?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: userId })
      });

      if (!response.ok) throw new Error('Failed to approve promotion');

      alert('Promotion approved successfully!');
      fetchPromotions();
    } catch (error) {
      alert('Error approving promotion: ' + error.message);
    }
  };

  const handleReject = async (promotionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          admin_id: userId,
          rejection_reason: reason 
        })
      });

      if (!response.ok) throw new Error('Failed to reject promotion');

      alert('Promotion rejected successfully!');
      fetchPromotions();
    } catch (error) {
      alert('Error rejecting promotion: ' + error.message);
    }
  };

  const handleDeactivate = async (promotionId) => {
    if (!window.confirm('Deactivate this promotion?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ admin_id: userId })
      });

      if (!response.ok) throw new Error('Failed to deactivate promotion');

      alert('Promotion deactivated successfully!');
      fetchPromotions();
    } catch (error) {
      alert('Error deactivating promotion: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Promotion Management</h1>
            <p className="text-gray-600">Manage product promotion requests and campaigns</p>
          </div>
          
          {userRole === 'seller' && (
            <button
              onClick={() => navigate('/seller/promotions/create')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              New Promotion Request
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white-100 p-4 mb-3">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading promotions...</p>
          </div>
        )}

        {/* Promotions List */}
        {!loading && (
          <>
            {promotions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg">No promotions found</p>
                {userRole === 'seller' && (
                  <button
                    onClick={() => navigate('/seller/promotions/create')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Promotion Request
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {promotions.map((promotion) => (
                  <div key={promotion.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          {/* Promotion Header */}
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{promotion.promotion_title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(promotion.status)}`}>
                              {promotion.status}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              {promotion.promotion_type}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-3">{promotion.promotion_description}</p>

                          {/* Product Info */}
                          {promotion.products && (
                            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                              {promotion.products.product_image && (
                                <img
                                  src={promotion.products.product_image}
                                  alt={promotion.products.product_name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{promotion.products.product_name}</p>
                                <p className="text-sm text-gray-600">{promotion.products.category}</p>
                                <p className="text-sm font-bold text-blue-600">${promotion.products.price}</p>
                              </div>
                            </div>
                          )}

                          {/* Seller Info */}
                          {promotion.users && (
                            <p className="text-sm text-gray-600 mb-3">
                              <span className="font-semibold">Seller:</span> {promotion.users.full_name}
                            </p>
                          )}

                          {/* Promotion Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            {promotion.discount_percentage > 0 && (
                              <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600 mb-1">Discount</p>
                                <p className="text-lg font-bold text-red-600">{promotion.discount_percentage}% OFF</p>
                              </div>
                            )}
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">Commission +</p>
                              <p className="text-lg font-bold text-green-600">{promotion.commission_increase}%</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">Start Date</p>
                              <p className="text-sm font-semibold text-blue-900">{formatDate(promotion.start_date)}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">End Date</p>
                              <p className="text-sm font-semibold text-purple-900">{formatDate(promotion.end_date)}</p>
                            </div>
                          </div>

                          {/* Target Audience */}
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Target:</span> {promotion.target_audience}
                          </p>

                          {/* Rejection Reason */}
                          {promotion.status === 'rejected' && promotion.rejection_reason && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-800">{promotion.rejection_reason}</p>
                            </div>
                          )}
                        </div>

                        {/* Banner Image */}
                        {promotion.banner_image && (
                          <div className="ml-4">
                            <img
                              src={promotion.banner_image}
                              alt="Promotion banner"
                              className="w-48 h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {userRole === 'admin' && (
                        <div className="flex gap-2 pt-4 border-t">
                          {promotion.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(promotion.id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-2 px-4 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(promotion.id)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-4 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Reject
                              </button>
                            </>
                          )}
                          {promotion.status === 'approved' && (
                            <button
                              onClick={() => handleDeactivate(promotion.id)}
                              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition shadow-md hover:shadow-lg"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PromotionManagementPage;