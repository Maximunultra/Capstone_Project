import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, Package, ShoppingBag, Hash, ChevronDown, ChevronUp, HeadphonesIcon, Shield, X, Paperclip, Clock, CheckCircle, XCircle, RefreshCcw, AlertCircle } from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER / PRODUCT CONTEXT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const statusStyles = {
  pending:    'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped:    'bg-purple-100 text-purple-700 border-purple-200',
  delivered:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  canceled:   'bg-red-100 text-red-700 border-red-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};

const statusDots = {
  pending:    'bg-amber-400',
  processing: 'bg-blue-400',
  shipped:    'bg-purple-400',
  delivered:  'bg-emerald-400',
  canceled:   'bg-red-400',
  cancelled:  'bg-red-400',
};

const MessageContextCard = ({ orderContext, productContext, isOwn }) => {
  const [expanded, setExpanded] = useState(false);
  if (!orderContext && !productContext) return null;

  const product      = productContext || orderContext?.items?.[0]?.product || null;
  const productName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const productImage = productContext?.product_image || product?.product_image || null;
  const brand        = productContext?.brand || product?.brand || null;

  const cardBase    = isOwn ? 'border-blue-300 bg-blue-700/30 text-blue-50' : 'border-gray-200 bg-gray-50 text-gray-800';
  const labelClass  = isOwn ? 'text-blue-200' : 'text-gray-500';
  const valueClass  = isOwn ? 'text-white font-semibold' : 'text-gray-900 font-semibold';
  const dividerClass = isOwn ? 'border-blue-400/40' : 'border-gray-200';

  return (
    <div className={`mt-2 rounded-xl border overflow-hidden text-xs ${cardBase}`}>
      <button onClick={() => setExpanded(p => !p)}
        className={`w-full flex items-center gap-2 px-3 py-2 transition ${isOwn ? 'hover:bg-blue-600/40' : 'hover:bg-gray-100'}`}>
        {productImage
          ? <img src={productImage} alt={productName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-white/30"/>
          : <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-blue-500/50' : 'bg-gray-200'}`}><Package className="w-4 h-4"/></div>
        }
        <div className="flex-1 min-w-0 text-left">
          <p className={`truncate font-semibold ${isOwn ? 'text-blue-100' : 'text-gray-700'}`}>{productName}</p>
          {orderContext && <p className={`truncate ${labelClass}`}>Order #{orderContext.order_number}</p>}
        </div>
        {orderContext && (
          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 flex items-center gap-1 ${statusStyles[orderContext.order_status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDots[orderContext.order_status] || 'bg-gray-400'}`}></span>
            {orderContext.order_status?.charAt(0).toUpperCase() + orderContext.order_status?.slice(1)}
          </span>
        )}
        {expanded ? <ChevronUp className={`w-3.5 h-3.5 flex-shrink-0 ${labelClass}`}/> : <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${labelClass}`}/>}
      </button>
      {expanded && (
        <div className={`px-3 pb-3 pt-1 border-t ${dividerClass} space-y-2`}>
          {brand && <div className="flex justify-between"><span className={labelClass}>Seller</span><span className={valueClass}>{brand}</span></div>}
          {productContext?.price && <div className="flex justify-between"><span className={labelClass}>Price</span><span className={valueClass}>₱{parseFloat(productContext.price).toFixed(2)}</span></div>}
          {orderContext && (
            <div className="flex justify-between"><span className={labelClass}>Order Total</span><span className={valueClass}>₱{parseFloat(orderContext.total_amount).toFixed(2)}</span></div>
          )}
        </div>
      )}
    </div>
  );
};

const ConversationContextBanner = ({ orderContext, productContext }) => {
  if (!orderContext && !productContext) return null;
  const productName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const productImage = productContext?.product_image || orderContext?.items?.[0]?.product?.product_image || null;
  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 flex items-center gap-3">
      {productImage
        ? <img src={productImage} alt={productName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-blue-100"/>
        : <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-5 h-5 text-blue-500"/></div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs text-blue-500 font-medium mb-0.5">Discussing</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{productName}</p>
        {orderContext && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Hash className="w-3 h-3 text-gray-400"/>
            <span className="text-xs text-gray-500 font-mono">{orderContext.order_number}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ml-1 ${statusStyles[orderContext.order_status] || ''}`}>
              {orderContext.order_status?.charAt(0).toUpperCase() + orderContext.order_status?.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REFUND STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
const RefundStatusBadge = ({ status }) => {
  const cfg = {
    pending:  { cls: 'bg-amber-100 text-amber-800 border-amber-200',  icon: <Clock className="w-3 h-3"/>,        label: 'Pending Review'  },
    approved: { cls: 'bg-green-100 text-green-800 border-green-200',  icon: <CheckCircle className="w-3 h-3"/>,  label: 'Confirmed'        },
    rejected: { cls: 'bg-red-100 text-red-800 border-red-200',        icon: <XCircle className="w-3 h-3"/>,      label: 'Rejected'        },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MY REFUNDS PANEL
// ─────────────────────────────────────────────────────────────────────────────
const MyRefundsPanel = ({ userId }) => {
  const [refunds,  setRefunds]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/refunds/user/${userId}`);
      const data = await res.json();
      if (data.success) setRefunds(data.refund_requests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const currency = (v) => `₱${parseFloat(v||0).toFixed(2)}`;
  const fmtDate  = (d) => new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
    </div>
  );

  if (refunds.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-3">
        <RefreshCcw className="w-8 h-8 text-orange-300"/>
      </div>
      <p className="text-gray-600 font-medium mb-1">No refund requests</p>
      <p className="text-sm text-gray-400">Your refund requests will appear here</p>
    </div>
  );

  // ── Detail view ───────────────────────────────────────────
  if (selected) return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white flex-shrink-0">
        <button onClick={() => setSelected(null)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition">
          ←
        </button>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">Refund Request #{selected.id}</p>
          <p className="text-xs text-gray-500">Order #{selected.order?.order_number}</p>
        </div>
        <RefundStatusBadge status={selected.status}/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {/* Amount + method */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Refund Amount</p>
            <p className="text-2xl font-bold text-gray-900">{currency(selected.refund_amount)}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment method</span>
            <span className="font-semibold uppercase">{selected.payment_method}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Submitted</span>
            <span className="text-gray-700">{fmtDate(selected.created_at)}</span>
          </div>
          {selected.reviewed_at && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">Reviewed</span>
              <span className="text-gray-700">{fmtDate(selected.reviewed_at)}</span>
            </div>
          )}
        </div>

        {/* Reason + description */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reason</p>
          <p className="font-semibold text-gray-900 text-sm">{selected.reason}</p>
          <p className="text-sm text-gray-600 mt-2">{selected.description}</p>
        </div>

        {/* Evidence photo */}
        {selected.evidence_url && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evidence Photo</p>
            <a href={selected.evidence_url} target="_blank" rel="noopener noreferrer">
              <img src={selected.evidence_url} alt="Evidence"
                className="rounded-xl max-h-40 object-cover border border-gray-200 hover:opacity-90 transition cursor-pointer"/>
            </a>
          </div>
        )}

        {/* Admin response */}
        {selected.admin_notes && (
          <div className={`rounded-xl p-4 border ${selected.status==='approved'?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${selected.status==='approved'?'text-green-600':'text-red-600'}`}>
              Admin Response
            </p>
            <p className={`text-sm ${selected.status==='approved'?'text-green-800':'text-red-800'}`}>
              {selected.admin_notes}
            </p>
          </div>
        )}

        {/* Approved — refund timeline */}
        {selected.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-1">Refund Approved!</p>
            <p className="text-xs text-green-700">
              {selected.payment_method === 'gcash'
                ? 'Your refund is being processed via GCash. It will appear in your wallet within 5–10 business days.'
                : selected.payment_method === 'paypal'
                ? 'Your refund is being processed via PayPal. It will appear in your account within 3–5 business days.'
                : 'Your refund will be transferred manually by the seller. Please expect contact within 2 business days.'}
            </p>
          </div>
        )}

        {/* Pending — what to expect */}
        {selected.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Under Review</p>
            <p className="text-xs text-amber-700">
              Our team is reviewing your request. This typically takes 1–3 business days.
              You will be notified of the decision here.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── List view ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
        <p className="text-sm font-semibold text-gray-700">{refunds.length} request{refunds.length!==1?'s':''}</p>
        <button onClick={load} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <RefreshCcw className="w-4 h-4 text-gray-400"/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {refunds.map(r => (
          <button key={r.id} onClick={() => setSelected(r)}
            className="w-full p-4 text-left hover:bg-gray-50 transition">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  Order #{r.order?.order_number || r.order_id}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
              </div>
              <RefundStatusBadge status={r.status}/>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span>
              <span className="font-bold text-gray-900 text-sm">{currency(r.refund_amount)}</span>
            </div>
            {/* Admin notes preview for non-pending */}
            {r.admin_notes && r.status !== 'pending' && (
              <p className={`text-xs mt-1.5 truncate ${r.status==='approved'?'text-green-600':'text-red-600'}`}>
                Admin: {r.admin_notes}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT SUPPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ContactSupportModal = ({ userId, adminId, adminLoading, onClose, onSent }) => {
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const SUBJECTS = [
    'Report a seller',
    'Request a refund',
    'Other',
  ];

  const handleSend = async () => {
    setError('');
    if (!subject) { setError('Please select a subject.'); return; }
    if (!body.trim()) { setError('Please enter your message.'); return; }
    if (body.trim().length < 10) { setError('Message must be at least 10 characters.'); return; }
    if (!adminId) { setError('Could not reach support. Please email us directly at support@artisan.com'); return; }

    setSending(true);
    try {
      const fullMessage = `[${subject}]\n\n${body.trim()}`;
      const res  = await fetch(`${API_BASE_URL}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sender_id: userId, receiver_id: adminId, message: fullMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      onSent(adminId);
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
              <HeadphonesIcon className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="font-bold text-lg">Contact Support</h2>
              <p className="text-violet-200 text-xs">We typically reply within 24 hours</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What's this about?</label>
            <div className="flex flex-col gap-2">
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition border ${
                    subject===s ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50'
                  }`}>
                  {s}
                </button>
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
            <Shield className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5"/>
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
              : <><Send className="w-4 h-4"/>Send to Support</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MessagesTab = ({ userId }) => {
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);

  const [activeTab,            setActiveTab]            = useState('messages'); // 'messages' | 'refunds'
  const [conversations,        setConversations]        = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages,             setMessages]             = useState([]);
  const [newMessage,           setNewMessage]           = useState('');
  const [searchQuery,          setSearchQuery]          = useState('');
  const [loading,              setLoading]              = useState(true);
  const [sending,              setSending]              = useState(false);
  const [imageFile,            setImageFile]            = useState(null);
  const [imagePreview,         setImagePreview]         = useState(null);
  const [pendingRefunds,       setPendingRefunds]       = useState(0);

  const [adminId,          setAdminId]          = useState(null);
  const [adminLoading,     setAdminLoading]     = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchConversations();
      fetchAdminId();
      fetchRefundCount();
    }
  }, [userId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchAdminId = async () => {
    setAdminLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/users/admin`);
      const data = await res.json();
      if (res.ok && data.id) setAdminId(data.id);
    } catch (err) { console.error('Could not fetch admin user:', err); }
    finally { setAdminLoading(false); }
  };

  const fetchRefundCount = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/refunds/user/${userId}`);
      const data = await res.json();
      if (data.success) {
        const pending = (data.refund_requests || []).filter(r => r.status === 'pending').length;
        setPendingRefunds(pending);
      }
    } catch (e) { console.error(e); }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/messages/user/${userId}`);
      const data = await res.json();
      if (data.success) setConversations(data.conversations || []);
    } catch (err) { console.error('Error fetching conversations:', err); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/messages/conversation/${userId}/${otherUserId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        markMessagesAsRead(otherUserId);
      }
    } catch (err) { console.error('Error fetching messages:', err); }
  };

  const markMessagesAsRead = async (otherUserId) => {
    try {
      await fetch(`${API_BASE_URL}/messages/conversation/${userId}/${otherUserId}/read`, { method: 'PATCH' });
      fetchConversations();
    } catch (err) { console.error('Error marking messages as read:', err); }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.other_user_id);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearImage = () => { setImageFile(null); setImagePreview(null); };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !imageFile) || !selectedConversation || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('sender_id',   userId);
      formData.append('receiver_id', selectedConversation.other_user_id);
      if (newMessage.trim()) formData.append('message', newMessage.trim());
      if (imageFile)         formData.append('image', imageFile);

      const res  = await fetch(`${API_BASE_URL}/messages`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        clearImage();
        fetchMessages(selectedConversation.other_user_id);
        fetchConversations();
      }
    } catch (err) { console.error('Error sending message:', err); }
    finally { setSending(false); }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleSupportSent = async (adminUserId) => {
    setShowSupportModal(false);
    await fetchConversations();
    setTimeout(async () => {
      const res  = await fetch(`${API_BASE_URL}/messages/conversation/${userId}/${adminUserId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setSelectedConversation({
          other_user_id:        adminUserId,
          other_user_name:      'Support Team',
          other_user_email:     '',
          last_order_context:   null,
          last_product_context: null,
        });
      }
    }, 400);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const diff = (Date.now() - date) / (1000 * 60 * 60);
    if (diff < 24) return date.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true });
    if (diff < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContextOrder   = selectedConversation?.last_order_context   || null;
  const activeContextProduct = selectedConversation?.last_product_context || null;
  const isAdminConversation  = adminId && selectedConversation?.other_user_id === adminId;
  const totalUnread          = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '620px' }}>
        <div className="flex h-full">

          {/* ── Left Sidebar ── */}
          <div className={`${selectedConversation && activeTab==='messages' ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-100`}>

            {/* Tab switcher */}
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
              <button onClick={() => setActiveTab('messages')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition relative ${activeTab==='messages'?'text-blue-600':'text-gray-500 hover:text-gray-700'}`}>
                <MessageCircle className="w-4 h-4"/>
                Messages
                {totalUnread > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">{totalUnread}</span>
                )}
                {activeTab==='messages' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"/>}
              </button>
              <button onClick={() => { setActiveTab('refunds'); fetchRefundCount(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition relative ${activeTab==='refunds'?'text-orange-600':'text-gray-500 hover:text-gray-700'}`}>
                <RefreshCcw className="w-4 h-4"/>
                My Refunds
                {pendingRefunds > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingRefunds}</span>
                )}
                {activeTab==='refunds' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"/>}
              </button>
            </div>

            {/* ── Messages Tab Content ── */}
            {activeTab === 'messages' && (
              <>
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Search..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                  </div>
                </div>

                {/* Contact Support Button */}
                <div className="px-3 pt-3 pb-2">
                  <button onClick={() => setShowSupportModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl hover:from-violet-100 hover:to-indigo-100 transition group">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition">
                      <HeadphonesIcon className="w-4 h-4 text-white"/>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-violet-700">Contact Support</p>
                      <p className="text-[11px] text-violet-500">Get help from our team</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Online"></div>
                  </button>
                </div>

                <div className="px-3 pb-2">
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Conversations</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <MessageCircle className="w-8 h-8 text-gray-400"/>
                      </div>
                      <p className="text-gray-600 font-medium mb-1">No messages yet</p>
                      <p className="text-sm text-gray-400">Message sellers about your orders</p>
                    </div>
                  ) : (
                    <div>
                      {filteredConversations.map((conv) => {
                        const isAdmin = adminId && conv.other_user_id === adminId;
                        return (
                          <button key={conv.other_user_id} onClick={() => handleSelectConversation(conv)}
                            className={`w-full p-3 hover:bg-gray-50 transition text-left border-b border-gray-50 ${selectedConversation?.other_user_id===conv.other_user_id?'bg-blue-50 border-l-4 border-l-blue-600':''}`}>
                            <div className="flex items-start gap-3">
                              <div className="relative flex-shrink-0">
                                {isAdmin
                                  ? <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm"><HeadphonesIcon className="w-5 h-5 text-white"/></div>
                                  : <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{conv.other_user_name?.charAt(0).toUpperCase()||'U'}</div>
                                }
                                {isAdmin && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h3 className="font-semibold text-gray-900 text-sm truncate flex items-center gap-1">
                                    {isAdmin ? <><span>Support Team</span><span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">ADMIN</span></> : (conv.other_user_name||'Unknown')}
                                  </h3>
                                  <span className="text-xs text-gray-500 ml-2">{formatTime(conv.last_message_time)}</span>
                                </div>
                                {!isAdmin && (conv.last_product_context || conv.last_order_context) && (
                                  <p className="text-[10px] text-blue-500 font-medium truncate flex items-center gap-1 mb-0.5">
                                    <Package className="w-3 h-3 flex-shrink-0"/>
                                    {conv.last_product_context?.product_name || conv.last_order_context?.items?.[0]?.product_name || `Order #${conv.last_order_context?.order_number}`}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 truncate">{conv.last_message||'No messages'}</p>
                                {conv.unread_count > 0 && (
                                  <span className={`inline-block mt-1 px-2 py-0.5 text-white text-xs font-bold rounded-full ${isAdmin?'bg-violet-600':'bg-blue-600'}`}>{conv.unread_count}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Refunds Tab Content ── */}
            {activeTab === 'refunds' && (
              <div className="flex-1 overflow-hidden">
                <MyRefundsPanel userId={userId}/>
              </div>
            )}
          </div>

          {/* ── Chat Area ── */}
          <div className={`${selectedConversation && activeTab==='messages' ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
            {selectedConversation && activeTab === 'messages' ? (
              <>
                {/* Chat Header */}
                <div className={`p-4 border-b border-gray-100 flex-shrink-0 ${isAdminConversation?'bg-gradient-to-r from-violet-50 to-indigo-50':'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedConversation(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">←</button>
                    {isAdminConversation
                      ? <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm"><HeadphonesIcon className="w-5 h-5 text-white"/></div>
                      : <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">{selectedConversation.other_user_name?.charAt(0).toUpperCase()}</div>
                    }
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {isAdminConversation ? 'Support Team' : selectedConversation.other_user_name}
                        {isAdminConversation && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">ADMIN</span>}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {isAdminConversation
                          ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>Available · replies within 24h</>
                          : 'Seller'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {!isAdminConversation && <ConversationContextBanner orderContext={activeContextOrder} productContext={activeContextProduct}/>}
                {isAdminConversation && (
                  <div className="mx-4 mt-3 mb-1 rounded-xl border border-violet-100 bg-violet-50 p-3 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-violet-500 flex-shrink-0"/>
                    <p className="text-xs text-violet-700">This is a private conversation with our support team. Do not share passwords or payment details.</p>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        {isAdminConversation
                          ? <><div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3"><HeadphonesIcon className="w-8 h-8 text-violet-500"/></div><p className="text-gray-700 font-medium">How can we help you?</p><p className="text-gray-500 text-sm mt-1">Send us a message and we'll get back to you.</p></>
                          : <p className="text-gray-500 text-sm">No messages yet</p>
                        }
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === userId;
                        return (
                          <div key={msg.id} className={`flex ${isOwn?'justify-end':'justify-start'}`}>
                            <div className="max-w-[78%]">
                              {msg.image_url && (
                                <div className={`mb-1 ${isOwn?'flex justify-end':''}`}>
                                  <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                                    <img src={msg.image_url} alt="attachment" className="max-w-[220px] max-h-[220px] rounded-2xl object-cover border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition"/>
                                  </a>
                                </div>
                              )}
                              {msg.message && (
                                <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn?(isAdminConversation?'bg-violet-600 text-white rounded-br-sm':'bg-blue-600 text-white rounded-br-sm'):'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'}`}>
                                  {msg.message}
                                </div>
                              )}
                              {!isAdminConversation && <MessageContextCard orderContext={msg.order_context} productContext={msg.product_context} isOwn={isOwn}/>}
                              <div className={`flex gap-1 mt-1 px-1 ${isOwn?'justify-end':''}`}>
                                <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef}/>
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                  {imagePreview && (
                    <div className="mb-2 relative inline-block">
                      <img src={imagePreview} alt="preview" className="max-h-24 max-w-[180px] rounded-xl object-cover border border-gray-200 shadow-sm"/>
                      <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow"><X className="w-3 h-3"/></button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect}/>
                    <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                      className={`p-2.5 rounded-xl transition flex-shrink-0 ${imageFile?(isAdminConversation?'bg-violet-100 text-violet-600':'bg-blue-100 text-blue-600'):'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      <Paperclip className="w-5 h-5"/>
                    </button>
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress}
                      placeholder={isAdminConversation?'Message support team...':'Type a message...'}
                      className={`flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm transition focus:bg-white ${isAdminConversation?'focus:ring-2 focus:ring-violet-500':'focus:ring-2 focus:ring-blue-500'}`}
                      maxLength={500}/>
                    <button onClick={handleSendMessage} disabled={(!newMessage.trim()&&!imageFile)||sending}
                      className={`p-2.5 rounded-xl transition ${(newMessage.trim()||imageFile)&&!sending?(isAdminConversation?'bg-violet-600 text-white hover:bg-violet-700':'bg-blue-600 text-white hover:bg-blue-700'):'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {sending ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <Send className="w-5 h-5"/>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 px-1">{newMessage.length}/500</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-blue-600"/>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {activeTab === 'refunds' ? 'Select a refund request' : 'Select a conversation'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'refunds' ? 'Choose a request from the list to view details' : 'Choose from the list to start messaging'}
                  </p>
                  {activeTab === 'messages' && (
                    <button onClick={() => setShowSupportModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-indigo-600 transition shadow-sm">
                      <HeadphonesIcon className="w-4 h-4"/>Contact Support
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSupportModal && (
        <ContactSupportModal userId={userId} adminId={adminId} adminLoading={adminLoading}
          onClose={() => setShowSupportModal(false)} onSent={handleSupportSent}/>
      )}
    </>
  );
};

export default MessagesTab;