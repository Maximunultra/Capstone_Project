import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Package, 
  Clock,
  CheckCheck,
  ArrowLeft,
  Loader2
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const SellerMessagesPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id;

  useEffect(() => {
    if (!currentUserId) {
      window.location.href = '/login';
      return;
    }
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh conversations every 10 seconds to keep unread count updated
  useEffect(() => {
    const interval = setInterval(() => {
      if (!selectedConversation) {
        fetchConversations();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages/user/${currentUserId}`);
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
        
        if (data.conversations?.length > 0 && !isMobileView && !selectedConversation) {
          setSelectedConversation(data.conversations[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/messages/conversation/${currentUserId}/${otherUserId}`
      );
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (otherUserId) => {
    try {
      await fetch(
        `${API_BASE_URL}/messages/conversation/${currentUserId}/${otherUserId}/read`,
        { method: 'PATCH' }
      );
      
      setConversations(prev => 
        prev.map(conv => 
          conv.other_user_id === otherUserId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );

      // Trigger a storage event to notify other components (like Sidebar)
      window.dispatchEvent(new Event('messagesRead'));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageToSend = newMessage.trim();
    setSending(true);
    setNewMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          receiver_id: selectedConversation.other_user_id,
          message: messageToSend
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        
        setConversations(prev => 
          prev.map(conv => 
            conv.other_user_id === selectedConversation.other_user_id
              ? { 
                  ...conv, 
                  last_message: messageToSend,
                  last_message_time: new Date().toISOString()
                }
              : conv
          )
        );
      } else {
        alert('Failed to send message: ' + data.error);
        setNewMessage(messageToSend);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total unread count for display
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="h-screen flex">
      {/* Desktop: Show both panels */}
      {!isMobileView && (
        <>
          {/* Conversations Panel */}
          <div className="w-1/3 max-w-md">
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                      {searchQuery 
                        ? 'No conversations match your search'
                        : 'Messages from buyers will appear here'}
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
          </div>

          {/* Messages Panel */}
          <div className="flex-1">
            {!selectedConversation ? (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
                  <p>Select a conversation from the list to start messaging</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col bg-white">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {selectedConversation.other_user_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900">
                        {selectedConversation.other_user_name || 'Unknown User'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.other_user_email}
                      </p>
                    </div>
                  </div>
                </div>

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
                          <div
                            key={msg.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isOwnMessage
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.message}</p>
                              <div className={`flex items-center gap-1 mt-1 text-xs ${
                                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(msg.created_at)}</span>
                                {isOwnMessage && msg.is_read && (
                                  <CheckCheck className="w-4 h-4 ml-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex gap-2">
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
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-1">
                    {newMessage.length}/500 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile: Show one panel at a time */}
      {isMobileView && (
        <>
          {!selectedConversation ? (
            <div className="w-full">
              <div className="h-full flex flex-col bg-white">
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.other_user_id}
                      onClick={() => setSelectedConversation(conv)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold relative">
                          {conv.other_user_name?.charAt(0)?.toUpperCase() || 'U'}
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
                              {conv.unread_count > 9 ? '9+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.other_user_name || 'Unknown User'}
                          </h3>
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                            {conv.last_message}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col bg-white">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 hover:bg-white rounded-lg transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {selectedConversation.other_user_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.other_user_name || 'Unknown User'}
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => {
                  const isOwnMessage = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white border text-gray-900'
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    maxLength={500}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SellerMessagesPage;