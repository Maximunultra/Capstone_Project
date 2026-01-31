import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = 'http://localhost:5000/api';

const LandingLayout = ({ children, onAuthChange, isAuthenticated, userRole }) => {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
      
      // Fetch cart count if user is a buyer
      if (userData.role === 'buyer') {
        fetchCartCount(userData.id);
        
        // Set up interval to refresh cart count every 30 seconds
        const interval = setInterval(() => fetchCartCount(userData.id), 30000);
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticated]);

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

  const handleSignOut = () => {
    localStorage.removeItem('user');
    setCartCount(0);
    setUserId(null);
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
    navigate('/buyer/cart');
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] flex flex-col">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-12 py-8 border-b border-gray-200 bg-white shadow-sm">
        <div className="text-2xl font-bold text-[#5c5042]">Artisan</div>
        <div className="flex items-center gap-8">
          <Link to="/buyer" className="text-[#5c5042] hover:text-[#c08a4b] font-medium transition">
            Home
          </Link>
          <Link to="/buyer/products" className="text-[#5c5042] hover:text-[#c08a4b] font-medium transition">
            Products
          </Link>
          <Link to="/buyer/about" className="text-[#5c5042] hover:text-[#c08a4b] font-medium transition">
            About
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-[#5c5042] hover:text-[#c08a4b] transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Cart Icon with Badge */}
          <button 
            onClick={handleCartClick}
            className="text-[#5c5042] hover:text-[#c08a4b] transition relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {isAuthenticated && userRole === 'buyer' && cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#5c5042]">
                Welcome, <span className="font-semibold">{userRole}</span>
              </span>
              <button 
                onClick={handleSignOut}
                className="bg-[#a48a6d] text-white px-5 py-2 rounded shadow font-medium hover:bg-[#c08a4b] transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login">
              <button className="bg-[#a48a6d] text-white px-5 py-2 rounded shadow font-medium hover:bg-[#c08a4b] transition">
                Sign In
              </button>
            </Link>
          )}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#5c5042] text-white py-8 px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Artisan</h3>
            <p className="text-gray-300">Discover handcrafted treasures from artisans around the world.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/buyer" className="text-gray-300 hover:text-[#c08a4b] transition">Home</Link></li>
              <li><Link to="/buyer/products" className="text-gray-300 hover:text-[#c08a4b] transition">Products</Link></li>
              <li><Link to="/buyer/about" className="text-gray-300 hover:text-[#c08a4b] transition">About</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <p className="text-gray-300">Email: support@artisan.com</p>
            <p className="text-gray-300">Phone: (123) 456-7890</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-600 text-center text-gray-400">
          <p>&copy; 2025 Artisan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingLayout;