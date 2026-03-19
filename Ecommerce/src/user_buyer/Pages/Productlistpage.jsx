import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const Productlistpage = ({ userId, userRole }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [pagination, setPagination] = useState({ limit: 15, offset: 0, total: 0 });

  const CART_LIMIT = 10;
  const [cartProductCount, setCartProductCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [modalAction, setModalAction] = useState('');
  const [quantityDraft, setQuantityDraft] = useState(null);
  const [quantityError, setQuantityError] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [showCartLimitModal, setShowCartLimitModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [suspension, setSuspension] = useState(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  const handleStoreClick = (e, sellerId) => {
    e.stopPropagation();
    if (sellerId) navigate(`/buyer/store/${sellerId}`);
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`${API_BASE_URL}/orders/check-suspension/${currentUserId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSuspension(d); })
      .catch(() => {});
  }, [currentUserId]);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'Accessories', label: 'Accessories' },
    { id: 'Home Decor', label: 'Home Decor' },
    { id: 'Kitchen', label: 'Kitchen' },
    { id: 'Clothing', label: 'Clothing' },
  ];

  const priceRanges = [
    { id: 'all', label: 'All Prices', min: 0, max: Infinity },
    { id: 'under1000', label: 'Under ₱1,000', min: 0, max: 1000 },
    { id: '1000-1500', label: '₱1,000 - ₱1,500', min: 1000, max: 1500 },
    { id: '1500-2000', label: '₱1,500 - ₱2,000', min: 1500, max: 2000 },
    { id: 'over2000', label: 'Over ₱2,000', min: 2000, max: Infinity },
  ];

  const sortOptions = [
    { id: 'featured', label: 'Featured' },
    { id: 'newest', label: 'Newest First' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'popular', label: 'Most Popular' },
  ];

  const getStoreName = (users) => {
    if (!users) return null;
    return users.store_name || users.full_name || null;
  };

  // ── Price formatting ─────────────────────────────────────────────────────
  const formatPrice = (value) =>
    parseFloat(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calculateDiscountedPrice = (price, discount) =>
    (!discount || discount === 0)
      ? formatPrice(price)
      : formatPrice(price - (price * discount / 100));

  const getProductPrice = (p) =>
    p.discount_percentage > 0
      ? parseFloat(p.price - (p.price * p.discount_percentage / 100))
      : parseFloat(p.price);

  const getTotalPrice = () =>
    !selectedProduct ? '0.00' : formatPrice(getProductPrice(selectedProduct) * quantity);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);
      params.append('buyer_view', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const priceRange = priceRanges.find(r => r.id === selectedPriceRange);
      if (priceRange && priceRange.id !== 'all') {
        if (priceRange.min > 0) params.append('min_price', priceRange.min);
        if (priceRange.max !== Infinity) params.append('max_price', priceRange.max);
      }

      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();

      let sortedProducts = data.products || [];
      switch (sortBy) {
        case 'newest':    sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
        case 'price-low': sortedProducts.sort((a, b) => a.price - b.price); break;
        case 'price-high':sortedProducts.sort((a, b) => b.price - a.price); break;
        case 'popular':   sortedProducts.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0)); break;
        default:          sortedProducts.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)); break;
      }

      setProducts(sortedProducts);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [pagination.offset, pagination.limit, selectedCategory, selectedPriceRange, sortBy, searchQuery]);

  const fetchCartCount = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cart/${currentUserId}/count`);
      if (!res.ok) return;
      const data = await res.json();
      setCartProductCount(data.unique_items ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCartCount(); }, [currentUserId]);

  const openModal = (product, action, e) => {
    e.stopPropagation();
    if (!currentUserId) {
      showToast(action === 'cart' ? 'Please login to add items to cart' : 'Please login to make a purchase', 'error');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    if (action === 'buynow' && suspension?.suspended) {
      showToast(
        `Checkout suspended for ${suspension.hours_left} more hour${suspension.hours_left !== 1 ? 's' : ''} due to repeated cancellations. You can still add items to your cart.`,
        'error'
      );
      return;
    }
    if (cartProductCount >= CART_LIMIT) { setShowCartLimitModal(true); return; }
    setSelectedProduct(product);
    setQuantity(1);
    setModalAction(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setSelectedProduct(null); setQuantity(1);
    setModalAction(''); setQuantityDraft(null); setQuantityError('');
  };

  const increaseQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock_quantity) { setQuantity(p => p + 1); setQuantityError(''); }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) { setQuantity(p => p - 1); setQuantityError(''); }
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;
    if (quantity > selectedProduct.stock_quantity) {
      setQuantityError(`Only ${selectedProduct.stock_quantity} item${selectedProduct.stock_quantity !== 1 ? 's' : ''} available in stock.`);
      return;
    }

    try {
      const stockRes = await fetch(`${API_BASE_URL}/products/${selectedProduct.id}`);
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const liveProduct = stockData.product || stockData;

        if (!liveProduct.is_active) {
          closeModal();
          showToast(`"${selectedProduct.product_name}" is no longer available.`, 'error');
          fetchProducts();
          return;
        }
        if (liveProduct.stock_quantity === 0) {
          closeModal();
          showToast(`"${selectedProduct.product_name}" just sold out.`, 'error');
          fetchProducts();
          return;
        }
        if (liveProduct.stock_quantity < quantity) {
          setQuantityError(`Only ${liveProduct.stock_quantity} item${liveProduct.stock_quantity !== 1 ? 's' : ''} available now. Please reduce your quantity.`);
          setSelectedProduct(prev => ({ ...prev, stock_quantity: liveProduct.stock_quantity }));
          return;
        }
      }
    } catch {
      console.warn('Stock pre-check failed, proceeding to cart add');
    }

    if (modalAction === 'buynow' && suspension?.suspended) {
      closeModal();
      showToast(
        `Checkout suspended for ${suspension.hours_left} more hour${suspension.hours_left !== 1 ? 's' : ''}. You can still add items to your cart.`,
        'error'
      );
      return;
    }

    try {
      const addResponse = await fetch(`${API_BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, product_id: selectedProduct.id, quantity }),
      });
      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        if (errorData.cart_limit_reached) { closeModal(); setShowCartLimitModal(true); return; }
        throw new Error(errorData.error || 'Failed to add to cart');
      }
      if (modalAction === 'cart') {
        closeModal(); showToast(`"${selectedProduct.product_name}" added to cart!`); fetchCartCount(); return;
      }
      const cartResponse = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!cartResponse.ok) throw new Error('Failed to fetch cart');
      const cartData = await cartResponse.json();
      const allCartItems = cartData.cart_items || [];
      const currentSellerId = selectedProduct.user_id;
      const otherSellerItems = allCartItems.filter(item => item.product?.user_id && item.product.user_id !== currentSellerId);
      const thisSellerItems  = allCartItems.filter(item => item.product?.user_id === currentSellerId);
      closeModal();
      if (otherSellerItems.length > 0) {
        const otherSellers = {};
        otherSellerItems.forEach(item => {
          const sid = item.product.user_id;
          const sname = item.product.seller_name || item.product.brand || `Seller ${sid.slice(0, 6)}`;
          if (!otherSellers[sid]) otherSellers[sid] = { name: sname, count: 0 };
          otherSellers[sid].count += item.quantity;
        });
        setConfirmModalData({ otherSellers: Object.values(otherSellers), thisSellerItems, currentSellerId, sellerName: selectedProduct.seller_name || selectedProduct.brand || 'this seller', productName: selectedProduct.product_name });
        setShowConfirmModal(true);
      } else {
        navigate('/buyer/checkout', { state: { checkoutItems: thisSellerItems, sellerId: currentSellerId } });
      }
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleConfirmProceed = () => {
    if (!confirmModalData) return;
    setShowConfirmModal(false);
    navigate('/buyer/checkout', { state: { checkoutItems: confirmModalData.thisSellerItems, sellerId: confirmModalData.currentSellerId } });
  };
  const handleConfirmCancel = () => { setShowConfirmModal(false); setConfirmModalData(null); };
  const handleProductClick  = (id) => navigate(`/buyer/products/${id}`);

  const nextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const prevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const ToastIcon = ({ type }) => {
    if (type === 'success') return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
    if (type === 'error')   return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  };

  const toastColors = { success: 'bg-[#5a7a52]', error: 'bg-red-600', info: 'bg-blue-600' };

  const StoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium max-w-xs ${toastColors[toast.type] || toastColors.info}`} style={{ animation: 'slideInRight 0.3s ease-out' }}>
          <ToastIcon type={toast.type} />
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 transition flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Suspended banner */}
      {suspension?.suspended && (
        <div className="bg-red-50 border-b-2 border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
              <span className="font-bold text-red-800 text-sm">Checkout Suspended</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                {suspension.hours_left}h remaining
              </span>
            </div>
            <p className="text-xs text-red-700 flex-1">
              Due to repeated cancellations, checkout is temporarily blocked until{' '}
              <strong>{new Date(suspension.suspended_until).toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>.
              You can still <strong>browse, add to cart, message sellers</strong>, and view your orders.
            </p>
          </div>
        </div>
      )}

      {/* Multi-seller Modal */}
      {showConfirmModal && confirmModalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-base">Mixed Cart Detected</h3>
                <p className="text-sm text-amber-700 mt-0.5">Your cart has items from other sellers</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-3">You can only checkout <strong>one seller at a time</strong>. The following items will stay in your cart for later:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
                {confirmModalData.otherSellers.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span><strong>{s.name}</strong> — {s.count} item{s.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">Proceed to checkout with <strong>{confirmModalData.sellerName}</strong> only?</p>
            </div>
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
              <button onClick={handleConfirmCancel} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm">Cancel</button>
              <button onClick={handleConfirmProceed} className="flex-1 px-4 py-2.5 bg-[#a48a6d] hover:bg-[#8b7355] text-white rounded-lg transition font-medium text-sm">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Limit Modal */}
      {showCartLimitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" style={{ animation: 'scaleIn 0.2s ease-out' }}>
            <div className="bg-red-50 border-b border-red-200 px-6 py-5 flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-base leading-tight">Cart is Full</h3>
                <p className="text-sm text-red-600 mt-0.5">You've reached the 10 unique product limit</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-4">Your cart already has <strong>10 different products</strong> — the maximum allowed. To add a new product, please remove an existing one first.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-amber-800">Tip: You can checkout your current products first, then come back to add more.</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
              <button onClick={() => setShowCartLimitModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm">Close</button>
              <button onClick={() => { setShowCartLimitModal(false); navigate('/buyer/cart'); }} className="flex-1 px-4 py-2.5 bg-[#a48a6d] hover:bg-[#8b7355] text-white rounded-lg transition font-medium text-sm">View My Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#f5f2ed] py-8 sm:py-10 md:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#4a4238] mb-3 sm:mb-4">Our Products</h1>
          <p className="text-sm sm:text-base text-[#8b7d6b] max-w-3xl mx-auto px-4">
            Discover our collection of handcrafted treasures, each piece telling a unique story of tradition, skill, and cultural heritage.
          </p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="bg-[#f5f2ed] pb-4 sm:pb-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a69c8e] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by product name or store name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPagination(prev => ({ ...prev, offset: 0 })); }}
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] placeholder-[#a69c8e] text-sm sm:text-base"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setPagination(prev => ({ ...prev, offset: 0 })); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a69c8e] hover:text-[#4a4238] transition p-0.5" title="Clear search">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[180px] md:min-w-[200px] px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base">
              {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs sm:text-sm text-[#8b7d6b] flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Searching products and stores for <strong className="text-[#4a4238] ml-1">"{searchQuery}"</strong>
            </p>
          )}
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="bg-[#f5f2ed] pb-4 px-4 sm:px-6 md:hidden">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#e8e3db] hover:bg-[#d8d3cb] text-[#4a4238] rounded-lg transition-colors font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Filters
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`bg-[#f5f2ed] pb-6 sm:pb-8 px-4 sm:px-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#e8e3db] rounded-lg p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  <label className="text-xs sm:text-sm font-semibold text-[#4a4238] uppercase tracking-wider">Categories</label>
                </div>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <label className="text-xs sm:text-sm font-semibold text-[#4a4238] uppercase tracking-wider">Price Range</label>
                </div>
                <select value={selectedPriceRange} onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-[#d4cdc3] rounded-lg focus:outline-none focus:border-[#8b7355] text-[#4a4238] cursor-pointer text-sm sm:text-base">
                  {priceRanges.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#d4cdc3] border-t-[#8b7355] rounded-full animate-spin"></div>
            <p className="text-[#8b7d6b] mt-4 text-sm sm:text-base">Loading products...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 sm:p-8 text-center">
            <p className="text-red-700 text-sm sm:text-base">Error: {error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg p-12 sm:p-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#d4cdc3] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-[#8b7d6b] text-base sm:text-lg font-medium">No products found</p>
            {searchQuery
              ? <p className="text-[#a69c8e] mt-2 text-sm">No results for "<strong>{searchQuery}</strong>" — try a different product or store name</p>
              : <p className="text-[#a69c8e] mt-2 text-sm sm:text-base">Try adjusting your filters</p>
            }
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {products.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product.id)}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col">

                  {/* Image */}
                  <div className="relative h-36 sm:h-40 md:h-48 bg-gray-100 overflow-hidden flex-shrink-0">
                    {product.product_image ? (
                      <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    )}
                    <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-col gap-1">
                      {product.is_featured && <span className="bg-yellow-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium">Featured</span>}
                      {product.discount_percentage > 0 && <span className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium">-{product.discount_percentage}%</span>}
                    </div>
                    {product.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold text-[10px] sm:text-sm">OUT OF STOCK</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-2.5 sm:p-3 md:p-4 flex flex-col flex-1">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#a48a6d] mb-0.5 text-xs sm:text-sm line-clamp-2 min-h-[32px] sm:min-h-[40px]" title={product.product_name}>
                        {product.product_name}
                      </h3>
                      {getStoreName(product.users) && (
                        <button
                          onClick={(e) => handleStoreClick(e, product.user_id)}
                          className="text-[10px] sm:text-xs text-[#8b7355] hover:text-[#a48a6d] hover:underline font-medium mb-1.5 flex items-center gap-1 truncate w-full text-left transition-colors"
                          title={`Visit ${getStoreName(product.users)}`}
                        >
                          <StoreIcon />
                          {getStoreName(product.users)}
                        </button>
                      )}
                      {product.description && (
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-1.5 sm:mb-2 line-clamp-2 min-h-[28px] sm:min-h-[32px]" title={product.description}>
                          {product.description}
                        </p>
                      )}
                      {product.category && <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2 truncate">{product.category}</p>}

                      <div className="mb-2 sm:mb-3">
                        {product.discount_percentage > 0 ? (
                          <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                            <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">₱{calculateDiscountedPrice(product.price, product.discount_percentage)}</span>
                            <span className="text-[10px] sm:text-xs md:text-sm text-gray-400 line-through">₱{formatPrice(product.price)}</span>
                          </div>
                        ) : (
                          <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">₱{formatPrice(product.price)}</span>
                        )}
                      </div>

                      <div className="flex items-center mb-2 sm:mb-3 min-h-[20px] sm:min-h-[24px]">
                        {product.rating_average > 0 && (
                          <>
                            <span className="text-yellow-500 text-xs sm:text-sm mr-0.5 sm:mr-1">★</span>
                            <span className="text-xs sm:text-sm font-medium">{product.rating_average}</span>
                            <span className="text-[10px] sm:text-xs text-gray-500 ml-0.5 sm:ml-1">({product.rating_count})</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-auto">
                      {currentUserRole === 'buyer' && product.stock_quantity > 0 && (
                        <div className="flex gap-1.5 sm:gap-2">
                          <button onClick={(e) => openModal(product, 'cart', e)}
                            className="flex-shrink-0 bg-white border-2 border-[#d4cdc3] hover:border-[#a48a6d] hover:bg-[#ebe5dc] text-gray-700 hover:text-[#a48a6d] p-1.5 sm:p-2 md:p-2.5 rounded-lg transition-all duration-200 touch-manipulation"
                            title="Add to Cart">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </button>
                          <button
                            onClick={(e) => openModal(product, 'buynow', e)}
                            disabled={suspension?.suspended}
                            title={suspension?.suspended ? `Checkout suspended — ${suspension.hours_left}h remaining` : 'Buy Now'}
                            className={`flex-1 py-1.5 sm:py-2 md:py-2.5 px-2 sm:px-3 md:px-4 rounded-lg transition-all duration-200 text-[10px] sm:text-xs md:text-sm font-medium touch-manipulation ${
                              suspension?.suspended
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-[#a48a6d] hover:bg-[#8b7355] text-white'
                            }`}>
                            {suspension?.suspended ? '🚫 Suspended' : 'Buy Now'}
                          </button>
                        </div>
                      )}
                      {currentUserRole === 'buyer' && product.stock_quantity === 0 && (
                        <div className="text-center py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-500">Currently unavailable</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {products.length > 0 && (
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {pagination.offset + 1} – {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} products
                  {searchQuery && <span className="ml-1 text-[#8b7355]">for "<strong>{searchQuery}</strong>"</span>}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={prevPage} disabled={pagination.offset === 0}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium touch-manipulation">Previous</button>
                  <button onClick={nextPage} disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-[#a48a6d] hover:bg-[#8b7355] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition text-xs sm:text-sm font-medium touch-manipulation">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add to Cart / Buy Now Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{modalAction === 'cart' ? 'Add to Cart' : 'Buy Now'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.product_image
                    ? <img src={selectedProduct.product_image} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-0.5 text-sm sm:text-base line-clamp-2">{selectedProduct.product_name}</h3>
                  {getStoreName(selectedProduct.users) && (
                    <p className="text-xs text-[#8b7355] font-medium mb-1 flex items-center gap-1">
                      <StoreIcon />
                      {getStoreName(selectedProduct.users)}
                    </p>
                  )}
                  {selectedProduct.category && <p className="text-xs sm:text-sm text-gray-500 mb-2">{selectedProduct.category}</p>}
                  {selectedProduct.discount_percentage > 0 ? (
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-lg sm:text-xl font-bold text-green-600">₱{calculateDiscountedPrice(selectedProduct.price, selectedProduct.discount_percentage)}</span>
                      <span className="text-xs sm:text-sm text-gray-400 line-through">₱{formatPrice(selectedProduct.price)}</span>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900">₱{formatPrice(selectedProduct.price)}</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quantity</label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <button onClick={decreaseQuantity} disabled={quantity <= 1}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation">−</button>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <input type="text" inputMode="numeric"
                      value={quantityDraft !== null ? quantityDraft : quantity}
                      onFocus={() => { setQuantityDraft(String(quantity)); setQuantityError(''); }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQuantityDraft(val);
                        const stock = selectedProduct?.stock_quantity ?? 1;
                        const parsed = parseInt(val, 10);
                        if (val === '' || parsed < 1) setQuantityError('Please enter a quantity of at least 1.');
                        else if (parsed > stock) setQuantityError(`Only ${stock} item${stock !== 1 ? 's' : ''} available in stock.`);
                        else setQuantityError('');
                      }}
                      onBlur={() => {
                        const parsed = parseInt(quantityDraft, 10);
                        const stock = selectedProduct?.stock_quantity ?? 1;
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= stock) { setQuantity(parsed); setQuantityError(''); }
                        setQuantityDraft(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') { setQuantityDraft(null); setQuantityError(''); e.target.blur(); }
                      }}
                      className={`w-16 sm:w-20 text-center text-xl sm:text-2xl font-bold text-gray-900 bg-white border-2 rounded-lg focus:outline-none transition py-1 cursor-text select-all ${quantityError ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-transparent focus:border-[#a48a6d] focus:ring-2 focus:ring-[#a48a6d]/20'}`}
                    />
                    <p className="text-xs text-gray-500">{selectedProduct.stock_quantity} available</p>
                  </div>
                  <button onClick={increaseQuantity} disabled={quantity >= selectedProduct.stock_quantity}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation">+</button>
                </div>
                {quantityError && (
                  <div className="mt-2.5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-3 py-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                    <span className="font-medium">{quantityError}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Total Price:</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#a48a6d]">₱{getTotalPrice()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button onClick={closeModal} className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation">Cancel</button>
                <button onClick={handleConfirm} disabled={!!quantityError}
                  className="w-full sm:flex-1 bg-[#a48a6d] hover:bg-[#8b7355] disabled:bg-[#c9b49a] disabled:cursor-not-allowed text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation">
                  {modalAction === 'cart' ? 'Add to Cart' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
};

export default Productlistpage;