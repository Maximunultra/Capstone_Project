import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:5000/api';

const LandingLayout = ({ children, onAuthChange, isAuthenticated, userRole }) => {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Get user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
      setUserName(userData.full_name || userData.name || 'User');
      
      // Fetch cart count and message count if user is a buyer
      if (userData.role === 'buyer') {
        fetchCartCount(userData.id);
        fetchMessageCount(userData.id);
        
        // Set up interval to refresh counts every 30 seconds
        const interval = setInterval(() => {
          fetchCartCount(userData.id);
          fetchMessageCount(userData.id);
        }, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCartCount = async (uid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${uid}/count`);
      if (response.ok) {
        const data = await response.json();
        setCartCount(data.total_items || 0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const fetchMessageCount = async (uid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/user/${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.conversations) {
          // Calculate total unread messages
          const totalUnread = data.conversations.reduce(
            (sum, conv) => sum + (conv.unread_count || 0), 
            0
          );
          setMessageCount(totalUnread);
        }
      }
    } catch (error) {
      console.error('Error fetching message count:', error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setCartCount(0);
    setMessageCount(0);
    setUserId(null);
    setUserName('');
    setShowDropdown(false);
    setMobileMenuOpen(false);
    if (onAuthChange) {
      onAuthChange(false, null, null);
    }
    navigate('/login');
  };

  const handleCartClick = () => {
    if (!isAuthenticated || userRole !== 'buyer') {
      alert('Please login as a buyer to view your cart');
      navigate('/login');
      return;
    }
    setMobileMenuOpen(false);
    navigate('/buyer/cart');
  };

  const handleMessagesClick = () => {
    if (!isAuthenticated || userRole !== 'buyer') {
      alert('Please login as a buyer to view your messages');
      navigate('/login');
      return;
    }
    setMobileMenuOpen(false);
    // Navigate to cart page with messages tab active
    navigate('/buyer/cart?tab=messages');
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    setMobileMenuOpen(false);
    navigate('/buyer/profile');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] flex flex-col">
      {/* Top Navigation - Responsive */}
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo - Responsive sizing */}
            <div className="text-xl sm:text-2xl font-bold text-[#5c5042] flex-shrink-0">
              Artisan
            </div>

            {/* Desktop Navigation Links - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8">
              <Link 
                to="/buyer" 
                className="text-sm lg:text-base text-[#5c5042] hover:text-[#c08a4b] font-medium transition whitespace-nowrap"
              >
                Home
              </Link>
              <Link 
                to="/buyer/products" 
                className="text-sm lg:text-base text-[#5c5042] hover:text-[#c08a4b] font-medium transition whitespace-nowrap"
              >
                Products
              </Link>
            </div>

            {/* Desktop Action Icons - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              {/* Messages Icon with Badge */}
              <button 
                onClick={handleMessagesClick}
                className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2"
                title="Messages"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isAuthenticated && userRole === 'buyer' && messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {messageCount > 99 ? '99+' : messageCount}
                  </span>
                )}
              </button>
              
              {/* Cart Icon with Badge */}
              <button 
                onClick={handleCartClick}
                className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2"
                title="Shopping Cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isAuthenticated && userRole === 'buyer' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
              
              {/* User Dropdown or Sign In */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center gap-2 text-sm text-[#5c5042] hover:text-[#c08a4b] transition"
                  >
                    <span className="font-semibold hidden lg:inline max-w-[120px] truncate">
                      Welcome, {userName}
                    </span>
                    <span className="font-semibold lg:hidden">
                      {userName.split(' ')[0]}
                    </span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        onClick={handleProfileClick}
                        className="w-full text-left px-4 py-2 text-sm text-[#5c5042] hover:bg-gray-100 transition flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <button className="bg-[#a48a6d] text-white px-4 lg:px-5 py-2 rounded shadow font-medium hover:bg-[#c08a4b] transition text-sm lg:text-base whitespace-nowrap">
                    Sign In
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Icons - Visible only on mobile/tablet */}
            <div className="flex md:hidden items-center gap-3">
              {/* Messages Icon for Mobile */}
              <button 
                onClick={handleMessagesClick}
                className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2"
                title="Messages"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {isAuthenticated && userRole === 'buyer' && messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {messageCount > 99 ? '99+' : messageCount}
                  </span>
                )}
              </button>

              {/* Cart Icon for Mobile */}
              <button 
                onClick={handleCartClick}
                className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2"
                title="Shopping Cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isAuthenticated && userRole === 'buyer' && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* Hamburger Menu Button */}
              <button 
                onClick={toggleMobileMenu}
                className="text-[#5c5042] hover:text-[#c08a4b] transition p-2"
              >
                {mobileMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <Link 
                to="/buyer" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition"
              >
                Home
              </Link>
              <Link 
                to="/buyer/products" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition"
              >
                Products
              </Link>
              
              <div className="border-t border-gray-200 pt-3">
                {isAuthenticated ? (
                  <>
                    <div className="text-sm font-semibold text-[#5c5042] mb-2">
                      Welcome, {userName}
                    </div>
                    <button
                      onClick={handleProfileClick}
                      className="w-full text-left text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left text-red-600 hover:text-red-700 font-medium py-2 transition flex items-center gap-2 mt-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full bg-[#a48a6d] text-white px-5 py-2.5 rounded shadow font-medium hover:bg-[#c08a4b] transition">
                      Sign In
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Main Content */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Footer - Responsive */}
      <footer className="bg-[#5c5042] text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Footer Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Brand Section */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Artisan</h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                Discover handcrafted treasures from artisans around the world.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-3 text-base sm:text-lg">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/buyer" className="text-gray-300 hover:text-[#c08a4b] transition text-sm sm:text-base">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/buyer/products" className="text-gray-300 hover:text-[#c08a4b] transition text-sm sm:text-base">
                    Products
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Contact Section */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="font-semibold mb-3 text-base sm:text-lg">Contact</h4>
              <p className="text-gray-300 text-sm sm:text-base mb-1">
                Email: support@artisan.com
              </p>
              <p className="text-gray-300 text-sm sm:text-base">
                Phone: (123) 456-7890
              </p>
            </div>
          </div>
          
          {/* Copyright - Responsive */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-600 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              &copy; 2025 Artisan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingLayout;