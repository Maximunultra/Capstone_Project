import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Search, Package, Clock, CheckCheck,
  ArrowLeft, Loader2, ShoppingBag, Hash,
  ChevronDown, ChevronUp, User, Paperclip, X
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

// ─────────────────────────────────────────────────────────────────────────────
// All helper components are defined at MODULE level (outside SellerMessagesPage).
// Defining components INSIDE a parent component causes React to treat them as
// brand-new component types on every render, unmounting and remounting them —
// which steals focus from the input on every keystroke.
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

const OrderContextPanel = ({ orderContext, productContext }) => {
  const [itemsExpanded, setItemsExpanded] = useState(false);
  if (!orderContext && !productContext) return null;

  const mainProduct      = productContext || orderContext?.items?.[0]?.product || null;
  const mainProductName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const mainProductImage = productContext?.product_image || mainProduct?.product_image || null;
  const brand            = productContext?.brand || mainProduct?.brand || null;

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-orange-500" />
          Order Context
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Details from the customer's inquiry</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100">
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-2">Product</p>
            <div className="flex gap-3 items-start">
              {mainProductImage ? (
                <img src={mainProductImage} alt={mainProductName} className="w-16 h-16 rounded-lg object-cover border border-orange-100 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-7 h-7 text-orange-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{mainProductName}</p>
                {brand && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" />{brand}
                  </p>
                )}
                {productContext?.price && (
                  <p className="text-sm font-bold text-orange-600 mt-1.5">₱{parseFloat(productContext.price).toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {orderContext && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Order</p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-xs">
                  <Hash className="w-3 h-3 text-gray-400" />
                  <span className="font-mono font-semibold text-gray-900">{orderContext.order_number}</span>
                </div>
                <StatusPill status={orderContext.order_status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Order Total</span>
                <span className="text-sm font-bold text-gray-900">₱{parseFloat(orderContext.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {orderContext.items?.length > 0 && (
              <div className="p-3">
                <button
                  onClick={() => setItemsExpanded(p => !p)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 transition mb-1"
                >
                  <span>{orderContext.items.length} Item{orderContext.items.length !== 1 ? 's' : ''} in Order</span>
                  {itemsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {itemsExpanded && (
                  <div className="space-y-2 mt-2">
                    {orderContext.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        {item.product?.product_image ? (
                          <img src={item.product.product_image} alt={item.product_name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.product_name}</p>
                          <p className="text-[10px] text-gray-500">×{item.quantity} · ₱{parseFloat(item.unit_price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 Seller Tip</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Reference the order number and product name in your reply so the customer knows you have the right context.
          </p>
        </div>
      </div>
    </div>
  );
};

const InlineContextCard = ({ orderContext, productContext, isOwn }) => {
  if (!orderContext && !productContext) return null;
  const productName  = productContext?.product_name || orderContext?.items?.[0]?.product_name || 'Product';
  const productImage = productContext?.product_image || orderContext?.items?.[0]?.product?.product_image || null;

  return (
    <div className={`mt-1.5 rounded-xl border overflow-hidden text-xs ${isOwn ? 'border-blue-300 bg-blue-700/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        {productImage ? (
          <img src={productImage} alt={productName} className="w-7 h-7 rounded object-cover flex-shrink-0" />
        ) : (
          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-blue-500/50' : 'bg-gray-100'}`}>
            <Package className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`truncate font-semibold ${isOwn ? 'text-blue-100' : 'text-gray-700'}`}>{productName}</p>
          {orderContext && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-mono ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>#{orderContext.order_number}</span>
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

const SellerMessagesPage = () => {
  const [conversations,        setConversations]        = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages,             setMessages]             = useState([]);
  const [newMessage,           setNewMessage]           = useState('');
  const [loading,              setLoading]              = useState(true);
  const [sending,              setSending]              = useState(false);
  const [searchQuery,          setSearchQuery]          = useState('');
  const [isMobileView,         setIsMobileView]         = useState(false);
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

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!selectedConversation) fetchConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedConversation]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

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
    const messageToSend = newMessage.trim();
    setSending(true);
    setNewMessage('');
    clearImage();
    try {
      const formData = new FormData();
      formData.append('sender_id',   currentUserId);
      formData.append('receiver_id', selectedConversation.other_user_id);
      if (messageToSend) formData.append('message', messageToSend);
      if (imageFile)     formData.append('image', imageFile);

      const res  = await fetch(`${API_BASE_URL}/messages`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setConversations(prev =>
          prev.map(conv =>
            conv.other_user_id === selectedConversation.other_user_id
              ? { ...conv, last_message: messageToSend || '📷 Image', last_message_time: new Date().toISOString() }
              : conv
          )
        );
      } else {
        alert('Failed to send message: ' + data.error);
        setNewMessage(messageToSend);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error sending message. Please try again.');
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const formatTime = (timestamp) => {
    const date          = new Date(timestamp);
    const diffInMinutes = Math.floor((Date.now() - date) / 60000);
    if (diffInMinutes < 1)     return 'Just now';
    if (diffInMinutes < 60)    return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)  return `${Math.floor(diffInMinutes / 60)} hr ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnreadCount     = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const activeOrderContext   = selectedConversation?.last_order_context   || null;
  const activeProductContext = selectedConversation?.last_product_context || null;
  const hasContext           = !!(activeOrderContext || activeProductContext);

  // ── Conversation list — inlined JSX variable (NOT a component function) ──
  const conversationListJSX = (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-orange-600" />
            Messages
          </h1>
          {totalUnreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
              {totalUnreadCount}
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-orange-500 p-8">
            <MessageCircle className="w-16 h-16 mb-4 text-orange-300" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm text-center mt-2">
              {searchQuery ? 'No conversations match your search' : 'Messages from buyers will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <button
                key={conv.other_user_id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                  selectedConversation?.other_user_id === conv.other_user_id
                    ? 'bg-blue-50 border-l-4 border-orange-600'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0 relative">
                    {conv.other_user_name?.charAt(0)?.toUpperCase() || 'U'}
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {conv.other_user_name || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    {(conv.last_product_context || conv.last_order_context) && (
                      <p className="text-[10px] text-orange-500 font-medium truncate flex items-center gap-1 mb-0.5">
                        <Package className="w-3 h-3 flex-shrink-0" />
                        {conv.last_product_context?.product_name
                          || conv.last_order_context?.items?.[0]?.product_name
                          || `Order #${conv.last_order_context?.order_number}`}
                      </p>
                    )}
                    <p className={`text-sm truncate mb-1 ${conv.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                      {conv.last_message}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                        {conv.unread_count} new
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Messages panel — inlined JSX variable (NOT a component function) ──────
  const messagesPanelJSX = selectedConversation ? (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {isMobileView && (
            <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-white rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
            {selectedConversation.other_user_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{selectedConversation.other_user_name || 'Unknown User'}</h2>
            <p className="text-sm text-gray-500">{selectedConversation.other_user_email}</p>
          </div>
          {hasContext && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium text-orange-600">Order context available</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwnMessage = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {/* Image attachment */}
                    {msg.image_url && (
                      <div className={`mb-1 ${isOwnMessage ? 'flex justify-end' : ''}`}>
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
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}>
                        <p className="text-sm break-words">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(msg.created_at)}</span>
                          {isOwnMessage && msg.is_read && <CheckCheck className="w-4 h-4 ml-1" />}
                        </div>
                      </div>
                    )}
                    {/* Timestamp when image-only */}
                    {!msg.message && msg.image_url && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isOwnMessage ? 'justify-end' : ''} text-gray-500`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <InlineContextCard
                      orderContext={msg.order_context}
                      productContext={msg.product_context}
                      isOwn={isOwnMessage}
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
            className={`p-2.5 rounded-xl transition flex-shrink-0 ${imageFile ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            maxLength={500}
            autoComplete="off"
          />
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !imageFile) || sending}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Send className="w-5 h-5" /><span className="hidden sm:inline">Send</span></>
            }
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1 px-1">{newMessage.length}/500 characters</p>
      </div>
    </div>
  ) : null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex">

      {/* ── DESKTOP ── */}
      {!isMobileView && (
        <>
          <div className="w-80 flex-shrink-0">
            {conversationListJSX}
          </div>

          <div className="flex-1 min-w-0">
            {selectedConversation ? messagesPanelJSX : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
                  <p>Select a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>

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
              {hasContext && (
                <div className="flex-shrink-0 px-4 pt-3 pb-1 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                    {(activeProductContext?.product_image || activeOrderContext?.items?.[0]?.product?.product_image) && (
                      <img
                        src={activeProductContext?.product_image || activeOrderContext?.items?.[0]?.product?.product_image}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
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
              <div className="flex-1 min-h-0">
                {messagesPanelJSX}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerMessagesPage;
