// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import axios from "axios";
// Admin Components
import AdminDashboard from "./admin/Pages/Dashboard";
import AdminLayout from "./admin/Components/Layout";
import UsersManager from "./admin/Pages/Seller";
import AdminAnalytics from "./admin/Pages/AdminAnalytics";  
import AdminProductPage from "./admin/Pages/AdminProductPage";
// Buyer Components
import BuyerDashboard from "./user_buyer/Pages/Dashboard";
import LandingLayout from "./user_buyer/Components/LandingLayout";
import Productlistpage from "./user_buyer/Pages/Productlistpage";
import CartPage from "./user_buyer/Pages/CartPage";
import CheckoutPage from "./user_buyer/Pages/CheckoutPage";
import OrdersPage from "./user_buyer/Pages/OrdersPage";
import OrderDetailsPage from "./user_buyer/Pages/OrderDetailsPage";
import MessagesPage from './user_buyer/Pages/MessagesPage';
import Profile from './user_buyer/Pages/Profile';
// Seller Components
import SellerDashboard from "./user_seller/Pages/Dashboard";
import SellerLayout from "./user_seller/Components/Layout";
import SellerOrderManagement from "./user_seller/Pages/Sellerordermanagement";
import SellerAnalytics from "./user_seller/Pages/Selleranalytics";
import SellerMessagesPage from "./user_seller/Pages/SellerMessagesPage";
import ProfileSeller from "./user_seller/Pages/ProfileSeller";
// Shared Components
import Login from "./Login";
import ForgotPassword from "./Components/ForgotPassword";
import Register from "./UserRegistration";
import UserProfileEdit from "./UserProfileEdit";
// Product Components
import ProductListPage from "./user_seller/Pages/ProductList";
import ProductDetailPage from "./Components/ProductDetail";
import ProductEditPage from "./user_seller/Components/ProductEdit";
// Promotion Components
import PromotionRequestPage from "./Components/PromotionRequest";
import PromotionManagementPage from "./Components/PromotionManagement";

// ✅ Session Kicked Modal Component
function SessionKickedModal({ onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center">
        
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Session Expired
        </h2>

        {/* Message */}
        <p className="text-gray-500 text-sm mb-6">
          Your account has been logged in on another device. 
          You have been signed out for security reasons.
        </p>

        {/* Button */}
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

const API_URL = "https://capstone-project-1msq.onrender.com";

// Global trigger for axios interceptor to show modal
let triggerSessionModal = null;

// ✅ Global Axios interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "SESSION_INVALIDATED"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (triggerSessionModal) triggerSessionModal();
    }
    return Promise.reject(error);
  }
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false); // ✅ modal state

  // ✅ Register modal trigger for axios interceptor
  useEffect(() => {
    triggerSessionModal = () => {
      setShowSessionModal(true);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
    };
    return () => { triggerSessionModal = null; };
  }, []);

  // ✅ Check session validity on app load
  useEffect(() => {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (user && token) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setUserId(userData.id);

      console.log('🔐 Loaded user:', userData);

      axios.get(`${API_URL}/api/protected/test`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch((err) => {
        if (
          err.response?.status === 401 &&
          err.response?.data?.code === "SESSION_INVALIDATED"
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setShowSessionModal(true);
        }
      });
    }
  }, []);

  // ✅ Check session every 30 seconds
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        clearInterval(interval);
        return;
      }

      axios.get(`${API_URL}/api/protected/test`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch((err) => {
        if (
          err.response?.status === 401 &&
          err.response?.data?.code === "SESSION_INVALIDATED"
        ) {
          clearInterval(interval);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setUserRole(null);
          setUserId(null);
          setShowSessionModal(true);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // ✅ When user clicks "Back to Login" on modal
  const handleSessionModalConfirm = () => {
    setShowSessionModal(false);
    window.location.href = "/login";
  };

  const handleAuthChange = (authStatus, role, id) => {
    setIsAuthenticated(authStatus);
    setUserRole(role);
    setUserId(id);
  };

  return (
    <>
      {/* ✅ Session Modal — renders on top of everything */}
      {showSessionModal && (
        <SessionKickedModal onConfirm={handleSessionModalConfirm} />
      )}

      <Router>
        <Routes>
          <Route path="/login" element={<Login onAuthChange={handleAuthChange} />} />

          {/* Registration Route */}
          <Route path="/register" element={<Register onAuthChange={handleAuthChange} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="admin" userRole={userRole}>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/admin/analytics" replace />} />
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/products" element={<ProductListPage userId={userId} userRole={userRole} />} />
                  <Route path="/products/:id" element={<AdminProductPage userId={userId} userRole={userRole} />} />
                  <Route path="/promotions" element={<PromotionManagementPage />} />
                  <Route path="/promotions/create" element={<PromotionRequestPage />} />
                  <Route path="/users" element={<UsersManager />} />
                  <Route path="/orders" element={<SellerOrderManagement />} />
                  <Route path="/analytics" element={<AdminAnalytics />} />
                </Routes>
              </AdminLayout>
            </PrivateRoute>
          } />

          {/* Seller Routes */}
          <Route path="/seller/*" element={
            <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="seller" userRole={userRole}>
              <SellerLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/seller/analytics" replace />} />
                  <Route path="/dashboard" element={<SellerDashboard />} />
                  <Route path="/products" element={<ProductListPage userId={userId} userRole={userRole} />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/products/:id/edit" element={<ProductEditPage />} />
                  <Route path="/promotions" element={<PromotionManagementPage />} />
                  <Route path="/promotions/create" element={<PromotionRequestPage />} />
                  <Route path="/orders" element={<SellerOrderManagement />} />
                  <Route path="/analytics" element={<SellerAnalytics />} />
                  <Route path="/messages" element={<SellerMessagesPage />} />
                  <Route path="/profile" element={<ProfileSeller />} />
                </Routes>
              </SellerLayout>
            </PrivateRoute>
          } />

          {/* Buyer Routes */}
          <Route path="/buyer/*" element={
            <LandingLayout onAuthChange={handleAuthChange} isAuthenticated={isAuthenticated} userRole={userRole}>
              <Routes>
                <Route path="/" element={<BuyerDashboard />} />
                <Route path="/products" element={<Productlistpage userId={userId} userRole={userRole} />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage userId={userId} />} />
                <Route path="/checkout" element={<CheckoutPage userId={userId} />} />
                <Route path="/orders" element={<OrdersPage userId={userId} />} />
                <Route path="/order/:orderId" element={<OrderDetailsPage />} />
                <Route path="/profile" element={<Profile userId={userId} />} />
                <Route path="/messages" element={<MessagesPage />} />
              </Routes>
            </LandingLayout>
          } />

          {/* Default Route */}
          <Route path="/" element={
            isAuthenticated && userRole !== 'buyer' ? (
              <Navigate to={`/${userRole}`} replace />
            ) : (
              <Navigate to="/buyer" replace />
            )
          } />

          {/* Catch all route */}
          <Route path="*" element={
            isAuthenticated ? (
              <Navigate to={`/${userRole}`} replace />
            ) : (
              <Navigate to="/buyer" replace />
            )
          } />

          {/* Additional Routes */}
          <Route path="/user-profile-edit/:id" element={<UserProfileEdit />} />
        </Routes>
      </Router>
    </>
  );
};

const PrivateRoute = ({ children, isAuthenticated, allowedRole, userRole }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== allowedRole) return <Navigate to={`/${userRole}`} replace />;
  return children;
};

export default App;