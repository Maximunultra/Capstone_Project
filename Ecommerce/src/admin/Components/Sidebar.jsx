import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart4,
  Package,
  Megaphone,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronDown,
  MessageCircle,
  FileText,
  RefreshCcw,
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const Sidebar = ({ isOpen, toggleSidebar, userRole, isMobile }) => {
  const location    = useLocation();
  const currentPath = location.pathname;

  const [pendingProducts,   setPendingProducts]   = useState(0);
  const [pendingPromotions, setPendingPromotions] = useState(0);
  const [pendingSellers,    setPendingSellers]    = useState(0);
  const [unreadMessages,    setUnreadMessages]    = useState(0);
  const [pendingRefunds,    setPendingRefunds]    = useState(0);

  const isInSettings = currentPath.includes('/settings');
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);

  const rolePrefix = userRole || JSON.parse(localStorage.getItem("user") || '{}').role || 'admin';

  // ── Fetchers ──────────────────────────────────────────────

  const fetchPendingProducts = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/products?approval_status=pending`);
      const data = await res.json();
      if (data.products) setPendingProducts(data.products.length);
    } catch (err) { console.error('Error fetching pending products:', err); }
  };

  const fetchPendingPromotions = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/promotions?status=pending`);
      const data = await res.json();
      if (data.success && data.promotions) setPendingPromotions(data.promotions.length);
    } catch (err) { console.error('Error fetching pending promotions:', err); }
  };

  const fetchPendingSellers = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/users`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const count = data.filter(u => u.role === 'seller' && u.approval_status === 'pending').length;
        setPendingSellers(count);
      }
    } catch (err) { console.error('Error fetching pending sellers:', err); }
  };

  const fetchUnreadMessages = async () => {
    try {
      const adminId = JSON.parse(localStorage.getItem("user") || '{}').id;
      if (!adminId) return;
      const res  = await fetch(`${API_BASE_URL}/messages/unread/count/${adminId}`);
      const data = await res.json();
      if (data.success) setUnreadMessages(data.unread_count || 0);
    } catch (err) { console.error('Error fetching unread messages:', err); }
  };

  const fetchPendingRefunds = async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/refunds/stats`);
      const data = await res.json();
      if (data.success) setPendingRefunds(data.stats?.pending || 0);
    } catch (err) { console.error('Error fetching pending refunds:', err); }
  };

  const fetchAllCounts = () => {
    fetchPendingProducts();
    fetchPendingPromotions();
    fetchPendingSellers();
    fetchUnreadMessages();
    fetchPendingRefunds();
  };

  useEffect(() => {
    fetchAllCounts();
    const interval = setInterval(fetchAllCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentPath.includes('/products'))   fetchPendingProducts();
    if (!currentPath.includes('/promotions')) fetchPendingPromotions();
    if (!currentPath.includes('/users'))      fetchPendingSellers();
    if (!currentPath.includes('/messages'))   fetchUnreadMessages();
    if (!currentPath.includes('/refunds'))    fetchPendingRefunds();
    if (currentPath.includes('/settings'))    setSettingsOpen(true);
  }, [currentPath]);

  // Clear badges locally when admin visits the page
  useEffect(() => {
    if (currentPath.includes('/messages')) setUnreadMessages(0);
  }, [currentPath]);

  useEffect(() => {
    if (currentPath.includes('/refunds')) setPendingRefunds(0);
  }, [currentPath]);

  // Re-sync when AdminMessagesPage marks messages as read
  useEffect(() => {
    const handler = () => fetchUnreadMessages();
    window.addEventListener('messagesRead', handler);
    return () => window.removeEventListener('messagesRead', handler);
  }, []);

  // ── Nav items ─────────────────────────────────────────────

  const mainNavItems = [
    {
      to:    `/${rolePrefix}/analytics`,
      label: "Analytics Dashboard",
      icon:  <BarChart4 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
    },
    {
      to:           `/${rolePrefix}/products`,
      label:        "Products",
      icon:         <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
      badge:        pendingProducts,
      badgeClearKey:'products',
      badgeColor:   'bg-red-500',
      badgePulse:   true,
    },
    {
      to:           `/${rolePrefix}/promotions`,
      label:        "Promotions",
      icon:         <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
      badge:        pendingPromotions,
      badgeClearKey:'promotions',
      badgeColor:   'bg-red-500',
      badgePulse:   true,
    },
    {
      to:           `/${rolePrefix}/users`,
      label:        "Users Management",
      icon:         <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
      badge:        pendingSellers,
      badgeClearKey:'users',
      badgeColor:   'bg-red-500',
      badgePulse:   true,
    },
    {
      to:           `/${rolePrefix}/messages`,
      label:        "Messages",
      icon:         <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
      badge:        unreadMessages,
      badgeClearKey:'messages',
      badgeColor:   'bg-blue-500',
      badgePulse:   false,
    },
    {
      to:           `/${rolePrefix}/refunds`,
      label:        "Refunds",
      icon:         <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />,
      badge:        pendingRefunds,
      badgeClearKey:'refunds',
      badgeColor:   'bg-orange-500',
      badgePulse:   true,
    },
  ];

  const settingsSubItems = [
    {
      to:    `/${rolePrefix}/settings/category-rules`,
      label: "Category Rules",
      icon:  <BookOpen className="w-3.5 h-3.5 mr-2" />,
    },
  ];

  // ── Handlers ──────────────────────────────────────────────

  const handleNavClick = (item) => {
    if (isMobile) toggleSidebar();
    if (item.badgeClearKey === 'products')   setPendingProducts(0);
    if (item.badgeClearKey === 'promotions') setPendingPromotions(0);
    if (item.badgeClearKey === 'users')      setPendingSellers(0);
    if (item.badgeClearKey === 'messages')   setUnreadMessages(0);
    if (item.badgeClearKey === 'refunds')    setPendingRefunds(0);
  };

  const formatBadge = (n) => (n > 99 ? '99+' : n);

  // ── Render ────────────────────────────────────────────────

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-30
        bg-[#e7e0cf] text-[#5c5042] shadow-xl
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 sm:w-64 md:w-64 lg:w-72 xl:w-80
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 mb-2 sm:mb-4 border-b border-[#d6d1c4]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm sm:text-lg">A</span>
          </div>
          <span className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
            Artisan
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-white/50 transition-all duration-300 focus:outline-none group"
          aria-label="Toggle sidebar"
        >
          {isOpen
            ? <X    className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-90" />
            : <Menu className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 sm:px-3 lg:px-4 overflow-y-auto h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
        <ul className="space-y-1 sm:space-y-1.5">

          {mainNavItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => handleNavClick(item)}
                className={`
                  flex items-center px-3 sm:px-4 py-2.5 sm:py-3
                  rounded-lg transition-all duration-200 text-sm sm:text-base
                  ${currentPath === item.to || currentPath.startsWith(item.to + '/')
                    ? "bg-white font-semibold shadow-sm text-amber-700"
                    : "hover:bg-white/70 hover:shadow-sm"
                  }
                `}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>

                {item.badge > 0 && (
                  <span className={`
                    ml-auto flex items-center justify-center
                    min-w-[20px] h-5 px-1.5 rounded-full
                    ${item.badgeColor || 'bg-red-500'} text-white text-xs font-bold
                    ${item.badgePulse ? 'animate-pulse' : ''}
                  `}>
                    {formatBadge(item.badge)}
                  </span>
                )}
              </Link>
            </li>
          ))}

          {/* Settings dropdown (admin only) */}
          {rolePrefix === 'admin' && (
            <li>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className={`
                  w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3
                  rounded-lg transition-all duration-200 text-sm sm:text-base
                  ${isInSettings
                    ? "bg-white/70 font-semibold text-amber-700"
                    : "hover:bg-white/70 hover:shadow-sm"
                  }
                `}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="truncate flex-1 text-left">Settings</span>
                <ChevronDown
                  className={`w-4 h-4 ml-auto transition-transform duration-300 flex-shrink-0
                    ${settingsOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out
                ${settingsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <ul className="mt-1 ml-3 pl-3 border-l-2 border-amber-200 space-y-1">
                  {settingsSubItems.map((sub) => (
                    <li key={sub.to}>
                      <Link
                        to={sub.to}
                        onClick={() => { if (isMobile) toggleSidebar(); }}
                        className={`
                          flex items-center px-3 py-2
                          rounded-lg transition-all duration-200 text-sm
                          ${currentPath === sub.to
                            ? "bg-white font-semibold shadow-sm text-amber-700"
                            : "hover:bg-white/70 hover:shadow-sm text-[#5c5042]"
                          }
                        `}
                      >
                        {sub.icon}
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          )}

        </ul>
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 w-full px-2 sm:px-3 lg:px-4 pb-4 sm:pb-5 lg:pb-6 bg-[#e7e0cf]">
        <hr className="my-3 sm:my-4 border-[#d6d1c4]" />
        <button
          className="flex w-full items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm sm:text-base group"
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 group-hover:rotate-12 transition-transform duration-300" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;