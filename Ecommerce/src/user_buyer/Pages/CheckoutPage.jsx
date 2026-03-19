import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, AlertCircle, Store, Package, MapPin, ChevronDown, X, Check } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Server error (${res.status})`); }
}

// ✅ Format number with commas for thousands
const formatPrice = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CheckoutPage = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Addresses
  const [savedAddresses, setSavedAddresses]     = useState([]);
  const [selectedAddress, setSelectedAddress]   = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [addressLoading, setAddressLoading]     = useState(true);

  const PLATFORM_FEE_PERCENTAGE = 0.10;

  // Shipping state
  const [shippingFee, setShippingFee]           = useState(null);
  const [shippingZone, setShippingZone]         = useState('');
  const [shippingLoading, setShippingLoading]   = useState(false);
  const [shippingNote, setShippingNote]         = useState('');

  const [contactInfo, setContactInfo] = useState({ fullName: '', email: '', phone: '' });
  const [paymentMethod, setPaymentMethod]         = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  const steps = [
    { id: 1, name: 'Review Order' },
    { id: 2, name: 'Payment' },
    { id: 3, name: 'Confirmation' },
  ];

  // Load contact info
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setContactInfo({ fullName: u.full_name || u.name || '', email: u.email || '', phone: u.phone || '' });
  }, []);

  // Load saved addresses
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

  // Load cart
  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    const stateItems = location.state?.checkoutItems;
    if (stateItems?.length > 0) {
      setCartItems(stateItems);
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
      setCartItems(data.cart_items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getTotalWeightKg = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const weight = parseFloat(item.product?.weight || 0);
      const unit   = (item.product?.weight_unit || 'g').toLowerCase();
      const weightKg = unit === 'kg' ? weight : weight / 1000;
      return total + (weightKg * item.quantity);
    }, 0);
  }, [cartItems]);

  const fetchShippingFee = useCallback(async (address, items) => {
    if (!address?.province || !items?.length) { setShippingFee(null); setShippingZone(''); return; }
    const totalWeightKg = items.reduce((total, item) => {
      const weight = parseFloat(item.product?.weight || 0);
      const unit   = (item.product?.weight_unit || 'g').toLowerCase();
      const weightKg = unit === 'kg' ? weight : weight / 1000;
      return total + (weightKg * item.quantity);
    }, 0);
    const weightToSend = Math.max(totalWeightKg, 0.1);
    setShippingLoading(true);
    setShippingNote('');
    try {
      const params = new URLSearchParams({ province: address.province, weight_kg: weightToSend.toFixed(3) });
      const res  = await fetch(`${API_BASE_URL}/shipping/calculate?${params}`);
      const data = await safeJson(res);
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

  // Derived
  const checkoutSellerId   = location.state?.sellerId || null;
  const checkoutSellerName =
    cartItems[0]?.product?.seller_name ||
    cartItems[0]?.product?.brand ||
    (checkoutSellerId ? `Seller ${checkoutSellerId.slice(0, 6)}` : null);

  const getTotalProducts     = () => cartItems.reduce((s, i) => s + i.quantity, 0);
  const calculateSubtotal    = () => cartItems.reduce((s, i) => s + (i.price || i.product?.price || 0) * i.quantity, 0).toFixed(2);
  const calculatePlatformFee = () => (parseFloat(calculateSubtotal()) * PLATFORM_FEE_PERCENTAGE).toFixed(2);
  const calculateShippingFee = () => { if (shippingFee === null) return '0.00'; return parseFloat(shippingFee).toFixed(2); };
  const calculateTotal = () => (parseFloat(calculateSubtotal()) + parseFloat(calculatePlatformFee()) + parseFloat(calculateShippingFee())).toFixed(2);

  const getDeliveryEstimate = (city = '', fromDate = new Date()) => {
    const isLegazpi = city.trim().toLowerCase().replace(/\s+/g, '') === 'legazpicity' || city.trim().toLowerCase() === 'legazpi';
    const base = new Date(fromDate);
    const fmt  = d => d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
    if (isLegazpi) {
      const t = new Date(base), tm = new Date(base);
      tm.setDate(tm.getDate() + 1);
      return { label: 'Today or Tomorrow', range: `${fmt(t)} – ${fmt(tm)}`, isLocal: true };
    }
    const mn = new Date(base), mx = new Date(base);
    mn.setDate(mn.getDate() + 3); mx.setDate(mx.getDate() + 4);
    return { label: '3–4 Business Days', range: `${fmt(mn)} – ${fmt(mx)}`, isLocal: false };
  };

  const DeliveryBanner = ({ city, orderDate }) => {
    if (!city) return null;
    const est = getDeliveryEstimate(city, orderDate);
    return (
      <div className={`rounded-lg p-3 border flex gap-3 ${est.isLocal ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <span className="text-lg">{est.isLocal ? '🏠' : '🚚'}</span>
        <div>
          <p className={`text-sm font-semibold ${est.isLocal ? 'text-green-800' : 'text-blue-800'}`}>Estimated Delivery: {est.label}</p>
          <p className={`text-xs mt-0.5 ${est.isLocal ? 'text-green-700' : 'text-blue-700'}`}>Expected: {est.range}</p>
        </div>
      </div>
    );
  };

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
    if (!selectedAddress) { alert('Please select a delivery address before proceeding.'); return; }
    if (shippingLoading) { alert('Please wait while the shipping fee is being calculated.'); return; }
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMethod) { alert('Please select a payment method'); return; }
    if ((paymentMethod === 'gcash' || paymentMethod === 'paypal') && parseFloat(calculateTotal()) < 100) {
      alert('Minimum order amount for GCash and PayPal is ₱100.00. Please use Cash on Delivery.');
      return;
    }
    if (paymentMethod === 'cod') { processOrder(); return; }
    await initiatePayMongoPayment();
  };

  const initiatePayMongoPayment = async () => {
    const si = buildShippingInfo();
    try {
      setProcessingPayment(true);
      const totalAmount = Math.round(parseFloat(calculateTotal()) * 100);
      if (totalAmount < 10000) { alert('Minimum order amount for online payment is ₱100.00'); setProcessingPayment(false); return; }
      const res = await fetch(`${API_BASE_URL}/payment/create-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount, payment_method: paymentMethod, currency: 'PHP',
          description: `Order for ${si.fullName}`,
          billing: { name: si.fullName, email: si.email, phone: si.phone, address: { line1: si.address, city: si.city, state: si.province, postal_code: si.postalCode, country: 'PH' } }
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create payment'); }
      const data = await res.json();
      if (data.checkout_url) {
        localStorage.setItem('pendingOrder', JSON.stringify({
          user_id: currentUserId, shipping_info: si, payment_method: paymentMethod,
          cart_items: cartItems, seller_id: checkoutSellerId,
          subtotal: calculateSubtotal(), tax: calculatePlatformFee(),
          shipping_fee: calculateShippingFee(), total: calculateTotal(),
          payment_intent_id: data.payment_intent_id
        }));
        window.location.href = data.checkout_url;
      }
    } catch (e) { alert('Failed to process payment: ' + e.message); setProcessingPayment(false); }
  };

  // ✅ CHECKPOINT 2: Final stock verification before submitting order
  const processOrder = async (paymentIntentId = null) => {
    const si = buildShippingInfo();

    // Stock check before submitting
    setLoading(true);
    try {
      const stockErrors = [];

      await Promise.all(cartItems.map(async (item) => {
        try {
          const res = await fetch(`${API_BASE_URL}/products/${item.product_id}`);
          if (!res.ok) {
            stockErrors.push(`"${item.product?.product_name || 'A product'}" is no longer available.`);
            return;
          }
          const data = await res.json();
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
        alert('⚠️ Cannot place order:\n\n' + stockErrors.join('\n') + '\n\nYou will be taken back to your cart to update your items.');
        navigate('/buyer/cart');
        return;
      }
    } catch (e) {
      alert('Could not verify stock availability. Please try again.');
      return;
    } finally {
      setLoading(false);
    }

    // ✅ Stock verified — now submit the order
    try {
      setLoading(true);
      const orderData = {
        user_id: currentUserId, seller_id: checkoutSellerId, shipping_info: si,
        payment_method: paymentMethod, cart_items: cartItems,
        subtotal: calculateSubtotal(), tax: calculatePlatformFee(),
        shipping_fee: calculateShippingFee(), total: calculateTotal(),
        payment_intent_id: paymentIntentId,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'paid'
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!res.ok) {
        const e = await res.json();
        // Handle backend atomic stock failure (race condition caught at DB level)
        if (e.stock_errors?.length > 0) {
          alert('⚠️ Stock changed during checkout:\n\n' + e.stock_errors.join('\n') + '\n\nReturning to your cart.');
          navigate('/buyer/cart');
        } else {
          alert(e.error || 'Failed to process order. Please try again.');
        }
        return;
      }

      const data = await res.json();
      setOrderConfirmation({
        orderNumber: data.order.order_number,
        orderId: data.order.id,
        date: new Date(data.order.order_date).toLocaleDateString(),
        ...orderData
      });
      setCurrentStep(3);
    } catch (e) {
      alert('Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('payment_success') === 'true') {
      const pending = localStorage.getItem('pendingOrder');
      if (pending) {
        const od = JSON.parse(pending);
        setPaymentMethod(od.payment_method); setCartItems(od.cart_items);
        if (p.get('payment_method') === 'paypal' && p.get('token')) processPayPalOrder(od, p.get('token'));
        else if (p.get('payment_intent_id')) processOrderWithData(od, p.get('payment_intent_id'));
        localStorage.removeItem('pendingOrder');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else { alert('Payment successful, but order data was lost. Please contact support.'); }
    }
  }, []);

  const processPayPalOrder = async (od, token) => {
    try {
      setLoading(true);
      const cr = await fetch(`${API_BASE_URL}/payment/capture-paypal/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!cr.ok) throw new Error('Failed to capture PayPal payment');
      const cd = await cr.json();
      const rd = { ...od, payment_method: 'paypal', payment_intent_id: token, payment_capture_id: cd.capture_id, payment_status: 'paid' };
      const r  = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd) });
      if (!r.ok) throw new Error('Failed to process order');
      const d = await r.json();
      setOrderConfirmation({ orderNumber: d.order.order_number, orderId: d.order.id, date: new Date(d.order.order_date).toLocaleDateString(), ...rd });
      setCurrentStep(3);
    } catch (e) { alert('Failed to process PayPal payment: ' + e.message); }
    finally { setLoading(false); }
  };

  const processOrderWithData = async (od, paymentIntentId) => {
    try {
      setLoading(true);
      const rd = { ...od, payment_intent_id: paymentIntentId, payment_status: od.payment_method === 'cod' ? 'pending' : 'paid' };
      const r  = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd) });
      if (!r.ok) throw new Error('Failed to process order');
      const d = await r.json();
      setOrderConfirmation({ orderNumber: d.order.order_number, orderId: d.order.id, date: new Date(d.order.order_date).toLocaleDateString(), ...rd });
      setCurrentStep(3);
    } catch (e) { alert('Failed to create order: ' + e.message); }
    finally { setLoading(false); }
  };

  const totalProducts   = getTotalProducts();
  const meetsMinPayment = parseFloat(calculateTotal()) >= 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">{processingPayment ? 'Processing payment...' : 'Loading checkout...'}</p>
        </div>
      </div>
    );
  }

  const si = buildShippingInfo();

  return (
    <div className="min-h-screen bg-white">

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
                    {/* ✅ Only show Change button if there are multiple saved addresses to switch between */}
                    {savedAddresses.length > 1 && (
                      <button type="button" onClick={() => setShowAddressPicker(true)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-500 text-green-600 text-sm font-semibold hover:bg-green-50 transition">
                        <ChevronDown className="w-4 h-4" />Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">No saved address found.</p>
                    <button type="button" onClick={() => navigate('/buyer/profile?tab=addresses')} className="text-sm text-green-600 underline font-semibold hover:text-green-800">+ Add a delivery address</button>
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
                          <button key={addr.id} type="button" onClick={() => { setSelectedAddress(addr); setShowAddressPicker(false); }}
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
                    <DeliveryBanner city={selectedAddress.city} />
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4 text-sm">
                  <div className="flex gap-2"><AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" /><p className="text-xs text-gray-500">Shipping fee is automatically calculated based on your delivery province and total package weight.</p></div>
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
                <div className="flex gap-3"><AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" /><div><p className="text-sm font-semibold text-yellow-800">Minimum Amount Required</p><p className="text-sm text-yellow-700 mt-1">Total (₱{formatPrice(calculateTotal())}) is below ₱100.00 minimum for GCash/PayPal.</p></div></div>
              </div>
            )}

            <div className="mb-6"><DeliveryBanner city={selectedAddress?.city} /></div>

            <div className="space-y-4 mb-8">
              {[
                { id: 'gcash', label: 'GCash', sub: 'Pay securely with GCash', icon: <span className="text-white font-bold text-xl">G</span>, bg: 'bg-blue-600' },
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
              <button onClick={() => setPaymentMethod('cod')} className={`w-full p-6 rounded-lg border-2 transition-all ${paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
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
              <div className="border-t pt-4"><div className="flex justify-between items-center"><span className="text-gray-600">Total Amount</span><span className="text-3xl font-bold text-green-600">₱{formatPrice(calculateTotal())}</span></div></div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setCurrentStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold">Back</button>
              <button onClick={handlePaymentSubmit} disabled={!paymentMethod || processingPayment || loading}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying stock...</>
                ) : processingPayment ? 'Processing...' : 'Complete Order'}
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
                <DeliveryBanner city={si.city} orderDate={new Date()} />
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
    </div>
  );
};

export default CheckoutPage;