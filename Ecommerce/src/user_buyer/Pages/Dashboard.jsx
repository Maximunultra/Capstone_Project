import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PromotionPopup from '../../Components/PromotionPopup';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const BuyerDashboard = ({ userId, userRole }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [modalAction, setModalAction] = useState('');

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;
  const currentUserRole = userRole || JSON.parse(localStorage.getItem('user') || '{}').role;

  const categories = [
    { id: 'all', label: 'All Collections' },
    { id: 'Accessories', label: 'Accessories' },
    { id: 'Home Decor', label: 'Home Decor' },
    { id: 'Kitchen', label: 'Kitchen' },
    { id: 'Clothing', label: 'Clothing' },
  ];

  // Fetch featured products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', 6);
      params.append('offset', 0);
      params.append('buyer_view', 'true'); // ✅ Only fetch approved and active products
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      
      // Prioritize featured products
      let sortedProducts = data.products || [];
      sortedProducts.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
      
      setProducts(sortedProducts.slice(0, 6));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const openModal = (product, action, e) => {
    e.stopPropagation();
    if (!currentUserId) {
      alert(action === 'cart' ? 'Please login to add items to cart' : 'Please login to make a purchase');
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setModalAction(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setQuantity(1);
    setModalAction('');
  };

  const increaseQuantity = () => {
    if (selectedProduct && quantity < selectedProduct.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: currentUserId, 
          product_id: selectedProduct.id, 
          quantity: quantity 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process request');
      }

      closeModal();

      if (modalAction === 'cart') {
        alert('Product added to cart successfully!');
      } else if (modalAction === 'buynow') {
        navigate('/buyer/checkout');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/buyer/products/${productId}`);
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount || discount === 0) return price;
    return (price - (price * discount / 100)).toFixed(2);
  };

  const getProductPrice = (product) => {
    if (product.discount_percentage > 0) {
      return calculateDiscountedPrice(product.price, product.discount_percentage);
    }
    return product.price;
  };

  const getTotalPrice = () => {
    if (!selectedProduct) return '0.00';
    const price = parseFloat(getProductPrice(selectedProduct));
    return (price * quantity).toFixed(2);
  };

  return (
    <>
      <PromotionPopup />
      <script src="//code.tidio.co/oxfymapkn0deunkpds95jghx4ah8ev1k.js" async></script>
      
      <div className="min-h-screen bg-[#f9f7f4]">
              
        {/* Hero Section - Fully Responsive */}
        <section className="relative bg-gradient-to-br from-[#f5f1eb] to-[#ebe5dc] py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 overflow-hidden">
          {/* Decorative Elements - Responsive sizing */}
          <div className="absolute top-[15%] sm:top-[20%] left-[3%] sm:left-[5%] w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-radial from-[#a48a6d]/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-[10%] sm:bottom-[15%] right-[5%] sm:right-[8%] w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 rounded-full bg-gradient-radial from-[#c4b29c]/8 to-transparent pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Badge - Responsive */}
            <div className="inline-block bg-[#ebe5dc] text-[#8b7355] px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 shadow-sm tracking-wider uppercase animate-fadeInDown">
              Discover Handcrafted Excellence
            </div>

            {/* Main Headline - Responsive typography */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-[#3d3328] mb-4 sm:mb-6 leading-tight animate-fadeInUp animation-delay-200">
              <span className="text-[#a48a6d]">Artisan</span> Creations
              <br />
              from Local Masters
            </h1>

            {/* Subheadline - Responsive text */}
            <p className="text-base sm:text-lg md:text-xl text-[#6b5d4f] mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 animate-fadeInUp animation-delay-400">
              A curated marketplace celebrating extraordinary handmade treasures 
              crafted by talented artisans from Legazpi City and the Bicol region.
            </p>

            {/* CTA Buttons - Responsive stacking */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 animate-fadeInUp animation-delay-600">
              <button 
                onClick={() => navigate('/buyer/products')}
                className="w-full sm:w-auto bg-[#a48a6d] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:bg-[#8b7355] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-sm sm:text-base"
              >
                Explore Collection
              </button>
            </div>
          </div>

          {/* Scroll Indicator - Hidden on small screens */}
          <div className="mt-12 sm:mt-16 md:mt-20 animate-bounce hidden sm:block">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a48a6d" strokeWidth="2" className="mx-auto">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
          </div>
        </section>

        {/* Featured Products Section - Responsive */}
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          {/* Section Header - Responsive */}
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#3d3328] mb-3 sm:mb-4">
              Featured Collections
            </h2>
            <p className="text-base sm:text-lg text-[#6b5d4f] px-4">
              Each piece tells a story of tradition, skill, and heritage
            </p>
          </div>

          {/* Category Filter Pills - Responsive with horizontal scroll */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 px-2 scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 sm:px-5 md:px-7 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-[#ebe5dc] border-2 border-[#a48a6d] text-[#a48a6d]'
                      : 'bg-transparent border-2 border-[#d4cdc3] text-[#6b5d4f] hover:border-[#a48a6d] hover:text-[#a48a6d]'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid - Responsive columns */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#d4cdc3] border-t-[#8b7355] rounded-full animate-spin"></div>
              <p className="text-[#8b7d6b] mt-4 text-sm sm:text-base">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 sm:p-16 text-center shadow-sm">
              <p className="text-[#8b7d6b] text-base sm:text-lg">No products found</p>
              <p className="text-[#a69c8e] mt-2 text-sm sm:text-base">Try selecting a different category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                >
                  {/* Product Image - Responsive height */}
                  <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-[#f5f1eb] overflow-hidden">
                    {product.product_image ? (
                      <img
                        src={product.product_image}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#a48a6d]/10 to-[#d4cdc3]/10" />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 sm:h-20 sm:w-20 text-[#c4b29c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}

                    {/* Badges - Responsive positioning */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1.5 sm:gap-2">
                      {product.is_featured && (
                        <span className="bg-yellow-500 text-white text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold shadow-md">
                          Featured
                        </span>
                      )}
                      {product.discount_percentage > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold shadow-md">
                          -{product.discount_percentage}%
                        </span>
                      )}
                    </div>

                    {product.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg">
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info - Responsive padding */}
                  <div className="p-4 sm:p-5 md:p-6">
                    {/* Category Tag */}
                    {product.category && (
                      <div className="inline-block bg-[#ebe5dc] text-[#a48a6d] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold mb-2 sm:mb-3 uppercase tracking-wide">
                        {product.category}
                      </div>
                    )}

                    {/* Product Name - Responsive text size */}
                    <h3 className="font-serif font-semibold text-[#3d3328] mb-2 text-lg sm:text-xl line-clamp-2 min-h-[48px] sm:min-h-[56px]" title={product.product_name}>
                      {product.product_name}
                    </h3>

                    {/* Description - Hidden on very small screens */}
                    {product.description && (
                      <p className="hidden sm:block text-sm text-[#6b5d4f] mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
                        {product.description || "Handcrafted with traditional techniques and modern design sensibility"}
                      </p>
                    )}

                    {/* Price and Stock - Responsive layout */}
                    <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mb-4 sm:mb-5 pt-3 sm:pt-4 border-t border-[#ebe5dc]">
                      <div>
                        {product.discount_percentage > 0 ? (
                          <div className="flex items-baseline gap-1.5 sm:gap-2">
                            <span className="text-xl sm:text-2xl font-bold text-[#a48a6d] font-serif">
                              ₱{calculateDiscountedPrice(product.price, product.discount_percentage)}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400 line-through">
                              ₱{product.price}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-[#a48a6d] font-serif">
                            ₱{product.price}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#8b7d6b]">
                        {product.stock_quantity} in stock
                      </div>
                    </div>

                    {/* Rating */}
                    {product.rating_average > 0 && (
                      <div className="flex items-center mb-4 sm:mb-5">
                        <span className="text-yellow-500 text-sm sm:text-base mr-1">★</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#3d3328]">{product.rating_average}</span>
                        <span className="text-xs text-[#8b7d6b] ml-1">
                          ({product.rating_count})
                        </span>
                      </div>
                    )}

                    {/* Action Buttons - Responsive sizing */}
                    {currentUserRole === 'buyer' && product.stock_quantity > 0 && (
                      <div className="flex gap-2 sm:gap-3">
                        <button
                          onClick={(e) => openModal(product, 'cart', e)}
                          className="flex-shrink-0 bg-white border-2 border-[#d4cdc3] hover:border-[#a48a6d] hover:bg-[#ebe5dc] text-[#a48a6d] p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300"
                          title="Add to Cart"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>

                        <button
                          onClick={(e) => openModal(product, 'buynow', e)}
                          className="flex-1 bg-[#a48a6d] hover:bg-[#8b7355] text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg"
                        >
                          Buy Now
                        </button>
                      </div>
                    )}

                    {currentUserRole === 'buyer' && product.stock_quantity === 0 && (
                      <div className="text-center py-2 sm:py-3 text-xs sm:text-sm text-[#8b7d6b]">
                        Currently unavailable
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View All Button - Responsive */}
          {!loading && products.length > 0 && (
            <div className="text-center mt-8 sm:mt-10 md:mt-12">
              <button 
                onClick={() => navigate('/buyer/products')}
                className="w-full sm:w-auto bg-[#a48a6d] text-white px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:bg-[#8b7355] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-sm sm:text-base"
              >
                View All Products
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Quantity Selection Modal - Fully Responsive */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header - Responsive */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {modalAction === 'cart' ? 'Add to Cart' : 'Buy Now'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Responsive */}
            <div className="p-4 sm:p-6">
              {/* Product Preview - Responsive */}
              <div className="flex gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.product_image ? (
                    <img src={selectedProduct.product_image} alt={selectedProduct.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{selectedProduct.product_name}</h3>
                  {selectedProduct.category && <p className="text-xs sm:text-sm text-gray-500 mb-2">{selectedProduct.category}</p>}
                  <div>
                    {selectedProduct.discount_percentage > 0 ? (
                      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-bold text-green-600">
                          ₱{calculateDiscountedPrice(selectedProduct.price, selectedProduct.discount_percentage)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-400 line-through">₱{selectedProduct.price}</span>
                      </div>
                    ) : (
                      <span className="text-lg sm:text-xl font-bold text-gray-900">₱{selectedProduct.price}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Selector - Responsive */}
              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Quantity</label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <button 
                    onClick={decreaseQuantity} 
                    disabled={quantity <= 1} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">{quantity}</span>
                    <p className="text-xs text-gray-500 mt-1">{selectedProduct.stock_quantity} available</p>
                  </div>
                  <button 
                    onClick={increaseQuantity} 
                    disabled={quantity >= selectedProduct.stock_quantity} 
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 rounded-lg font-bold text-lg sm:text-xl transition touch-manipulation"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Price - Responsive */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-5 sm:mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-600 font-medium">Total Price:</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">₱{getTotalPrice()}</span>
                </div>
              </div>

              {/* Action Buttons - Responsive stacking */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button 
                  onClick={closeModal} 
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm} 
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium transition text-sm sm:text-base touch-manipulation"
                >
                  {modalAction === 'cart' ? 'Add to Cart' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Crimson+Text:wght@400;600&display=swap');

        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        /* Hide scrollbar for category pills */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Touch-friendly buttons */
        .touch-manipulation {
          touch-action: manipulation;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.6s ease-out;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          animation-fill-mode: both;
        }

        /* Extra small breakpoint for very small devices */
        @media (min-width: 475px) {
          .xs\:flex-row {
            flex-direction: row;
          }
          .xs\:items-center {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
};

export default BuyerDashboard;