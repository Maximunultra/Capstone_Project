import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// const API_BASE_URL = 'http://localhost:5000/api';
// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const PromotionManagementPage = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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
      if (filter !== 'all') params.append('status', filter);
      if (userRole === 'seller') params.append('user_id', userId);

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

  const handleDeactivate = async (promotionId) => {
    if (!window.confirm('Deactivate this promotion?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/promotions/${promotionId}/deactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired:  'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Check if promotion is currently live
  const isLive = (promotion) => {
    const now = new Date();
    return promotion.status === 'approved'
      && new Date(promotion.start_date) <= now
      && new Date(promotion.end_date) >= now;
  };

  // Check if promotion is scheduled (approved but start_date not yet reached)
  const isScheduled = (promotion) => {
    const now = new Date();
    return promotion.status === 'approved' && new Date(promotion.start_date) > now;
  };

  return (
    <div className="min-h-screen bg-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Promotion Management</h1>
            <p className="text-gray-600">Manage product promotion banners</p>
          </div>
          {userRole === 'seller' && (
            <button onClick={() => navigate('/seller/promotions/create')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
              <span className="text-xl">+</span>
              New Promotion
            </button>
          )}
        </div>

        {/* Filters — removed 'pending' since nothing is ever pending now */}
        <div className="bg-white-100 p-4 mb-3">
          <div className="flex flex-wrap gap-2">
            {['all', 'approved', 'rejected', 'expired'].map((status) => (
              <button key={status} onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status ? 'bg-orange-600 text-white' : 'bg-orange-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading promotions...</p>
          </div>
        )}

        {!loading && (
          <>
            {promotions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-600 text-lg">No promotions found</p>
                {userRole === 'seller' && (
                  <button onClick={() => navigate('/seller/promotions/create')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    Create Promotion
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

                          {/* Header row */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900">{promotion.promotion_title}</h3>

                            {/* Status badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(promotion.status)}`}>
                              {promotion.status}
                            </span>

                            {/* Live / Scheduled badge — more useful than just "approved" */}
                            {isLive(promotion) && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white animate-pulse">
                                🟢 Live now
                              </span>
                            )}
                            {isScheduled(promotion) && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                🕐 Scheduled
                              </span>
                            )}

                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              {promotion.promotion_type}
                            </span>
                          </div>

                          <p className="text-gray-600 mb-3">{promotion.promotion_description}</p>

                          {/* Product Info */}
                          {promotion.products && (
                            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                              {promotion.products.product_image && (
                                <img src={promotion.products.product_image} alt={promotion.products.product_name} className="w-16 h-16 object-cover rounded-lg" />
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{promotion.products.product_name}</p>
                                <p className="text-sm text-gray-600">{promotion.products.category}</p>
                                <p className="text-sm font-bold text-blue-600">₱{promotion.products.price}</p>
                              </div>
                            </div>
                          )}

                          {/* Seller Info (admin view) */}
                          {promotion.users && userRole === 'admin' && (
                            <p className="text-sm text-gray-600 mb-3">
                              <span className="font-semibold">Seller:</span> {promotion.users.full_name}
                            </p>
                          )}

                          {/* Date grid */}
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">Start Date</p>
                              <p className="text-sm font-semibold text-blue-900">{formatDate(promotion.start_date)}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">End Date</p>
                              <p className="text-sm font-semibold text-purple-900">{formatDate(promotion.end_date)}</p>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Target:</span> {promotion.target_audience}
                          </p>
                        </div>

                        {/* Banner Image */}
                        {promotion.banner_image && (
                          <div className="ml-4 flex-shrink-0">
                            <img src={promotion.banner_image} alt="Promotion banner" className="w-48 h-32 object-cover rounded-lg border-2 border-gray-200" />
                          </div>
                        )}
                      </div>

                      {/* Admin action — only Deactivate, no approve/reject needed */}
                      {userRole === 'admin' && (promotion.status === 'approved') && (
                        <div className="flex gap-2 pt-4 border-t">
                          <button onClick={() => handleDeactivate(promotion.id)}
                            className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg">
                            Deactivate
                          </button>
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