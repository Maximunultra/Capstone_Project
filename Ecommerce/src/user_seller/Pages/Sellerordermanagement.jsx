import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, Edit2, X, Save, DollarSign, ShoppingBag } from 'lucide-react';

// API Base URL - Update this to your actual API endpoint
// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const SellerOrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id;
  const currentUserRole = currentUser.role;

  // Fetch orders based on user role
  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching orders for user:', currentUserId, 'Role:', currentUserRole);

      // Build query params
      let url = `${API_BASE_URL}/orders`;
      const params = new URLSearchParams();
      
      // If seller, add seller_id filter
      if (currentUserRole === 'seller' && currentUserId) {
        params.append('seller_id', currentUserId);
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('📡 API Request URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📦 Orders received:', data);

      if (data.success) {
        setOrders(data.orders);
        console.log(`✅ Loaded ${data.orders.length} orders`);
      } else {
        console.error('❌ Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !selectedStatus) return;
    
    // Prevent changing status if already delivered
    if (selectedOrder.order_status === 'delivered') {
      alert('Cannot change status of delivered orders');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: selectedStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, order_status: selectedStatus } : o));
        setSelectedOrder({ ...selectedOrder, order_status: selectedStatus });
        alert('Order status updated successfully!');
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!selectedOrder || !selectedPaymentStatus) return;
    
    // Only allow payment status update for COD orders
    if (selectedOrder.payment_method !== 'cod') {
      alert('Payment status can only be modified for COD orders');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/orders/${selectedOrder.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: selectedPaymentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, payment_status: selectedPaymentStatus } : o));
        setSelectedOrder({ ...selectedOrder, payment_status: selectedPaymentStatus });
        alert('Payment status updated successfully!');
      } else {
        alert(data.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTracking = async () => {
    if (!selectedOrder || !trackingNumber.trim()) return;
    
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/orders/${selectedOrder.id}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_number: trackingNumber })
      });
      
      const data = await response.json();
      if (data.success) {
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, tracking_number: trackingNumber } : o));
        setSelectedOrder({ ...selectedOrder, tracking_number: trackingNumber });
        setEditingTracking(false);
        alert('Tracking number updated successfully!');
      }
    } catch (error) {
      console.error('Error updating tracking:', error);
      alert('Error updating tracking number');
    } finally {
      setSaving(false);
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.order_status);
    setSelectedPaymentStatus(order.payment_status);
    setTrackingNumber(order.tracking_number || '');
    setEditingTracking(false);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setEditingTracking(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
      processing: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Package, label: 'Processing' },
      shipped: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck, label: 'Shipped' },
      delivered: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: X, label: 'Cancelled' }
    };
    return configs[status] || configs.pending;
  };

  const getPaymentStatusConfig = (status) => {
    const configs = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending' },
      paid: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Paid' },
      failed: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Failed' }
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  // Calculate total items in order
  const getTotalItems = (orderItems) => {
    if (!orderItems || orderItems.length === 0) return 0;
    return orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-2">
              {currentUserRole === 'seller' ? 'My Orders' : 'Order Management'}
            </h1>
            <p className="text-gray-600">
              {currentUserRole === 'seller' 
                ? 'Manage orders containing your products' 
                : 'Manage all customer orders'}
            </p>
          </div>

          {/* Role Badge */}
          {currentUserRole === 'admin' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-6 py-3">
              <p className="text-sm text-blue-800 font-medium">
                👁️ Admin View - All Orders
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-3 flex-wrap">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-amber-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600 text-lg font-medium mb-2">No orders found</p>
              <p className="text-gray-500 text-sm">
                {currentUserRole === 'seller' 
                  ? 'Orders containing your products will appear here' 
                  : 'No orders match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tracking #</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const statusConfig = getStatusConfig(order.order_status);
                    const paymentConfig = getPaymentStatusConfig(order.payment_status);
                    const StatusIcon = statusConfig.icon;
                    const totalItems = getTotalItems(order.order_items);
                    
                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-gray-100 hover:bg-amber-50/50 transition-colors duration-200 cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                        onClick={() => openOrderDetails(order)}
                      >
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{order.shipping_full_name}</div>
                          <div className="text-sm text-gray-500">{order.shipping_email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(order.order_date)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                            <ShoppingBag size={14} />
                            {totalItems} {totalItems === 1 ? 'item' : 'items'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${statusConfig.color}`}
                          >
                            <StatusIcon size={14} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${paymentConfig.color}`}
                          >
                            {paymentConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {order.tracking_number || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderDetails(order);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 ${
                              currentUserRole === 'admin'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                            }`}
                          >
                            {currentUserRole === 'admin' ? 'View Details' : 'Update'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeOrderDetails}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b-2 border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0 z-10">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent mb-1">
                  Order Details
                </h2>
                <p className="text-gray-600 font-medium">
                  {selectedOrder.order_number}
                </p>
              </div>
              <button
                onClick={closeOrderDetails}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Order Items Section */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShoppingBag size={16} />
                  Order Items ({getTotalItems(selectedOrder.order_items)} items)
                </h3>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl overflow-hidden">
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="divide-y divide-amber-200">
                      {selectedOrder.order_items.map((item, index) => (
                        <div key={index} className="p-4 flex gap-4 hover:bg-white/50 transition-colors">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-20 h-20 object-cover rounded-lg border-2 border-amber-200"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-amber-200">
                                <Package size={32} className="text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 mb-1 truncate">
                              {item.product_name}
                            </h4>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                              {item.product_category && (
                                <span className="inline-flex items-center px-2 py-1 bg-white rounded-md border border-amber-200">
                                  <span className="font-medium">Category:</span>
                                  <span className="ml-1">{item.product_category}</span>
                                </span>
                              )}
                              {item.product_brand && (
                                <span className="inline-flex items-center px-2 py-1 bg-white rounded-md border border-amber-200">
                                  <span className="font-medium">Brand:</span>
                                  <span className="ml-1">{item.product_brand}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600">
                                <span className="font-medium">Quantity:</span> {item.quantity}
                              </span>
                              <span className="text-gray-600">
                                <span className="font-medium">Unit Price:</span> {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                          </div>

                          {/* Item Subtotal */}
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      No items found in this order
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Customer Information
                </h3>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl space-y-2">
                  <div className="text-gray-900">
                    <strong>Name:</strong> {selectedOrder.shipping_full_name}
                  </div>
                  <div className="text-gray-900">
                    <strong>Email:</strong> {selectedOrder.shipping_email}
                  </div>
                  <div className="text-gray-900">
                    <strong>Phone:</strong> {selectedOrder.shipping_phone}
                  </div>
                  <div className="text-gray-900">
                    <strong>Address:</strong> {selectedOrder.shipping_address}, {selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Order Status
                </h3>
                {currentUserRole === 'admin' ? (
                  // ADMIN: View only
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl flex items-center justify-between border-2 border-blue-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Current Status</p>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getStatusConfig(selectedOrder.order_status).color}`}>
                        {React.createElement(getStatusConfig(selectedOrder.order_status).icon, { size: 14 })}
                        {getStatusConfig(selectedOrder.order_status).label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">👁️ View Only</p>
                      <p className="text-xs text-gray-600 font-medium">Admins cannot modify orders</p>
                    </div>
                  </div>
                ) : selectedOrder.order_status === 'delivered' ? (
                  // SELLER: Delivered orders cannot be changed
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-5 rounded-xl flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      Delivered (Cannot be changed)
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CheckCircle size={14} />
                      Delivered
                    </span>
                  </div>
                ) : (
                  // SELLER: Can update status
                  <>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    {selectedStatus !== selectedOrder.order_status && (
                      <button
                        onClick={handleUpdateStatus}
                        disabled={saving}
                        className="mt-3 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Status'}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Payment Status - Only for COD */}
              {selectedOrder.payment_method === 'cod' && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Payment Status (COD)
                  </h3>
                  {currentUserRole === 'admin' ? (
                    // ADMIN: View only
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl flex items-center justify-between border-2 border-blue-200">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Current Payment Status</p>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getPaymentStatusConfig(selectedOrder.payment_status).color}`}>
                          {getPaymentStatusConfig(selectedOrder.payment_status).label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">👁️ View Only</p>
                        <p className="text-xs text-gray-600 font-medium">Admins cannot modify payment</p>
                      </div>
                    </div>
                  ) : (
                    // SELLER: Can update
                    <>
                      <select
                        value={selectedPaymentStatus}
                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                      {selectedPaymentStatus !== selectedOrder.payment_status && (
                        <button
                          onClick={handleUpdatePaymentStatus}
                          disabled={saving}
                          className="mt-3 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                          <DollarSign size={18} />
                          {saving ? 'Saving...' : 'Save Payment Status'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tracking Number */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Tracking Number
                </h3>
                {currentUserRole === 'admin' ? (
                  // ADMIN: View only
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl flex items-center justify-between border-2 border-blue-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.tracking_number || 'No tracking number'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">👁️ View Only</p>
                      <p className="text-xs text-gray-600 font-medium">Admins cannot modify tracking</p>
                    </div>
                  </div>
                ) : editingTracking ? (
                  // SELLER: Editing mode
                  <div>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-300"
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={handleUpdateTracking}
                        disabled={saving || !trackingNumber.trim()}
                        className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingTracking(false);
                          setTrackingNumber(selectedOrder.tracking_number || '');
                        }}
                        className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 py-3 rounded-xl font-bold transition-all duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // SELLER: Display mode with edit button
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {selectedOrder.tracking_number || 'No tracking number'}
                    </span>
                    <button
                      onClick={() => setEditingTracking(true)}
                      className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Order Summary
                </h3>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.shipping_fee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Payment Method</span>
                    <span className="font-bold uppercase">{selectedOrder.payment_method}</span>
                  </div>
                  <div className="border-t-2 border-amber-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrderManagement;