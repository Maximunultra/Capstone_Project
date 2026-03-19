import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import AddressModal from "../Components/AddressModal";
import useAddresses from "../../hooks/useAddresses";

const API_BASE_URL = "https://capstone-project-1msq.onrender.com/api";

// ─── Shared address list content (desktop dropdown + mobile sheet both use this)
const AddressPanel = ({ userId, onClose }) => {
  const { addresses, loading, error, addAddress, updateAddress, deleteAddress, setDefault } =
    useAddresses(userId);
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleSave = async (formData, addressId) => {
    setActionError(null);
    if (addressId) await updateAddress(addressId, formData);
    else           await addAddress(formData);
  };
  const handleDelete = async (id) => {
    setActionError(null);
    try { await deleteAddress(id); } catch (err) { setActionError(err.message); }
  };
  const handleSetDefault = async (id) => {
    setActionError(null);
    try { await setDefault(id); } catch (err) { setActionError(err.message); }
  };

  return (
    <>
      {(error || actionError) && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs">
          {error || actionError}
        </div>
      )}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-5 w-5 text-[#c08a4b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="text-3xl mb-2">🏠</div>
            <p className="text-sm font-medium text-[#5c5042]">No saved addresses</p>
            <p className="text-xs text-gray-400 mt-1">Add an address for faster checkout</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {addresses.map((addr) => (
              <div key={addr.id} className="px-4 py-3 hover:bg-[#f8f5f1] transition group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {addr.label && (
                        <span className="bg-[#c08a4b]/10 text-[#c08a4b] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {addr.label === "Home" ? "🏠" : addr.label === "Work" ? "🏢" : "📍"} {addr.label}
                        </span>
                      )}
                      {addr.is_default && (
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Default</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#5c5042] truncate">{addr.full_name}</p>
                    <p className="text-xs text-gray-500">{addr.phone}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {addr.street}, {addr.city}, {addr.province} {addr.zip_code}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 mt-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <button onClick={() => { setEditTarget(addr); setShowModal(true); }}
                      className="text-[#c08a4b] hover:bg-[#c08a4b]/10 p-1.5 rounded-lg transition" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!addr.is_default && (
                      <button onClick={() => handleSetDefault(addr.id)}
                        className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition" title="Set default">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button onClick={() => handleDelete(addr.id)}
                      className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="w-full flex items-center justify-center gap-2 bg-[#5c5042] hover:bg-[#4a3f35] text-white py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </button>
      </div>
      {showModal && (
        <AddressModal
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSave={handleSave}
          editAddress={editTarget}
        />
      )}
    </>
  );
};

// ─── Desktop: flyout dropdown ─────────────────────────────────────────────────
const AddressDropdown = ({ userId, onClose }) => {
  const { addresses } = useAddresses(userId);
  return (
    <div
      data-portal="address-dropdown"
      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#f8f5f1] to-white">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span className="font-semibold text-[#5c5042] text-sm">My Addresses</span>
          {addresses.length > 0 && (
            <span className="bg-[#c08a4b]/10 text-[#c08a4b] text-xs font-bold px-2 py-0.5 rounded-full">{addresses.length}</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-[#5c5042] transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <AddressPanel userId={userId} onClose={onClose} />
    </div>
  );
};

// ─── Mobile: bottom sheet via portal ─────────────────────────────────────────
const MobileAddressSheet = ({ userId, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return ReactDOM.createPortal(
    <div data-portal="mobile-sheet" style={{ position: "fixed", inset: 0, zIndex: 99998 }}>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1 }}
        className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="font-bold text-[#5c5042]">My Addresses</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#5c5042] p-1.5 rounded-lg hover:bg-gray-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AddressPanel userId={userId} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Artisan Logo (matches Login page logo exactly) ───────────────────────────
const ArtisanLogo = () => (
  <div className="relative flex-shrink-0">
    {/* Rotated background accent */}
    <div className="w-8 h-8 sm:w-9 sm:h-9 absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl transform rotate-6 opacity-20"></div>
    {/* Main logo square */}
    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center shadow-md relative">
      <span className="text-white font-bold text-sm sm:text-base">A</span>
    </div>
  </div>
);

// ─── LandingLayout ────────────────────────────────────────────────────────────
const LandingLayout = ({ children, onAuthChange, isAuthenticated, userRole }) => {
  const navigate = useNavigate();
  const [cartCount, setCartCount]               = useState(0);
  const [messageCount, setMessageCount]         = useState(0);
  const [userId, setUserId]                     = useState(null);
  const [userName, setUserName]                 = useState("");
  const [showDropdown, setShowDropdown]         = useState(false);
  const [showAddressPanel, setShowAddressPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false);
  const [showMobileSheet, setShowMobileSheet]   = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const u = JSON.parse(user);
      setUserId(u.id);
      setUserName(u.full_name || u.name || "User");
      if (u.role === "buyer") {
        fetchCartCount(u.id);
        fetchMessageCount(u.id);
        const iv = setInterval(() => { fetchCartCount(u.id); fetchMessageCount(u.id); }, 30000);
        return () => clearInterval(iv);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = (e) => {
      const isInsidePortal =
        e.target.closest('[data-portal="address-modal"]') ||
        e.target.closest('[data-portal="mobile-sheet"]');
      if (isInsidePortal) return;

      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAddressPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCartCount = async (uid) => {
    try { const r = await fetch(`${API_BASE_URL}/cart/${uid}/count`); if (r.ok) { const d = await r.json(); setCartCount(d.total_items || 0); } } catch (e) { console.error(e); }
  };
  const fetchMessageCount = async (uid) => {
    try {
      const r = await fetch(`${API_BASE_URL}/messages/user/${uid}`);
      if (r.ok) { const d = await r.json(); if (d.success && d.conversations) setMessageCount(d.conversations.reduce((s, c) => s + (c.unread_count || 0), 0)); }
    } catch (e) { console.error(e); }
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    setCartCount(0); setMessageCount(0); setUserId(null); setUserName("");
    setShowDropdown(false); setShowAddressPanel(false); setMobileMenuOpen(false); setShowMobileSheet(false);
    if (onAuthChange) onAuthChange(false, null, null);
    navigate("/login");
  };
  const handleCartClick = () => {
    if (!isAuthenticated || userRole !== "buyer") { alert("Please login as a buyer"); navigate("/login"); return; }
    setMobileMenuOpen(false); navigate("/buyer/cart");
  };
  const handleMessagesClick = () => {
    if (!isAuthenticated || userRole !== "buyer") { alert("Please login as a buyer"); navigate("/login"); return; }
    setMobileMenuOpen(false); navigate("/buyer/cart?tab=messages");
  };
  const handleProfileClick = () => {
    setShowDropdown(false); setShowAddressPanel(false); setMobileMenuOpen(false);
    navigate("/buyer/profile");
  };
  const handleMobileAddressClick = () => {
    setMobileMenuOpen(false);
    setShowMobileSheet(true);
  };

  const MsgIcon = ({ sz }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
  const CartIcon = ({ sz }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#f8f5f1] flex flex-col">
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">

            {/* ── Brand: Logo + Wordmark ── */}
            <Link to="/buyer" className="flex items-center gap-2.5 flex-shrink-0 group">
              <ArtisanLogo />
              <span className="text-2xl md:text-3xl lg:text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent duration-200">
                Artisan
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-4 lg:gap-8">
              <Link to="/buyer" className="text-sm lg:text-base text-[#5c5042] hover:text-[#c08a4b] font-medium transition">Home</Link>
              <Link to="/buyer/products" className="text-sm lg:text-base text-[#5c5042] hover:text-[#c08a4b] font-medium transition">Products</Link>
            </div>

            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <button onClick={handleMessagesClick} className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2" title="Messages">
                <MsgIcon sz="h-5 w-5 lg:h-6 lg:w-6" />
                {isAuthenticated && userRole === "buyer" && messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{messageCount > 99 ? "99+" : messageCount}</span>
                )}
              </button>
              <button onClick={handleCartClick} className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2" title="Cart">
                <CartIcon sz="h-5 w-5 lg:h-6 lg:w-6" />
                {isAuthenticated && userRole === "buyer" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </button>

              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => { setShowDropdown(!showDropdown); setShowAddressPanel(false); }}
                    className="flex items-center gap-2 text-sm text-[#5c5042] hover:text-[#c08a4b] transition">
                    <span className="font-semibold hidden lg:inline max-w-[120px] truncate">Welcome, {userName}</span>
                    <span className="font-semibold lg:hidden">{userName.split(" ")[0]}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <button onClick={handleProfileClick} className="w-full text-left px-4 py-2.5 text-sm text-[#5c5042] hover:bg-gray-50 transition flex items-center gap-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#c08a4b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </button>

                      <button onClick={() => setShowAddressPanel(!showAddressPanel)}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#5c5042] hover:bg-gray-50 transition flex items-center gap-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#c08a4b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        My Addresses
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ml-auto transition-transform ${showAddressPanel ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {showAddressPanel && userId && (
                        <AddressDropdown userId={userId} onClose={() => setShowAddressPanel(false)} />
                      )}

                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition flex items-center gap-2.5">
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
                  <button className="bg-[#a48a6d] text-white px-4 lg:px-5 py-2 rounded shadow font-medium hover:bg-[#c08a4b] transition text-sm lg:text-base whitespace-nowrap">Sign In</button>
                </Link>
              )}
            </div>

            {/* Mobile icons */}
            <div className="flex md:hidden items-center gap-3">
              <button onClick={handleMessagesClick} className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2">
                <MsgIcon sz="h-6 w-6" />
                {isAuthenticated && userRole === "buyer" && messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{messageCount > 99 ? "99+" : messageCount}</span>
                )}
              </button>
              <button onClick={handleCartClick} className="text-[#5c5042] hover:text-[#c08a4b] transition relative p-2">
                <CartIcon sz="h-6 w-6" />
                {isAuthenticated && userRole === "buyer" && cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#5c5042] hover:text-[#c08a4b] transition p-2">
                {mobileMenuOpen
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Mobile hamburger menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              <Link to="/buyer" onClick={() => setMobileMenuOpen(false)} className="block text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition">Home</Link>
              <Link to="/buyer/products" onClick={() => setMobileMenuOpen(false)} className="block text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition">Products</Link>
              <div className="border-t border-gray-200 pt-3">
                {isAuthenticated ? (
                  <>
                    <div className="text-sm font-semibold text-[#5c5042] mb-2">Welcome, {userName}</div>
                    <button onClick={handleProfileClick} className="w-full text-left text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Profile
                    </button>
                    <button onClick={handleMobileAddressClick} className="w-full text-left text-[#5c5042] hover:text-[#c08a4b] font-medium py-2 transition flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      My Addresses
                    </button>
                    <button onClick={handleSignOut} className="w-full text-left text-red-600 hover:text-red-700 font-medium py-2 transition flex items-center gap-2 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <button className="w-full bg-[#a48a6d] text-white px-5 py-2.5 rounded shadow font-medium hover:bg-[#c08a4b] transition">Sign In</button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 w-full">{children}</main>

      {/* Mobile bottom sheet — portal renders outside nav, above everything */}
      {showMobileSheet && userId && (
        <MobileAddressSheet userId={userId} onClose={() => setShowMobileSheet(false)} />
      )}

      <footer className="bg-[#5c5042] text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div>
              {/* Footer brand with logo */}
              <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl transform rotate-6 opacity-30"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md relative">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">Artisan</h3>
              </div>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">Discover handcrafted treasures from artisans around the world.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-base sm:text-lg">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/buyer" className="text-gray-300 hover:text-[#c08a4b] transition text-sm sm:text-base">Home</Link></li>
                <li><Link to="/buyer/products" className="text-gray-300 hover:text-[#c08a4b] transition text-sm sm:text-base">Products</Link></li>
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="font-semibold mb-3 text-base sm:text-lg">Contact</h4>
              <p className="text-gray-300 text-sm sm:text-base mb-1">Email: support@artisan.com</p>
              <p className="text-gray-300 text-sm sm:text-base">Phone: (123) 456-7890</p>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-600 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">&copy; 2025 Artisan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingLayout;