import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';
// const API_BASE_URL = 'http://localhost:5000/api';

const CheckoutPage = ({ userId }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

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
    return (subtotal * 0.12).toFixed(2);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(calculateSubtotal());
    const tax = parseFloat(calculateTax());
    return (subtotal + tax).toFixed(2);
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.phone || !shippingInfo.address) {
      alert('Please fill in all required fields');
      return;
    }
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Check minimum amount for online payments
    const total = parseFloat(calculateTotal());
    if ((paymentMethod === 'gcash' || paymentMethod === 'card') && total < 100) {
      alert('Minimum order amount for GCash and Card payment is ₱100.00. Please use Cash on Delivery or add more items to your cart.');
      return;
    }

    // If Cash on Delivery, process order directly
    if (paymentMethod === 'cod') {
      processOrder();
      return;
    }

    // For GCash and Card payments, initiate PayMongo payment
    await initiatePayMongoPayment();
  };

  const initiatePayMongoPayment = async () => {
    try {
      setProcessingPayment(true);
      
      const totalAmount = Math.round(parseFloat(calculateTotal()) * 100); // Convert to centavos

      // Validate minimum amount (10000 centavos = ₱100)
      if (totalAmount < 10000) {
        alert('Minimum order amount for online payment is ₱100.00');
        setProcessingPayment(false);
        return;
      }

      // Create payment intent
      const paymentData = {
        amount: totalAmount,
        payment_method: paymentMethod,
        currency: 'PHP',
        description: `Order for ${shippingInfo.fullName}`,
        billing: {
          name: shippingInfo.fullName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: {
            line1: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.province,
            postal_code: shippingInfo.postalCode,
            country: 'PH'
          }
        }
      };

      console.log('Creating payment with amount:', totalAmount, 'centavos (₱' + (totalAmount/100) + ')');

      const response = await fetch(`${API_BASE_URL}/payment/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const data = await response.json();

      // Redirect to PayMongo checkout page
      if (data.checkout_url) {
        // Store order data temporarily (will be used after redirect)
        localStorage.setItem('pendingOrder', JSON.stringify({
          user_id: currentUserId,
          shipping_info: shippingInfo,
          payment_method: paymentMethod,
          cart_items: cartItems,
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          shipping_fee: 0,
          total: calculateTotal(),
          payment_intent_id: data.payment_intent_id
        }));

        // Redirect to PayMongo
        window.location.href = data.checkout_url;
      }

    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to process payment: ' + error.message);
      setProcessingPayment(false);
    }
  };

  const processOrder = async (paymentIntentId = null) => {
    try {
      setLoading(true);
      
      const orderData = {
        user_id: currentUserId,
        shipping_info: shippingInfo,
        payment_method: paymentMethod,
        cart_items: cartItems,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        shipping_fee: 0,
        total: calculateTotal(),
        payment_intent_id: paymentIntentId,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'paid'
      };

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

  // Check for payment success on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentIntentId = urlParams.get('payment_intent_id');
    const sourceId = urlParams.get('source_id');

    console.log('=== PAYMENT REDIRECT CHECK ===');
    console.log('URL:', window.location.href);
    console.log('payment_success:', paymentSuccess);
    console.log('payment_intent_id:', paymentIntentId);
    console.log('source_id:', sourceId);
    console.log('=============================');

    if (paymentSuccess === 'true' && (paymentIntentId || sourceId)) {
      console.log('✅ Payment success detected!');
      
      const pendingOrder = localStorage.getItem('pendingOrder');
      console.log('📦 Pending order from localStorage:', pendingOrder ? 'Found' : 'Not found');
      
      if (pendingOrder) {
        const orderData = JSON.parse(pendingOrder);
        
        console.log('📝 Order data:', orderData);
        
        // Set the state from stored data for UI display
        setShippingInfo(orderData.shipping_info);
        setPaymentMethod(orderData.payment_method);
        setCartItems(orderData.cart_items);
        
        console.log('🚀 Processing order with payment ID:', paymentIntentId || sourceId);
        
        // Process the order using the data from localStorage directly
        // Don't rely on state updates as they're async
        processOrderWithData(orderData, paymentIntentId || sourceId);
        
        // Clear pending order
        localStorage.removeItem('pendingOrder');
        console.log('🧹 Cleared pending order from localStorage');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        console.error('❌ No pending order found in localStorage!');
        alert('Payment successful, but order data was lost. Please contact support with your payment confirmation.');
      }
    }
  }, []);

  // New function to process order with data directly from localStorage
  const processOrderWithData = async (orderData, paymentIntentId) => {
    try {
      setLoading(true);
      
      // If this is a GCash source, create the payment in PayMongo first
      if (paymentIntentId && paymentIntentId.startsWith('src_')) {
        console.log('💳 Creating PayMongo payment from GCash source:', paymentIntentId);
        try {
          const paymentResponse = await fetch(`${API_BASE_URL}/payment/create-payment-from-source`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: paymentIntentId })
          });
          
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            console.log('✅ PayMongo payment created:', paymentData.payment_id);
          } else {
            console.warn('⚠️ Could not create PayMongo payment, but order will still be created');
          }
        } catch (error) {
          console.warn('⚠️ PayMongo payment creation failed:', error.message);
          // Continue with order creation even if PayMongo payment fails
        }
      }
      
      const requestData = {
        user_id: orderData.user_id,
        shipping_info: orderData.shipping_info,
        payment_method: orderData.payment_method,
        cart_items: orderData.cart_items,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        shipping_fee: orderData.shipping_fee || 0,
        total: orderData.total,
        payment_intent_id: paymentIntentId,
        payment_status: orderData.payment_method === 'cod' ? 'pending' : 'paid'
      };

      console.log('📤 Sending order request:', requestData);

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Order creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to process order');
      }

      const data = await response.json();

      console.log('✅ Order created successfully:', data.order.order_number);

      setOrderConfirmation({
        orderNumber: data.order.order_number,
        orderId: data.order.id,
        date: new Date(data.order.order_date).toLocaleDateString(),
        ...requestData
      });

      setCurrentStep(4);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error processing order:', error);
      alert('Failed to create order. Please contact support. Error: ' + error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {processingPayment ? 'Processing payment...' : 'Loading checkout...'}
          </p>
        </div>
      </div>
    );
  }

  // Check if cart total meets minimum for online payment
  const total = parseFloat(calculateTotal());
  const meetsMinimum = total >= 100;

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

            {/* Minimum Amount Warning */}
            {!meetsMinimum && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Minimum Amount Required</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your cart total (₱{calculateTotal()}) is below the ₱100.00 minimum for GCash and Card payments. 
                      Please use Cash on Delivery or add more items to your cart.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              {/* GCash */}
              <button
                onClick={() => setPaymentMethod('gcash')}
                disabled={!meetsMinimum}
                className={`w-full p-6 rounded-lg border-2 transition-all ${
                  !meetsMinimum 
                    ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                    : paymentMethod === 'gcash'
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
                    <p className="text-sm text-gray-600">
                      Pay securely with your GCash account
                      {!meetsMinimum && <span className="block text-red-600 font-medium mt-1">Minimum ₱100.00 required</span>}
                    </p>
                  </div>
                  {paymentMethod === 'gcash' && meetsMinimum && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Card Payment */}
              {/* <button
                onClick={() => setPaymentMethod('card')}
                disabled={!meetsMinimum}
                className={`w-full p-6 rounded-lg border-2 transition-all ${
                  !meetsMinimum
                    ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                    : paymentMethod === 'card'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">Credit/Debit Card</h3>
                    <p className="text-sm text-gray-600">
                      Pay with Visa, Mastercard, or other cards
                      {!meetsMinimum && <span className="block text-red-600 font-medium mt-1">Minimum ₱100.00 required</span>}
                    </p>
                  </div>
                  {paymentMethod === 'card' && meetsMinimum && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button> */}

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

            {/* Security Notice */}
            {(paymentMethod === 'gcash' || paymentMethod === 'card') && meetsMinimum && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-800">
                    You will be redirected to a secure payment page to complete your transaction.
                  </p>
                </div>
              </div>
            )}

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
                disabled={!paymentMethod || processingPayment}
                className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 transition font-semibold shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Processing...' : 'Complete Order'}
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
              {/* <p className="text-gray-600">
                A confirmation email has been sent to <span className="font-medium">{shippingInfo.email}</span>
              </p> */}
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