import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, CheckCircle, ShoppingBag, Mail } from 'lucide-react';
import OrdersPage from './OrdersPage';
import MessagesTab from './MessagesTab';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

const CartPage = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('cart');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  // Check URL parameters for tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['cart', 'orders', 'messages'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without page reload
    navigate(`/buyer/cart?tab=${tab}`, { replace: true });
  };

  if (loading && cartItems.length === 0 && activeTab === 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            {activeTab === 'cart' ? 'Shopping Cart' : activeTab === 'orders' ? 'My Orders' : 'Messages'}
          </h1>
          <p className="text-gray-600">
            {activeTab === 'cart' && 'Review your items and checkout'}
            {activeTab === 'orders' && 'Track and manage your orders'}
            {activeTab === 'messages' && 'Communicate with sellers'}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex">
            {[
              { id: 'cart', label: 'Cart', icon: ShoppingBag, count: cartItems.length },
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'messages', label: 'Messages', icon: Mail }
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 relative ${
                  activeTab === id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
                {activeTab === id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-4">
                  <p className="text-red-700">Error: {error}</p>
                </div>
              )}

              {cartItems.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-12 h-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                  <p className="text-gray-600 mb-8">Start shopping and add items to your cart</p>
                  <button
                    onClick={handleContinueShopping}
                    className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg hover:shadow-xl"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cart Items */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Cart Items Header */}
                      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h2 className="text-xl font-bold text-gray-900">Cart Items ({cartItems.length})</h2>
                      </div>

                      {/* Items List */}
                      <div className="divide-y divide-gray-100">
                        {cartItems.map((item) => (
                          <div key={item.id} className="p-6 hover:bg-gray-50/50 transition group">
                            <div className="flex gap-4">
                              {/* Product Image */}
                              <div 
                                className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 border-transparent group-hover:border-blue-200 transition"
                                onClick={() => navigate(`/buyer/products/${item.product_id}`)}
                              >
                                {item.product?.product_image ? (
                                  <img 
                                    src={item.product.product_image} 
                                    alt={item.product?.product_name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Package className="w-10 h-10" />
                                  </div>
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 
                                      className="font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition"
                                      onClick={() => navigate(`/buyer/products/${item.product_id}`)}
                                    >
                                      {item.product?.product_name}
                                    </h3>
                                    {item.product?.brand && (
                                      <p className="text-sm text-gray-500">
                                        {item.product.brand}
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
                                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                      <button
                                        onClick={() => updateQuantityLocal(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-lg font-bold transition shadow-sm"
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center font-bold text-gray-900">
                                        {item.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateQuantityLocal(item.id, item.quantity + 1)}
                                        disabled={item.quantity >= item.product?.stock_quantity}
                                        className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-lg font-bold transition shadow-sm"
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
                                  <div className="mt-3">
                                    <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium">
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
                      <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                        <button
                          onClick={handleContinueShopping}
                          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition font-semibold"
                        >
                          Continue Shopping
                        </button>
                        <button
                          onClick={updateCartOnServer}
                          disabled={!hasChanges || loading}
                          className={`flex-1 py-3 px-6 rounded-xl transition font-semibold ${
                            hasChanges && !loading
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {loading ? 'Updating...' : 'Update Cart'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-bold text-gray-900">₱{getSubtotal()}</span>
                        </div>
                        
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping Fee</span>
                          <span className="font-bold text-gray-900">
                            {getShippingFee() === 0 ? (
                              <span className="text-emerald-600">FREE</span>
                            ) : (
                              `₱${getShippingFee().toFixed(2)}`
                            )}
                          </span>
                        </div>
                        
                        {parseFloat(getSubtotal()) < 1000 && parseFloat(getSubtotal()) > 0 && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-4 rounded-xl border border-blue-200 font-medium">
                            Add ₱{(1000 - parseFloat(getSubtotal())).toFixed(2)} more for free shipping! 🚚
                          </div>
                        )}

                        <div className="border-t-2 border-gray-200 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total</span>
                            <span className="text-3xl font-bold text-blue-600">₱{getTotal()}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCheckout}
                        disabled={hasChanges}
                        className={`w-full py-4 px-6 rounded-xl transition font-bold text-lg flex items-center justify-center gap-2 ${
                          hasChanges
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        <CheckCircle className="w-6 h-6" />
                        Proceed to Checkout
                      </button>

                      {hasChanges && (
                        <p className="text-sm text-orange-600 text-center mt-3 font-medium">
                          Please update cart first
                        </p>
                      )}

                      {/* Free Shipping Info */}
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">Shipping</h3>
                            <p className="text-sm text-gray-600">
                              Your Shipping will be calculated at checkout
                            </p>
                          </div>
                        </div>

                        {/* Secure Checkout */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">Secure Checkout</h3>
                            <p className="text-sm text-gray-600">
                              Your payment information is protected
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <OrdersPage userId={currentUserId} />
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <MessagesTab userId={currentUserId} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CartPage;