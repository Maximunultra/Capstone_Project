import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, X, Send } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

const OrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order details');
      const data = await response.json();
      console.log('Order data:', data); // DEBUG
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'processing': 'bg-blue-100 text-blue-800 border-blue-200',
      'shipped': 'bg-purple-100 text-purple-800 border-purple-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'pending': 'text-yellow-600',
      'paid': 'text-green-600',
      'failed': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if order can be cancelled (only pending and processing orders)
  const canCancelOrder = () => {
    if (!order) return false;
    const cancellableStatuses = ['pending', 'processing'];
    return cancellableStatuses.includes(order.order_status.toLowerCase());
  };

  // Check if message seller button should be shown (all statuses except cancelled)
  const canMessageSeller = () => {
    if (!order) return false;
    const activeStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    return activeStatuses.includes(order.order_status.toLowerCase());
  };

  const handleCancelOrder = async () => {
    if (!canCancelOrder()) {
      alert('This order cannot be cancelled at this stage.');
      return;
    }

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
      fetchOrderDetails();
    } catch (err) {
      alert('Error cancelling order: ' + err.message);
    }
  };

  const handleSendMessage = async () => {
    console.log('=== SEND MESSAGE DEBUG ===');
    console.log('Message text:', messageText);
    console.log('Order:', order);
    console.log('Order items:', order?.order_items);
    
    if (!messageText.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!order || !order.order_items || order.order_items.length === 0) {
      alert('Unable to send message - no seller information available');
      console.error('No order items found');
      return;
    }

    // Get the first order item
    const firstItem = order.order_items[0];
    console.log('First order item:', firstItem);
    console.log('Product:', firstItem.product);
    console.log('Product user_id:', firstItem.product?.user_id);

    // Get seller ID from the first order item's product (using user_id since that's the seller)
    const sellerId = firstItem.product?.user_id;
    
    if (!sellerId) {
      console.error('Seller ID not found. Product structure:', firstItem.product);
      alert('Seller information not available. Please try again or contact support.');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Current user:', currentUser);
    
    const buyerId = currentUser.id;

    if (!buyerId) {
      alert('User not logged in. Please log in and try again.');
      return;
    }

    const messageData = {
      sender_id: buyerId,  // ✅ FIXED: Keep as UUID string, don't parseInt
      receiver_id: sellerId,  // ✅ FIXED: Keep as UUID string, don't parseInt
      message: messageText.trim(),
      order_id: parseInt(orderId),
      product_id: parseInt(firstItem.product_id || firstItem.product?.id)
    };

    console.log('Sending message data:', messageData);

    setSendingMessage(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      alert('Message sent successfully!');
      setMessageText('');
      setShowMessageModal(false);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error sending message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Order Not Found</h2>
            <p className="text-red-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/buyer/orders')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/buyer/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Details</h1>
              <p className="text-gray-600">Order #{order.order_number}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(order.order_status)}`}>
                {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
              </span>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Cancel Order Button - Only show if order can be cancelled */}
                {canCancelOrder() && (
                  <button
                    onClick={handleCancelOrder}
                    className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition"
                  >
                    Cancel Order
                  </button>
                )}
                
                {/* Message Seller Button - Show for all orders except cancelled */}
                {canMessageSeller() && (
                  <button
                    onClick={() => {
                      console.log('Message Seller button clicked');
                      console.log('Order items available:', order.order_items);
                      setShowMessageModal(true);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded hover:bg-blue-50 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message Seller
                  </button>
                )}
              </div>

              {/* Status Message for Delivered/Cancelled Orders */}
              {order.order_status === 'delivered' && (
                <p className="text-xs text-green-600 italic">✓ Order delivered successfully</p>
              )}
              {order.order_status === 'cancelled' && (
                <p className="text-xs text-red-500 italic">This order has been cancelled</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500 mb-1">Order Date</p>
              <p className="font-medium text-gray-900">{formatDate(order.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Method</p>
              <p className="font-medium text-gray-900">{order.payment_method.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
              <p className={`font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Progress</h2>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
                
                {/* Steps */}
                <div className="space-y-8 relative">
                  {[
                    { status: 'pending', label: 'Order Placed', icon: '📋' },
                    { status: 'processing', label: 'Processing', icon: '⚙️' },
                    { status: 'shipped', label: 'Shipped', icon: '🚚' },
                    { status: 'delivered', label: 'Delivered', icon: '✅' }
                  ].map((step, index) => {
                    const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
                    const currentIndex = statusOrder.indexOf(order.order_status);
                    const stepIndex = statusOrder.indexOf(step.status);
                    const isCompleted = stepIndex <= currentIndex;
                    const isCurrent = stepIndex === currentIndex;

                    return (
                      <div key={step.status} className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl relative z-10 ${
                          isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200'
                        }`}>
                          {isCompleted ? '✓' : step.icon}
                        </div>
                        <div className="flex-1 pt-2">
                          <h3 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                            {step.label}
                          </h3>
                          {isCurrent && (
                            <p className="text-sm text-blue-600 mt-1">Current Status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tracking Information */}
            {order.tracking_number && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">Tracking Number</h3>
                    <p className="font-mono text-lg font-bold text-blue-600">{order.tracking_number}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Use this tracking number to monitor your shipment
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Items</h2>
              <div className="space-y-4">
                {order.order_items?.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {item.product?.product_image ? (
                        <img
                          src={item.product.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.product_name}</h3>
                      {item.product_brand && (
                        <p className="text-sm text-gray-500 mb-1">Brand: {item.product_brand}</p>
                      )}
                      {item.product_category && (
                        <p className="text-sm text-gray-500 mb-2">{item.product_category}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Unit Price: ₱{parseFloat(item.unit_price).toFixed(2)}</p>
                          <p className="font-semibold text-gray-900">Subtotal: ₱{parseFloat(item.subtotal).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">₱{parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span className="font-medium">₱{parseFloat(order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Fee</span>
                  <span className="font-medium">
                    {order.shipping_fee === 0 || order.shipping_fee === '0' ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₱${parseFloat(order.shipping_fee).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">₱{parseFloat(order.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Full Name</p>
                  <p className="font-medium text-gray-900">{order.shipping_full_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{order.shipping_email}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Phone</p>
                  <p className="font-medium text-gray-900">{order.shipping_phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Address</p>
                  <p className="font-medium text-gray-900">{order.shipping_address}</p>
                  <p className="font-medium text-gray-900">
                    {order.shipping_city}, {order.shipping_province}
                    {order.shipping_postal_code && ` ${order.shipping_postal_code}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you have any questions about your order, please contact our customer support.
              </p>
              <button className="w-full bg-white border-2 border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition font-medium">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Seller Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Message Seller</h2>
                  <p className="text-sm text-blue-100">Regarding Order #{order.order_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Product Info */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Product:</p>
                  <div className="flex items-center gap-3">
                    {order.order_items[0].product?.product_image && (
                      <img
                        src={order.order_items[0].product.product_image}
                        alt={order.order_items[0].product_name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{order.order_items[0].product_name}</p>
                      {order.order_items.length > 1 && (
                        <p className="text-sm text-gray-500">+{order.order_items.length - 1} more item(s)</p>
                      )}
                    </div>
                  </div>
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
                  <strong>Note:</strong> This message will be sent directly to the seller. They will be notified and can respond to your inquiry.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowMessageModal(false)}
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

export default OrderDetailsPage;