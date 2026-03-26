import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, AlertCircle, Store, Package, MapPin, ChevronDown, X, Check } from 'lucide-react';

// const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error (${res.status})`); }
}

const formatPrice = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ── Toast Notification ─────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id}
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm animate-slideUp
          ${t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800'
          : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
          : t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800'
          :                        'bg-blue-50 border-blue-200 text-blue-800'}`}>
        <span className="text-base leading-none mt-0.5">
          {t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}
        </span>
        <span className="flex-1 leading-snug">{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 transition ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
};

// ── Inline confirm dialog (replaces alert for destructive actions) ──
const ConfirmDialog = ({ dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className={`px-6 py-5 flex items-start gap-4 border-b ${dialog.danger ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dialog.danger ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertCircle className={`h-5 w-5 ${dialog.danger ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-base ${dialog.danger ? 'text-red-900' : 'text-blue-900'}`}>{dialog.message}</h3>
            {dialog.subMessage && (
              <p className={`text-sm mt-1 whitespace-pre-line ${dialog.danger ? 'text-red-700' : 'text-blue-700'}`}>{dialog.subMessage}</p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 flex gap-3 justify-end">
          {dialog.showCancel && (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm">Cancel</button>
          )}
          <button
            onClick={() => { dialog.onConfirm?.(); }}
            className={`px-5 py-2 rounded-lg text-white font-semibold text-sm transition ${dialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {dialog.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── LBC Delivery Estimate (from Legazpi City, Bicol) ───────────────
const getDeliveryEstimate = (city = '', province = '', fromDate = new Date()) => {
  const fmt     = d => d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const cityNorm     = city.trim().toLowerCase().replace(/\s+/g, '');
  const provinceNorm = province.trim().toLowerCase();

  // Same city — Legazpi to Legazpi
  if (cityNorm === 'legazpicity' || cityNorm === 'legazpi') {
    return {
      label: 'Same Day – Next Day',
      range: `${fmt(fromDate)} – ${fmt(addDays(fromDate, 1))}`,
      icon: '🏠', color: 'green',
    };
  }

  // Bicol Region provinces (nearby)
  const bicolProvinces = ['albay', 'camarines sur', 'camarines norte', 'sorsogon', 'masbate', 'catanduanes'];
  if (bicolProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '2–3 Business Days',
      range: `${fmt(addDays(fromDate, 2))} – ${fmt(addDays(fromDate, 3))}`,
      icon: '📦', color: 'blue',
    };
  }

  // Rest of Luzon
  const luzonProvinces = [
    'metro manila', 'ncr', 'manila', 'quezon city', 'laguna', 'batangas', 'cavite',
    'rizal', 'bulacan', 'pampanga', 'nueva ecija', 'tarlac', 'pangasinan',
    'ilocos', 'la union', 'benguet', 'nueva vizcaya', 'quirino', 'aurora',
    'bataan', 'zambales', 'quezon', 'marinduque', 'occidental mindoro',
    'oriental mindoro', 'palawan', 'romblon', 'mindoro',
  ];
  if (luzonProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '3–5 Business Days',
      range: `${fmt(addDays(fromDate, 3))} – ${fmt(addDays(fromDate, 5))}`,
      icon: '🚚', color: 'blue',
    };
  }

  // Visayas
  const visayasProvinces = [
    'cebu', 'bohol', 'leyte', 'samar', 'negros', 'iloilo', 'capiz', 'aklan',
    'antique', 'guimaras', 'biliran', 'eastern samar', 'northern samar',
    'western samar', 'southern leyte', 'siquijor',
  ];
  if (visayasProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '5–7 Business Days',
      range: `${fmt(addDays(fromDate, 5))} – ${fmt(addDays(fromDate, 7))}`,
      icon: '✈️', color: 'orange',
    };
  }

  // Mindanao
  const mindanaoProvinces = [
    'davao', 'bukidnon', 'misamis', 'cagayan de oro', 'zamboanga', 'lanao',
    'sultan kudarat', 'sarangani', 'south cotabato', 'north cotabato',
    'maguindanao', 'basilan', 'sulu', 'tawi-tawi', 'agusan', 'surigao',
    'dinagat', 'compostela',
  ];
  if (mindanaoProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '7–10 Business Days',
      range: `${fmt(addDays(fromDate, 7))} – ${fmt(addDays(fromDate, 10))}`,
      icon: '🛳️', color: 'red',
    };
  }

  // Fallback
  return {
    label: '3–7 Business Days',
    range: `${fmt(addDays(fromDate, 3))} – ${fmt(addDays(fromDate, 7))}`,
    icon: '🚚', color: 'blue',
  };
};

const colorMap = {
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-800',  sub: 'text-green-700'  },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-800',   sub: 'text-blue-700'   },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800', sub: 'text-orange-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-800',    sub: 'text-red-700'    },
};

const DeliveryBanner = ({ city, province, orderDate }) => {
  if (!city && !province) return null;
  const est = getDeliveryEstimate(city || '', province || '', orderDate || new Date());
  const c   = colorMap[est.color] || colorMap.blue;
  return (
    <div className={`rounded-lg p-3 border flex gap-3 ${c.bg} ${c.border}`}>
      <span className="text-lg leading-none mt-0.5">{est.icon}</span>
      <div>
        <p className={`text-sm font-semibold ${c.title}`}>
          Estimated Delivery: {est.label}
        </p>
        <p className={`text-xs mt-0.5 ${c.sub}`}>Expected: {est.range}</p>
        <p className={`text-xs mt-1 opacity-70 ${c.sub}`}>
          Business days only, excluding holidays
        </p>
        <p className={`text-xs mt-0.5 opacity-60 ${c.sub}`}>
          Actual delivery may vary. Tracking number will be provided once seller ships your order.
        </p>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────
const CheckoutPage = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToast();

  const [currentStep, setCurrentStep]             = useState(1);
  const [cartItems,   setCartItems]               = useState([]);
  const [loading,     setLoading]                 = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [dialog, setDialog]                       = useState(null);

  const [savedAddresses,    setSavedAddresses]    = useState([]);
  const [selectedAddress,   setSelectedAddress]   = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [addressLoading,    setAddressLoading]    = useState(true);

  const PLATFORM_FEE_PERCENTAGE = 0.10;

  const [shippingFee,     setShippingFee]     = useState(null);
  const [shippingZone,    setShippingZone]    = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingNote,    setShippingNote]    = useState('');

  const [contactInfo,       setContactInfo]       = useState({ fullName: '', email: '', phone: '' });
  const [paymentMethod,     setPaymentMethod]     = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // ── FIX: ref to track the active beforeunload handler so we can remove it ──
  const abandonHandlerRef = useRef(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  const steps = [
    { id: 1, name: 'Review Order' },
    { id: 2, name: 'Payment' },
    { id: 3, name: 'Confirmation' },
  ];

  // Helper: show a simple info/error dialog (replaces alert)
  const showDialog = (message, subMessage, opts = {}) => {
    setDialog({
      message,
      subMessage,
      confirmLabel: opts.confirmLabel || 'OK',
      danger: opts.danger || false,
      showCancel: opts.showCancel || false,
      onConfirm: () => { opts.onConfirm?.(); setDialog(null); },
    });
  };

  // ── FIX: release stock reservation via sendBeacon when user abandons payment ──
  const registerAbandonHandler = useCallback((reservationId) => {
    // Remove any previous handler first
    if (abandonHandlerRef.current) {
      window.removeEventListener('beforeunload', abandonHandlerRef.current);
    }

    const handler = () => {
      const rid = localStorage.getItem('pendingReservation');
      if (!rid) return;
      // sendBeacon is fire-and-forget and works even as the page unloads
      navigator.sendBeacon(
        `${API_BASE_URL}/orders/release-stock/${rid}`,
        new Blob(['{}'], { type: 'application/json' })
      );
      localStorage.removeItem('pendingReservation');
    };

    localStorage.setItem('pendingReservation', reservationId);
    window.addEventListener('beforeunload', handler);
    abandonHandlerRef.current = handler;
  }, []);

  // ── FIX: clear the abandon handler once payment succeeds ──
  const clearAbandonHandler = useCallback(() => {
    if (abandonHandlerRef.current) {
      window.removeEventListener('beforeunload', abandonHandlerRef.current);
      abandonHandlerRef.current = null;
    }
    localStorage.removeItem('pendingReservation');
  }, []);

  // ── FIX: on mount, release any leftover reservation from a previous crashed session ──
  useEffect(() => {
    const leftoverReservationId = localStorage.getItem('pendingReservation');
    const params = new URLSearchParams(window.location.search);
    const isReturningFromPayment = params.get('payment_success') === 'true';

    if (leftoverReservationId && !isReturningFromPayment) {
      // User came back without completing payment — release immediately
      fetch(`${API_BASE_URL}/orders/release-stock/${leftoverReservationId}`, { method: 'POST' })
        .catch(err => console.error('Failed to release leftover reservation:', err));
      localStorage.removeItem('pendingReservation');
    }
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setContactInfo({ fullName: u.full_name || u.name || '', email: u.email || '', phone: u.phone || '' });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      setAddressLoading(true);
      try {
        const res  = await fetch(`${API_BASE_URL}/addresses/user/${currentUserId}`);
        const data = await safeJson(res);
        if (res.ok && Array.isArray(data) && data.length > 0) {
          setSavedAddresses(data);
          const def = data.find(a => a.is_default) || data[0];
          setSelectedAddress(def);
        }
      } catch (e) { console.error('Failed to load addresses:', e); }
      finally { setAddressLoading(false); }
    })();
  }, [currentUserId]);

  const normalizeCartItems = (items) =>
    (items || []).map(item => ({
      ...item,
      product_id: item.product?.id || item.product_id,
    }));

  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    const stateItems = location.state?.checkoutItems;
    if (stateItems?.length > 0) {
      setCartItems(normalizeCartItems(stateItems));
      setLoading(false);
    } else {
      fetchCartItems();
    }
  }, [currentUserId]);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      setCartItems(normalizeCartItems(data.cart_items || []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getTotalWeightKg = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const weight   = parseFloat(item.product?.weight || 0);
      const unit     = (item.product?.weight_unit || 'g').toLowerCase();
      const weightKg = unit === 'kg' ? weight : weight / 1000;
      return total + (weightKg * item.quantity);
    }, 0);
  }, [cartItems]);

  const fetchShippingFee = useCallback(async (address, items) => {
    if (!address?.province || !items?.length) { setShippingFee(null); setShippingZone(''); return; }
    const totalWeightKg = items.reduce((total, item) => {
      const weight   = parseFloat(item.product?.weight || 0);
      const unit     = (item.product?.weight_unit || 'g').toLowerCase();
      const weightKg = unit === 'kg' ? weight : weight / 1000;
      return total + (weightKg * item.quantity);
    }, 0);
    const weightToSend = Math.max(totalWeightKg, 0.1);
    setShippingLoading(true);
    setShippingNote('');
    try {
      const params = new URLSearchParams({ province: address.province, weight_kg: weightToSend.toFixed(3) });
      const res    = await fetch(`${API_BASE_URL}/shipping/calculate?${params}`);
      const data   = await safeJson(res);
      if (res.ok && data.success) {
        setShippingFee(parseFloat(data.fee));
        setShippingZone(data.zone || '');
        if (data.note) setShippingNote(data.note);
      } else {
        setShippingFee(150);
        setShippingZone('');
        setShippingNote('Could not calculate exact rate, estimated fee applied');
      }
    } catch (e) {
      setShippingFee(150);
      setShippingNote('Network error, estimated fee applied');
    } finally {
      setShippingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAddress && cartItems.length > 0) fetchShippingFee(selectedAddress, cartItems);
  }, [selectedAddress, cartItems, fetchShippingFee]);

  const checkoutSellerId   = location.state?.sellerId || null;
  const checkoutSellerName =
    cartItems[0]?.product?.seller_name ||
    cartItems[0]?.product?.brand ||
    (checkoutSellerId ? `Seller ${checkoutSellerId.slice(0, 6)}` : null);

  const getTotalProducts     = () => cartItems.reduce((s, i) => s + i.quantity, 0);
  const calculateSubtotal    = () => cartItems.reduce((s, i) => s + (i.price || i.product?.price || 0) * i.quantity, 0).toFixed(2);
  const calculatePlatformFee = () => (parseFloat(calculateSubtotal()) * PLATFORM_FEE_PERCENTAGE).toFixed(2);
  const calculateShippingFee = () => { if (shippingFee === null) return '0.00'; return parseFloat(shippingFee).toFixed(2); };
  const calculateTotal       = () => (parseFloat(calculateSubtotal()) + parseFloat(calculatePlatformFee()) + parseFloat(calculateShippingFee())).toFixed(2);

  const ShippingFeeBanner = () => {
    if (!selectedAddress?.province) return null;
    if (shippingLoading) {
      return (
        <div className="rounded-lg p-4 border bg-gray-50 border-gray-200 flex gap-3 items-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin shrink-0" />
          <p className="text-sm text-gray-600">Calculating shipping fee for {selectedAddress.province}...</p>
        </div>
      );
    }
    if (shippingFee === null) return null;
    const totalWeightKg = getTotalWeightKg();
    return (
      <div className="rounded-lg p-4 border bg-blue-50 border-blue-200 flex gap-3">
        <Truck className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-blue-800">Shipping to {selectedAddress.province}{shippingZone ? ` · ${shippingZone}` : ''}</p>
          <p className="mt-0.5 text-blue-700">₱{formatPrice(shippingFee)} — based on {totalWeightKg > 0 ? `${totalWeightKg.toFixed(2)}kg` : 'estimated weight'}</p>
          {shippingNote && <p className="mt-1 text-xs text-blue-600 italic">{shippingNote}</p>}
        </div>
      </div>
    );
  };

  const buildShippingInfo = () => ({
    fullName:   selectedAddress?.full_name  || contactInfo.fullName,
    email:      contactInfo.email,
    phone:      selectedAddress?.phone      || contactInfo.phone,
    address:    selectedAddress?.street     || '',
    city:       selectedAddress?.city       || '',
    province:   selectedAddress?.province   || '',
    postalCode: selectedAddress?.zip_code   || '',
  });

  const handleProceedToPayment = () => {
    if (!selectedAddress) {
      addToast('Please select a delivery address before proceeding.', 'warning');
      return;
    }
    if (shippingLoading) {
      addToast('Please wait while the shipping fee is being calculated.', 'info');
      return;
    }
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMethod) {
      addToast('Please select a payment method.', 'warning');
      return;
    }
    if ((paymentMethod === 'gcash' || paymentMethod === 'paypal') && parseFloat(calculateTotal()) < 100) {
      showDialog(
        'Minimum amount required',
        `Total (₱${formatPrice(calculateTotal())}) is below ₱100.00 minimum for GCash and PayPal. Please use Cash on Delivery instead.`,
        { confirmLabel: 'Got it' }
      );
      return;
    }
    if (paymentMethod === 'cod') { processOrder(); return; }
    await initiatePayMongoPayment();
  };

  const initiatePayMongoPayment = async () => {
    const si = buildShippingInfo();
    let reservationId = null;

    try {
      setProcessingPayment(true);
      const totalAmount = Math.round(parseFloat(calculateTotal()) * 100);
      if (totalAmount < 10000) {
        showDialog('Minimum order amount', 'Minimum order amount for online payment is ₱100.00.', { confirmLabel: 'Got it' });
        setProcessingPayment(false);
        return;
      }

      // Reserve stock before going to payment gateway
      const reserveRes  = await fetch(`${API_BASE_URL}/orders/reserve-stock`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cart_items: cartItems, user_id: currentUserId })
      });
      const reserveData = await reserveRes.json();

      if (!reserveRes.ok) {
        if (reserveData.stock_errors?.length > 0) {
          showDialog(
            '⚠️ Some items are no longer available',
            reserveData.stock_errors.join('\n') + '\n\nYou will be returned to your cart.',
            { confirmLabel: 'Go to Cart', onConfirm: () => navigate('/buyer/cart') }
          );
          return;
        }
        throw new Error(reserveData.error || 'Failed to reserve stock');
      }

      reservationId = reserveData.reservation_id;

      // ── FIX: register the abandon handler as soon as we have a reservation ID ──
      // If the user closes the tab or navigates away from the payment gateway,
      // sendBeacon will call release-stock to restore the inventory immediately.
      registerAbandonHandler(reservationId);

      const res = await fetch(`${API_BASE_URL}/payment/create-payment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          amount: totalAmount, payment_method: paymentMethod, currency: 'PHP',
          description: `Order for ${si.fullName}`,
          billing: {
            name: si.fullName, email: si.email, phone: si.phone,
            address: { line1: si.address, city: si.city, state: si.province, postal_code: si.postalCode, country: 'PH' }
          }
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create payment'); }
      const data = await res.json();

      if (data.checkout_url) {
        localStorage.setItem('pendingOrder', JSON.stringify({
          user_id:           currentUserId,
          shipping_info:     si,
          payment_method:    paymentMethod,
          cart_items:        cartItems,
          seller_id:         checkoutSellerId,
          subtotal:          calculateSubtotal(),
          tax:               calculatePlatformFee(),
          shipping_fee:      calculateShippingFee(),
          total:             calculateTotal(),
          payment_intent_id: data.payment_intent_id,
          reservation_id:    reservationId,
        }));
        // Note: do NOT clear the abandon handler here — it must stay active
        // until the user either completes payment (payment_success=true) or abandons.
        window.location.href = data.checkout_url;
      }
    } catch (e) {
      if (reservationId) {
        // ── FIX: also clear the abandon handler on error since we're releasing manually ──
        clearAbandonHandler();
        fetch(`${API_BASE_URL}/orders/release-stock/${reservationId}`, { method: 'POST' })
          .catch(err => console.error('Failed to release reservation:', err));
      }
      showDialog('Payment failed', e.message || 'Failed to process payment. Please try again.', { danger: true, confirmLabel: 'Try Again' });
      setProcessingPayment(false);
    }
  };

  const processOrder = async (paymentIntentId = null) => {
    const si = buildShippingInfo();
    const normalizedItems = cartItems.map(item => ({
      ...item,
      product_id: item.product?.id || item.product_id
    }));

    setLoading(true);
    try {
      const stockErrors = [];
      await Promise.all(normalizedItems.map(async (item) => {
        try {
          const res     = await fetch(`${API_BASE_URL}/products/${item.product_id}`);
          if (!res.ok)  { stockErrors.push(`"${item.product?.product_name || 'A product'}" is no longer available.`); return; }
          const data    = await res.json();
          const product = data.product || data;
          if (!product.is_active) {
            stockErrors.push(`"${product.product_name}" was removed by the seller.`);
          } else if (product.stock_quantity < item.quantity) {
            stockErrors.push(
              product.stock_quantity === 0
                ? `"${product.product_name}" just sold out.`
                : `"${product.product_name}" only has ${product.stock_quantity} left (you ordered ${item.quantity}).`
            );
          }
        } catch {
          stockErrors.push(`Could not verify "${item.product?.product_name || 'a product'}". Please try again.`);
        }
      }));

      if (stockErrors.length > 0) {
        showDialog(
          '⚠️ Cannot place order',
          stockErrors.join('\n') + '\n\nYou will be taken back to your cart.',
          { confirmLabel: 'Go to Cart', onConfirm: () => navigate('/buyer/cart') }
        );
        return;
      }
    } catch (e) {
      addToast('Could not verify stock availability. Please try again.', 'error');
      return;
    } finally {
      setLoading(false);
    }

    try {
      setLoading(true);
      const orderData = {
        user_id:           currentUserId,
        seller_id:         checkoutSellerId,
        shipping_info:     si,
        payment_method:    paymentMethod,
        cart_items:        normalizedItems,
        subtotal:          calculateSubtotal(),
        tax:               calculatePlatformFee(),
        shipping_fee:      calculateShippingFee(),
        total:             calculateTotal(),
        payment_intent_id: paymentIntentId,
        payment_status:    paymentMethod === 'cod' ? 'pending' : 'paid'
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(orderData)
      });

      if (!res.ok) {
        const e = await res.json();
        if (e.stock_errors?.length > 0) {
          showDialog(
            '⚠️ Stock changed during checkout',
            e.stock_errors.join('\n') + '\n\nReturning to your cart.',
            { confirmLabel: 'Go to Cart', onConfirm: () => navigate('/buyer/cart') }
          );
        } else {
          showDialog('Order failed', e.error || 'Failed to process order. Please try again.', { danger: true, confirmLabel: 'Try Again' });
        }
        return;
      }

      const data = await res.json();
      setOrderConfirmation({
        orderNumber: data.order.order_number,
        orderId:     data.order.id,
        date:        new Date(data.order.order_date).toLocaleDateString(),
        ...orderData
      });
      setCurrentStep(3);
    } catch (e) {
      showDialog('Order failed', 'Failed to process order. Please try again.', { danger: true, confirmLabel: 'Try Again' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('payment_success') === 'true') {
      // ── FIX: clear the abandon handler — payment succeeded, stock must NOT be released ──
      clearAbandonHandler();

      const pending = localStorage.getItem('pendingOrder');
      if (pending) {
        const od = JSON.parse(pending);
        const normalizedOd = {
          ...od,
          cart_items: (od.cart_items || []).map(item => ({
            ...item,
            product_id: item.product?.id || item.product_id,
          }))
        };
        setPaymentMethod(normalizedOd.payment_method);
        setCartItems(normalizedOd.cart_items);
        if (p.get('payment_method') === 'paypal' && p.get('token')) {
          processPayPalOrder(normalizedOd, p.get('token'));
        } else if (p.get('payment_intent_id')) {
          processOrderWithData(normalizedOd, p.get('payment_intent_id'));
        }
        localStorage.removeItem('pendingOrder');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        showDialog(
          'Order data missing',
          'Payment was successful but order data was lost. Please contact support with your payment reference.',
          { danger: true, confirmLabel: 'OK' }
        );
      }
    }
  }, []);

  const processPayPalOrder = async (od, token) => {
    try {
      setLoading(true);
      const cr = await fetch(`${API_BASE_URL}/payment/capture-paypal/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      });
      if (!cr.ok) throw new Error('Failed to capture PayPal payment');
      const cd = await cr.json();
      const rd = {
        ...od,
        payment_method:     'paypal',
        payment_intent_id:  token,
        payment_capture_id: cd.capture_id,
        payment_status:     'paid'
      };
      const r = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd)
      });
      if (!r.ok) throw new Error('Failed to process order');
      const d = await r.json();
      setOrderConfirmation({
        orderNumber: d.order.order_number,
        orderId:     d.order.id,
        date:        new Date(d.order.order_date).toLocaleDateString(),
        ...rd
      });
      setCurrentStep(3);
    } catch (e) {
      showDialog('PayPal payment failed', e.message || 'Failed to process PayPal payment.', { danger: true, confirmLabel: 'Try Again' });
    } finally { setLoading(false); }
  };

  const processOrderWithData = async (od, paymentIntentId) => {
    try {
      setLoading(true);
      const rd = {
        ...od,
        payment_intent_id: paymentIntentId,
        payment_status:    od.payment_method === 'cod' ? 'pending' : 'paid'
      };
      const r = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd)
      });

      if (!r.ok) {
        const e = await r.json();
        if (e.reservation_expired) {
          showDialog(
            'Payment reservation expired',
            'Your 30-minute reservation expired. Your GCash/PayPal payment will be refunded automatically. Please try ordering again.',
            { confirmLabel: 'Browse Products', onConfirm: () => navigate('/buyer/products') }
          );
          return;
        }
        throw new Error(e.error || 'Failed to process order');
      }

      const d = await r.json();
      setOrderConfirmation({
        orderNumber: d.order.order_number,
        orderId:     d.order.id,
        date:        new Date(d.order.order_date).toLocaleDateString(),
        ...rd
      });
      setCurrentStep(3);
    } catch (e) {
      showDialog('Order failed', e.message || 'Failed to create order.', { danger: true, confirmLabel: 'Try Again' });
    } finally { setLoading(false); }
  };

  const totalProducts   = getTotalProducts();
  const meetsMinPayment = parseFloat(calculateTotal()) >= 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">{processingPayment ? 'Reserving stock & processing payment...' : 'Loading checkout...'}</p>
        </div>
      </div>
    );
  }

  const si = buildShippingInfo();

  return (
    <div className="min-h-screen bg-white">

      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} />

      {/* Progress Bar */}
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step.id ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {currentStep > step.id
                      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      : step.id}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${currentStep >= step.id ? 'text-green-600' : 'text-gray-500'}`}>{step.name}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* STEP 1: Order Review */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Order Review</h2>

              {checkoutSellerName && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <Store className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-700">Checking out from:</p>
                    <p className="font-bold text-green-900">{checkoutSellerName}</p>
                  </div>
                </div>
              )}

              {/* Delivery Address Card */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Delivery Address</span>
                </div>

                {addressLoading ? (
                  <div className="px-5 py-6 flex items-center gap-3 text-gray-500">
                    <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span className="text-sm">Loading addresses...</span>
                  </div>
                ) : selectedAddress ? (
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {selectedAddress.label && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedAddress.label === 'Home' ? '🏠' : selectedAddress.label === 'Work' ? '🏢' : '📍'} {selectedAddress.label}
                          </span>
                        )}
                        {selectedAddress.is_default && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">✓ Default</span>}
                      </div>
                      <p className="font-bold text-gray-900">{selectedAddress.full_name}</p>
                      <p className="text-sm text-gray-600">{selectedAddress.phone}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.province} {selectedAddress.zip_code}</p>
                    </div>
                    {savedAddresses.length > 1 && (
                      <button type="button" onClick={() => setShowAddressPicker(true)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-500 text-green-600 text-sm font-semibold hover:bg-green-50 transition">
                        <ChevronDown className="w-4 h-4" />Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No saved address found. Please </p>
                    {/* <button type="button" onClick={() => navigate('/buyer/profile?tab=addresses')} className="text-sm text-green-600 underline font-semibold hover:text-green-800">+ Add a delivery address</button> */}
                  </div>
                )}
              </div>

              {/* Address Picker Modal */}
              {showAddressPicker && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowAddressPicker(false)} />
                  <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '28rem' }} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-gray-900">Select Address</span>
                      </div>
                      <button onClick={() => setShowAddressPicker(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {savedAddresses.map(addr => {
                        const isSelected = selectedAddress?.id === addr.id;
                        return (
                          <button key={addr.id} type="button"
                            onClick={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {addr.label && (
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                      {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '🏢' : '📍'} {addr.label}
                                    </span>
                                  )}
                                  {addr.is_default && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">✓ Default</span>}
                                </div>
                                <p className="font-semibold text-gray-900 text-sm">{addr.full_name}</p>
                                <p className="text-xs text-gray-500">{addr.phone}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{addr.street}, {addr.city}, {addr.province} {addr.zip_code}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Order Items</span>
                  <span className="ml-auto text-xs text-gray-500">{totalProducts} item{totalProducts !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {cartItems.map(item => (
                    <div key={item.id} className="p-4 flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {item.product?.product_image
                          ? <img src={item.product.product_image} alt={item.product.product_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-7 h-7 text-gray-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{item.product?.product_name}</p>
                        <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                        {item.product?.weight > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Weight: {item.product.weight_unit === 'kg' ? `${item.product.weight}kg` : `${item.product.weight}g`} × {item.quantity}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <p className="font-bold text-gray-900">₱{formatPrice((item.price || item.product?.price || 0) * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <ShippingFeeBanner />

              {/* Delivery estimate below shipping banner */}
              {selectedAddress?.city && (
                <DeliveryBanner
                  city={selectedAddress.city}
                  province={selectedAddress.province}
                  orderDate={new Date()}
                />
              )}

              <button onClick={handleProceedToPayment} disabled={!selectedAddress || shippingLoading}
                className="w-full bg-green-500 text-white py-4 rounded-xl hover:bg-green-600 transition font-bold text-lg shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed">
                {shippingLoading ? 'Calculating shipping...' : 'Proceed to Payment'}
              </button>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-gray-50 rounded-xl p-6 sticky top-6 space-y-5">
                <h3 className="font-bold text-gray-900">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">₱{formatPrice(calculateSubtotal())}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Platform Fee (10%)</span><span className="font-medium">₱{formatPrice(calculatePlatformFee())}</span></div>
                  <div className="flex justify-between text-gray-600">
                    <div className="flex flex-col">
                      <span>Shipping Fee</span>
                      {shippingZone && <span className="text-xs text-blue-600 font-medium">{shippingZone}</span>}
                    </div>
                    <span className="font-medium">{shippingLoading ? <span className="text-gray-400">Calculating...</span> : `₱${formatPrice(calculateShippingFee())}`}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-green-600">₱{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
                {selectedAddress?.city && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📦 Delivery Estimate</p>
                    <DeliveryBanner
                      city={selectedAddress.city}
                      province={selectedAddress.province}
                      orderDate={new Date()}
                    />
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4 text-sm">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-500">Shipping fee is automatically calculated based on your delivery province and total package weight.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Payment */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Select Payment Method</h2>

            {checkoutSellerName && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                <Store className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-900">Paying for: {checkoutSellerName}</p>
              </div>
            )}

            {selectedAddress && (
              <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-gray-700">Delivering to:</p>
                  <p className="text-gray-600">{selectedAddress.full_name} · {selectedAddress.phone}</p>
                  <p className="text-gray-600">{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.province}</p>
                </div>
                <button onClick={() => setCurrentStep(1)} className="text-xs text-green-600 underline font-semibold shrink-0">Change</button>
              </div>
            )}

            {!meetsMinPayment && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Minimum Amount Required</p>
                    <p className="text-sm text-yellow-700 mt-1">Total (₱{formatPrice(calculateTotal())}) is below ₱100.00 minimum for GCash/PayPal.</p>
                  </div>
                </div>
              </div>
            )}

            {meetsMinPayment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Stock is held for 30 minutes</p>
                  <p className="text-sm text-blue-700 mt-0.5">When you click "Complete Order" for GCash or PayPal, your items are reserved so no one else can buy them while you pay.</p>
                </div>
              </div>
            )}

            {/* Delivery estimate on payment step */}
            <div className="mb-6">
              <DeliveryBanner city={selectedAddress?.city} province={selectedAddress?.province} />
            </div>

            <div className="space-y-4 mb-8">
              {[
                { id: 'gcash',  label: 'GCash',  sub: 'Pay securely with GCash',  icon: <span className="text-white font-bold text-xl">G</span>, bg: 'bg-blue-600' },
                { id: 'paypal', label: 'PayPal', sub: 'Pay securely with PayPal', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.936.936 0 0 1 .92-.768h6.811c1.863 0 3.339.394 4.428 1.182 1.089.788 1.634 1.954 1.634 3.498 0 .844-.172 1.616-.516 2.316-.344.7-.838 1.298-1.482 1.794a6.418 6.418 0 0 1-2.271 1.078c-.885.22-1.847.33-2.886.33h-1.447l-.994 6.187a.643.643 0 0 1-.633.533z"/></svg>, bg: 'bg-blue-500' }
              ].map(pm => (
                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} disabled={!meetsMinPayment}
                  className={`w-full p-6 rounded-lg border-2 transition-all ${!meetsMinPayment ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed' : paymentMethod === pm.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 ${pm.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>{pm.icon}</div>
                    <div className="text-left flex-1"><h3 className="font-bold text-gray-900 text-lg">{pm.label}</h3><p className="text-sm text-gray-600">{pm.sub}</p></div>
                    {paymentMethod === pm.id && meetsMinPayment && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              ))}
              <button onClick={() => setPaymentMethod('cod')}
                className={`w-full p-6 rounded-lg border-2 transition-all ${paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <div className="text-left flex-1"><h3 className="font-bold text-gray-900 text-lg">Cash on Delivery</h3><p className="text-sm text-gray-600">Pay when you receive your order</p></div>
                  {paymentMethod === 'cod' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₱{formatPrice(calculateSubtotal())}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Platform Fee (10%)</span><span>₱{formatPrice(calculatePlatformFee())}</span></div>
                <div className="flex justify-between text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span>Shipping Fee</span>
                    {shippingZone && <span className="text-xs text-blue-600 font-medium">{shippingZone} zone</span>}
                  </div>
                  <span>₱{formatPrice(calculateShippingFee())}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-3xl font-bold text-green-600">₱{formatPrice(calculateTotal())}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold">Back</button>
              <button onClick={handlePaymentSubmit} disabled={!paymentMethod || processingPayment || loading}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying stock...</>
                ) : processingPayment ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Reserving & redirecting...</>
                ) : 'Complete Order'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {currentStep === 3 && orderConfirmation && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
              <p className="text-gray-600">Thank you for your purchase</p>
              {checkoutSellerName && (
                <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
                  <Store className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">From: {checkoutSellerName}</span>
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-8 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-sm text-gray-600 mb-1">Order Number</p><p className="font-bold text-gray-900">{orderConfirmation.orderNumber}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Order Date</p><p className="font-bold text-gray-900">{orderConfirmation.date}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Payment Method</p><p className="font-bold text-gray-900 capitalize">{paymentMethod.replace('-', ' ')}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Total Amount</p><p className="font-bold text-green-600 text-xl">₱{formatPrice(calculateTotal())}</p></div>
              </div>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Shipping To:</p>
                <p className="font-medium text-gray-900">{si.fullName}</p>
                <p className="text-sm text-gray-600">{si.address}</p>
                <p className="text-sm text-gray-600">{si.city}, {si.province} {si.postalCode}</p>
              </div>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">📦 Estimated Delivery</p>
                <DeliveryBanner city={si.city} province={si.province} orderDate={new Date()} />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Platform Fee</span><span>₱{formatPrice(orderConfirmation.tax)}</span></div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping Fee {shippingZone ? `(${shippingZone})` : ''}</span>
                  <span>₱{formatPrice(orderConfirmation.shipping_fee)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={() => navigate('/buyer/products')} className="w-full bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg">Continue Shopping</button>
              <button onClick={() => navigate('/buyer/cart?tab=orders')} className="w-full bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold">View My Orders</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default CheckoutPage;