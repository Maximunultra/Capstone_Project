import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Megaphone,
  MessageSquare,
  BarChart4,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const Sidebar = ({ isOpen, toggleSidebar, userRole, isMobile }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [unreadCount, setUnreadCount] = useState(0);

  // Get the role prefix from localStorage or props
  const rolePrefix = userRole || JSON.parse(localStorage.getItem("user") || '{}').role || 'buyer';
  const currentUserId = JSON.parse(localStorage.getItem("user") || '{}').id;

  const navItems = [
    { to: `/${rolePrefix}/analytics`, label: "Analytics Dashboard", icon: <BarChart4 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" /> },
    { to: `/${rolePrefix}/products`, label: "Products", icon: <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" /> },
    { to: `/${rolePrefix}/orders`, label: "Orders", icon: <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" /> },
    { to: `/${rolePrefix}/promotions`, label: "Promotions", icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" /> },
    { to: `/${rolePrefix}/messages`, label: "Messages", icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />, hasNotification: true },
  ];

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    if (!currentUserId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/messages/user/${currentUserId}`);
      const data = await response.json();
      
      if (data.success && data.conversations) {
        // Calculate total unread messages from all conversations
        const totalUnread = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch unread count on component mount and set up polling
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Refresh unread count when navigating away from messages page
  useEffect(() => {
    if (!currentPath.includes('/messages')) {
      fetchUnreadCount();
    }
  }, [currentPath]);

  const handleNavClick = () => {
    // Auto-close sidebar on mobile after navigation
    if (isMobile) {
      toggleSidebar();
    }
    
    // If navigating to messages, reset unread count immediately
    if (currentPath.includes('/messages')) {
      setUnreadCount(0);
    }
  };

  return (
    <aside
      className={`
        fixed 
        top-0 
        left-0 
        h-full 
        z-30 
        bg-[#e7e0cf] 
        text-[#5c5042] 
        shadow-xl
        transition-all 
        duration-300
        ease-in-out
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
        
        {/* Close button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 sm:p-2 rounded-lg hover:bg-white/50 transition-all duration-300 focus:outline-none group"
          aria-label="Toggle sidebar"
        >
          {isOpen ? (
            <X className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-90" />
          ) : (
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 sm:px-3 lg:px-4 overflow-y-auto h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
        <ul className="space-y-1 sm:space-y-1.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`
                  flex 
                  items-center 
                  px-3 sm:px-4 
                  py-2.5 sm:py-3 
                  rounded-lg 
                  transition-all 
                  duration-200
                  text-sm sm:text-base
                  relative
                  ${
                    currentPath === item.to
                      ? "bg-white font-semibold shadow-sm text-amber-700"
                      : "hover:bg-white/70 hover:shadow-sm"
                  }
                `}
                onClick={handleNavClick}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                
                {/* Notification Badge */}
                {item.hasNotification && unreadCount > 0 && (
                  <>
                    {/* Show count if more than 0 */}
                    {unreadCount > 0 && (
                      <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    
                    {/* Alternative: Just show a red dot (uncomment this and comment out the count above if you prefer) */}
                    {/* <span className="ml-auto w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span> */}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section (Settings & Logout) */}
      <div className="absolute bottom-0 left-0 w-full px-2 sm:px-3 lg:px-4 pb-4 sm:pb-5 lg:pb-6 bg-[#e7e0cf]">
        <hr className="my-3 sm:my-4 border-[#d6d1c4]" />
        
        {/* Profile */}
        <Link
          to={`/${rolePrefix}/profile`}
          className={`
            flex 
            items-center 
            px-3 sm:px-4 
            py-2.5 sm:py-3 
            rounded-lg 
            transition-all 
            duration-200
            text-sm sm:text-base
            mb-1 sm:mb-2
            ${
              currentPath === `/${rolePrefix}/settings` 
                ? "bg-white font-semibold shadow-sm text-amber-700" 
                : "hover:bg-white/70 hover:shadow-sm"
            }
          `}
          onClick={handleNavClick}
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
          <span>Profile</span>
        </Link>
        
        {/* Logout */}
        <button
          className="
            flex 
            w-full 
            items-center 
            px-3 sm:px-4 
            py-2.5 sm:py-3 
            rounded-lg 
            hover:bg-red-50 
            hover:text-red-600 
            transition-all 
            duration-200
            text-sm sm:text-base
            group
          "
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