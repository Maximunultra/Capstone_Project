import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin, MessageCircle, Calendar, Hash, User, X, Send } from 'lucide-react';

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
      
      // Auto-select first order if none selected
      if (data.orders && data.orders.length > 0 && !selectedOrder) {
        setSelectedOrder(data.orders[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  // Check if message seller button should be shown
  const canMessageSeller = (order) => {
    if (!order) return false;
    const activeStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    return activeStatuses.includes(order.order_status.toLowerCase());
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-amber-100 text-amber-800 border-amber-200',
      'processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
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
      case 'cancelled':
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
      'cancelled': 0
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

      alert('Order cancelled successfully');
      fetchOrders();
    } catch (err) {
      alert('Error cancelling order: ' + err.message);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    shipped: orders.filter(o => o.order_status === 'shipped').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length
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
              { key: 'cancelled', label: 'Cancelled' }
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
                        {selectedOrder.order_items?.map((item, index) => (
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
                              </div>

                              {/* <div className="text-right">
                                <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                                <p className="text-xl font-bold text-gray-900">₱{parseFloat(item.subtotal).toFixed(2)}</p>
                              </div> */}
                            </div>
                          </div>
                        ))}
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
                      {/* Message Seller Button - Opens Modal */}
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
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="p-6">
              {/* Product Info */}
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

              {/* Error Message */}
              {messageError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{messageError}</p>
                </div>
              )}

              {/* Message Input */}
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

              {/* Info Box */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This message will be sent directly to the seller.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
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
    </div>
  );
};

export default OrdersPage;