import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const OrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleCancelOrder = async () => {
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
              {order.order_status === 'pending' && (
                <button
                  onClick={handleCancelOrder}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel Order
                </button>
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
    </div>
  );
};

export default OrderDetailsPage;