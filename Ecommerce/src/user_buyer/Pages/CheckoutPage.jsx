import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const CheckoutPage = ({ userId }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form data
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const currentUserId = userId || JSON.parse(localStorage.getItem('user') || '{}').id;

  const steps = [
    { id: 1, name: 'Shipping Info' },
    { id: 2, name: 'Review' },
    { id: 3, name: 'Payment' },
    { id: 4, name: 'Confirmation' },
  ];

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    fetchCartItems();
  }, [currentUserId]);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch cart items');
      const data = await response.json();
      setCartItems(data.cart_items || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.price || item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0).toFixed(2);
  };

  const calculateTax = () => {
    const subtotal = parseFloat(calculateSubtotal());
    return (subtotal * 0.12).toFixed(2); // 12% tax
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const tax = parseFloat(calculateTax());
    return (subtotal + tax).toFixed(2);
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    // Validate shipping info
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.phone || !shippingInfo.address) {
      alert('Please fill in all required fields');
      return;
    }
    setCurrentStep(2);
  };

  const handlePaymentSubmit = () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    // Process order
    processOrder();
  };

  const processOrder = async () => {
    try {
      setLoading(true);
      
      // Prepare order data
      const orderData = {
        user_id: currentUserId,
        shipping_info: shippingInfo,
        payment_method: paymentMethod,
        cart_items: cartItems,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        shipping_fee: 0, // Free shipping
        total: calculateTotal(),
      };

      // Send order to backend API
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process order');
      }

      const data = await response.json();

      // Set order confirmation with data from backend
      setOrderConfirmation({
        orderNumber: data.order.order_number,
        orderId: data.order.id,
        date: new Date(data.order.order_date).toLocaleDateString(),
        ...orderData
      });

      setCurrentStep(4);
      setLoading(false);

    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to process order. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar */}
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      currentStep >= step.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep >= step.id ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 transition-all ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Step 1: Shipping Information */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Shipping Information</h2>
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={shippingInfo.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={shippingInfo.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="juan@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingInfo.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="123 Main Street, Barangay Sample"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Manila"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province *
                    </label>
                    <input
                      type="text"
                      name="province"
                      value={shippingInfo.province}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Metro Manila"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={shippingInfo.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold text-lg shadow-lg"
                >
                  Continue to Review
                </button>
              </form>
            </div>

            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="font-bold text-gray-900 mb-4">Shipping & Privacy</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p>Free shipping on orders over ₱1,000</p>
                  </div>
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p>Your information is secure and encrypted</p>
                  </div>
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p>Order confirmation will be sent to your email</p>
                  </div>
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p>We never share your personal information</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Order Review */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Order Review</h2>

              {/* Products */}
              <div className="space-y-4 mb-8">
                {cartItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-6 flex gap-4">
                    <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.product_image ? (
                        <img
                          src={item.product.product_image}
                          alt={item.product.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.product?.product_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">Quantity: {item.quantity}</p>
                      <p className="text-lg font-bold text-gray-900">
                        ₱{((item.price || item.product?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Back to Shipping
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg"
                >
                  Continue to Payment
                </button>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="font-bold text-gray-900 mb-4">Shipping Details</h3>
                <div className="space-y-2 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
                  <p className="font-medium text-gray-900">{shippingInfo.fullName}</p>
                  <p>{shippingInfo.email}</p>
                  <p>{shippingInfo.phone}</p>
                  <p>{shippingInfo.address}</p>
                  <p>{shippingInfo.city}, {shippingInfo.province} {shippingInfo.postalCode}</p>
                </div>

                <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₱{calculateSubtotal()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (12%)</span>
                    <span className="font-medium">₱{calculateTax()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-green-600">₱{calculateTotal()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Select Payment Method</h2>

            <div className="space-y-4 mb-8">
              {/* GCash */}
              <button
                onClick={() => setPaymentMethod('gcash')}
                className={`w-full p-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'gcash'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">G</span>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">GCash</h3>
                    <p className="text-sm text-gray-600">Pay securely with your GCash account</p>
                  </div>
                  {paymentMethod === 'gcash' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* PayPal */}
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`w-full p-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">P</span>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">PayPal</h3>
                    <p className="text-sm text-gray-600">Pay with your PayPal account</p>
                  </div>
                  {paymentMethod === 'paypal' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Cash on Delivery */}
              <button
                onClick={() => setPaymentMethod('cod')}
                className={`w-full p-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">Cash on Delivery</h3>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                  {paymentMethod === 'cod' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-3xl font-bold text-green-600">₱{calculateTotal()}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Back to Review
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={!paymentMethod}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Complete Order
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && orderConfirmation && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
              <p className="text-gray-600">Thank you for your purchase</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-8 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="font-bold text-gray-900">{orderConfirmation.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="font-bold text-gray-900">{orderConfirmation.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-bold text-gray-900 capitalize">{paymentMethod.replace('-', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="font-bold text-green-600 text-xl">₱{calculateTotal()}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-2">Shipping To:</p>
                <p className="font-medium text-gray-900">{shippingInfo.fullName}</p>
                <p className="text-sm text-gray-600">{shippingInfo.address}</p>
                <p className="text-sm text-gray-600">{shippingInfo.city}, {shippingInfo.province}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-gray-600">
                A confirmation email has been sent to <span className="font-medium">{shippingInfo.email}</span>
              </p>
              <button
                onClick={() => navigate('/buyer/products')}
                className="w-full bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate('/buyer/orders')}
                className="w-full bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                View My Orders
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;