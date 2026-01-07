import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

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
    
    // Show promotions if not seen in last 24 hours
    if (!lastSeen || (now - parseInt(lastSeen)) > 24 * 60 * 60 * 1000) {
      if (activePromotions.length > 0) {
        setTimeout(() => setIsVisible(true), 2000); // Show after 2 seconds
      }
    }
  }, [activePromotions]);

  const fetchActivePromotions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/promotions/active`);
      if (!response.ok) throw new Error('Failed to fetch promotions');
      
      const data = await response.json();
      // Filter only approved and currently active promotions
      const now = new Date();
      const active = (data.promotions || []).filter(p => 
        p.status === 'approved' && 
        new Date(p.start_date) <= now && 
        new Date(p.end_date) >= now
      );
      setActivePromotions(active);
    } catch (error) {
      console.error('Error fetching active promotions:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('promotions_last_seen', Date.now().toString());
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
        onClick={handleClose}
      />

      {/* Popup Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Image Section */}
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-8 flex items-center justify-center">
              {/* Promotion Type Badge */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold uppercase">
                  {currentPromotion.promotion_type}
                </span>
              </div>

              {/* Main Product Image */}
              <div className="relative">
                {(currentPromotion.banner_image || product?.product_image) ? (
                  <img
                    src={currentPromotion.banner_image || product.product_image}
                    alt={product?.product_name}
                    className="w-full max-h-96 object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="w-64 h-64 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <span className="text-white text-8xl">🎉</span>
                  </div>
                )}

                {/* Floating Discount Badge */}
                {currentPromotion.discount_percentage > 0 && (
                  <div className="absolute -top-6 -right-6 bg-red-500 text-white rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-2xl animate-bounce">
                    <span className="text-3xl font-bold">{currentPromotion.discount_percentage}%</span>
                    <span className="text-xs font-semibold">OFF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Content Section */}
            <div className="p-8 flex flex-col">
              {/* Promotion Title */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentPromotion.promotion_title}
                </h2>
                <p className="text-gray-600">
                  {currentPromotion.promotion_description}
                </p>
              </div>

              {/* Product Info */}
              {product && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.product_name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{product.category}</p>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-3 mb-3">
                    {currentPromotion.discount_percentage > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-green-600">
                          ${calculateDiscountedPrice(product.price, currentPromotion.discount_percentage)}
                        </span>
                        <span className="text-2xl text-gray-500 line-through">
                          ${product.price}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900">
                        ${product.price}
                      </span>
                    )}
                  </div>

                  {/* Savings Info */}
                  {currentPromotion.discount_percentage > 0 && (
                    <p className="text-green-600 font-semibold">
                      You save ${(product.price - calculateDiscountedPrice(product.price, currentPromotion.discount_percentage)).toFixed(2)}!
                    </p>
                  )}
                </div>
              )}

              {/* Promotion Period */}
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-yellow-900">Limited Time Offer!</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Ends: {new Date(currentPromotion.end_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Call to Action */}
              <div className="mt-auto space-y-3">
                <button
                  onClick={handleViewProduct}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  View Product Now →
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold transition"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleDontShowAgain}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-4 rounded-lg text-sm transition"
                  >
                    Don't Show for 7 Days
                  </button>
                </div>
              </div>

              {/* Navigation Dots */}
              {activePromotions.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                  <button
                    onClick={handlePrevious}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <div className="flex gap-2">
                    {activePromotions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          idx === currentIndex ? 'w-8 bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNext}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </>
  );
};

export default PromotionPopup;