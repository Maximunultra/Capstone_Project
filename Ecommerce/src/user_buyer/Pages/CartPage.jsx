import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, CheckCircle, ShoppingBag, Mail, Store, AlertCircle, ChevronDown, ChevronUp, Trash2, X, MapPin, Truck } from 'lucide-react';
import OrdersPage from './OrdersPage';
import MessagesTab from './MessagesTab';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1-shnf.onrender.com/api';

const CART_LIMIT = 10;

const formatPrice = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStoreName = (product) => {
  if (!product) return null;
  return (
    product.users?.store_name ||
    product.users?.full_name ||
    product.seller_name ||
    product.brand ||
    null
  );
};

// ── Toast Notification ─────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
<div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">  
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

// ── Shipping Breakdown Component ───────────────────────────────────
const ShippingBreakdown = ({ items, shippingFee, shippingZone, shippingLoading }) => {
  const [expanded, setExpanded] = React.useState(false);

  const getItemWeightKg = (item) => {
    const w = parseFloat(item.product?.weight || 0);
    const unit = (item.product?.weight_unit || 'g').toLowerCase();
    return unit === 'kg' ? w : w / 1000;
  };

  const rows = items.map(item => {
    const unitKg = getItemWeightKg(item);
    const totalKg = unitKg * item.quantity;
    const unitDisplay = item.product?.weight_unit === 'kg'
      ? `${item.product.weight}kg` : `${item.product?.weight || 0}g`;
    return { name: item.product?.product_name || 'Product', unitDisplay, unitKg, qty: item.quantity, totalKg, hasWeight: (item.product?.weight || 0) > 0 };
  });

  const totalKg = rows.reduce((s, r) => s + r.totalKg, 0);
  const allMissingWeight = rows.every(r => !r.hasWeight);
  const barPct = Math.min((totalKg / 30) * 100, 100);

  const getBracket = (kg) => {
    if (kg <= 1) return '0–1 kg'; if (kg <= 2) return '1–2 kg'; if (kg <= 3) return '2–3 kg';
    if (kg <= 5) return '3–5 kg'; if (kg <= 10) return '5–10 kg'; if (kg <= 20) return '10–20 kg';
    return '20–30 kg';
  };

  return (
    <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', backgroundColor: 'var(--color-background-secondary)', padding: '10px 20px' }}>
      <button onClick={() => setExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontSize: 12, color: 'var(--color-text-info)', fontWeight: 500 }}>{expanded ? 'Hide' : 'Show'} shipping calculation</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-info)" strokeWidth="2.5" style={{ marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {allMissingWeight && (
            <div style={{ fontSize: 11, color: 'var(--color-text-warning)', background: 'var(--color-background-warning)', border: '0.5px solid var(--color-border-warning)', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>
              Weight not set on some products — using 0.1kg minimum.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.hasWeight
                    ? <span style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 5, padding: '2px 7px', color: 'var(--color-text-secondary)', fontSize: 11 }}>{r.unitDisplay} × {r.qty} = {(r.unitKg * r.qty * 1000).toFixed(0)}g</span>
                    : <span style={{ background: 'var(--color-background-warning)', border: '0.5px solid var(--color-border-warning)', borderRadius: 5, padding: '2px 7px', color: 'var(--color-text-warning)', fontSize: 11 }}>no weight set</span>
                  }
                  <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', minWidth: 50, textAlign: 'right' }}>
                    {r.totalKg >= 1 ? `${r.totalKg.toFixed(3)} kg` : `${(r.totalKg * 1000).toFixed(0)} g`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Total weight</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-info)' }}>{totalKg >= 1 ? `${totalKg.toFixed(3)} kg` : `${(totalKg * 1000).toFixed(0)} g`}</span>
            </div>
            <div style={{ height: 6, background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
              <div style={{ height: '100%', width: `${barPct}%`, background: '#378ADD', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Bracket: {getBracket(Math.max(totalKg, 0.01))} (max 30 kg)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '8px 12px' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Shipping fee</span>
              {shippingZone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <span style={{ fontSize: 11, background: '#EAF3DE', color: '#27500A', borderRadius: 10, padding: '1px 7px', fontWeight: 500 }}>{getBracket(Math.max(totalKg, 0.01))} → {shippingZone}</span>
                </div>
              )}
            </div>
            {shippingLoading
              ? <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Calculating...</span>
              : shippingFee !== null
                ? <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>₱{formatPrice(shippingFee)}</span>
                : <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Add address</span>
            }
          </div>
        </div>
      )}
    </div>
  );
};

// ── Checkbox component ─────────────────────────────────────────────
const Checkbox = ({ checked, indeterminate = false, onChange }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
      checked || indeterminate ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 hover:border-blue-400'
    }`}
  >
    {indeterminate && !checked
      ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
      : checked
        ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : null
    }
  </button>
);

const CartPage = ({ userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState('cart');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [selectionMode, setSelectionMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());

  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [quantityErrors, setQuantityErrors] = useState({});

  const [defaultAddress, setDefaultAddress] = useState(null);
  const [shippingFees, setShippingFees] = useState({});

  const [selectedCheckoutItems, setSelectedCheckoutItems] = useState(new Set());
  const [priceChangedItems, setPriceChangedItems] = useState(new Set());
  const [suspension, setSuspension] = useState(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const totalCartItems = cartItems.length;
  const isAtLimit = totalCartItems >= CART_LIMIT;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['cart', 'orders', 'messages'].includes(tab)) setActiveTab(tab);
  }, [location.search]);

  useEffect(() => {
    if (!currentUserId) { navigate('/login'); return; }
    if (activeTab === 'cart') { fetchCartItems(); fetchDefaultAddress(); }
  }, [currentUserId, activeTab]);

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`${API_BASE_URL}/orders/check-suspension/${currentUserId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSuspension(d); })
      .catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    if (activeTab !== 'cart') return;
    const interval = setInterval(() => { fetchCartItems(); }, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'cart') fetchCartItems();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab]);

  const fetchDefaultAddress = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/user/${currentUserId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        const def = data.find(a => a.is_default) || data[0];
        setDefaultAddress(def);
      }
    } catch (e) { console.warn('Could not load default address:', e); }
  };

  const fetchCartItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch cart items');
      const data = await response.json();
      const items = data.cart_items || [];

      const changed = new Set();
      items.forEach(item => {
        if (!item.product) return;
        const livePrice = getLivePrice(item.product);
        const savedPrice = parseFloat(item.price);
        if (Math.abs(livePrice - savedPrice) > 0.001) changed.add(item.id);
      });

      setPriceChangedItems(changed);
      setCartItems(items);
      setHasChanges(false);
      setCheckedItems(new Set());
      setSelectionMode(false);
      setSelectedCheckoutItems(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGroupWeightKg = (items) => {
    const total = items.reduce((sum, item) => {
      const weight = parseFloat(item.product?.weight || 0);
      const unit = (item.product?.weight_unit || 'g').toLowerCase();
      const kg = unit === 'kg' ? weight : weight / 1000;
      return sum + (kg * item.quantity);
    }, 0);
    return Math.max(total, 0.1);
  };

  const fetchGroupShippingFee = useCallback(async (sellerId, items, address) => {
    if (!address?.province || !items?.length) return;
    const weightKg = getGroupWeightKg(items);
    setShippingFees(prev => ({ ...prev, [sellerId]: { ...prev[sellerId], loading: true, error: null } }));
    try {
      const params = new URLSearchParams({ province: address.province, weight_kg: weightKg.toFixed(3) });
      const res = await fetch(`${API_BASE_URL}/shipping/calculate?${params}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setShippingFees(prev => ({ ...prev, [sellerId]: { fee: parseFloat(data.fee), zone: data.zone || '', loading: false, error: null } }));
      } else {
        setShippingFees(prev => ({ ...prev, [sellerId]: { fee: 150, zone: '', loading: false, error: 'Could not calculate exact rate' } }));
      }
    } catch {
      setShippingFees(prev => ({ ...prev, [sellerId]: { fee: 150, zone: '', loading: false, error: 'Network error' } }));
    }
  }, []);

  useEffect(() => {
    if (!defaultAddress || cartItems.length === 0) return;
    const groups = getSellerGroups();
    groups.forEach(group => { fetchGroupShippingFee(group.sellerId, group.items, defaultAddress); });
  }, [defaultAddress, cartItems]);

  const totalWeightAllItems = cartItems.reduce((sum, item) => {
    const weight = parseFloat(item.product?.weight || 0);
    const unit = (item.product?.weight_unit || 'g').toLowerCase();
    const kg = unit === 'kg' ? weight : weight / 1000;
    return sum + (kg * item.quantity);
  }, 0);

  useEffect(() => {
    if (!defaultAddress || cartItems.length === 0) return;
    const groups = getSellerGroups();
    groups.forEach(group => { fetchGroupShippingFee(group.sellerId, group.items, defaultAddress); });
  }, [totalWeightAllItems]);

  const exitSelectionMode = () => { setSelectionMode(false); setCheckedItems(new Set()); };

  const getSellerGroups = () => {
    const groups = {};
    cartItems.forEach(item => {
      const sellerId = item.product?.user_id || 'unknown';
      const sellerName = item.product?.seller_name || item.product?.brand || `Seller ${sellerId.slice(0, 6)}`;
      if (!groups[sellerId]) groups[sellerId] = { sellerId, sellerName, items: [] };
      groups[sellerId].items.push(item);
    });
    return Object.values(groups);
  };

  const sellerGroups = getSellerGroups();

  const allItemIds = cartItems.map(i => i.id);
  const isAllChecked = allItemIds.length > 0 && allItemIds.every(id => checkedItems.has(id));
  const isAllIndeterminate = checkedItems.size > 0 && !isAllChecked;
  const selectedCount = checkedItems.size;

  const toggleItem = (itemId) => {
    setCheckedItems(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });
  };

  const toggleSellerGroup = (groupItems) => {
    const groupIds = groupItems.map(i => i.id);
    const allGroupChecked = groupIds.every(id => checkedItems.has(id));
    setCheckedItems(prev => {
      const n = new Set(prev);
      allGroupChecked ? groupIds.forEach(id => n.delete(id)) : groupIds.forEach(id => n.add(id));
      return n;
    });
  };

  const getGroupCheckState = (groupItems) => {
    const groupIds = groupItems.map(i => i.id);
    const count = groupIds.filter(id => checkedItems.has(id)).length;
    if (count === 0) return 'none';
    if (count === groupIds.length) return 'all';
    return 'some';
  };

  const toggleSelectAll = () => { isAllChecked ? setCheckedItems(new Set()) : setCheckedItems(new Set(allItemIds)); };

  const handleBulkRemove = () => {
    if (checkedItems.size === 0) return;
    setConfirmDialog({
      message: `Remove ${checkedItems.size} item${checkedItems.size > 1 ? 's' : ''}?`,
      subMessage: `${checkedItems.size} selected item${checkedItems.size > 1 ? 's' : ''} will be permanently removed from your cart.`,
      confirmLabel: 'Remove Selected', danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          await Promise.all([...checkedItems].map(id => fetch(`${API_BASE_URL}/cart/${id}`, { method: 'DELETE' })));
          const remaining = cartItems.filter(i => !checkedItems.has(i.id));
          setCartItems(remaining);
          setCheckedItems(new Set());
          setSelectedCheckoutItems(prev => new Set([...prev].filter(id => remaining.some(r => r.id === id))));
          if (remaining.length === 0) exitSelectionMode();
          addToast(`${checkedItems.size} item${checkedItems.size > 1 ? 's' : ''} removed from cart.`, 'success');
        } catch (err) {
          addToast('Error removing items. Please try again.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const updateQuantityLocal = (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    const item = cartItems.find(i => i.id === cartItemId);
    if (item && newQuantity > item.product.stock_quantity) {
      setQuantityErrors(prev => ({ ...prev, [cartItemId]: `Only ${item.product.stock_quantity} item${item.product.stock_quantity !== 1 ? 's' : ''} available in stock.` }));
      return;
    }
    setQuantityErrors(prev => { const n = { ...prev }; delete n[cartItemId]; return n; });
    setCartItems(prev => prev.map(i => i.id === cartItemId ? { ...i, quantity: newQuantity } : i));
    setHasChanges(true);
  };

  const updateCartOnServer = async () => {
    setLoading(true);
    try {
      await Promise.all(cartItems.map(item =>
        fetch(`${API_BASE_URL}/cart/${item.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity })
        })
      ));
      setHasChanges(false);
      addToast('Cart updated successfully!', 'success');
      await fetchCartItems();
    } catch (err) {
      addToast('Error updating cart. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    setConfirmDialog({
      message: 'Remove this item?', subMessage: 'This item will be removed from your cart.',
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}`, { method: 'DELETE' });
          if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to remove item'); }
          const remaining = cartItems.filter(i => i.id !== cartItemId);
          setCartItems(remaining);
          setCheckedItems(prev => { const n = new Set(prev); n.delete(cartItemId); return n; });
          setSelectedCheckoutItems(prev => { const n = new Set(prev); n.delete(cartItemId); return n; });
          if (remaining.length === 0) exitSelectionMode();
          addToast('Item removed from cart.', 'success');
        } catch (err) {
          addToast('Error removing item. Please try again.', 'error');
        }
      }
    });
  };

  const getLivePrice = (product) => {
    if (!product) return 0;
    const base = parseFloat(product.price);
    if (product.discount_percentage > 0) return base - (base * product.discount_percentage / 100);
    return base;
  };
  const getItemPrice = (item) => { if (item.product) return getLivePrice(item.product); return parseFloat(item.price) || 0; };
  const getItemTotal = (item) => getItemPrice(item) * item.quantity;
  const getGroupTotalQty = (items) => items.reduce((s, i) => s + i.quantity, 0);
  const getGroupSubtotal = (items) => items.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0);
  const getGroupShippingFee = (sellerId) => { const e = shippingFees[sellerId]; if (!e) return null; if (e.loading) return null; return e.fee ?? 150; };
  const getGroupShippingZone = (sellerId) => shippingFees[sellerId]?.zone || '';
  const isGroupShippingLoading = (sellerId) => shippingFees[sellerId]?.loading === true;
  const getGroupTotal = (sellerId, items) => { const s = getGroupSubtotal(items); const sh = getGroupShippingFee(sellerId); return sh === null ? s : s + sh; };

  const toggleCheckoutItem = (itemId) => {
    setSelectedCheckoutItems(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });
  };

  const toggleGroupCheckoutSelection = (groupItems) => {
    const groupIds = groupItems.map(i => i.id);
    const allSelected = groupIds.every(id => selectedCheckoutItems.has(id));
    setSelectedCheckoutItems(prev => {
      const n = new Set(prev);
      allSelected ? groupIds.forEach(id => n.delete(id)) : groupIds.forEach(id => n.add(id));
      return n;
    });
  };

  const getGroupCheckoutState = (groupItems) => {
    const groupIds = groupItems.map(i => i.id);
    const count = groupIds.filter(id => selectedCheckoutItems.has(id)).length;
    if (count === 0) return 'none';
    if (count === groupIds.length) return 'all';
    return 'some';
  };

  const itemsForCheckout = cartItems.filter(i => selectedCheckoutItems.has(i.id));

  const checkoutSellerGroups = (() => {
    const groups = {};
    itemsForCheckout.forEach(item => {
      const sellerId = item.product?.user_id || 'unknown';
      const sellerName = item.product?.seller_name || item.product?.brand || `Seller ${sellerId.slice(0, 6)}`;
      if (!groups[sellerId]) groups[sellerId] = { sellerId, sellerName, items: [] };
      groups[sellerId].items.push(item);
    });
    return Object.values(groups);
  })();

  const checkoutHasMultipleSellers = checkoutSellerGroups.length > 1;

  const selectedSubtotal = itemsForCheckout.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0);
  const selectedShipping = checkoutSellerGroups.reduce((s, g) => { const fee = getGroupShippingFee(g.sellerId); return s + (fee !== null ? fee : 0); }, 0);
  const selectedTotal = selectedSubtotal + selectedShipping;

  const handleCheckout = async () => {
    if (suspension?.suspended) {
      setConfirmDialog({
        message: 'Checkout Suspended',
        subMessage: suspension.message ||
          `Your checkout is suspended for ${suspension.hours_left} more hour${suspension.hours_left !== 1 ? 's' : ''} due to repeated order cancellations. You can still browse, add to cart, message sellers, and view your orders.`,
        confirmLabel: 'Got it',
        danger: false,
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }

    if (itemsForCheckout.length === 0) {
      addToast('Please select items you want to purchase.', 'warning');
      return;
    }
    if (hasChanges) {
      addToast('Please update your cart before proceeding to checkout.', 'warning');
      return;
    }
    if (checkoutHasMultipleSellers) {
      setConfirmDialog({
        message: 'Multiple sellers selected',
        subMessage: `Your selected items are from ${checkoutSellerGroups.length} different sellers. You can only checkout one seller at a time. Please deselect items from the other seller(s).`,
        confirmLabel: 'OK', danger: false, onConfirm: () => setConfirmDialog(null)
      });
      return;
    }

    setLoading(true);
    try {
      const stockErrors = [];
      await Promise.all(itemsForCheckout.map(async (item) => {
        try {
          const res = await fetch(`${API_BASE_URL}/products/${item.product_id}`);
          if (!res.ok) { stockErrors.push(`"${item.product?.product_name || 'A product'}" is no longer available.`); return; }
          const data = await res.json();
          const product = data.product || data;
          if (!product.is_active) {
            stockErrors.push(`"${product.product_name}" has been removed by the seller.`);
          } else if (product.stock_quantity < item.quantity) {
            stockErrors.push(product.stock_quantity === 0
              ? `"${product.product_name}" is now out of stock. Or Browse Different products.`
              : `"${product.product_name}" only has ${product.stock_quantity} left (you want ${item.quantity}).`
            );
          }
        } catch {
          stockErrors.push(`Could not verify "${item.product?.product_name || 'a product'}". Please try again.`);
        }
      }));

      if (stockErrors.length > 0) {
        setConfirmDialog({
          message: '⚠️ Some items are unavailable',
          subMessage: stockErrors.join('\n'),
          confirmLabel: 'Update Cart', danger: false,
          onConfirm: () => { setConfirmDialog(null); fetchCartItems(); }
        });
        return;
      }

      const sellerId = checkoutSellerGroups[0]?.sellerId || null;
      navigate('/buyer/checkout', { state: { checkoutItems: itemsForCheckout, sellerId } });
    } catch {
      addToast('Could not verify item availability. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => { setActiveTab(tab); navigate(`/buyer/cart?tab=${tab}`, { replace: true }); };
  const toggleGroup = (sellerId) => { setCollapsedGroups(prev => ({ ...prev, [sellerId]: !prev[sellerId] })); };

  const renderCartItem = (item) => {
    const isDeleteChecked = checkedItems.has(item.id);
    const isCheckoutSelected = selectedCheckoutItems.has(item.id);
    const livePrice = getItemPrice(item);
    const savedPrice = parseFloat(item.price) || 0;
    const priceWasUpdated = priceChangedItems.has(item.id) || Math.abs(livePrice - savedPrice) > 0.001;
    const isOutOfStock = item.product?.stock_quantity === 0;
    const storeName = getStoreName(item.product);

    return (
      <div key={item.id} className={`p-5 transition-colors group ${
        selectionMode && isDeleteChecked ? 'bg-red-50/40'
        : !selectionMode && isCheckoutSelected ? 'bg-blue-50/20'
        : 'hover:bg-gray-50/60'
      }`}>
        <div className="flex gap-4 items-start">

          {!selectionMode && (
            <div className="pt-1 flex-shrink-0">
              <Checkbox checked={isCheckoutSelected} onChange={() => toggleCheckoutItem(item.id)} />
            </div>
          )}

          {selectionMode && (
            <div className="pt-1 flex-shrink-0">
              <Checkbox checked={isDeleteChecked} onChange={() => toggleItem(item.id)} />
            </div>
          )}

          <div
            className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 border-transparent group-hover:border-blue-200 transition"
            onClick={() => navigate(`/buyer/products/${item.product_id}`)}>
            {item.product?.product_image
              ? <img src={item.product.product_image} alt={item.product?.product_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-8 h-8" /></div>
            }
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-semibold leading-tight text-center">OUT OF{'\n'}STOCK</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-gray-900 mb-0.5 cursor-pointer hover:text-blue-600 transition truncate text-sm"
                  onClick={() => navigate(`/buyer/products/${item.product_id}`)}>
                  {item.product?.product_name}
                </h3>

                {storeName && (
                  <p className="text-xs text-gray-500 font-medium mb-0.5 flex items-center gap-1 truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {storeName}
                  </p>
                )}

                {item.product?.category && <p className="text-xs text-gray-400">{item.product.category}</p>}
                {item.product?.weight > 0 && (
                  <p className="text-xs text-gray-400">
                    {item.product.weight_unit === 'kg' ? `${item.product.weight}kg` : `${item.product.weight}g`} per item
                  </p>
                )}

                {isOutOfStock && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium text-red-600 bg-red-50">
                    Out of stock
                  </span>
                )}
              </div>
              {!selectionMode && (
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition flex-shrink-0 p-0.5" title="Remove from cart">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <div>
                {item.product?.discount_percentage > 0 ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-green-600">₱{formatPrice(livePrice)}</span>
                    <span className="text-xs text-gray-400 line-through">₱{formatPrice(item.product.price)}</span>
                  </div>
                ) : (
                  <span className="text-base font-bold text-gray-900">₱{formatPrice(livePrice)}</span>
                )}
                {priceWasUpdated && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full leading-tight">Price updated</span>
                    <span className="text-[10px] text-gray-400 line-through">was ₱{formatPrice(savedPrice)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => updateQuantityLocal(item.id, item.quantity - 1)} disabled={item.quantity <= 1}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-md font-bold transition shadow-sm text-sm">−</button>

                  <input type="text" inputMode="numeric"
                    value={quantityDrafts[item.id] !== undefined ? quantityDrafts[item.id] : item.quantity}
                    onFocus={() => {
                      setQuantityDrafts(prev => ({ ...prev, [item.id]: String(item.quantity) }));
                      setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setQuantityDrafts(prev => ({ ...prev, [item.id]: val }));
                      const stock = item.product?.stock_quantity ?? 1;
                      const parsed = parseInt(val, 10);
                      if (val === '' || parsed < 1) setQuantityErrors(prev => ({ ...prev, [item.id]: 'Quantity must be at least 1.' }));
                      else if (parsed > stock) setQuantityErrors(prev => ({ ...prev, [item.id]: `Only ${stock} item${stock !== 1 ? 's' : ''} available in stock.` }));
                      else setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                    }}
                    onBlur={() => {
                      const draft = quantityDrafts[item.id];
                      const parsed = parseInt(draft, 10);
                      const stock = item.product?.stock_quantity ?? 1;
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= stock) updateQuantityLocal(item.id, parsed);
                      setQuantityDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                      setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') {
                        setQuantityDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                        setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                        e.target.blur();
                      }
                    }}
                    className={`w-9 text-center font-bold text-gray-900 text-sm bg-white rounded-md border focus:outline-none transition py-0.5 cursor-text select-all ${
                      quantityErrors[item.id] ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                    title="Click to edit quantity"
                  />

                  <button onClick={() => updateQuantityLocal(item.id, item.quantity + 1)} disabled={item.quantity >= item.product?.stock_quantity}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-300 text-gray-700 rounded-md font-bold transition shadow-sm text-sm">+</button>
                </div>

                <div className="text-right min-w-[72px]">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                  <p className={`text-sm font-bold ${isCheckoutSelected && !selectionMode ? 'text-blue-700' : 'text-gray-900'}`}>
                    ₱{formatPrice(getItemTotal(item))}
                  </p>
                </div>
              </div>
            </div>

            {quantityErrors[item.id] && (
              <div className="mt-2 flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-2.5 py-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="font-medium">{quantityErrors[item.id]}</span>
              </div>
            )}

            {item.product?.stock_quantity <= 10 && item.product?.stock_quantity > 0 && !quantityErrors[item.id] && (
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-orange-600 bg-orange-50">
                  Only {item.product.stock_quantity} left
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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

      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className={`px-6 py-5 flex items-start gap-4 border-b ${confirmDialog.danger ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmDialog.danger ? 'bg-red-100' : 'bg-blue-100'}`}>
                {confirmDialog.danger ? <Trash2 className="h-5 w-5 text-red-600" /> : <AlertCircle className="h-5 w-5 text-blue-600" />}
              </div>
              <div>
                <h3 className={`font-bold text-base ${confirmDialog.danger ? 'text-red-900' : 'text-blue-900'}`}>{confirmDialog.message}</h3>
                {confirmDialog.subMessage && (
                  <p className={`text-sm mt-1 whitespace-pre-line ${confirmDialog.danger ? 'text-red-700' : 'text-blue-700'}`}>{confirmDialog.subMessage}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 flex gap-3 justify-end">
              {confirmDialog.danger && (
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-sm">Cancel</button>
              )}
              <button onClick={confirmDialog.onConfirm} className={`px-5 py-2 rounded-lg text-white font-semibold text-sm transition ${confirmDialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            {activeTab === 'cart' ? 'Shopping Cart' : activeTab === 'orders' ? 'My Orders' : 'Messages'}
          </h1>
          <p className="text-gray-600">
            {activeTab === 'cart' && 'Select the items you want to checkout'}
            {activeTab === 'orders' && 'Track and manage your orders'}
            {activeTab === 'messages' && 'Communicate with sellers'}
          </p>
        </div>

        {/* Suspension banner */}
        {suspension?.suspended && activeTab === 'cart' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-red-800 text-sm">Checkout Suspended</p>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{suspension.hours_left}h remaining</span>
              </div>
              <p className="text-xs text-red-700">
                Due to repeated cancellations, checkout is blocked until{' '}
                <strong>{new Date(suspension.suspended_until).toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>.
                You can still <strong>add to cart, message sellers</strong>, and view your orders.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex">
            {[
              { id: 'cart', label: 'Cart', icon: ShoppingBag, count: cartItems.length },
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'messages', label: 'Messages', icon: Mail }
            ].map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 relative ${activeTab === id ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon className="w-5 h-5" />
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
                )}
                {activeTab === id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-fadeIn">
          {activeTab === 'cart' && (
            <>
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"><p className="text-red-700">Error: {error}</p></div>}

              {priceChangedItems.size > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">{priceChangedItems.size === 1 ? '1 item has' : `${priceChangedItems.size} items have`} an updated price</p>
                    <p className="text-xs text-amber-700 mt-0.5">The latest prices are shown below.</p>
                  </div>
                </div>
              )}

              {isAtLimit && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3.5 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Cart limit reached — {CART_LIMIT} of {CART_LIMIT} unique products</p>
                    <p className="text-xs text-amber-700 mt-0.5">Remove one before adding a new product.</p>
                  </div>
                </div>
              )}

              {cartItems.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-12 h-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                  <p className="text-gray-600 mb-8">Start shopping and add items to your cart</p>
                  <button onClick={() => navigate('/buyer/products')} className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-semibold shadow-lg">Browse Products</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* ── Left: Seller Groups ── */}
                  <div className="lg:col-span-2 space-y-4">

                    {/* Top Action Bar */}
                    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-200 ${selectionMode ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'}`}>
                      {!selectionMode ? (
                        <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${isAtLimit ? 'text-amber-600' : 'text-gray-500'}`}>{totalCartItems} / {CART_LIMIT} products</span>
                            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${isAtLimit ? 'bg-amber-400' : totalCartItems >= 8 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                                style={{ width: `${(totalCartItems / CART_LIMIT) * 100}%` }} />
                            </div>
                          </div>
                          <button onClick={() => setSelectionMode(true)}
                            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 px-4 py-2 rounded-xl transition-all duration-150">
                            <Trash2 className="w-4 h-4" />Remove Items
                          </button>
                        </div>
                      ) : (
                        <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-red-50/50">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isAllChecked} indeterminate={isAllIndeterminate} onChange={toggleSelectAll} />
                            <span className="font-semibold text-gray-700 text-sm select-none">{isAllChecked ? 'Deselect All' : 'Select All'}</span>
                            {selectedCount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{selectedCount} to remove</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedCount > 0 && (
                              <button onClick={handleBulkRemove} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 px-3.5 py-2 rounded-xl transition-all duration-150">
                                <Trash2 className="w-4 h-4" />Remove ({selectedCount})
                              </button>
                            )}
                            <button onClick={exitSelectionMode} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl transition-all duration-150">
                              <X className="w-4 h-4" />Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!selectionMode && cartItems.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <p className="text-sm text-blue-700 flex-1">
                          <strong>{selectedCheckoutItems.size}</strong> of <strong>{cartItems.length}</strong> item{cartItems.length !== 1 ? 's' : ''} selected for checkout.
                        </p>
                        <div className="flex gap-2 shrink-0">
                          {selectedCheckoutItems.size < cartItems.length && (
                            <button onClick={() => setSelectedCheckoutItems(new Set(cartItems.map(i => i.id)))}
                              className="text-xs text-blue-600 underline font-semibold hover:text-blue-800">Select all</button>
                          )}
                          {selectedCheckoutItems.size > 0 && (
                            <button onClick={() => setSelectedCheckoutItems(new Set())}
                              className="text-xs text-gray-500 underline font-semibold hover:text-gray-700">Clear all</button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Seller groups */}
                    {sellerGroups.map((group) => {
                      const isCollapsed = collapsedGroups[group.sellerId];
                      const groupSubtotal = getGroupSubtotal(group.items);
                      const shippingFee = getGroupShippingFee(group.sellerId);
                      const shippingLoading = isGroupShippingLoading(group.sellerId);
                      const shippingZone = getGroupShippingZone(group.sellerId);
                      const groupTotal = getGroupTotal(group.sellerId, group.items);
                      const groupQty = getGroupTotalQty(group.items);
                      const groupWeightKg = getGroupWeightKg(group.items);
                      const deleteGroupCheckState = getGroupCheckState(group.items);
                      const checkoutGroupState = getGroupCheckoutState(group.items);
                      const selectedInGroup = group.items.filter(i => selectedCheckoutItems.has(i.id)).length;

                      return (
                        <div key={group.sellerId} className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden transition-all">

                          <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              {!selectionMode && (
                                <Checkbox
                                  checked={checkoutGroupState === 'all'}
                                  indeterminate={checkoutGroupState === 'some'}
                                  onChange={() => toggleGroupCheckoutSelection(group.items)}
                                />
                              )}
                              {selectionMode && (
                                <Checkbox
                                  checked={deleteGroupCheckState === 'all'}
                                  indeterminate={deleteGroupCheckState === 'some'}
                                  onChange={() => toggleSellerGroup(group.items)}
                                />
                              )}
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Store className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{group.sellerName}</p>
                                <p className="text-xs text-gray-500">
                                  {group.items.length} product{group.items.length !== 1 ? 's' : ''} · {groupQty} item{groupQty !== 1 ? 's' : ''}
                                  {!selectionMode && selectedInGroup > 0 && selectedInGroup < group.items.length && (
                                    <span className="ml-1.5 text-blue-600 font-semibold">· {selectedInGroup}/{group.items.length} selected</span>
                                  )}
                                  {!selectionMode && selectedInGroup === group.items.length && group.items.length > 0 && (
                                    <span className="ml-1.5 text-blue-600 font-semibold">· All selected</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Group total</p>
                                <p className="font-bold text-gray-900 text-sm">
                                  {shippingLoading
                                    ? <span className="text-gray-400 text-xs">Calculating...</span>
                                    : `₱${formatPrice(groupTotal)}`}
                                </p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); toggleGroup(group.sellerId); }} className="text-gray-400 hover:text-gray-700 transition">
                                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="divide-y divide-gray-100">
                              {group.items.map(item => renderCartItem(item))}
                            </div>
                          )}

                          {!isCollapsed && (
                            <ShippingBreakdown items={group.items} shippingFee={shippingFee} shippingZone={shippingZone} shippingLoading={shippingLoading} />
                          )}

                          {!isCollapsed && (
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                              <span className="text-gray-500">Subtotal: <strong className="text-gray-800">₱{formatPrice(groupSubtotal)}</strong></span>
                              <span className="text-gray-500 flex items-center gap-1.5">
                                {shippingLoading ? (
                                  <span className="flex items-center gap-1 text-blue-500">
                                    <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                    Calculating shipping...
                                  </span>
                                ) : shippingFee !== null ? (
                                  <>
                                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                                    Shipping: <strong className="text-gray-800">₱{formatPrice(shippingFee)}</strong>
                                    {shippingZone && <span className="text-xs text-blue-600 font-medium">({shippingZone} · {groupWeightKg.toFixed(2)}kg)</span>}
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">Shipping: add address to calculate</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Bottom actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3">
                      <button onClick={() => navigate('/buyer/products')} className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition font-semibold text-sm">Continue Shopping</button>
                      <button onClick={updateCartOnServer} disabled={!hasChanges || loading}
                        className={`flex-1 py-3 px-6 rounded-xl transition font-semibold text-sm ${hasChanges && !loading ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                        {loading ? 'Updating...' : 'Update Cart'}
                      </button>
                    </div>
                  </div>

                  {/* ── Right: Order Summary ── */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-3">Order Summary</h2>

                      {/* Cart capacity */}
                      <div className={`mb-4 rounded-xl border px-4 py-2.5 ${isAtLimit ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold ${isAtLimit ? 'text-amber-700' : 'text-gray-500'}`}>Cart capacity</span>
                          <span className={`text-xs font-bold ${isAtLimit ? 'text-amber-600' : 'text-gray-600'}`}>{totalCartItems} / {CART_LIMIT}{isAtLimit && ' · Full'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${isAtLimit ? 'bg-amber-400' : totalCartItems >= 8 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                            style={{ width: `${(totalCartItems / CART_LIMIT) * 100}%` }} />
                        </div>
                      </div>

                      {itemsForCheckout.length > 0 ? (
                        <>
                          {checkoutHasMultipleSellers && (
                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700 font-medium">
                                Items from {checkoutSellerGroups.length} sellers selected. Deselect items from other sellers to continue.
                              </p>
                            </div>
                          )}

                          <div className="mb-4 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {itemsForCheckout.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                                <span className="text-gray-500 truncate flex-1">{item.product?.product_name}</span>
                                <span className="text-gray-700 font-semibold shrink-0">₱{formatPrice(getItemTotal(item))}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-gray-600 text-sm">
                              <span>Subtotal ({itemsForCheckout.length} item{itemsForCheckout.length !== 1 ? 's' : ''})</span>
                              <span className="font-bold text-gray-900">₱{formatPrice(selectedSubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 text-sm">
                              <span>Shipping Fee</span>
                              <span className="font-bold text-gray-900">
                                {checkoutSellerGroups.some(g => isGroupShippingLoading(g.sellerId))
                                  ? <span className="text-gray-400 text-xs animate-pulse">Calculating...</span>
                                  : selectedShipping > 0
                                    ? `₱${formatPrice(selectedShipping)}`
                                    : <span className="text-gray-400 text-xs">—</span>
                                }
                              </span>
                            </div>
                            <div className="border-t-2 border-gray-200 pt-4">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-3xl font-bold text-blue-600">₱{formatPrice(selectedTotal)}</span>
                              </div>
                              {itemsForCheckout.length < cartItems.length && (
                                <p className="text-xs text-gray-400 mt-1 text-right">For {itemsForCheckout.length} selected item{itemsForCheckout.length !== 1 ? 's' : ''} only</p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mb-6 py-8 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-500 font-medium">No items selected</p>
                          <p className="text-xs text-gray-400 mt-1">Tick checkboxes to select items you want to buy</p>
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={hasChanges || itemsForCheckout.length === 0 || checkoutHasMultipleSellers || loading || suspension?.suspended}
                        className={`w-full py-4 px-6 rounded-xl transition font-bold text-base flex items-center justify-center gap-2 ${
                          suspension?.suspended
                            ? 'bg-red-100 text-red-400 cursor-not-allowed'
                            : hasChanges || itemsForCheckout.length === 0 || checkoutHasMultipleSellers || loading
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}>
                        {loading ? (
                          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking availability...</>
                        ) : suspension?.suspended ? (
                          <>🚫 Checkout suspended</>
                        ) : (
                          <><CheckCircle className="w-5 h-5" />
                            {checkoutHasMultipleSellers ? 'Select 1 seller only'
                              : itemsForCheckout.length === 0 ? 'Select items to checkout'
                              : `Checkout ${itemsForCheckout.length} item${itemsForCheckout.length !== 1 ? 's' : ''}`}
                          </>
                        )}
                      </button>

                      {suspension?.suspended && (
                        <p className="text-xs text-red-500 text-center mt-3 font-medium">
                          Suspended for {suspension.hours_left} more hour{suspension.hours_left !== 1 ? 's' : ''}
                        </p>
                      )}
                      {hasChanges && !suspension?.suspended && <p className="text-xs text-orange-600 text-center mt-3 font-medium">Please update cart first</p>}
                      {checkoutHasMultipleSellers && !hasChanges && !suspension?.suspended && (
                        <p className="text-xs text-amber-600 text-center mt-3 font-medium">Deselect items from other sellers to continue</p>
                      )}

                      {itemsForCheckout.length > 0 && itemsForCheckout.length < cartItems.length && (
                        <div className="mt-5 pt-5 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Staying in cart ({cartItems.length - itemsForCheckout.length})
                          </p>
                          <div className="space-y-2">
                            {cartItems.filter(i => !selectedCheckoutItems.has(i.id)).map(item => (
                              <div key={item.id} className="flex items-center justify-between">
                                <span className="text-gray-400 truncate max-w-[140px] text-xs">{item.product?.product_name}</span>
                                <span className="text-gray-400 font-medium text-xs">₱{formatPrice(getItemTotal(item))}</span>
                              </div>
                            ))}
                            <p className="text-xs text-gray-400 mt-2">These will stay in your cart for later.</p>
                          </div>
                        </div>
                      )}

                      {/* Trust badges */}
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-xs">Secure Checkout</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Your payment info is protected</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'orders' && <OrdersPage userId={currentUserId} />}
          {activeTab === 'messages' && <MessagesTab userId={currentUserId} />}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default CartPage;