import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

// ⚙️ CONFIGURATION - Change these for testing
const SHOW_DELAY_MS = 2000; // Show popup after 2 seconds
const COOLDOWN_MINUTES = 1; // Show again after 1 minute (for testing, change to 1440 for 24 hours in production)

const PromotionPopup = () => {
  const navigate = useNavigate();
  const [activePromotions, setActivePromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchActivePromotions();
  }, []);

  useEffect(() => {
    // Check if user has seen promotions recently
    const lastSeen = localStorage.getItem('promotions_last_seen');
    const now = Date.now();
    
    // Convert cooldown minutes to milliseconds
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    
    // Show promotions if not seen within cooldown period
    if (!lastSeen || (now - parseInt(lastSeen)) > cooldownMs) {
      if (activePromotions.length > 0) {
        console.log('✅ Showing promotion popup...');
        setTimeout(() => setIsVisible(true), SHOW_DELAY_MS);
      }
    } else {
      const timeRemaining = cooldownMs - (now - parseInt(lastSeen));
      const minutesRemaining = Math.ceil(timeRemaining / 60000);
      console.log(`⏱️ Promotion popup on cooldown. Will show again in ${minutesRemaining} minute(s)`);
    }
  }, [activePromotions]);

  const fetchActivePromotions = async () => {
    try {
      console.log('🔍 Fetching active promotions...');
      const response = await fetch(`${API_BASE_URL}/promotions/active`);
      if (!response.ok) throw new Error('Failed to fetch promotions');
      
      const data = await response.json();
      console.log('📦 Received promotions:', data);
      
      // Filter only approved and currently active promotions
      const now = new Date();
      const active = (data.promotions || []).filter(p => 
        p.status === 'approved' && 
        new Date(p.start_date) <= now && 
        new Date(p.end_date) >= now
      );
      
      console.log(`✅ ${active.length} active promotions found`);
      setActivePromotions(active);
    } catch (error) {
      console.error('❌ Error fetching active promotions:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('promotions_last_seen', Date.now().toString());
    console.log('👋 Popup closed. Will show again after cooldown period.');
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activePromotions.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + activePromotions.length) % activePromotions.length);
  };

  const handleViewProduct = () => {
    const promotion = activePromotions[currentIndex];
    if (promotion && promotion.product_id) {
      handleClose();
      navigate(`/buyer/products/${promotion.product_id}`);
    }
  };

  const handleDontShowAgain = () => {
    // Don't show for 7 days
    const sevenDaysFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('promotions_last_seen', sevenDaysFromNow.toString());
    setIsVisible(false);
    console.log('🚫 Popup disabled for 7 days');
  };

  if (!isVisible || activePromotions.length === 0) {
    return null;
  }

  const currentPromotion = activePromotions[currentIndex];
  const product = currentPromotion.products;

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  return (
    <>
      {/* Backdrop - Fixed positioning with fade animation */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 
        Popup Modal Container
        - Mobile: Full screen with padding for safe areas
        - Tablet+: Centered with max width
        - Prevents overflow with overflow-y-auto
      */}
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 md:p-6 pointer-events-none overflow-y-auto">
        <div 
          className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-5xl sm:w-full max-h-screen sm:max-h-[95vh] overflow-y-auto pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* 
            Close Button
            - Mobile: Top-right with safe padding
            - Tablet+: Absolute positioning
            - Touch-friendly size (min 44x44px)
          */}
          <button
            onClick={handleClose}
            className="sticky sm:absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-white/95 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2.5 sm:p-2 shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 ml-auto block sm:inline-block"
            aria-label="Close promotion popup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 
            Main Content Grid
            - Mobile: Single column (stack vertically)
            - Tablet+: Two columns side by side
          */}
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-full sm:min-h-0">
            
            {/* 
              Left Section: Image/Visual Content
              - Mobile: Smaller height, centered
              - Tablet: Medium height
              - Desktop: Full height with gradient
            */}
            <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-6 sm:p-8 md:p-10 lg:p-12 flex items-center justify-center min-h-[250px] sm:min-h-[350px] lg:min-h-[500px]">
              
              {/* Promotion Type Badge - Responsive sizing */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
                <span className="bg-white/25 backdrop-blur-md text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold uppercase shadow-lg">
                  {currentPromotion.promotion_type}
                </span>
              </div>

              {/* Main Product Image Container */}
              <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                {(currentPromotion.banner_image || product?.product_image) ? (
                  <img
                    src={currentPromotion.banner_image || product.product_image}
                    alt={product?.product_name || 'Promotion'}
                    className="w-full h-auto max-h-[200px] sm:max-h-[280px] md:max-h-[350px] lg:max-h-96 object-contain drop-shadow-2xl"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto">
                    <span className="text-white text-6xl sm:text-7xl md:text-8xl" role="img" aria-label="Party popper">🎉</span>
                  </div>
                )}

                {/* 
                  Floating Discount Badge
                  - Responsive sizing and positioning
                  - Hidden on very small screens if needed
                */}
                {currentPromotion.discount_percentage > 0 && (
                  <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-red-500 text-white rounded-full w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex flex-col items-center justify-center shadow-2xl animate-bounce">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold">{currentPromotion.discount_percentage}%</span>
                    <span className="text-[10px] sm:text-xs font-semibold uppercase">OFF</span>
                  </div>
                )}
              </div>
            </div>

            {/* 
              Right Section: Content Details
              - Mobile: Full width with comfortable padding
              - Tablet+: Flex column with proper spacing
            */}
            <div className="p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col bg-white">
              
              {/* Promotion Title & Description */}
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                  {currentPromotion.promotion_title}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {currentPromotion.promotion_description}
                </p>
              </div>

              {/* Product Info Section */}
              {product && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                    {product.product_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 uppercase tracking-wide">
                    {product.category}
                  </p>

                  {/* 
                    Price Display
                    - Responsive text sizing
                    - Flex wrap for smaller screens
                  */}
                  <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2 sm:mb-3">
                    {currentPromotion.discount_percentage > 0 ? (
                      <>
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600">
                          ${calculateDiscountedPrice(product.price, currentPromotion.discount_percentage)}
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl text-gray-500 line-through">
                          ${product.price}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
                        ${product.price}
                      </span>
                    )}
                  </div>

                  {/* Savings Info */}
                  {currentPromotion.discount_percentage > 0 && (
                    <p className="text-sm sm:text-base text-green-600 font-semibold flex items-center gap-1.5">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      You save ${(product.price - calculateDiscountedPrice(product.price, currentPromotion.discount_percentage)).toFixed(2)}!
                    </p>
                  )}
                </div>
              )}

              {/* 
                Promotion Period Banner
                - Responsive padding and text
                - Improved visual hierarchy
              */}
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-yellow-900 text-sm sm:text-base">⚡ Limited Time Offer!</span>
                </div>
                <p className="text-xs sm:text-sm text-yellow-800 ml-6 sm:ml-7">
                  Ends: {new Date(currentPromotion.end_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* 
                Call to Action Buttons
                - Mobile: Stacked vertically with full width
                - Tablet+: Proper spacing
                - Touch-friendly sizing (min 44px height)
              */}
              <div className="mt-auto space-y-3 sm:space-y-4">
                
                {/* Primary CTA Button */}
                <button
                  onClick={handleViewProduct}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 text-white py-3.5 sm:py-4 px-6 rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>View Product Now</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                {/* Secondary Action Buttons - Responsive grid */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={handleClose}
                    className="w-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-colors duration-200 min-h-[44px]"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleDontShowAgain}
                    className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 py-2.5 sm:py-3 px-4 rounded-lg text-xs sm:text-sm transition-colors duration-200 min-h-[44px] font-medium"
                  >
                    Don't Show for 7 Days
                  </button>
                </div>
              </div>

              {/* 
                Navigation Dots (Carousel Control)
                - Only shown if multiple promotions
                - Responsive sizing and spacing
                - Touch-friendly buttons
              */}
              {activePromotions.length > 1 && (
                <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                  
                  {/* Previous Button */}
                  <button
                    onClick={handlePrevious}
                    className="p-2 sm:p-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Previous promotion"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Dot Indicators - Responsive sizing */}
                  <div className="flex gap-1.5 sm:gap-2">
                    {activePromotions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex 
                            ? 'w-6 sm:w-8 bg-blue-600' 
                            : 'w-2 sm:w-2.5 bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to promotion ${idx + 1}`}
                        aria-current={idx === currentIndex ? 'true' : 'false'}
                      />
                    ))}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNext}
                    className="p-2 sm:p-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Next promotion"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 
        CSS Animations
        - Smooth fade-in for backdrop
        - Slide-up animation for modal
        - Hardware-accelerated transforms
      */}
      <style jsx>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
          }
          to { 
            opacity: 1; 
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Custom scrollbar for better UX */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </>
  );
};

export default PromotionPopup;