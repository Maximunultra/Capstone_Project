import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrdersPage from './OrdersPage';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const CartPage = ({ userId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cart');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    if (activeTab === 'cart') {
      fetchCartItems();
    }
  }, [currentUserId, activeTab]);

  const fetchCartItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch cart items');
      const data = await response.json();
      setCartItems(data.cart_items || []);
      setHasChanges(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantityLocal = (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find(item => item.id === cartItemId);
    if (item && newQuantity > item.product.stock_quantity) {
      alert(`Only ${item.product.stock_quantity} items available in stock`);
      return;
    }
    
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
    setHasChanges(true);
  };

  const updateCartOnServer = async () => {
    setLoading(true);
    try {
      const updatePromises = cartItems.map(item =>
        fetch(`${API_BASE_URL}/cart/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity })
        })
      );
      
      await Promise.all(updatePromises);
      setHasChanges(false);
      alert('Cart updated successfully!');
      await fetchCartItems();
    } catch (err) {
      alert('Error updating cart: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    if (!window.confirm('Are you sure you want to remove this item from your cart?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item');
      }
      
      setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
      alert('Item removed from cart');
    } catch (err) {
      alert('Error removing item: ' + err.message);
    }
  };

  const getItemPrice = (item) => {
    // Use stored price from cart if available, otherwise calculate from product
    if (item.price) {
      return parseFloat(item.price);
    }
    
    if (item.product) {
      let price = item.product.price;
      if (item.product.discount_percentage > 0) {
        price = price - (price * item.product.discount_percentage / 100);
      }
      return parseFloat(price);
    }
    return 0;
  };

  const getItemTotal = (item) => {
    return (getItemPrice(item) * item.quantity).toFixed(2);
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0).toFixed(2);
  };

  const getShippingFee = () => {
    const subtotal = parseFloat(getSubtotal());
    // Free shipping over ₱1,000
    return subtotal >= 1000 ? 0 : 99;
  };

  const getTotal = () => {
    const subtotal = parseFloat(getSubtotal());
    const shipping = getShippingFee();
    return (subtotal + shipping).toFixed(2);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (hasChanges) {
      alert('Please update your cart before proceeding to checkout');
      return;
    }
    navigate('/buyer/checkout');
  };

  const handleContinueShopping = () => {
    navigate('/buyer/products');
  };

  if (loading && cartItems.length === 0 && activeTab === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {activeTab === 'cart' ? 'Your Shopping Cart' : activeTab === 'orders' ? 'My Orders' : 'Messages'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-sm border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('cart')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'cart'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cart ({cartItems.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'orders'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'messages'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Messages
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'cart' && (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-4">
                <p className="text-red-700">Error: {error}</p>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="bg-white rounded-b-lg shadow-sm p-12 text-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-24 w-24 mx-auto text-gray-300 mb-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-6">Add some products to get started!</p>
                <button
                  onClick={handleContinueShopping}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm">
                    {/* Cart Items Header */}
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Cart Items</h2>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-gray-200">
                      {cartItems.map((item) => (
                        <div key={item.id} className="p-6 hover:bg-gray-50 transition">
                          <div className="flex gap-4">
                            {/* Product Image */}
                            <div 
                              className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                              onClick={() => navigate(`/buyer/products/${item.product_id}`)}
                            >
                              {item.product?.product_image ? (
                                <img 
                                  src={item.product.product_image} 
                                  alt={item.product?.product_name} 
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                              )}
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h3 
                                    className="font-semibold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition"
                                    onClick={() => navigate(`/buyer/products/${item.product_id}`)}
                                  >
                                    {item.product?.product_name}
                                  </h3>
                                  {item.product?.brand && (
                                    <p className="text-sm text-gray-500 mb-1">
                                      Brand: <span className="font-medium">{item.product.brand}</span>
                                    </p>
                                  )}
                                  {item.product?.category && (
                                    <p className="text-sm text-gray-500">{item.product.category}</p>
                                  )}
                                </div>
                                
                                {/* Remove Button */}
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-gray-400 hover:text-red-600 transition flex-shrink-0"
                                  title="Remove from cart"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              {/* Price and Quantity Controls */}
                              <div className="flex items-center justify-between mt-4">
                                {/* Price */}
                                <div>
                                  {item.product?.discount_percentage > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-lg font-bold text-green-600">
                                        ₱{getItemPrice(item).toFixed(2)}
                                      </span>
                                      <span className="text-sm text-gray-400 line-through">
                                        ₱{item.product.price}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-lg font-bold text-gray-900">
                                      ₱{getItemPrice(item).toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateQuantityLocal(item.id, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded border border-gray-300 font-bold transition"
                                    >
                                      −
                                    </button>
                                    <span className="w-12 text-center font-semibold text-gray-900">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantityLocal(item.id, item.quantity + 1)}
                                      disabled={item.quantity >= item.product?.stock_quantity}
                                      className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded border border-gray-300 font-bold transition"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Item Total */}
                                  <div className="text-right min-w-[80px]">
                                    <p className="text-sm text-gray-500">Total</p>
                                    <p className="text-lg font-bold text-gray-900">₱{getItemTotal(item)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Stock Warning */}
                              {item.product?.stock_quantity <= 10 && (
                                <div className="mt-2">
                                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                    Only {item.product.stock_quantity} left in stock
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                      <button
                        onClick={handleContinueShopping}
                        className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Continue Shopping
                      </button>
                      <button
                        onClick={updateCartOnServer}
                        disabled={!hasChanges || loading}
                        className={`flex-1 py-3 px-6 rounded-lg transition font-medium ${
                          hasChanges && !loading
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {loading ? 'Updating...' : 'Update Cart'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-gray-900">₱{getSubtotal()}</span>
                      </div>
                      
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping Fee</span>
                        <span className="font-semibold text-gray-900">
                          {getShippingFee() === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            `₱${getShippingFee().toFixed(2)}`
                          )}
                        </span>
                      </div>
                      
                      {parseFloat(getSubtotal()) < 1000 && parseFloat(getSubtotal()) > 0 && (
                        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
                          Add ₱{(1000 - parseFloat(getSubtotal())).toFixed(2)} more for free shipping!
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total</span>
                          <span className="text-2xl font-bold text-blue-600">₱{getTotal()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={hasChanges}
                      className={`w-full py-4 px-6 rounded-lg transition font-semibold text-lg ${
                        hasChanges
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      Proceed to Checkout
                    </button>

                    {hasChanges && (
                      <p className="text-sm text-orange-600 text-center mt-3">
                        Please update cart before checkout
                      </p>
                    )}

                    {/* Free Shipping Info */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Free Shipping</h3>
                          <p className="text-sm text-gray-600">
                            On all orders over ₱1,000
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Secure Checkout */}
                    <div className="mt-4 flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Secure Checkout</h3>
                        <p className="text-sm text-gray-600">
                          Your payment information is protected
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
            <OrdersPage userId={currentUserId} />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-b-lg shadow-sm p-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Messages</h2>
            <p className="text-gray-600">Your messages will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;