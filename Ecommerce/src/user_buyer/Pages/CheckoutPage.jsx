import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, AlertCircle, Info, ShieldCheck, Store, Package } from 'lucide-react';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

const CheckoutPage = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [allCartItems, setAllCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const PLATFORM_FEE_PERCENTAGE = 0.10;
  const FIXED_SHIPPING_FEE_3PLUS = 100;

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '', email: '', phone: '',
    address: '', city: '', province: '', postalCode: '',
  });

  // Field-level errors — same pattern as Profile.jsx
  const [fieldErrors, setFieldErrors] = useState({});

  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  const steps = [
    { id: 1, name: 'Shipping Info' },
    { id: 2, name: 'Review' },
    { id: 3, name: 'Payment' },
    { id: 4, name: 'Confirmation' },
  ];

  // ── 1. Auto-fill name/email/phone from localStorage on mount ────
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (loggedInUser?.full_name) {
      setShippingInfo(prev => ({
        ...prev,
        fullName: loggedInUser.full_name || '',
        email:    loggedInUser.email    || '',
        phone:    loggedInUser.phone    || '',
        // address / city / province / postalCode intentionally left blank
      }));
    }
  }, []);

  // ── 2. Load cart items ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    const stateItems = location.state?.checkoutItems;
    if (stateItems && stateItems.length > 0) {
      setCartItems(stateItems);
      setLoading(false);
      fetchAllCartItems();
    } else {
      fetchCartItems();
    }
  }, [currentUserId]);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      setCartItems(data.cart_items || []);
      setAllCartItems(data.cart_items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAllCartItems = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!res.ok) return;
      const data = await res.json();
      setAllCartItems(data.cart_items || []);
    } catch (e) { console.error(e); }
  };

  // ── Derived state ────────────────────────────────────────────────
  const checkoutSellerId = location.state?.sellerId || null;
  const checkoutSellerName =
    cartItems[0]?.product?.seller_name ||
    cartItems[0]?.product?.brand ||
    (checkoutSellerId ? `Seller ${checkoutSellerId.slice(0, 6)}` : null);

  const remainingItems = allCartItems.filter(ai => !cartItems.some(ci => ci.id === ai.id));
  const hasRemainingItems = remainingItems.length > 0;

  // ── Price helpers ────────────────────────────────────────────────
  const getTotalProducts  = () => cartItems.reduce((s, i) => s + i.quantity, 0);
  const getRawShipping    = () => cartItems.reduce((s, i) => s + parseFloat(i.product?.shipping_fee || 50) * i.quantity, 0);
  const calculateSubtotal = () => cartItems.reduce((s, i) => s + (i.price || i.product?.price || 0) * i.quantity, 0).toFixed(2);
  const calculatePlatformFee = () => (parseFloat(calculateSubtotal()) * PLATFORM_FEE_PERCENTAGE).toFixed(2);
  const calculateShippingFee = () => getTotalProducts() >= 3 ? FIXED_SHIPPING_FEE_3PLUS.toFixed(2) : getRawShipping().toFixed(2);
  const isFixedShippingApplied = () => getTotalProducts() >= 3;
  const getShippingSavings = () => {
    if (!isFixedShippingApplied()) return 0;
    const s = getRawShipping() - FIXED_SHIPPING_FEE_3PLUS;
    return s > 0 ? s.toFixed(2) : '0.00';
  };
  const calculateTotal = () => (parseFloat(calculateSubtotal()) + parseFloat(calculatePlatformFee()) + parseFloat(calculateShippingFee())).toFixed(2);

  // ── Phone validation helpers (same as Profile.jsx) ───────────────
  const getPhoneStatus = () => {
    if (!shippingInfo.phone) return null;
    return shippingInfo.phone.length === 11 && shippingInfo.phone.startsWith('09') ? 'valid' : 'invalid';
  };

  // ── Full form validation ─────────────────────────────────────────
  const validateShippingForm = () => {
    const errors = {};
    if (!shippingInfo.fullName.trim())
      errors.fullName = 'Full name is required';
    if (!shippingInfo.email.trim())
      errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(shippingInfo.email))
      errors.email = 'Please enter a valid email address';
    if (!shippingInfo.phone.trim())
      errors.phone = 'Phone number is required';
    else if (shippingInfo.phone.length !== 11)
      errors.phone = 'Phone number must be exactly 11 digits';
    else if (!shippingInfo.phone.startsWith('09'))
      errors.phone = 'Phone number must start with 09 (e.g. 09XXXXXXXXX)';
    if (!shippingInfo.address.trim())
      errors.address = 'Barangay / address is required';
    if (!shippingInfo.city.trim())
      errors.city = 'City is required';
    if (!shippingInfo.province.trim())
      errors.province = 'Province is required';
    return errors;
  };

  // ── Input change handler ─────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Phone: digits only, max 11 — same as Profile.jsx
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 11) setShippingInfo(prev => ({ ...prev, phone: digits }));
      if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
      return;
    }
    setShippingInfo(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── Delivery estimate ────────────────────────────────────────────
  const getDeliveryEstimate = (city = '', fromDate = new Date()) => {
    const isLegazpi = city.trim().toLowerCase().replace(/\s+/g, '') === 'legazpicity' || city.trim().toLowerCase() === 'legazpi';
    const base = new Date(fromDate);
    const fmt = d => d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
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
      <div className={`rounded-lg p-4 border flex gap-3 ${est.isLocal ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <span className="text-xl">{est.isLocal ? '🏠' : '🚚'}</span>
        <div>
          <p className={`text-sm font-semibold ${est.isLocal ? 'text-green-800' : 'text-blue-800'}`}>Estimated Delivery: {est.label}</p>
          <p className={`text-xs mt-0.5 ${est.isLocal ? 'text-green-700' : 'text-blue-700'}`}>Expected: {est.range}</p>
          <p className={`text-xs mt-0.5 ${est.isLocal ? 'text-green-600' : 'text-blue-600'}`}>{est.isLocal ? '📍 Within Legazpi City — same/next day' : '📦 Outside Legazpi City — standard delivery'}</p>
        </div>
      </div>
    );
  };

  const RemainingItemsNotice = () => {
    if (!hasRemainingItems) return null;
    const groups = {};
    remainingItems.forEach(item => {
      const sid = item.product?.user_id || 'unknown';
      const sname = item.product?.seller_name || item.product?.brand || `Seller ${sid.slice(0, 6)}`;
      if (!groups[sid]) groups[sid] = { sellerName: sname, count: 0 };
      groups[sid].count += item.quantity;
    });
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">You have remaining items in your cart</p>
            <p className="text-sm text-amber-700 mt-1">After this order, return to checkout items from:</p>
            <ul className="mt-2 space-y-1">
              {Object.values(groups).map((g, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                  <Store className="w-3 h-3" /><strong>{g.sellerName}</strong> — {g.count} item{g.count !== 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // ── Step navigation ──────────────────────────────────────────────
  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const errors = validateShippingForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error field
      const firstKey = Object.keys(errors)[0];
      document.getElementsByName(firstKey)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldErrors({});
    setCurrentStep(2);
  };

  const handleContinueToPayment = () => {
    if (getTotalProducts() >= 3 && parseFloat(calculateShippingFee()) !== FIXED_SHIPPING_FEE_3PLUS) {
      alert('Shipping fee error. Please refresh and try again.');
      return;
    }
    setCurrentStep(3);
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
    try {
      setProcessingPayment(true);
      const totalAmount = Math.round(parseFloat(calculateTotal()) * 100);
      if (totalAmount < 10000) { alert('Minimum order amount for online payment is ₱100.00'); setProcessingPayment(false); return; }
      const res = await fetch(`${API_BASE_URL}/payment/create-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount, payment_method: paymentMethod, currency: 'PHP', description: `Order for ${shippingInfo.fullName}`, billing: { name: shippingInfo.fullName, email: shippingInfo.email, phone: shippingInfo.phone, address: { line1: shippingInfo.address, city: shippingInfo.city, state: shippingInfo.province, postal_code: shippingInfo.postalCode, country: 'PH' } } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create payment'); }
      const data = await res.json();
      if (data.checkout_url) {
        localStorage.setItem('pendingOrder', JSON.stringify({ user_id: currentUserId, shipping_info: shippingInfo, payment_method: paymentMethod, cart_items: cartItems, seller_id: checkoutSellerId, subtotal: calculateSubtotal(), tax: calculatePlatformFee(), shipping_fee: calculateShippingFee(), total: calculateTotal(), payment_intent_id: data.payment_intent_id }));
        window.location.href = data.checkout_url;
      }
    } catch (e) { alert('Failed to process payment: ' + e.message); setProcessingPayment(false); }
  };

  const processOrder = async (paymentIntentId = null) => {
    try {
      setLoading(true);
      const orderData = { user_id: currentUserId, seller_id: checkoutSellerId, shipping_info: shippingInfo, payment_method: paymentMethod, cart_items: cartItems, subtotal: calculateSubtotal(), tax: calculatePlatformFee(), shipping_fee: calculateShippingFee(), total: calculateTotal(), payment_intent_id: paymentIntentId, payment_status: paymentMethod === 'cod' ? 'pending' : 'paid' };
      const res = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to process order'); }
      const data = await res.json();
      setOrderConfirmation({ orderNumber: data.order.order_number, orderId: data.order.id, date: new Date(data.order.order_date).toLocaleDateString(), ...orderData });
      setCurrentStep(4);
    } catch (e) { alert('Failed to process order. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('payment_success') === 'true') {
      const pending = localStorage.getItem('pendingOrder');
      if (pending) {
        const od = JSON.parse(pending);
        setShippingInfo(od.shipping_info); setPaymentMethod(od.payment_method); setCartItems(od.cart_items);
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
      const r = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd) });
      if (!r.ok) throw new Error('Failed to process order');
      const d = await r.json();
      setOrderConfirmation({ orderNumber: d.order.order_number, orderId: d.order.id, date: new Date(d.order.order_date).toLocaleDateString(), ...rd });
      setCurrentStep(4);
    } catch (e) { alert('Failed to process PayPal payment: ' + e.message); }
    finally { setLoading(false); }
  };

  const processOrderWithData = async (od, paymentIntentId) => {
    try {
      setLoading(true);
      const rd = { ...od, payment_intent_id: paymentIntentId, payment_status: od.payment_method === 'cod' ? 'pending' : 'paid' };
      const r = await fetch(`${API_BASE_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rd) });
      if (!r.ok) throw new Error('Failed to process order');
      const d = await r.json();
      setOrderConfirmation({ orderNumber: d.order.order_number, orderId: d.order.id, date: new Date(d.order.order_date).toLocaleDateString(), ...rd });
      setCurrentStep(4);
    } catch (e) { alert('Failed to create order: ' + e.message); }
    finally { setLoading(false); }
  };

  // ── Derived values ───────────────────────────────────────────────
  const totalProducts   = getTotalProducts();
  const rawShipping     = getRawShipping();
  const meetsMinPayment = parseFloat(calculateTotal()) >= 100;
  const fixedApplied    = isFixedShippingApplied();
  const shippingSavings = getShippingSavings();

  // ── Reusable helpers ─────────────────────────────────────────────
  const FieldError = ({ name }) => fieldErrors[name]
    ? <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{fieldErrors[name]}</p>
    : null;

  const inputClass = (name) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${fieldErrors[name] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;

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

  return (
    <div className="min-h-screen bg-white">

      {/* Progress Bar */}
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-6">
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
                {i < steps.length - 1 && <div className={`flex-1 h-1 mx-4 transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* ══ STEP 1: Shipping ══ */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">

              {/* Seller banner */}
              {checkoutSellerName && (
                <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <Store className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-700">Checking out products from:</p>
                    <p className="font-bold text-green-900">{checkoutSellerName}</p>
                  </div>
                </div>
              )}

              {/* Auto-fill notice */}
              <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Some fields have been auto-filled from your account</p>
                  <p className="text-sm text-blue-700 mt-0.5">Please complete your <strong>delivery address</strong> below.</p>
                </div>
              </div>

              <RemainingItemsNotice />

              <h2 className="text-3xl font-bold text-gray-900 mb-6">Shipping Information</h2>

              <form onSubmit={handleShippingSubmit} className="space-y-6" noValidate>

                {/* ── Account info (auto-filled) ── */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Account Info
                    <span className="normal-case font-normal text-gray-400 ml-1">(auto-filled — you can still edit)</span>
                  </p>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="fullName" value={shippingInfo.fullName} onChange={handleInputChange}
                      className={inputClass('fullName')} placeholder="Juan Dela Cruz" />
                    <FieldError name="fullName" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input type="email" name="email" value={shippingInfo.email} onChange={handleInputChange}
                        className={inputClass('email')} placeholder="juan@email.com" />
                      <FieldError name="email" />
                    </div>

                    {/* Phone — live validation identical to Profile.jsx */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          name="phone"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="09XXXXXXXXX"
                          className={`w-full px-4 py-3 pr-14 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
                            fieldErrors.phone
                              ? 'border-red-400 bg-red-50'
                              : getPhoneStatus() === 'valid'
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-300'
                          }`}
                        />
                        <span className={`absolute right-3 top-3.5 text-xs font-semibold pointer-events-none ${shippingInfo.phone.length === 11 ? 'text-green-600' : 'text-gray-400'}`}>
                          {shippingInfo.phone.length}/11
                        </span>
                      </div>

                      {/* Live checklist — same as Profile.jsx */}
                      {shippingInfo.phone.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          <div className={`flex items-center gap-1 text-xs ${shippingInfo.phone.startsWith('09') ? 'text-green-600' : 'text-red-500'}`}>
                            <span>{shippingInfo.phone.startsWith('09') ? '✓' : '✗'}</span>
                            <span>Starts with 09</span>
                          </div>
                          <div className={`flex items-center gap-1 text-xs ${shippingInfo.phone.length === 11 ? 'text-green-600' : 'text-red-500'}`}>
                            <span>{shippingInfo.phone.length === 11 ? '✓' : '✗'}</span>
                            <span>Exactly 11 digits ({shippingInfo.phone.length} entered)</span>
                          </div>
                        </div>
                      )}
                      <FieldError name="phone" />
                    </div>
                  </div>
                </div>

                {/* ── Delivery address (must fill) ── */}
                <div className="bg-white border-2 border-green-200 rounded-xl p-5 space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Delivery Address
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full normal-case font-semibold">Please fill in</span>
                  </p>

                  {/* Barangay */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Barangay / Street Address <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="address" value={shippingInfo.address} onChange={handleInputChange}
                      className={inputClass('address')} placeholder="e.g. Brgy. Bigaa, 123 Rizal St." />
                    <FieldError name="address" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input type="text" name="city" value={shippingInfo.city} onChange={handleInputChange}
                        className={inputClass('city')} placeholder="e.g. Legazpi City" />
                      <FieldError name="city" />
                    </div>

                    {/* Province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input type="text" name="province" value={shippingInfo.province} onChange={handleInputChange}
                        className={inputClass('province')} placeholder="e.g. Albay" />
                      <FieldError name="province" />
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                      <input type="text" name="postalCode" value={shippingInfo.postalCode} onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                        placeholder="e.g. 4500" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold text-lg shadow-lg">
                  Continue to Review
                </button>
              </form>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="font-bold text-gray-900 mb-4">📦 Items in this order</h3>
                <div className="space-y-3 mb-5">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {item.product?.product_image
                          ? <img src={item.product.product_image} alt={item.product.product_name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product?.product_name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4 mb-5 space-y-3 text-sm">
                  <div className="flex gap-2"><Info className="h-4 w-4 text-blue-500 mt-0.5" /><div><p className="font-medium text-gray-900">1–2 items</p><p className="text-xs text-gray-500">Individual shipping fees apply</p></div></div>
                  <div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-green-500 mt-0.5" /><div><p className="font-medium text-gray-900">3+ items → Fixed ₱100</p><p className="text-xs text-gray-500">Flat ₱100 shipping fee</p></div></div>
                </div>
                {shippingInfo.city
                  ? <div className="pt-4 border-t border-gray-200"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">📦 Delivery Estimate</p><DeliveryBanner city={shippingInfo.city} /></div>
                  : <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-400">Enter your city above to see delivery estimate</div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Review ══ */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Order Review</h2>
              {checkoutSellerName && (
                <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <Store className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-900">Seller: {checkoutSellerName}</p>
                </div>
              )}
              <div className="space-y-4 mb-8">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-6 flex gap-4">
                    <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.product_image ? <img src={item.product.product_image} alt={item.product.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.product?.product_name}</h3>
                      <p className="text-sm text-gray-600 mb-2">Qty: {item.quantity}</p>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-gray-900">₱{((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                        <div className="flex items-center text-sm text-gray-500"><Truck className="w-4 h-4 mr-1" />₱{((item.product?.shipping_fee || 50) * item.quantity).toFixed(2)} shipping</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalProducts === 1 && <div className="mb-6 rounded-lg p-4 border bg-gray-50 border-gray-200 flex gap-3"><Info className="w-5 h-5 text-gray-500 mt-0.5" /><div className="text-sm"><p className="font-semibold text-gray-800">Individual Shipping Fee</p><p className="mt-1 text-gray-600">₱{rawShipping.toFixed(2)}</p></div></div>}
              {totalProducts === 2 && <div className="mb-6 rounded-lg p-4 border bg-blue-50 border-blue-200 flex gap-3"><Info className="w-5 h-5 text-blue-500 mt-0.5" /><div className="text-sm"><p className="font-semibold text-blue-800">Combined Shipping Fee</p><p className="mt-1 text-blue-700">₱{rawShipping.toFixed(2)}</p></div></div>}
              {totalProducts >= 3 && <div className={`mb-6 rounded-lg p-4 border flex gap-3 ${parseFloat(shippingSavings) > 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}><ShieldCheck className={`w-5 h-5 mt-0.5 ${parseFloat(shippingSavings) > 0 ? 'text-green-500' : 'text-blue-500'}`} /><div className="text-sm"><p className={`font-semibold ${parseFloat(shippingSavings) > 0 ? 'text-green-800' : 'text-blue-800'}`}>Fixed ₱{FIXED_SHIPPING_FEE_3PLUS} Shipping Applied</p><p className={`mt-1 ${parseFloat(shippingSavings) > 0 ? 'text-green-700' : 'text-blue-700'}`}>{totalProducts} products — flat ₱{FIXED_SHIPPING_FEE_3PLUS}.{parseFloat(shippingSavings) > 0 && ` You save ₱${shippingSavings}!`}</p></div></div>}
              <RemainingItemsNotice />
              <div className="flex gap-4">
                <button onClick={() => setCurrentStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold">Back to Shipping</button>
                <button onClick={handleContinueToPayment} className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg">Continue to Payment</button>
              </div>
            </div>
            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="font-bold text-gray-900 mb-4">Shipping Details</h3>
                <div className="space-y-1 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
                  <p className="font-medium text-gray-900">{shippingInfo.fullName}</p>
                  <p>{shippingInfo.email}</p><p>{shippingInfo.phone}</p>
                  <p>{shippingInfo.address}</p>
                  <p>{shippingInfo.city}, {shippingInfo.province} {shippingInfo.postalCode}</p>
                </div>
                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">₱{calculateSubtotal()}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Platform Fee (10%)</span><span className="font-medium">₱{calculatePlatformFee()}</span></div>
                  <div className="flex justify-between text-gray-600">
                    <div className="flex flex-col"><span>Shipping Fee</span>{totalProducts === 2 && <span className="text-xs text-blue-600">Sum of individual fees</span>}{fixedApplied && <span className="text-xs text-green-600 font-medium">Fixed flat fee (3+ items)</span>}</div>
                    <span className="font-medium">₱{calculateShippingFee()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center"><span className="text-lg font-bold text-gray-900">Total</span><span className="text-2xl font-bold text-green-600">₱{calculateTotal()}</span></div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📦 Estimated Delivery</p>
                    <DeliveryBanner city={shippingInfo.city} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Payment ══ */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Select Payment Method</h2>
            {checkoutSellerName && <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6"><Store className="w-5 h-5 text-green-600" /><p className="text-sm font-semibold text-green-900">Paying for: {checkoutSellerName}</p></div>}
            {!meetsMinPayment && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"><div className="flex gap-3"><AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" /><div><p className="text-sm font-semibold text-yellow-800">Minimum Amount Required</p><p className="text-sm text-yellow-700 mt-1">Total (₱{calculateTotal()}) is below the ₱100.00 minimum for GCash/PayPal.</p></div></div></div>}
            {fixedApplied && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" /><div><p className="text-sm font-semibold text-green-800">Fixed Shipping Applied ✓</p><p className="text-sm text-green-700 mt-1">{totalProducts} products → Fixed ₱{FIXED_SHIPPING_FEE_3PLUS}.{parseFloat(shippingSavings) > 0 && ` Save ₱${shippingSavings}!`}</p></div></div></div>}
            <div className="mb-6"><DeliveryBanner city={shippingInfo.city} /></div>
            <div className="space-y-4 mb-8">
              {[{ id: 'gcash', label: 'GCash', sub: 'Pay securely with GCash', icon: <span className="text-white font-bold text-xl">G</span>, bg: 'bg-blue-600' }, { id: 'paypal', label: 'PayPal', sub: 'Pay securely with PayPal', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.936.936 0 0 1 .92-.768h6.811c1.863 0 3.339.394 4.428 1.182 1.089.788 1.634 1.954 1.634 3.498 0 .844-.172 1.616-.516 2.316-.344.7-.838 1.298-1.482 1.794a6.418 6.418 0 0 1-2.271 1.078c-.885.22-1.847.33-2.886.33h-1.447l-.994 6.187a.643.643 0 0 1-.633.533z"/></svg>, bg: 'bg-blue-500' }].map(pm => (
                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} disabled={!meetsMinPayment}
                  className={`w-full p-6 rounded-lg border-2 transition-all ${!meetsMinPayment ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed' : paymentMethod === pm.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                  <div className="flex items-center gap-4"><div className={`w-16 h-16 ${pm.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>{pm.icon}</div><div className="text-left flex-1"><h3 className="font-bold text-gray-900 text-lg">{pm.label}</h3><p className="text-sm text-gray-600">{pm.sub}</p></div>{paymentMethod === pm.id && meetsMinPayment && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                </button>
              ))}
              <button onClick={() => setPaymentMethod('cod')} className={`w-full p-6 rounded-lg border-2 transition-all ${paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                <div className="flex items-center gap-4"><div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div className="text-left flex-1"><h3 className="font-bold text-gray-900 text-lg">Cash on Delivery</h3><p className="text-sm text-gray-600">Pay when you receive your order</p></div>{paymentMethod === 'cod' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₱{calculateSubtotal()}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><span>Platform Fee (10%)</span><span>₱{calculatePlatformFee()}</span></div>
                <div className="flex justify-between text-sm text-gray-600"><div className="flex flex-col"><span>Shipping Fee</span>{fixedApplied && <span className="text-xs text-green-600 font-medium">Fixed flat fee (3+ items)</span>}{totalProducts === 2 && <span className="text-xs text-blue-600">Sum of individual fees</span>}</div><span>₱{calculateShippingFee()}</span></div>
              </div>
              <div className="border-t pt-4"><div className="flex justify-between items-center"><span className="text-gray-600">Total Amount</span><span className="text-3xl font-bold text-green-600">₱{calculateTotal()}</span></div></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep(2)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold">Back to Review</button>
              <button onClick={handlePaymentSubmit} disabled={!paymentMethod || processingPayment} className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed">{processingPayment ? 'Processing...' : 'Complete Order'}</button>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Confirmation ══ */}
        {currentStep === 4 && orderConfirmation && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
              <p className="text-gray-600">Thank you for your purchase</p>
              {checkoutSellerName && <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5"><Store className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700 font-medium">From: {checkoutSellerName}</span></div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-8 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><p className="text-sm text-gray-600 mb-1">Order Number</p><p className="font-bold text-gray-900">{orderConfirmation.orderNumber}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Order Date</p><p className="font-bold text-gray-900">{orderConfirmation.date}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Payment Method</p><p className="font-bold text-gray-900 capitalize">{paymentMethod.replace('-', ' ')}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Total Amount</p><p className="font-bold text-green-600 text-xl">₱{calculateTotal()}</p></div>
              </div>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Shipping To:</p>
                <p className="font-medium text-gray-900">{shippingInfo.fullName}</p>
                <p className="text-sm text-gray-600">{shippingInfo.address}</p>
                <p className="text-sm text-gray-600">{shippingInfo.city}, {shippingInfo.province} {shippingInfo.postalCode}</p>
              </div>
              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">📦 Estimated Delivery</p>
                <DeliveryBanner city={shippingInfo.city} orderDate={new Date()} />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Platform Fee</span><span>₱{orderConfirmation.tax}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Shipping Fee</span><span>₱{orderConfirmation.shipping_fee}</span></div>
              </div>
            </div>
            {hasRemainingItems && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <div className="flex gap-3"><Info className="h-5 w-5 text-amber-600 mt-0.5" /><div><p className="text-sm font-semibold text-amber-800">You still have items in your cart!</p><p className="text-sm text-amber-700 mt-1">Return to checkout the remaining {remainingItems.reduce((s, i) => s + i.quantity, 0)} item(s) from other sellers.</p></div></div>
              </div>
            )}
            <div className="space-y-3">
              {hasRemainingItems && <button onClick={() => navigate('/buyer/cart')} className="w-full bg-amber-500 text-white py-4 rounded-lg hover:bg-amber-600 transition font-semibold shadow-lg">Go to Cart (Checkout Remaining Items)</button>}
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