import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin, MessageCircle, Calendar, Hash, User, X, Send, Star, HeadphonesIcon, Shield, AlertTriangle } from 'lucide-react';
import RefundRequestModal from '../Components/RefundRequestModal';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const Toast = ({ toasts, removeToast }) => (
  <div className="fixed  top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
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
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
};

// ─────────────────────────────────────────────────────────────────────────────
// INFO DIALOG (replaces alert for important messages)
// ─────────────────────────────────────────────────────────────────────────────

const InfoDialog = ({ dialog, onClose }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-5 flex items-start gap-4 border-b ${dialog.danger ? 'bg-red-50 border-red-100' : dialog.success ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${dialog.danger ? 'bg-red-100' : dialog.success ? 'bg-green-100' : 'bg-blue-100'}`}>
            {dialog.icon || (dialog.danger ? '❌' : dialog.success ? '✅' : 'ℹ️')}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-base ${dialog.danger ? 'text-red-900' : dialog.success ? 'text-green-900' : 'text-blue-900'}`}>{dialog.title}</h3>
            {dialog.body && (
              <p className={`text-sm mt-1 whitespace-pre-line leading-relaxed ${dialog.danger ? 'text-red-700' : dialog.success ? 'text-green-700' : 'text-blue-700'}`}>
                {dialog.body}
              </p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 flex gap-3 justify-end">
          {dialog.showCancel && (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm">
              Cancel
            </button>
          )}
          <button
            onClick={() => { dialog.onConfirm?.(); onClose(); }}
            className={`px-5 py-2 rounded-lg text-white font-semibold text-sm transition ${
              dialog.danger ? 'bg-red-600 hover:bg-red-700'
              : dialog.success ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {dialog.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY ESTIMATE HELPER — LBC from Legazpi City, Bicol
// ─────────────────────────────────────────────────────────────────────────────

const getDeliveryEstimate = (city = '', province = '', orderDate = new Date()) => {
  const fmt      = d => d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const base     = new Date(orderDate);

  const cityNorm     = city.trim().toLowerCase().replace(/\s+/g, '');
  const provinceNorm = province.trim().toLowerCase();

  // Same city — Legazpi
  if (cityNorm === 'legazpicity' || cityNorm === 'legazpi') {
    return {
      label: 'Same Day – Next Day', days: '0–1 day',
      range: `${fmt(base)} – ${fmt(addDays(base, 1))}`,
      icon: '🏠', color: 'green', isLocal: true,
    };
  }

  // Bicol Region
  const bicolProvinces = ['albay', 'camarines sur', 'camarines norte', 'sorsogon', 'masbate', 'catanduanes'];
  if (bicolProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '2–3 Business Days', days: '2–3 days',
      range: `${fmt(addDays(base, 2))} – ${fmt(addDays(base, 3))}`,
      icon: '📦', color: 'blue', isLocal: false,
    };
  }

  // Luzon
  const luzonProvinces = [
    'metro manila', 'ncr', 'manila', 'quezon city', 'laguna', 'batangas', 'cavite',
    'rizal', 'bulacan', 'pampanga', 'nueva ecija', 'tarlac', 'pangasinan',
    'ilocos', 'la union', 'benguet', 'nueva vizcaya', 'quirino', 'aurora',
    'bataan', 'zambales', 'quezon', 'marinduque', 'occidental mindoro',
    'oriental mindoro', 'palawan', 'romblon', 'mindoro',
  ];
  if (luzonProvinces.some(p => provinceNorm.includes(p))) {
    return {
      label: '3–5 Business Days', days: '3–5 days',
      range: `${fmt(addDays(base, 3))} – ${fmt(addDays(base, 5))}`,
      icon: '🚚', color: 'blue', isLocal: false,
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
      label: '5–7 Business Days', days: '5–7 days',
      range: `${fmt(addDays(base, 5))} – ${fmt(addDays(base, 7))}`,
      icon: '✈️', color: 'orange', isLocal: false,
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
      label: '7–10 Business Days', days: '7–10 days',
      range: `${fmt(addDays(base, 7))} – ${fmt(addDays(base, 10))}`,
      icon: '🛳️', color: 'red', isLocal: false,
    };
  }

  // Fallback
  return {
    label: '3–7 Business Days', days: '3–7 days',
    range: `${fmt(addDays(base, 3))} – ${fmt(addDays(base, 7))}`,
    icon: '🚚', color: 'blue', isLocal: false,
  };
};

const colorMap = {
  green:  { pill: 'bg-green-100 text-green-700',   bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-800',  sub: 'text-green-700',  note: 'text-green-600'  },
  blue:   { pill: 'bg-blue-100 text-blue-700',     bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-800',   sub: 'text-blue-700',   note: 'text-blue-600'   },
  orange: { pill: 'bg-orange-100 text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800', sub: 'text-orange-700', note: 'text-orange-600' },
  red:    { pill: 'bg-red-100 text-red-700',       bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-800',    sub: 'text-red-700',    note: 'text-red-600'    },
};

const DeliveryPill = ({ city, province, orderDate }) => {
  if (!city && !province) return null;
  const est = getDeliveryEstimate(city || '', province || '', orderDate);
  const c   = colorMap[est.color] || colorMap.blue;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${c.pill}`}>
      {est.icon} {est.days}
    </span>
  );
};

const DeliveryBanner = ({ city, province, orderDate }) => {
  if (!city && !province) return null;
  const est = getDeliveryEstimate(city || '', province || '', orderDate);
  const c   = colorMap[est.color] || colorMap.blue;
  return (
    <div className={`rounded-xl p-4 border flex gap-3 items-start ${c.bg} ${c.border}`}>
      <span className="text-2xl flex-shrink-0 mt-0.5">{est.icon}</span>
      <div>
        <p className={`font-semibold text-sm ${c.title}`}>Estimated Delivery: {est.label}</p>
        <p className={`text-xs mt-1 font-medium ${c.sub}`}>Expected: {est.range}</p>
        <p className={`text-xs mt-0.5 ${c.note}`}>
           Business days only, excluding holidays
        </p>
        <p className={`text-xs mt-0.5 opacity-70 ${c.note}`}>
          Tracking number will be provided once seller ships your order.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT SUPPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORT_SUBJECTS = [
  'Problem with my order',
  'Payment issue',
  'Account problem',
  'Report a seller',
  'Request a refund',
  'Other',
];

const ContactSupportModal = ({ userId, adminId, adminLoading, selectedOrder, onClose, onSent }) => {
  const [subject, setSubject] = useState(selectedOrder ? 'Problem with my order' : '');
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    setError('');
    if (!subject)              { setError('Please select a subject.'); return; }
    if (!body.trim())          { setError('Please enter your message.'); return; }
    if (body.trim().length<10) { setError('Message must be at least 10 characters.'); return; }
    if (!adminId)              { setError('Could not reach support. Please email us directly at support@artisan.com'); return; }

    setSending(true);
    try {
      const orderRef    = selectedOrder ? `\n\nOrder Reference: #${selectedOrder.order_number}` : '';
      const fullMessage = `[${subject}]${orderRef}\n\n${body.trim()}`;
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sender_id:   userId,
          receiver_id: adminId,
          message:     fullMessage,
          order_id:    selectedOrder ? selectedOrder.id : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Contact Support</h2>
              {selectedOrder
                ? <p className="text-violet-200 text-xs">Regarding Order #{selectedOrder.order_number}</p>
                : <p className="text-violet-200 text-xs">We typically reply within 24 hours</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          {selectedOrder && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              {selectedOrder.order_items?.[0]?.product?.product_image && (
                <img src={selectedOrder.order_items[0].product.product_image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Order</p>
                <p className="font-semibold text-gray-900 font-mono text-sm">#{selectedOrder.order_number}</p>
                <p className="text-xs text-gray-600 truncate">
                  {selectedOrder.order_items?.[0]?.product_name}
                  {selectedOrder.order_items?.length > 1 && ` +${selectedOrder.order_items.length - 1} more`}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What's this about?</label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORT_SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition border ${
                    subject === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue in detail..."
              rows={4} maxLength={500}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition resize-none"/>
            <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/500</p>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <Shield className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700">Your message goes directly to our support team. Do not share passwords or payment details.</p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} disabled={sending}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || adminLoading || !subject || !body.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {adminLoading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Connecting...</>
              : sending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</>
              : <><Send className="w-4 h-4"/>Send to Support</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REFUND POLICY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getRefundStatus = (order) => {
  if (!order) return { canRefund: false, expired: false, deadline: null, hoursLeft: null, label: null };

  const status  = order.order_status?.toLowerCase();
  const method  = order.payment_method?.toLowerCase();
  const payment = order.payment_status?.toLowerCase();

  if (status === 'cancelled' && method === 'cod') return { canRefund: false, expired: false, deadline: null, hoursLeft: null, label: null };
  if (status !== 'delivered' && status !== 'cancelled') return { canRefund: false, expired: false, deadline: null, hoursLeft: null, label: null };
  if (status === 'cancelled' && payment !== 'paid') return { canRefund: false, expired: false, deadline: null, hoursLeft: null, label: null };

  const deadlineStr = order.refund_deadline;
  const now = new Date();

  if (deadlineStr) {
    const deadline  = new Date(deadlineStr);
    const msLeft    = deadline - now;
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    const expired   = msLeft <= 0;

    if (status === 'cancelled') {
      return { canRefund: !expired, expired, deadline, hoursLeft, label: expired ? 'Refund request expired' : `Request refund · ${hoursLeft}h left`, type: 'cancellation' };
    }
    if (status === 'delivered') {
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      return { canRefund: !expired, expired, deadline, hoursLeft, daysLeft, label: expired ? 'Refund request expired' : `Request refund · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, type: 'delivery' };
    }
  }

  if (status === 'cancelled' && (method === 'gcash' || method === 'paypal') && payment === 'paid') {
    const cancelledAt = order.cancelled_at ? new Date(order.cancelled_at) : new Date(order.updated_at || order.order_date);
    const deadline    = new Date(cancelledAt.getTime() + 24 * 60 * 60 * 1000);
    const msLeft      = deadline - now;
    const hoursLeft   = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    const expired     = msLeft <= 0;
    return { canRefund: !expired, expired, deadline, hoursLeft, label: expired ? 'Refund request expired' : `Request refund · ${hoursLeft}h left`, type: 'cancellation' };
  }

  if (status === 'delivered') {
    const updatedAt = new Date(order.updated_at || order.order_date);
    const deadline  = new Date(updatedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const msLeft    = deadline - now;
    const daysLeft  = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
    const expired   = msLeft <= 0;
    return { canRefund: !expired, expired, deadline, hoursLeft, daysLeft, label: expired ? 'Refund request expired' : `Request refund · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, type: 'delivery' };
  }

  return { canRefund: false, expired: false, deadline: null, hoursLeft: null, label: null };
};

const canRequestRefund  = (order) => { const { canRefund, expired } = getRefundStatus(order); return canRefund || expired; };
const refundButtonLabel = (order) => {
  const { label, expired } = getRefundStatus(order);
  if (expired) return 'Refund Unavailable';
  if (label)   return label;
  const status = order.order_status?.toLowerCase();
  if (status === 'cancelled') return 'Request Refund for Cancelled Order';
  return 'Request Refund';
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

const CancelConfirmModal = ({ order, suspension, onConfirm, onClose, loading }) => {
  const willTriggerSuspension = suspension && !suspension.suspended && (suspension.current_count || 0) + 1 >= suspension.limit;
  const isLastWarning         = suspension && !suspension.suspended && suspension.warning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`p-5 flex items-center gap-3 ${willTriggerSuspension ? 'bg-red-50 border-b border-red-200' : 'bg-amber-50 border-b border-amber-200'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${willTriggerSuspension ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${willTriggerSuspension ? 'text-red-600' : 'text-amber-600'}`}/>
          </div>
          <div>
            <h3 className={`font-bold text-base ${willTriggerSuspension ? 'text-red-900' : 'text-amber-900'}`}>Cancel Order?</h3>
            <p className={`text-xs mt-0.5 ${willTriggerSuspension ? 'text-red-700' : 'text-amber-700'}`}>Order #{order.order_number}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <p className="text-gray-600">
              {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''} ·{' '}
              <span className="font-semibold text-gray-900">₱{parseFloat(order.total_amount).toFixed(2)}</span>
              {' '}· <span className="uppercase font-medium">{order.payment_method}</span>
            </p>
          </div>

          {willTriggerSuspension && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-xl flex-shrink-0">🚫</span>
                <div>
                  <p className="font-bold text-red-800 text-sm">This will suspend your checkout</p>
                  <p className="text-xs text-red-700 mt-1">
                    Cancelling will reach the limit of <strong>{suspension.limit} cancellations in 7 days</strong>.
                    Your checkout will be suspended for <strong>2 days</strong>.
                  </p>
                  <p className="text-xs text-red-500 mt-2">You can still browse, add to cart, message sellers and view orders during suspension.</p>
                </div>
              </div>
            </div>
          )}

          {isLastWarning && !willTriggerSuspension && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-bold text-orange-800 text-sm">Warning — 1 more cancellation after this</p>
                  <p className="text-xs text-orange-700 mt-1">After this, 1 more cancellation this week will suspend checkout for 2 days.</p>
                </div>
              </div>
            </div>
          )}

          {order.payment_status === 'paid' && (order.payment_method === 'gcash' || order.payment_method === 'paypal') && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-blue-800">
                Paid via <strong>{order.payment_method.toUpperCase()}</strong>. After cancellation you can request a refund from your orders page.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">Are you sure? This cannot be undone.</p>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Keep Order
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${
              willTriggerSuspension ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}>
            {loading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Cancelling...</>
              : willTriggerSuspension ? '🚫 Cancel & Accept Suspension'
              : 'Yes, Cancel Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const OrdersPage = ({ userId }) => {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [orders,         setOrders]         = useState([]);
  const [selectedOrder,  setSelectedOrder]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText,      setMessageText]      = useState('');
  const [sendingMessage,   setSendingMessage]   = useState(false);
  const [messageError,     setMessageError]     = useState('');

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [adminId,          setAdminId]          = useState(null);
  const [adminLoading,     setAdminLoading]     = useState(true);

  const [showRefundModal, setShowRefundModal] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelLoading,   setCancelLoading]   = useState(false);

  const [suspension, setSuspension] = useState(null);

  const [showReviewModal,  setShowReviewModal]  = useState(false);
  const [selectedProduct,  setSelectedProduct]  = useState(null);
  const [rating,           setRating]           = useState(0);
  const [hoverRating,      setHoverRating]      = useState(0);
  const [reviewComment,    setReviewComment]    = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError,      setReviewError]      = useState('');
  const [existingReviews,  setExistingReviews]  = useState({});
  const [refundMap,        setRefundMap]        = useState({});

  // InfoDialog state
  const [dialog, setDialog] = useState(null);
  const showDialog = useCallback((opts) => setDialog(opts), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    fetchOrders();
    fetchAdminId();
    fetchSuspension();
  }, [currentUserId, selectedStatus]);

  const fetchSuspension = async () => {
    if (!currentUserId) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/orders/check-suspension/${currentUserId}`);
      const data = await res.json();
      if (data.success) setSuspension(data);
    } catch { /* non-fatal */ }
  };

  const fetchAdminId = async () => {
    setAdminLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/users/admin`);
      const data = await res.json();
      if (res.ok && data.id) setAdminId(data.id);
    } catch (err) { console.error('Could not fetch admin user:', err); }
    finally { setAdminLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true); setError(null);
    try {
      const statusParam = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const res  = await fetch(`${API_BASE_URL}/orders/user/${currentUserId}${statusParam}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      const fetchedOrders = data.orders || [];
      setOrders(fetchedOrders);
      if (fetchedOrders.length > 0 && !selectedOrder) setSelectedOrder(fetchedOrders[0]);
      await fetchExistingReviews(fetchedOrders);
      await fetchRefundStatuses(fetchedOrders);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchExistingReviews = async (ordersList) => {
    try {
      const reviewsMap = {};
      for (const order of ordersList) {
        if (order.order_items) {
          for (const item of order.order_items) {
            const productId = item.product_id || item.product?.id;
            if (productId) {
              const res = await fetch(`${API_BASE_URL}/feedback/product/${productId}`);
              if (res.ok) {
                const reviews    = await res.json();
                const userReview = reviews.find(r => r.user_id === currentUserId);
                if (userReview) reviewsMap[productId] = userReview;
              }
            }
          }
        }
      }
      setExistingReviews(reviewsMap);
    } catch (err) { console.error('Error fetching existing reviews:', err); }
  };

  const fetchRefundStatuses = async (ordersList) => {
    try {
      const map = {};
      const eligibleIds = ordersList
        .filter(o => {
          const s = o.order_status?.toLowerCase();
          const m = o.payment_method?.toLowerCase();
          const p = o.payment_status?.toLowerCase();
          return s === 'delivered' || (s === 'cancelled' && p === 'paid' && (m === 'gcash' || m === 'paypal'));
        })
        .map(o => o.id);

      await Promise.all(eligibleIds.map(async (orderId) => {
        try {
          const res = await fetch(`${API_BASE_URL}/refunds/order/${orderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.refund_request) map[orderId] = data.refund_request;
          }
        } catch { /* non-fatal */ }
      }));
      setRefundMap(map);
    } catch (err) { console.error('Error fetching refund statuses:', err); }
  };

  const handleOpenReviewModal = (product, orderItem) => {
    setSelectedProduct({ ...product, orderItem });
    const productId      = product.id || orderItem.product_id;
    const existingReview = existingReviews[productId];
    setRating(existingReview?.rating || 0);
    setReviewComment(existingReview?.comment || '');
    setReviewError('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    setReviewError('');
    if (rating === 0)                     { setReviewError('Please select a rating'); return; }
    if (!reviewComment.trim())            { setReviewError('Please write a comment'); return; }
    if (reviewComment.trim().length < 10) { setReviewError('Comment must be at least 10 characters long'); return; }

    setSubmittingReview(true);
    try {
      const productId      = selectedProduct.id || selectedProduct.orderItem.product_id;
      const existingReview = existingReviews[productId];
      const res = existingReview
        ? await fetch(`${API_BASE_URL}/feedback/${existingReview.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, comment: reviewComment.trim(), user_id: currentUserId })
          })
        : await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, user_id: currentUserId, rating, comment: reviewComment.trim() })
          });

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to submit review'); }

      setShowReviewModal(false);
      setSelectedProduct(null);
      setRating(0);
      setReviewComment('');
      addToast(existingReview ? 'Review updated successfully!' : 'Review submitted successfully!', 'success');
      await fetchOrders();
    } catch (err) { setReviewError(err.message); }
    finally { setSubmittingReview(false); }
  };

  const handleSendMessage = async () => {
    setMessageError('');
    if (!messageText.trim())                 { setMessageError('Please enter a message'); return; }
    if (!selectedOrder?.order_items?.length) { setMessageError('No order items found'); return; }

    const firstItem = selectedOrder.order_items[0];
    const sellerId  = firstItem.product?.user_id;
    if (!sellerId) { setMessageError('Seller information not available'); return; }

    const buyerId = JSON.parse(localStorage.getItem('user') || '{}').id;
    if (!buyerId) { setMessageError('You must be logged in to send messages'); return; }

    setSendingMessage(true);
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:   buyerId,
          receiver_id: sellerId,
          message:     messageText.trim(),
          order_id:    selectedOrder.id,
          product_id:  firstItem.product_id || firstItem.product?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setMessageText('');
      setShowMessageModal(false);
      addToast('Message sent to seller!', 'success');
    } catch (err) { setMessageError(err.message); }
    finally { setSendingMessage(false); }
  };

  const canMessageSeller  = (order) => order && ['pending','processing','shipped','delivered'].includes(order.order_status?.toLowerCase());
  const canReviewProduct  = (order) => order?.order_status?.toLowerCase() === 'delivered';

  const getStatusColor = (status) => ({
    pending:    'bg-amber-100 text-amber-800 border-amber-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    shipped:    'bg-purple-100 text-purple-800 border-purple-200',
    delivered:  'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled:  'bg-red-100 text-red-800 border-red-200',
  }[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200');

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':    return <Clock className="w-4 h-4"/>;
      case 'processing': return <Package className="w-4 h-4"/>;
      case 'shipped':    return <Truck className="w-4 h-4"/>;
      case 'delivered':  return <CheckCircle className="w-4 h-4"/>;
      case 'cancelled':  return <X className="w-4 h-4"/>;
      default:           return <Clock className="w-4 h-4"/>;
    }
  };

  const getOrderProgress  = (status) => ({ pending:25, processing:50, shipped:75, delivered:100, cancelled:0 }[status?.toLowerCase()] || 0);
  const formatDate        = (d) => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const formatDateTime    = (d) => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

  const handleCancelOrder = (order) => { setCancellingOrder(order); setShowCancelModal(true); };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setCancelLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/orders/${cancellingOrder.id}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: currentUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to cancel order');

      setShowCancelModal(false);
      setCancellingOrder(null);
      await fetchOrders();
      await fetchSuspension();

      // Show refund notice via dialog instead of alert
      if (data?.refund_deadline && data?.refund_status !== 'No refund needed') {
        const deadline  = new Date(data.refund_deadline);
        const hoursLeft = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60)));
        const method    = cancellingOrder?.payment_method?.toUpperCase();
        showDialog({
          title:        'Order Cancelled',
          icon:         '⏰',
          success:      false,
          body:
            `Since you paid via ${method}, you have ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} to request a refund.\n\n` +
            `Deadline: ${deadline.toLocaleString('en-PH', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}\n\n` +
            `After this deadline, refunds will no longer be accepted per our refund policy.`,
          confirmLabel: 'I Understand',
        });
      } else {
        addToast('Order cancelled successfully.', 'success');
      }
    } catch (err) {
      addToast('Error cancelling order: ' + err.message, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const statusCounts = {
    all:        orders.length,
    pending:    orders.filter(o => o.order_status === 'pending').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    shipped:    orders.filter(o => o.order_status === 'shipped').length,
    delivered:  orders.filter(o => o.order_status === 'delivered').length,
    cancelled:  orders.filter(o => o.order_status === 'cancelled').length,
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">

      <Toast toasts={toasts} removeToast={removeToast} />
      <InfoDialog dialog={dialog} onClose={closeDialog} />

      <div className="max-w-7xl mx-auto px-4 py-8">

        {suspension?.suspended && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-800 text-sm">Checkout Temporarily Suspended</p>
              <p className="text-xs text-red-700 mt-0.5">{suspension.message}</p>
              <p className="text-xs text-red-400 mt-1">
                You can still view orders, request refunds, message sellers, and browse normally.
                <span className="font-semibold ml-1">⏱ {suspension.hours_left}h remaining</span>
              </p>
            </div>
          </div>
        )}

        {!suspension?.suspended && suspension?.warning && (
          <div className="bg-orange-50 border border-orange-300 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0"/>
            <p className="text-sm text-orange-800">
              <strong>⚠️ Warning:</strong> 1 more cancellation this week will suspend your checkout for 2 days.
              Only checkout is affected — all other features stay active.
            </p>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {[
              { key:'all',        label:'All Orders'  },
              { key:'pending',    label:'Pending'     },
              { key:'processing', label:'Processing'  },
              { key:'shipped',    label:'Shipped'     },
              { key:'delivered',  label:'Delivered'   },
              { key:'cancelled',  label:'Cancelled'   },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSelectedStatus(key)}
                className={`px-6 py-4 font-semibold transition whitespace-nowrap relative ${selectedStatus===key?'text-blue-600 bg-blue-50':'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                {label}
                {statusCounts[key] > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${selectedStatus===key?'bg-blue-600 text-white':'bg-gray-200 text-gray-600'}`}>
                    {statusCounts[key]}
                  </span>
                )}
                {selectedStatus===key && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"/>}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-700">Error: {error}</p></div>}

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400"/>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-600 mb-8">
              {selectedStatus==='all' ? "You haven't placed any orders yet" : `You don't have any ${selectedStatus} orders`}
            </p>
            <button onClick={() => navigate('/buyer/products')}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg hover:shadow-xl">
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Orders List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Order History</h2>
                  <p className="text-sm text-gray-600">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {orders.map((order) => (
                    <div key={order.id} onClick={() => setSelectedOrder(order)}
                      className={`p-4 cursor-pointer transition hover:bg-gray-50 ${selectedOrder?.id===order.id?'bg-blue-50 border-l-4 border-blue-600':''}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Hash className="w-4 h-4 text-gray-400"/>
                        <p className="font-mono text-sm font-semibold text-gray-900">{order.order_number}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Calendar className="w-4 h-4 text-gray-400"/>
                        <p className="text-sm text-gray-600">{formatDate(order.order_date)}</p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="font-bold text-gray-900">₱{parseFloat(order.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="mb-2">
                        <DeliveryPill city={order.shipping_city} province={order.shipping_province} orderDate={order.order_date}/>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.order_status)}`}>
                          {getStatusIcon(order.order_status)}
                          {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                        </span>
                        {(() => {
                          const ri     = getRefundStatus(order);
                          const refund = refundMap[order.id];
                          if (refund) {
                            if (refund.status === 'approved') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">↩ Refunded</span>;
                            if (refund.status === 'pending' || refund.status === 'seller_pending') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">⏳ Refund Pending</span>;
                            if (refund.status === 'rejected') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Refund Rejected</span>;
                          }
                          if (!ri.canRefund && !ri.expired) return null;
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              ri.expired ? 'bg-gray-100 text-gray-400'
                              : ri.hoursLeft <= 6 ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                            }`}>
                              {ri.expired ? 'Refund expired' : ri.type === 'cancellation' ? `Refund · ${ri.hoursLeft}h` : `Refund · ${ri.daysLeft}d`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Order Detail */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Details</h2>
                        <p className="text-gray-600 font-mono text-sm">{selectedOrder.order_number}</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(selectedOrder.order_status)}`}>
                        {getStatusIcon(selectedOrder.order_status)}
                        {selectedOrder.order_status.charAt(0).toUpperCase() + selectedOrder.order_status.slice(1)}
                      </span>
                    </div>

                    {selectedOrder.order_status !== 'cancelled' && (
                      <div className="relative mt-6">
                        <div className="flex justify-between mb-3">
                          {[
                            { status:'pending',    icon:Clock,       label:'Pending'    },
                            { status:'processing', icon:Package,     label:'Processing' },
                            { status:'shipped',    icon:Truck,       label:'Shipped'    },
                            { status:'delivered',  icon:CheckCircle, label:'Delivered'  },
                          ].map(({ status, icon: Icon, label }) => {
                            const steps    = ['pending','processing','shipped','delivered'];
                            const isActive = steps.indexOf(selectedOrder.order_status) >= steps.indexOf(status);
                            const isCurrent = selectedOrder.order_status === status;
                            return (
                              <div key={status} className="flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                  isActive
                                    ? (isCurrent && status==='delivered' ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-blue-600 text-white')
                                    : 'bg-gray-200 text-gray-400'
                                }`}>
                                  <Icon className="w-5 h-5"/>
                                </div>
                                <span className={`text-xs mt-2 font-medium ${isActive?'text-gray-900':'text-gray-500'}`}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10" style={{marginLeft:'20px',width:'calc(100% - 40px)'}}>
                          <div className="h-full bg-blue-600 transition-all duration-500" style={{width:`${getOrderProgress(selectedOrder.order_status)}%`}}/>
                        </div>
                      </div>
                    )}

                    {selectedOrder.order_status === 'cancelled' && (
                      <div className="mt-4 space-y-2">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <X className="w-4 h-4 text-red-600"/>
                            <p className="font-semibold text-red-800 text-sm">Order Cancelled</p>
                          </div>
                          {selectedOrder.payment_status === 'paid' && (selectedOrder.payment_method === 'gcash' || selectedOrder.payment_method === 'paypal') && (
                            <p className="text-xs text-red-700 mt-1">
                              This order was paid via {selectedOrder.payment_method.toUpperCase()}. You may request a refund below.
                            </p>
                          )}
                          {selectedOrder.payment_method === 'cod' && (
                            <p className="text-xs text-red-700 mt-1">
                              This was a Cash on Delivery order. No online payment was made, so no refund is required.
                            </p>
                          )}
                        </div>
                        {selectedOrder.payment_status === 'paid' &&
                         (selectedOrder.payment_method === 'gcash' || selectedOrder.payment_method === 'paypal') && (() => {
                          const refundInfo = getRefundStatus(selectedOrder);
                          if (refundInfo.expired || !refundInfo.hoursLeft) return null;
                          const isUrgent = refundInfo.hoursLeft <= 6;
                          return (
                            <div className={`rounded-xl p-4 flex items-start gap-3 border-2 ${isUrgent ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              <div>
                                <p className={`font-bold text-sm ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
                                  {isUrgent ? '⚠️ Refund deadline approaching!' : '⏰ Refund request deadline'}
                                </p>
                                <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
                                  You have <strong>{refundInfo.hoursLeft} hour{refundInfo.hoursLeft !== 1 ? 's' : ''}</strong> to request a refund for this{' '}
                                  {selectedOrder.payment_method.toUpperCase()} payment.
                                </p>
                                <p className={`text-xs mt-1 font-medium ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                                  Deadline: {refundInfo.deadline?.toLocaleString('en-PH', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-6">

                    {selectedOrder.order_status !== 'cancelled' && (
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-600"/>Estimated Delivery
                        </h3>
                        <DeliveryBanner
                          city={selectedOrder.shipping_city}
                          province={selectedOrder.shipping_province}
                          orderDate={selectedOrder.order_date}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600"/>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Order Placed</p>
                            <p className="font-semibold text-gray-900">{formatDateTime(selectedOrder.order_date)}</p>
                          </div>
                        </div>
                      </div>
                      {selectedOrder.tracking_number && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-white"/>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium">LBC Tracking Number</p>
                              <p className="font-bold text-gray-900 font-mono">{selectedOrder.tracking_number}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600"/>Delivery Address
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-5 space-y-1.5">
                        <p className="font-semibold text-gray-900 text-lg">{selectedOrder.shipping_full_name}</p>
                        <p className="text-gray-600">{selectedOrder.shipping_phone}</p>
                        <p className="text-gray-600">{selectedOrder.shipping_email}</p>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">
                            {selectedOrder.shipping_address}<br/>
                            {selectedOrder.shipping_city}, {selectedOrder.shipping_province} {selectedOrder.shipping_postal_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600"/>Ordered Items
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.order_items?.map((item, index) => {
                          const productId = item.product_id || item.product?.id;
                          const hasReview = existingReviews[productId];
                          return (
                            <div key={index} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition">
                              <div className="flex gap-4">
                                <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                  {item.product?.product_image
                                    ? <img src={item.product.product_image} alt={item.product_name} className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-8 h-8"/></div>}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{item.product_name}</h4>
                                  {item.product?.brand && (
                                    <div className="flex items-center gap-2 mb-2">
                                      <User className="w-3.5 h-3.5 text-gray-400"/>
                                      <p className="text-sm text-gray-600">Seller: <span className="font-medium">{item.product.brand}</span></p>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-sm text-gray-600">Qty: <span className="font-semibold text-gray-900">{item.quantity}</span></p>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Unit Price</p>
                                      <p className="font-bold text-gray-900">₱{parseFloat(item.unit_price).toFixed(2)}</p>
                                    </div>
                                  </div>
                                  {canReviewProduct(selectedOrder) && (
                                    <div className="mt-3">
                                      <button onClick={() => handleOpenReviewModal(item.product, item)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                          hasReview ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                          : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                        }`}>
                                        <Star className="w-4 h-4"/>
                                        {hasReview ? 'Edit Review' : 'Write Review'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="text-blue-600 font-bold text-lg">₱</span>Order Summary
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                        {[
                          { label:'Subtotal',     value: selectedOrder.subtotal     },
                          { label:'Platform Fee', value: selectedOrder.tax          },
                          { label:'Shipping Fee', value: selectedOrder.shipping_fee },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-gray-700">
                            <span>{label}</span>
                            <span className="font-semibold">₱{parseFloat(value).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-gray-700">
                          <span>Payment Method</span>
                          <span className="font-semibold uppercase">{selectedOrder.payment_method}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                          <span>Payment Status</span>
                          <span className={`font-semibold ${selectedOrder.payment_status==='paid'?'text-green-600':'text-amber-600'}`}>
                            {selectedOrder.payment_status?.charAt(0).toUpperCase() + selectedOrder.payment_status?.slice(1)}
                          </span>
                        </div>
                        <div className="border-t-2 border-gray-300 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-900">Total Amount</span>
                            <span className="text-3xl font-bold text-blue-600">₱{parseFloat(selectedOrder.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <div className="flex gap-3">
                        {canMessageSeller(selectedOrder) && (
                          <button onClick={() => setShowMessageModal(true)}
                            className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                            <MessageCircle className="w-5 h-5"/>Message Seller
                          </button>
                        )}
                        {selectedOrder.order_status === 'pending' && (
                          <button onClick={() => handleCancelOrder(selectedOrder)}
                            className="flex-1 bg-red-50 text-red-600 py-4 px-6 rounded-xl hover:bg-red-100 transition font-semibold border-2 border-red-200">
                            Cancel Order
                          </button>
                        )}
                      </div>

                      {canRequestRefund(selectedOrder) && (() => {
                        const refundInfo = getRefundStatus(selectedOrder);
                        const refund     = refundMap[selectedOrder.id];

                        if (refund?.status === 'approved') return (
                          <div className="w-full flex items-center gap-3 py-3 px-6 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 text-sm font-semibold">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            <div>
                              <p>Refund Approved</p>
                              <p className="text-xs text-green-600 font-normal mt-0.5">₱{parseFloat(refund.refund_amount||0).toFixed(2)} has been refunded to your account</p>
                            </div>
                          </div>
                        );
                        if (refund?.status === 'pending' || refund?.status === 'seller_pending') return (
                          <div className="w-full flex items-center gap-3 py-3 px-6 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin flex-shrink-0"/>
                            <div>
                              <p>{refund.status === 'seller_pending' ? 'Awaiting Seller Confirmation' : 'Refund Under Review'}</p>
                              <p className="text-xs text-blue-600 font-normal mt-0.5">₱{parseFloat(refund.refund_amount||0).toFixed(2)} · We'll notify you once processed</p>
                            </div>
                          </div>
                        );
                        if (refund?.status === 'rejected') return (
                          <div className="w-full flex items-center gap-3 py-3 px-6 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            <div>
                              <p>Refund Request Rejected</p>
                              {refund.admin_notes && <p className="text-xs text-red-600 font-normal mt-0.5">Reason: {refund.admin_notes}</p>}
                            </div>
                          </div>
                        );

                        return (
                          <div>
                            {refundInfo.expired ? (
                              <div className="w-full flex flex-col gap-2 py-3 px-6 rounded-xl border-2 border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-center gap-2 text-gray-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  <span className="font-semibold text-sm">Cannot refund due to refund policy rules</span>
                                </div>
                                <p className="text-xs text-gray-400 text-center">
                                  {refundInfo.type === 'cancellation'
                                    ? 'Refund requests for cancelled orders must be submitted within 24 hours of cancellation.'
                                    : 'Refund requests for delivered orders must be submitted within 3 days of delivery.'}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <button onClick={() => setShowRefundModal(true)}
                                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition font-semibold text-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                                  {refundButtonLabel(selectedOrder)}
                                </button>
                                <div className={`mt-2 px-4 py-2 rounded-lg flex items-center gap-2 ${refundInfo.hoursLeft <= 6 ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${refundInfo.hoursLeft <= 6 ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                  <p className={`text-xs font-medium ${refundInfo.hoursLeft <= 6 ? 'text-red-700' : 'text-amber-700'}`}>
                                    {refundInfo.type === 'cancellation' ? 'Refund policy: submit within 24h of cancellation · ' : 'Refund policy: submit within 3 days of delivery · '}
                                    <strong>
                                      {refundInfo.type === 'delivery' && refundInfo.daysLeft > 1 ? `${refundInfo.daysLeft} days remaining` : `${refundInfo.hoursLeft}h remaining`}
                                    </strong>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {canMessageSeller(selectedOrder) && (
                        <button onClick={() => setShowSupportModal(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition font-semibold text-sm">
                          <HeadphonesIcon className="w-4 h-4"/>
                          Contact Support about this order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                  <p className="text-gray-600">Select an order to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirm Modal */}
      {showCancelModal && cancellingOrder && (
        <CancelConfirmModal
          order={cancellingOrder}
          suspension={suspension}
          onConfirm={handleConfirmCancel}
          onClose={() => { setShowCancelModal(false); setCancellingOrder(null); }}
          loading={cancelLoading}
        />
      )}

      {/* Message Seller Modal */}
      {showMessageModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6"/>
                <div>
                  <h2 className="text-xl font-bold">Message Seller</h2>
                  <p className="text-sm text-blue-100">Order #{selectedOrder.order_number}</p>
                </div>
              </div>
              <button onClick={() => { setShowMessageModal(false); setMessageText(''); setMessageError(''); }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
              {selectedOrder.order_items?.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Product:</p>
                  <div className="flex items-center gap-3">
                    {selectedOrder.order_items[0].product?.product_image && (
                      <img src={selectedOrder.order_items[0].product.product_image} alt={selectedOrder.order_items[0].product_name} className="w-12 h-12 object-cover rounded-lg"/>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{selectedOrder.order_items[0].product_name}</p>
                      {selectedOrder.order_items.length > 1 && <p className="text-sm text-gray-500">+{selectedOrder.order_items.length - 1} more item(s)</p>}
                    </div>
                  </div>
                </div>
              )}
              {messageError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{messageError}</p></div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Message</label>
                <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your message to the seller here..."
                  className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none"
                  disabled={sendingMessage} maxLength={500}/>
                <p className="text-sm text-gray-500 mt-2">{messageText.length} / 500 characters</p>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800"><strong>Note:</strong> This message will be sent directly to the seller.</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button onClick={() => { setShowMessageModal(false); setMessageText(''); setMessageError(''); }} disabled={sendingMessage}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50">Cancel</button>
              <button onClick={handleSendMessage} disabled={!messageText.trim() || sendingMessage}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {sendingMessage
                  ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/><span>Sending...</span></>
                  : <><Send className="w-5 h-5"/>Send Message</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showSupportModal && (
        <ContactSupportModal
          userId={currentUserId}
          adminId={adminId}
          adminLoading={adminLoading}
          selectedOrder={selectedOrder}
          onClose={() => setShowSupportModal(false)}
          onSent={() => {
            setShowSupportModal(false);
            addToast('Your message has been sent to our support team. We\'ll get back to you within 24 hours.', 'success', 6000);
          }}
        />
      )}

      {/* Refund Request Modal */}
      {showRefundModal && selectedOrder && (
        <RefundRequestModal
          order={selectedOrder}
          userId={currentUserId}
          onClose={() => setShowRefundModal(false)}
          onSubmitted={() => { fetchOrders(); }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6"/>
                <div>
                  <h2 className="text-xl font-bold">
                    {existingReviews[selectedProduct.id || selectedProduct.orderItem.product_id] ? 'Edit Review' : 'Write Review'}
                  </h2>
                  <p className="text-sm text-amber-100">Share your experience</p>
                </div>
              </div>
              <button onClick={() => { setShowReviewModal(false); setSelectedProduct(null); setRating(0); setReviewComment(''); setReviewError(''); }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Product:</p>
                <div className="flex items-center gap-3">
                  {selectedProduct.product_image && <img src={selectedProduct.product_image} alt="" className="w-16 h-16 object-cover rounded-lg"/>}
                  <p className="font-semibold text-gray-900">{selectedProduct.product_name || selectedProduct.orderItem.product_name}</p>
                </div>
              </div>
              {reviewError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{reviewError}</p></div>}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Your Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} className="transition-transform hover:scale-125">
                      <svg className={`w-10 h-10 ${star<=(hoverRating||rating)?'text-yellow-400':'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {rating===1&&'⭐ Poor'}{rating===2&&'⭐⭐ Fair'}{rating===3&&'⭐⭐⭐ Good'}{rating===4&&'⭐⭐⭐⭐ Very Good'}{rating===5&&'⭐⭐⭐⭐⭐ Excellent'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product... (minimum 10 characters)"
                  className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition resize-none"
                  disabled={submittingReview} maxLength={500}/>
                <p className="text-sm text-gray-500 mt-2">{reviewComment.length} / 500 characters</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button onClick={() => { setShowReviewModal(false); setSelectedProduct(null); setRating(0); setReviewComment(''); setReviewError(''); }} disabled={submittingReview}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold disabled:opacity-50">Cancel</button>
              <button onClick={handleSubmitReview} disabled={rating===0 || !reviewComment.trim() || submittingReview}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submittingReview
                  ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/><span>Submitting...</span></>
                  : <><Star className="w-5 h-5"/>{existingReviews[selectedProduct.id || selectedProduct.orderItem.product_id] ? 'Update Review' : 'Submit Review'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default OrdersPage;