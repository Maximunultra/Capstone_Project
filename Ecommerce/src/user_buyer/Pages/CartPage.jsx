import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, CheckCircle, ShoppingBag, Mail, Store, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [hasChanges, setHasChanges] = useState(false);

  // Which seller's group is selected for checkout (seller_id string or null)
  const [selectedSellerId, setSelectedSellerId] = useState(null);

  // Track collapsed state per seller group
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const FIXED_SHIPPING_FEE_3PLUS = 100;

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  // ─── Tab from URL ───────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['cart', 'orders', 'messages'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    if (activeTab === 'cart') fetchCartItems();
  }, [currentUserId, activeTab]);

  // ─── Fetch ──────────────────────────────────────────────────────
  const fetchCartItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch cart items');
      const data = await response.json();
      setCartItems(data.cart_items || []);
      setHasChanges(false);
      setSelectedSellerId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Group cart items by seller ─────────────────────────────────
  /**
   * Returns an array of seller groups:
   * [{ sellerId, sellerName, items: [...] }, ...]
   */
  const getSellerGroups = () => {
    const groups = {};
    cartItems.forEach(item => {
      const sellerId = item.product?.user_id || 'unknown';
      const sellerName = item.product?.seller_name || item.product?.brand || `Seller ${sellerId.slice(0, 6)}`;
      if (!groups[sellerId]) {
        groups[sellerId] = { sellerId, sellerName, items: [] };
      }
      groups[sellerId].items.push(item);
    });
    return Object.values(groups);
  };

  const sellerGroups = getSellerGroups();
  const hasMultipleSellers = sellerGroups.length > 1;

  // ─── Quantity helpers ───────────────────────────────────────────
  const updateQuantityLocal = (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    const item = cartItems.find(i => i.id === cartItemId);
    if (item && newQuantity > item.product.stock_quantity) {
      alert(`Only ${item.product.stock_quantity} items available in stock`);
      return;
    }
    setCartItems(prev =>
      prev.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i)
    );
    setHasChanges(true);
  };

  const updateCartOnServer = async () => {
    setLoading(true);
    try {
      await Promise.all(
        cartItems.map(item =>
          fetch(`${API_BASE_URL}/cart/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: item.quantity })
          })
        )
      );
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
    if (!window.confirm('Remove this item from your cart?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to remove item');
      }
      setCartItems(prev => prev.filter(i => i.id !== cartItemId));
      // Clear selected seller if their group is now empty
      const remaining = cartItems.filter(i => i.id !== cartItemId);
      const groups = {};
      remaining.forEach(i => { groups[i.product?.user_id] = true; });
      if (selectedSellerId && !groups[selectedSellerId]) setSelectedSellerId(null);
    } catch (err) {
      alert('Error removing item: ' + err.message);
    }
  };

  // ─── Price helpers ───────────────────────────────────────────────
  const getItemPrice = (item) => {
    if (item.price) return parseFloat(item.price);
    if (item.product) {
      let price = item.product.price;
      if (item.product.discount_percentage > 0)
        price = price - (price * item.product.discount_percentage / 100);
      return parseFloat(price);
    }
    return 0;
  };

  const getItemTotal = (item) => (getItemPrice(item) * item.quantity).toFixed(2);

  // ─── Shipping fee for a group of items ──────────────────────────
  const getGroupTotalQty = (items) => items.reduce((s, i) => s + i.quantity, 0);

  const getGroupRawShipping = (items) =>
    items.reduce((s, i) => {
      const fee = parseFloat(i.product?.shipping_fee || 50);
      return s + fee * i.quantity;
    }, 0);

  const getGroupShippingFee = (items) => {
    const qty = getGroupTotalQty(items);
    return qty >= 3 ? FIXED_SHIPPING_FEE_3PLUS : getGroupRawShipping(items);
  };

  const getGroupSubtotal = (items) =>
    items.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0);

  const getGroupTotal = (items) =>
    getGroupSubtotal(items) + getGroupShippingFee(items);

  // ─── Selected group helpers ──────────────────────────────────────
  const selectedGroup = sellerGroups.find(g => g.sellerId === selectedSellerId) || null;
  const selectedItems = selectedGroup?.items || [];

  const getSelectedSubtotal = () => getGroupSubtotal(selectedItems).toFixed(2);
  const getSelectedShipping = () => getGroupShippingFee(selectedItems).toFixed(2);
  const getSelectedTotal = () => getGroupTotal(selectedItems).toFixed(2);
  const selectedFixedApplied = getGroupTotalQty(selectedItems) >= 3;
  const selectedSavings = selectedFixedApplied
    ? Math.max(0, getGroupRawShipping(selectedItems) - FIXED_SHIPPING_FEE_3PLUS)
    : 0;

  // ─── Checkout ───────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cartItems.length === 0) { alert('Your cart is empty'); return; }

    if (hasMultipleSellers && !selectedSellerId) {
      alert('You have products from multiple sellers.\nPlease select one seller group to checkout.');
      return;
    }

    if (hasChanges) {
      alert('Please update your cart before proceeding to checkout.');
      return;
    }

    // Pass selected seller's items to checkout via location state
    const itemsToCheckout = hasMultipleSellers ? selectedItems : cartItems;
    navigate('/buyer/checkout', { state: { checkoutItems: itemsToCheckout, sellerId: selectedSellerId } });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/buyer/cart?tab=${tab}`, { replace: true });
  };

  const toggleGroup = (sellerId) => {
    setCollapsedGroups(prev => ({ ...prev, [sellerId]: !prev[sellerId] }));
  };

  // ─── Render helpers ──────────────────────────────────────────────
  const renderCartItem = (item) => (
    <div key={item.id} className="p-6 hover:bg-gray-50/50 transition group">
      <div className="flex gap-4">
        {/* Image */}
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

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 pr-4">
              <h3
                className="font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition truncate"
                onClick={() => navigate(`/buyer/products/${item.product_id}`)}
              >
                {item.product?.product_name}
              </h3>
              {item.product?.brand && (
                <p className="text-sm text-gray-500">{item.product.brand}</p>
              )}
              {item.product?.category && (
                <p className="text-sm text-gray-400">{item.product.category}</p>
              )}
            </div>
            <button
              onClick={() => removeFromCart(item.id)}
              className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
              title="Remove from cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mt-3">
            {/* Price */}
            <div>
              {item.product?.discount_percentage > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-green-600">₱{getItemPrice(item).toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through">₱{item.product.price}</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-900">₱{getItemPrice(item).toFixed(2)}</span>
              )}
            </div>

            {/* Qty + total */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => updateQuantityLocal(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-lg font-bold transition shadow-sm"
                >−</button>
                <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                <button
                  onClick={() => updateQuantityLocal(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product?.stock_quantity}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-lg font-bold transition shadow-sm"
                >+</button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-base font-bold text-gray-900">₱{getItemTotal(item)}</p>
              </div>
            </div>
          </div>

          {item.product?.stock_quantity <= 10 && (
            <div className="mt-2">
              <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium">
                Only {item.product.stock_quantity} left in stock
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Loading ─────────────────────────────────────────────────────
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
                  }`}>{count}</span>
                )}
                {activeTab === id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">

          {/* ── CART TAB ── */}
          {activeTab === 'cart' && (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
                    onClick={() => navigate('/buyer/products')}
                    className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* ── Left: Seller Groups ── */}
                  <div className="lg:col-span-2 space-y-6">

                    {/* Multi-seller notice */}
                    {hasMultipleSellers && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-800">Products from multiple sellers detected</p>
                          <p className="text-sm text-amber-700 mt-1">
                            You can only checkout products from <strong>one seller at a time</strong>.
                            Select a seller group below to proceed to checkout.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Seller group cards */}
                    {sellerGroups.map((group) => {
                      const isSelected = selectedSellerId === group.sellerId;
                      const isCollapsed = collapsedGroups[group.sellerId];
                      const groupShipping = getGroupShippingFee(group.items);
                      const groupSubtotal = getGroupSubtotal(group.items);
                      const groupTotal = getGroupTotal(group.items);
                      const groupQty = getGroupTotalQty(group.items);
                      const fixedApplied = groupQty >= 3;
                      const rawShipping = getGroupRawShipping(group.items);
                      const savings = fixedApplied ? Math.max(0, rawShipping - FIXED_SHIPPING_FEE_3PLUS) : 0;

                      return (
                        <div
                          key={group.sellerId}
                          className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
                            hasMultipleSellers
                              ? isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-blue-300'
                              : 'border-gray-100'
                          }`}
                        >
                          {/* Seller Header */}
                          <div
                            className={`flex items-center justify-between p-4 cursor-pointer ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            } border-b border-gray-100`}
                            onClick={() => hasMultipleSellers && setSelectedSellerId(isSelected ? null : group.sellerId)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Seller select radio (only show if multiple sellers) */}
                              {hasMultipleSellers && (
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                              )}
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Store className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{group.sellerName}</p>
                                <p className="text-xs text-gray-500">
                                  {group.items.length} product{group.items.length !== 1 ? 's' : ''} · {groupQty} item{groupQty !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Group total</p>
                                <p className="font-bold text-gray-900">₱{groupTotal.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleGroup(group.sellerId); }}
                                className="text-gray-400 hover:text-gray-700 transition"
                              >
                                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Items list */}
                          {!isCollapsed && (
                            <div className="divide-y divide-gray-100">
                              {group.items.map(item => renderCartItem(item))}
                            </div>
                          )}

                          {/* Group shipping summary */}
                          {!isCollapsed && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                              <span className="text-gray-600">
                                Subtotal: <strong className="text-gray-900">₱{groupSubtotal.toFixed(2)}</strong>
                              </span>
                              <span className="text-gray-600 flex items-center gap-1">
                                Shipping: <strong className="text-gray-900">₱{groupShipping.toFixed(2)}</strong>
                                {fixedApplied && (
                                  <span className="ml-1 text-xs text-green-600 font-medium">
                                    Fixed ({groupQty}+ items{savings > 0 ? `, save ₱${savings.toFixed(2)}` : ''})
                                  </span>
                                )}
                              </span>

                              {/* Checkout this seller button */}
                              {hasMultipleSellers && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSellerId(group.sellerId);
                                  }}
                                  className={`ml-auto text-xs px-3 py-1 rounded-lg font-semibold transition ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {isSelected ? '✓ Selected for Checkout' : 'Select for Checkout'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Action buttons */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3">
                      <button
                        onClick={() => navigate('/buyer/products')}
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

                  {/* ── Right: Order Summary ── */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Order Summary</h2>

                      {/* Multi-seller: show which group is selected */}
                      {hasMultipleSellers && (
                        <div className="mb-4">
                          {selectedGroup ? (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                              <Store className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-blue-700 font-semibold">Checking out from:</p>
                                <p className="text-sm font-bold text-blue-900">{selectedGroup.sellerName}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              <p className="text-xs text-amber-700 font-medium">
                                Select a seller group to see the summary
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Summary values — for single seller show all; for multi show selected */}
                      {(!hasMultipleSellers || selectedGroup) && (
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-bold text-gray-900">
                              ₱{hasMultipleSellers ? getSelectedSubtotal() : getGroupSubtotal(cartItems).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex justify-between text-gray-600">
                            <div className="flex flex-col">
                              <span>Shipping Fee</span>
                              {(hasMultipleSellers ? selectedFixedApplied : getGroupTotalQty(cartItems) >= 3) && (
                                <span className="text-xs text-green-600 font-medium mt-0.5">
                                  Fixed flat fee (3+ items)
                                  {(hasMultipleSellers ? selectedSavings : Math.max(0, getGroupRawShipping(cartItems) - FIXED_SHIPPING_FEE_3PLUS)) > 0 &&
                                    ` · save ₱${(hasMultipleSellers ? selectedSavings : Math.max(0, getGroupRawShipping(cartItems) - FIXED_SHIPPING_FEE_3PLUS)).toFixed(2)}`
                                  }
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-gray-900">
                              ₱{hasMultipleSellers ? getSelectedShipping() : getGroupShippingFee(cartItems).toFixed(2)}
                            </span>
                          </div>

                          {/* Green box for fixed shipping */}
                          {(hasMultipleSellers ? selectedFixedApplied : getGroupTotalQty(cartItems) >= 3) && (
                            <div className="text-xs bg-green-50 border border-green-200 p-3 rounded-lg text-green-700">
                              <div className="flex items-start gap-2">
                                <span className="text-sm">✓</span>
                                <div>
                                  <p className="font-medium text-green-800">Fixed ₱{FIXED_SHIPPING_FEE_3PLUS} Shipping</p>
                                  <p>
                                    Flat fee for 3+ products
                                    {(hasMultipleSellers ? selectedSavings : Math.max(0, getGroupRawShipping(cartItems) - FIXED_SHIPPING_FEE_3PLUS)) > 0 &&
                                      ` — you save ₱${(hasMultipleSellers ? selectedSavings : Math.max(0, getGroupRawShipping(cartItems) - FIXED_SHIPPING_FEE_3PLUS)).toFixed(2)}!`
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="border-t-2 border-gray-200 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">Total</span>
                              <span className="text-3xl font-bold text-blue-600">
                                ₱{hasMultipleSellers ? getSelectedTotal() : getGroupTotal(cartItems).toFixed(2)}
                              </span>
                            </div>
                            {hasMultipleSellers && (
                              <p className="text-xs text-gray-400 mt-1 text-right">
                                For selected seller only
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Checkout button */}
                      <button
                        onClick={handleCheckout}
                        disabled={hasChanges || (hasMultipleSellers && !selectedSellerId)}
                        className={`w-full py-4 px-6 rounded-xl transition font-bold text-lg flex items-center justify-center gap-2 ${
                          hasChanges || (hasMultipleSellers && !selectedSellerId)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        <CheckCircle className="w-6 h-6" />
                        {hasMultipleSellers && !selectedSellerId ? 'Select a Seller Group' : 'Proceed to Checkout'}
                      </button>

                      {hasChanges && (
                        <p className="text-sm text-orange-600 text-center mt-3 font-medium">
                          Please update cart first
                        </p>
                      )}

                      {hasMultipleSellers && !selectedSellerId && !hasChanges && (
                        <p className="text-sm text-amber-600 text-center mt-3 font-medium">
                          Select one seller group above to continue
                        </p>
                      )}

                      {/* Multi-seller: other groups summary */}
                      {hasMultipleSellers && sellerGroups.length > 1 && (
                        <div className="mt-5 pt-5 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Other seller groups
                          </p>
                          <div className="space-y-2">
                            {sellerGroups
                              .filter(g => g.sellerId !== selectedSellerId)
                              .map(g => (
                                <div key={g.sellerId} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Store className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600 truncate max-w-[120px]">{g.sellerName}</span>
                                  </div>
                                  <span className="text-gray-700 font-medium">₱{getGroupTotal(g.items).toFixed(2)}</span>
                                </div>
                              ))
                            }
                            <p className="text-xs text-gray-400 mt-2">
                              Complete this checkout first, then return to checkout the remaining items.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Security badges */}
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">Shipping Calculated at Checkout</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Based on your delivery location</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">Secure Checkout</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Your payment info is protected</p>
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
          {activeTab === 'orders' && <OrdersPage userId={currentUserId} />}

          {/* Messages Tab */}
          {activeTab === 'messages' && <MessagesTab userId={currentUserId} />}

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default CartPage;