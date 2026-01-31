import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, Edit2, X, Save } from 'lucide-react';

// API Base URL - Update this to your actual API endpoint
const API_BASE_URL = 'http://localhost:5000/api';

const SellerOrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch all orders (you'll need to modify your backend to add an endpoint for all orders)
  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // This endpoint would need to be created in your backend
      const response = await fetch(`${API_BASE_URL}/orders${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !selectedStatus) return;
    
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
      }
    } catch (error) {
      console.error('Error updating status:', error);
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
      }
    } catch (error) {
      console.error('Error updating tracking:', error);
    } finally {
      setSaving(false);
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.order_status);
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

  return (
    <div style={{ 
      fontFamily: '"Instrument Serif", Georgia, serif',
      padding: '2rem',
      minHeight: '100vh',
      background: '#f3f4f6'
    }}>

      {/* Header */}
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <div className="fade-in-up stagger-1">
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '400',
            letterSpacing: '-0.02em',
            color: '#1a1512',
            marginBottom: '0.25rem',
            fontStyle: 'italic'
          }}>
            Orders
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b635a',
            marginBottom: '2rem',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontWeight: '400'
          }}>
            Manage your customer orders
          </p>
        </div>

        {/* Filters */}
        <div className="fade-in-up stagger-2" style={{
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          {['all', 'pending', 'processing', 'shipped', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="btn"
              style={{
                padding: '0.625rem 1.5rem',
                border: statusFilter === status ? '2px solid #1a1512' : '2px solid #e5e7eb',
                background: statusFilter === status ? '#1a1512' : 'white',
                color: statusFilter === status ? 'white' : '#6b635a',
                borderRadius: '6px',
                fontSize: '0.9375rem',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="fade-in-up stagger-3" style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {loading ? (
            <div style={{
              padding: '4rem',
              textAlign: 'center',
              color: '#6b635a',
              fontFamily: 'Inter, -apple-system, sans-serif'
            }}>
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{
              padding: '4rem',
              textAlign: 'center',
              color: '#6b635a',
              fontFamily: 'Inter, -apple-system, sans-serif'
            }}>
              No orders found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Order ID</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Customer</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Date</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Amount</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Status</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Tracking #</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontFamily: 'Inter', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b635a' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const statusConfig = getStatusConfig(order.order_status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr
                      key={order.id}
                      className="table-row"
                      onClick={() => openOrderDetails(order)}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: index % 2 === 0 ? 'white' : '#f9fafb'
                      }}
                    >
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'Inter', fontSize: '0.9375rem', fontWeight: '500', color: '#1a1512' }}>
                        {order.order_number}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'Inter', fontSize: '0.9375rem', color: '#1a1512' }}>
                        <div style={{ fontWeight: '500' }}>{order.shipping_full_name}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#6b635a', marginTop: '0.125rem' }}>{order.shipping_email}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'Inter', fontSize: '0.9375rem', color: '#6b635a' }}>
                        {formatDate(order.order_date)}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'Inter', fontSize: '0.9375rem', fontWeight: '600', color: '#1a1512' }}>
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span 
                          className={`status-badge ${statusConfig.color}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            border: '1.5px solid',
                            fontFamily: 'Inter'
                          }}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'Inter', fontSize: '0.875rem', color: '#6b635a' }}>
                        {order.tracking_number || '—'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetails(order);
                          }}
                          className="btn"
                          style={{
                            padding: '0.5rem 1.25rem',
                            background: '#1a1512',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="overlay"
          onClick={closeOrderDetails}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '2rem 2.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '400',
                  fontStyle: 'italic',
                  color: '#1a1512',
                  marginBottom: '0.25rem'
                }}>
                  Order Details
                </h2>
                <p style={{
                  fontFamily: 'Inter',
                  fontSize: '0.9375rem',
                  color: '#6b635a'
                }}>
                  {selectedOrder.order_number}
                </p>
              </div>
              <button
                onClick={closeOrderDetails}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={24} color="#6b635a" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2.5rem' }}>
              {/* Customer Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontFamily: 'Inter',
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600',
                  color: '#6b635a',
                  marginBottom: '1rem'
                }}>
                  Customer Information
                </h3>
                <div style={{
                  background: '#f9fafb',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  fontFamily: 'Inter',
                  fontSize: '0.9375rem'
                }}>
                  <div style={{ marginBottom: '0.75rem', color: '#1a1512' }}>
                    <strong>Name:</strong> {selectedOrder.shipping_full_name}
                  </div>
                  <div style={{ marginBottom: '0.75rem', color: '#1a1512' }}>
                    <strong>Email:</strong> {selectedOrder.shipping_email}
                  </div>
                  <div style={{ marginBottom: '0.75rem', color: '#1a1512' }}>
                    <strong>Phone:</strong> {selectedOrder.shipping_phone}
                  </div>
                  <div style={{ color: '#1a1512' }}>
                    <strong>Address:</strong> {selectedOrder.shipping_address}, {selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontFamily: 'Inter',
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600',
                  color: '#6b635a',
                  marginBottom: '1rem'
                }}>
                  Order Status
                </h3>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    color: '#1a1512',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1a1512'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
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
                    className="btn"
                    style={{
                      marginTop: '1rem',
                      width: '100%',
                      padding: '0.875rem',
                      background: '#1a1512',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Status'}
                  </button>
                )}
              </div>

              {/* Tracking Number */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontFamily: 'Inter',
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600',
                  color: '#6b635a',
                  marginBottom: '1rem'
                }}>
                  Tracking Number
                </h3>
                {editingTracking ? (
                  <div>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        color: '#1a1512',
                        background: 'white',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1a1512'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        onClick={handleUpdateTracking}
                        disabled={saving || !trackingNumber.trim()}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '0.875rem',
                          background: '#1a1512',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          cursor: (saving || !trackingNumber.trim()) ? 'not-allowed' : 'pointer',
                          opacity: (saving || !trackingNumber.trim()) ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingTracking(false);
                          setTrackingNumber(selectedOrder.tracking_number || '');
                        }}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '0.875rem',
                          background: 'white',
                          color: '#6b635a',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#f9fafb',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontFamily: 'Inter',
                      fontSize: '0.9375rem',
                      fontWeight: '500',
                      color: '#1a1512'
                    }}>
                      {selectedOrder.tracking_number || 'No tracking number'}
                    </span>
                    <button
                      onClick={() => setEditingTracking(true)}
                      className="btn"
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        color: '#1a1512',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <h3 style={{
                  fontFamily: 'Inter',
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600',
                  color: '#6b635a',
                  marginBottom: '1rem'
                }}>
                  Order Summary
                </h3>
                <div style={{
                  background: '#f9fafb',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  fontFamily: 'Inter',
                  fontSize: '0.9375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#6b635a' }}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#6b635a' }}>
                    <span>Tax</span>
                    <span>{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#6b635a' }}>
                    <span>Shipping</span>
                    <span>{formatCurrency(selectedOrder.shipping_fee)}</span>
                  </div>
                  <div style={{
                    borderTop: '2px solid #e5e7eb',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    color: '#1a1512'
                  }}>
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