import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Package, Clock, CheckCheck,
  ArrowLeft, Loader2, ShoppingBag, Hash, ChevronDown, ChevronUp,
  User, HeadphonesIcon, Shield, Users, Paperclip, X
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL HELPERS  (never defined inside the page component)
// ─────────────────────────────────────────────────────────────────────────────

const statusStyles = {
  pending:    { pill: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-400'    },
  processing: { pill: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400'     },
  shipped:    { pill: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400'   },
  delivered:  { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  canceled:   { pill: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-400'      },
};

const StatusPill = ({ status }) => {
  const s = statusStyles[status] || { pill: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// Order/product context panel shown on the right side of the chat
const OrderContextPanel = ({ orderContext, productContext }) => {
  const [expanded, setExpanded] = useState(false);
  if (!orderContext && !productContext) return null;

  const mainProductName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const mainProductImage = productContext?.product_image || orderContext?.items?.[0]?.product?.product_image || null;
  const brand            = productContext?.brand || orderContext?.items?.[0]?.product?.brand || null;

  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-500" />
          Order Context
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Attached to this conversation</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Product */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Product</p>
            <div className="flex gap-2 items-start">
              {mainProductImage
                ? <img src={mainProductImage} alt={mainProductName} className="w-14 h-14 rounded-lg object-cover border border-amber-100 flex-shrink-0" />
                : <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Package className="w-6 h-6 text-amber-400" /></div>
              }
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-xs leading-tight">{mainProductName}</p>
                {brand && <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1"><User className="w-3 h-3" />{brand}</p>}
                {productContext?.price && <p className="text-xs font-bold text-amber-600 mt-1">₱{parseFloat(productContext.price).toFixed(2)}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Order */}
        {orderContext && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Order</p>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1 text-xs">
                  <Hash className="w-3 h-3 text-gray-400" />
                  <span className="font-mono font-semibold text-gray-900">{orderContext.order_number}</span>
                </div>
                <StatusPill status={orderContext.order_status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">Total</span>
                <span className="text-xs font-bold text-gray-900">₱{parseFloat(orderContext.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {orderContext.items?.length > 0 && (
              <div className="p-3">
                <button
                  onClick={() => setExpanded(p => !p)}
                  className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-600 hover:text-gray-900 transition mb-1"
                >
                  <span>{orderContext.items.length} item{orderContext.items.length !== 1 ? 's' : ''}</span>
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {expanded && (
                  <div className="space-y-1.5 mt-1">
                    {orderContext.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-lg">
                        {item.product?.product_image
                          ? <img src={item.product.product_image} alt={item.product_name} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                          : <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center flex-shrink-0"><Package className="w-3 h-3 text-gray-400" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-800 truncate">{item.product_name}</p>
                          <p className="text-[9px] text-gray-500">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Inline context card shown below each chat bubble that has order/product data
const InlineContextCard = ({ orderContext, productContext, isOwn }) => {
  if (!orderContext && !productContext) return null;
  const productName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const productImage = productContext?.product_image || orderContext?.items?.[0]?.product?.product_image || null;

  return (
    <div className={`mt-1.5 rounded-xl border overflow-hidden text-xs ${isOwn ? 'border-amber-300 bg-amber-600/20' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        {productImage
          ? <img src={productImage} alt={productName} className="w-7 h-7 rounded object-cover flex-shrink-0" />
          : <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-amber-500/40' : 'bg-gray-100'}`}><Package className="w-3.5 h-3.5" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className={`truncate font-semibold ${isOwn ? 'text-amber-100' : 'text-gray-700'}`}>{productName}</p>
          {orderContext && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-mono ${isOwn ? 'text-amber-200' : 'text-gray-400'}`}>#{orderContext.order_number}</span>
              <StatusPill status={orderContext.order_status} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const AdminMessagesPage = () => {
  const [conversations,        setConversations]        = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages,             setMessages]             = useState([]);
  const [newMessage,           setNewMessage]           = useState('');
  const [loading,              setLoading]              = useState(true);
  const [sending,              setSending]              = useState(false);
  const [searchQuery,          setSearchQuery]          = useState('');
  const [isMobileView,         setIsMobileView]         = useState(false);
  const [filter,               setFilter]               = useState('all'); // all | unread | support
  const [imageFile,            setImageFile]            = useState(null);
  const [imagePreview,         setImagePreview]         = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const currentUser    = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId  = currentUser.id;

  useEffect(() => {
    if (!currentUserId) { window.location.href = '/login'; return; }
    fetchConversations();
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_user_id);
      markAsRead(selectedConversation.other_user_id);
    }
  }, [selectedConversation]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Refresh conversations every 15s to catch new support messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) fetchMessages(selectedConversation.other_user_id);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedConversation]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/messages/user/${currentUserId}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !isMobileView && !selectedConversation) {
          setSelectedConversation(data.conversations[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/messages/conversation/${currentUserId}/${otherUserId}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markAsRead = async (otherUserId) => {
    try {
      await fetch(`${API_BASE_URL}/messages/conversation/${currentUserId}/${otherUserId}/read`, { method: 'PATCH' });
      setConversations(prev =>
        prev.map(conv => conv.other_user_id === otherUserId ? { ...conv, unread_count: 0 } : conv)
      );
      window.dispatchEvent(new Event('messagesRead'));
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
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
    const msg = newMessage.trim();
    setSending(true);
    setNewMessage('');
    clearImage();
    try {
      const formData = new FormData();
      formData.append('sender_id',   currentUserId);
      formData.append('receiver_id', selectedConversation.other_user_id);
      if (msg)       formData.append('message', msg);
      if (imageFile) formData.append('image', imageFile);

      const res  = await fetch(`${API_BASE_URL}/messages`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setConversations(prev =>
          prev.map(conv =>
            conv.other_user_id === selectedConversation.other_user_id
              ? { ...conv, last_message: msg || '📷 Image', last_message_time: new Date().toISOString() }
              : conv
          )
        );
      } else {
        alert('Failed to send: ' + data.error);
        setNewMessage(msg);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const formatTime = (ts) => {
    const date          = new Date(ts);
    const diffInMinutes = Math.floor((Date.now() - date) / 60000);
    if (diffInMinutes < 1)     return 'Just now';
    if (diffInMinutes < 60)    return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440)  return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if a conversation is a "support" inquiry (message starts with [subject tag])
  const isSupportMessage = (conv) => conv.last_message?.startsWith('[');

  const filteredConversations = conversations.filter(conv => {
    const matchSearch = conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        conv.other_user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'unread') return conv.unread_count > 0;
    if (filter === 'support') return isSupportMessage(conv);
    return true;
  });

  const totalUnread    = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const totalSupport   = conversations.filter(isSupportMessage).length;

  const activeOrderContext   = selectedConversation?.last_order_context   || null;
  const activeProductContext = selectedConversation?.last_product_context || null;
  const hasContext           = !!(activeOrderContext || activeProductContext);

  // ── Conversation list JSX (inlined variable, NOT a sub-component) ────────
  const conversationListJSX = (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-600" />
            Messages
          </h1>
          {totalUnread > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread} unread
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {[
            { key: 'all',     label: 'All',     count: conversations.length },
            { key: 'unread',  label: 'Unread',  count: totalUnread          },
            { key: 'support', label: 'Support', count: totalSupport         },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1 ${filter === key ? 'text-amber-200' : 'text-gray-400'}`}>({count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-14 h-14 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No conversations</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter !== 'all' ? `No ${filter} messages` : 'Messages will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => {
              const isSupport = isSupportMessage(conv);
              return (
                <button
                  key={conv.other_user_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-3.5 text-left hover:bg-gray-50 transition ${
                    selectedConversation?.other_user_id === conv.other_user_id
                      ? 'bg-amber-50 border-l-4 border-amber-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        isSupport
                          ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}>
                        {isSupport
                          ? <HeadphonesIcon className="w-5 h-5" />
                          : conv.other_user_name?.charAt(0)?.toUpperCase() || 'U'
                        }
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={`font-semibold text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.other_user_name || 'Unknown User'}
                          </h3>
                          {isSupport && (
                            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">SUPPORT</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{formatTime(conv.last_message_time)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-0.5">{conv.other_user_email}</p>
                      <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                        {conv.last_message}
                      </p>
                      {/* Product hint */}
                      {(conv.last_product_context || conv.last_order_context) && (
                        <p className="text-[10px] text-amber-500 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Package className="w-3 h-3 flex-shrink-0" />
                          {conv.last_product_context?.product_name
                            || conv.last_order_context?.items?.[0]?.product_name
                            || `Order #${conv.last_order_context?.order_number}`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── Messages panel JSX (inlined variable, NOT a sub-component) ───────────
  const messagesPanelJSX = selectedConversation ? (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-white rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
            isSupportMessage(selectedConversation)
              ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {isSupportMessage(selectedConversation)
              ? <HeadphonesIcon className="w-5 h-5" />
              : selectedConversation.other_user_name?.charAt(0)?.toUpperCase() || 'U'
            }
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              {selectedConversation.other_user_name || 'Unknown User'}
              {isSupportMessage(selectedConversation) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">SUPPORT REQUEST</span>
              )}
            </h2>
            <p className="text-xs text-gray-500">{selectedConversation.other_user_email}</p>
          </div>
          {hasContext && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Order attached</span>
            </div>
          )}
        </div>
      </div>

      {/* Support notice */}
      {isSupportMessage(selectedConversation) && (
        <div className="mx-4 mt-3 mb-1 flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-100 rounded-xl flex-shrink-0">
          <Shield className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700">
            This is a <strong>support request</strong> from a customer. Reply promptly to maintain trust.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-14 h-14 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {/* Image attachment */}
                    {msg.image_url && (
                      <div className={`mb-1 ${isOwn ? 'flex justify-end' : ''}`}>
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.image_url}
                            alt="attachment"
                            className="max-w-[220px] max-h-[220px] rounded-2xl object-cover border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition"
                          />
                        </a>
                      </div>
                    )}
                    {/* Text bubble */}
                    {msg.message && (
                      <div className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-amber-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm break-words">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'text-amber-200' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(msg.created_at)}</span>
                          {isOwn && msg.is_read && <CheckCheck className="w-3.5 h-3.5 ml-1" />}
                        </div>
                      </div>
                    )}
                    {/* Timestamp when image-only */}
                    {!msg.message && msg.image_url && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'justify-end' : ''} text-gray-400`}>
                        <Clock className="w-3 h-3" /><span>{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <InlineContextCard
                      orderContext={msg.order_context}
                      productContext={msg.product_context}
                      isOwn={isOwn}
                    />
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview} alt="preview" className="max-h-24 max-w-[180px] rounded-xl object-cover border border-gray-200 shadow-sm" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className={`p-2.5 rounded-xl transition flex-shrink-0 ${imageFile ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Reply to ${selectedConversation.other_user_name || 'user'}...`}
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            maxLength={500}
            autoComplete="off"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !imageFile) || sending}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Send className="w-5 h-5" /><span className="hidden sm:inline text-sm font-semibold">Reply</span></>
            }
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 px-1">{newMessage.length}/500</p>
      </div>
    </div>
  ) : null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex bg-gray-100">

      {/* ── DESKTOP ── */}
      {!isMobileView && (
        <>
          <div className="w-80 flex-shrink-0 shadow-sm">{conversationListJSX}</div>

          <div className="flex-1 min-w-0">
            {selectedConversation ? messagesPanelJSX : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Messages</h2>
                  <p className="text-sm">Select a conversation to view and reply</p>
                  {totalUnread > 0 && (
                    <p className="mt-3 text-sm font-semibold text-red-600">
                      {totalUnread} unread message{totalUnread !== 1 ? 's' : ''} waiting
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order context panel */}
          {selectedConversation && hasContext && (
            <OrderContextPanel
              orderContext={activeOrderContext}
              productContext={activeProductContext}
            />
          )}
        </>
      )}

      {/* ── MOBILE ── */}
      {isMobileView && (
        <>
          {!selectedConversation ? (
            <div className="w-full">{conversationListJSX}</div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {/* Compact context banner on mobile */}
              {hasContext && (
                <div className="flex-shrink-0 px-4 pt-3 pb-1 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                    {(activeProductContext?.product_image || activeOrderContext?.items?.[0]?.product?.product_image) && (
                      <img
                        src={activeProductContext?.product_image || activeOrderContext?.items?.[0]?.product?.product_image}
                        alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {activeProductContext?.product_name || activeOrderContext?.items?.[0]?.product_name || 'Product'}
                      </p>
                      {activeOrderContext && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-500 font-mono">#{activeOrderContext.order_number}</span>
                          <StatusPill status={activeOrderContext.order_status} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0">{messagesPanelJSX}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminMessagesPage;
