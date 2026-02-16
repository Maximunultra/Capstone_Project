import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin, MessageCircle, Calendar, Hash, User, X, Send, Star } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const OrdersPage = ({ userId }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Message Modal States
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState('');

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [existingReviews, setExistingReviews] = useState({});

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [currentUserId, selectedStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const response = await fetch(`${API_BASE_URL}/orders/user/${currentUserId}${statusParam}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
      
      if (data.orders && data.orders.length > 0 && !selectedOrder) {
        setSelectedOrder(data.orders[0]);
      }

      // Fetch existing reviews for all products in orders
      await fetchExistingReviews(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingReviews = async (ordersList) => {
    try {
      const reviewsMap = {};
      
      for (const order of ordersList) {
        if (order.order_items) {
          for (const item of order.order_items) {
            const productId = item.product_id || item.product?.id;
            if (productId) {
              const response = await fetch(`${API_BASE_URL}/feedback/product/${productId}`);
              if (response.ok) {
                const reviews = await response.json();
                const userReview = reviews.find(r => r.user_id === currentUserId);
                if (userReview) {
                  reviewsMap[productId] = userReview;
                }
              }
            }
          }
        }
      }
      
      setExistingReviews(reviewsMap);
    } catch (err) {
      console.error('Error fetching existing reviews:', err);
    }
  };

  const handleOpenReviewModal = (product, orderItem) => {
    setSelectedProduct({ ...product, orderItem });
    const productId = product.id || orderItem.product_id;
    const existingReview = existingReviews[productId];
    
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewComment(existingReview.comment);
    } else {
      setRating(0);
      setReviewComment('');
    }
    
    setReviewError('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    setReviewError('');
    
    if (rating === 0) {
      setReviewError('Please select a rating');
      return;
    }
    
    if (!reviewComment.trim()) {
      setReviewError('Please write a comment');
      return;
    }
    
    if (reviewComment.trim().length < 10) {
      setReviewError('Comment must be at least 10 characters long');
      return;
    }

    setSubmittingReview(true);
    
    try {
      const productId = selectedProduct.id || selectedProduct.orderItem.product_id;
      const existingReview = existingReviews[productId];
      
      let response;
      
      if (existingReview) {
        // Update existing review
        response = await fetch(`${API_BASE_URL}/feedback/${existingReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            comment: reviewComment.trim(),
            user_id: currentUserId
          })
        });
      } else {
        // Create new review
        response = await fetch(`${API_BASE_URL}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: parseInt(productId),
            user_id: currentUserId,
            rating,
            comment: reviewComment.trim()
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      alert(existingReview ? '✅ Review updated successfully!' : '✅ Review submitted successfully!');
      
      setShowReviewModal(false);
      setSelectedProduct(null);
      setRating(0);
      setReviewComment('');
      
      // Refresh to get updated reviews
      await fetchOrders();
      
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSendMessage = async () => {
    setMessageError('');
    
    if (!messageText.trim()) {
      setMessageError('Please enter a message');
      return;
    }

    if (!selectedOrder || !selectedOrder.order_items || selectedOrder.order_items.length === 0) {
      setMessageError('No order items found');
      return;
    }

    const firstItem = selectedOrder.order_items[0];
    const sellerId = firstItem.product?.user_id;
    
    if (!sellerId) {
      setMessageError('Seller information not available');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const buyerId = currentUser.id;

    if (!buyerId) {
      setMessageError('You must be logged in to send messages');
      return;
    }

    setSendingMessage(true);
    try {
      const messageData = {
        sender_id: buyerId,
        receiver_id: sellerId,
        message: messageText.trim(),
        order_id: parseInt(selectedOrder.id),
        product_id: parseInt(firstItem.product_id || firstItem.product?.id)
      };

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessageText('');
      setShowMessageModal(false);
      alert('✅ Message sent successfully!');
      
    } catch (err) {
      setMessageError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const canMessageSeller = (order) => {
    if (!order) return false;
    const activeStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    return activeStatuses.includes(order.order_status.toLowerCase());
  };

  const canReviewProduct = (order) => {
    if (!order) return false;
    return order.order_status.toLowerCase() === 'delivered';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-amber-100 text-amber-800 border-amber-200',
      'processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'canceled': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'canceled':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getOrderProgress = (status) => {
    const progressMap = {
      'pending': 25,
      'processing': 50,
      'shipped': 75,
      'delivered': 100,
      'canceled': 0
    };
    return progressMap[status] || 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      alert('Order canceled successfully');
      fetchOrders();
    } catch (err) {
      alert('Error canceling order: ' + err.message);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    shipped: orders.filter(o => o.order_status === 'shipped').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    canceled: orders.filter(o => o.order_status === 'canceled').length
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'pending', label: 'Pending' },
              { key: 'processing', label: 'Processing' },
              { key: 'shipped', label: 'Shipped' },
              { key: 'delivered', label: 'Delivered' },
              { key: 'canceled', label: 'Canceled' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-6 py-4 font-semibold transition whitespace-nowrap relative ${
                  selectedStatus === key
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
                {statusCounts[key] > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${
                    selectedStatus === key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {statusCounts[key]}
                  </span>
                )}
                {selectedStatus === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {/* Main Content */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-600 mb-8">
              {selectedStatus === 'all'
                ? "You haven't placed any orders yet"
                : `You don't have any ${selectedStatus} orders`}
            </p>
            <button
              onClick={() => navigate('/buyer/products')}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg hover:shadow-xl"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders List - Left Panel */}
            <div className="lg:col-span-1 space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Order History</h2>
                  <p className="text-sm text-gray-600">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                </div>
                
                <div className="divide-y divide-gray-100 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-4 cursor-pointer transition hover:bg-gray-50 ${
                        selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <p className="font-mono text-sm font-semibold text-gray-900">{order.order_number}</p>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-600">{formatDate(order.order_date)}</p>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-base font-medium leading-none">₱</span>
                          <p className="text-sm text-gray-600">Total</p>
                        </div>
                        <p className="font-bold text-gray-900">
                          ₱{parseFloat(order.total_amount).toFixed(2)}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.order_status)}`}>
                        {getStatusIcon(order.order_status)}
                        {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Details - Right Panel */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Details</h2>
                        <p className="text-gray-600 font-mono text-sm">{selectedOrder.order_number}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(selectedOrder.order_status)}`}>
                        {getStatusIcon(selectedOrder.order_status)}
                        {selectedOrder.order_status.charAt(0).toUpperCase() + selectedOrder.order_status.slice(1)}
                      </span>
                    </div>

                    {/* Progress Tracker */}
                    <div className="relative mt-6">
                      <div className="flex justify-between mb-3">
                        {[
                          { status: 'pending', icon: Clock, label: 'Pending' },
                          { status: 'processing', icon: Package, label: 'Processing' },
                          { status: 'shipped', icon: Truck, label: 'Shipped' },
                          { status: 'delivered', icon: CheckCircle, label: 'Delivered' }
                        ].map(({ status, icon: Icon, label }) => {
                          const isActive = ['pending', 'processing', 'shipped', 'delivered'].indexOf(selectedOrder.order_status) >= 
                                          ['pending', 'processing', 'shipped', 'delivered'].indexOf(status);
                          const isCurrentStep = selectedOrder.order_status === status;
                          
                          return (
                            <div key={status} className="flex flex-col items-center flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isActive 
                                  ? isCurrentStep && status === 'delivered'
                                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                    : 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10" style={{ marginLeft: '20px', marginRight: '20px', width: 'calc(100% - 40px)' }}>
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: `${getOrderProgress(selectedOrder.order_status)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-6 space-y-6">
                    {/* Shipment Dates & Tracking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Order Placed</p>
                            <p className="font-semibold text-gray-900">{formatDateTime(selectedOrder.order_date)}</p>
                          </div>
                        </div>
                      </div>

                      {selectedOrder.tracking_number && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">Tracking Number</p>
                              <p className="font-bold text-gray-900 font-mono">{selectedOrder.tracking_number}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Delivery Address
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-5">
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-900 text-lg">{selectedOrder.shipping_full_name}</p>
                          <p className="text-gray-600">{selectedOrder.shipping_phone}</p>
                          <p className="text-gray-600">{selectedOrder.shipping_email}</p>
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-gray-700 leading-relaxed">
                              {selectedOrder.shipping_address}<br />
                              {selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Ordered Items
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.order_items?.map((item, index) => {
                          const productId = item.product_id || item.product?.id;
                          const hasReview = existingReviews[productId];
                          
                          return (
                            <div key={index} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition">
                              <div className="flex gap-4">
                                <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                  {item.product?.product_image ? (
                                    <img 
                                      src={item.product.product_image} 
                                      alt={item.product_name} 
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <Package className="w-8 h-8" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{item.product_name}</h4>
                                  
                                  {item.product?.brand && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <User className="w-3.5 h-3.5 text-gray-400" />
                                      <p className="text-sm text-gray-600">Seller: <span className="font-medium">{item.product.brand}</span></p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-sm text-gray-600">Quantity: <span className="font-semibold text-gray-900">{item.quantity}</span></p>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">Unit Price</p>
                                      <p className="font-bold text-gray-900">₱{parseFloat(item.unit_price).toFixed(2)}</p>
                                    </div>
                                  </div>

                                  {/* Review Button for Delivered Orders */}
                                  {canReviewProduct(selectedOrder) && (
                                    <div className="mt-3">
                                      <button
                                        onClick={() => handleOpenReviewModal(item.product, item)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                          hasReview
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                        }`}
                                      >
                                        <Star className="w-4 h-4" />
                                        {hasReview ? 'Edit Review' : 'Write Review'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-blue-600 text-large">₱</span>
                        Order Summary
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-6">
                        <div className="space-y-3">
                          <div className="flex justify-between text-gray-700">
                            <span>Subtotal</span>
                            <span className="font-semibold">₱{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>Tax</span>
                            <span className="font-semibold">₱{parseFloat(selectedOrder.tax).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>Shipping Fee</span>
                            <span className="font-semibold">₱{parseFloat(selectedOrder.shipping_fee).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>Payment Method</span>
                            <span className="font-semibold uppercase">{selectedOrder.payment_method}</span>
                          </div>
                          <div className="border-t-2 border-gray-300 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xl font-bold text-gray-900">Total Amount</span>
                              <span className="text-3xl font-bold text-blue-600">₱{parseFloat(selectedOrder.total_amount).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      {canMessageSeller(selectedOrder) && (
                        <button 
                          onClick={() => setShowMessageModal(true)}
                          className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                          <MessageCircle className="w-5 h-5" />
                          Message Seller
                        </button>
                      )}
                      
                      {selectedOrder.order_status === 'pending' && (
                        <button 
                          onClick={() => handleCancelOrder(selectedOrder.id)}
                          className="flex-1 bg-red-50 text-red-600 py-4 px-6 rounded-xl hover:bg-red-100 transition font-semibold border-2 border-red-200"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Select an order to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Seller Modal */}
      {showMessageModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Message Seller</h2>
                  <p className="text-sm text-blue-100">Order #{selectedOrder.order_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setMessageError('');
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Product:</p>
                  <div className="flex items-center gap-3">
                    {selectedOrder.order_items[0].product?.product_image && (
                      <img
                        src={selectedOrder.order_items[0].product.product_image}
                        alt={selectedOrder.order_items[0].product_name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{selectedOrder.order_items[0].product_name}</p>
                      {selectedOrder.order_items.length > 1 && (
                        <p className="text-sm text-gray-500">+{selectedOrder.order_items.length - 1} more item(s)</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {messageError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{messageError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message to the seller here..."
                  className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none"
                  disabled={sendingMessage}
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-2">
                  {messageText.length} / 500 characters
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This message will be sent directly to the seller.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setMessageError('');
                }}
                disabled={sendingMessage}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    {existingReviews[selectedProduct.id || selectedProduct.orderItem.product_id] ? 'Edit Review' : 'Write Review'}
                  </h2>
                  <p className="text-sm text-amber-100">Share your experience</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedProduct(null);
                  setRating(0);
                  setReviewComment('');
                  setReviewError('');
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Product:</p>
                <div className="flex items-center gap-3">
                  {selectedProduct.product_image && (
                    <img
                      src={selectedProduct.product_image}
                      alt={selectedProduct.product_name || selectedProduct.orderItem.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedProduct.product_name || selectedProduct.orderItem.product_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {reviewError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{reviewError}</p>
                </div>
              )}

              {/* Star Rating */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Your Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-125"
                    >
                      <svg
                        className={`w-10 h-10 ${
                          star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {rating === 1 && '⭐ Poor'}
                    {rating === 2 && '⭐⭐ Fair'}
                    {rating === 3 && '⭐⭐⭐ Good'}
                    {rating === 4 && '⭐⭐⭐⭐ Very Good'}
                    {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
                  </p>
                )}
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product... (minimum 10 characters)"
                  className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition resize-none"
                  disabled={submittingReview}
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-2">
                  {reviewComment.length} / 500 characters
                </p>
              </div>

              {/* Info Box */}
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Your review will be visible to all users and will help others make informed decisions.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedProduct(null);
                  setRating(0);
                  setReviewComment('');
                  setReviewError('');
                }}
                disabled={submittingReview}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={rating === 0 || !reviewComment.trim() || submittingReview}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" />
                    {existingReviews[selectedProduct.id || selectedProduct.orderItem.product_id] ? 'Update Review' : 'Submit Review'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;