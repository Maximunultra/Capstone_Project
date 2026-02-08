// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

// Admin Components
import AdminDashboard from "./admin/Pages/Dashboard";
import AdminLayout from "./admin/Components/Layout";
import UsersManager from "./admin/Pages/Seller";
import AdminAnalytics from "./admin/Pages/AdminAnalytics";  
// Buyer Components
import BuyerDashboard from "./user_buyer/Pages/Dashboard";
import LandingLayout from "./user_buyer/Components/LandingLayout";
import Productlistpage from "./user_buyer/Pages/Productlistpage";
import CartPage from "./user_buyer/Pages/CartPage";
import CheckoutPage from "./user_buyer/Pages/CheckoutPage";
import OrdersPage from "./user_buyer/Pages/OrdersPage";
import OrderDetailsPage from "./user_buyer/Pages/OrderDetailsPage";
import MessagesPage from './user_buyer/Pages/MessagesPage';
// Seller Components
import SellerDashboard from "./user_seller/Pages/Dashboard";
import SellerLayout from "./user_seller/Components/Layout";
import SellerOrderManagement from "./user_seller/Pages/Sellerordermanagement";
import SellerAnalytics from "./user_seller/Pages/Selleranalytics";
import SellerMessagesPage from "./user_seller/Pages/SellerMessagesPage";
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

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setUserRole(userData.role);
      setUserId(userData.id);
      
      // Debug log
      console.log('🔐 Loaded user:', userData);
    }
  }, []);

  const handleAuthChange = (authStatus, role, id) => {
    setIsAuthenticated(authStatus);
    setUserRole(role);
    setUserId(id);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onAuthChange={handleAuthChange} />} />

        {/* Registration Route */}
        <Route 
          path="/register" 
          element={<Register onAuthChange={handleAuthChange} />} 
        />
        <Route 
          path="/forgot-password" 
          element={<ForgotPassword />} 
        />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="admin" userRole={userRole}>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                
                {/* Admin Product Routes */}
                <Route 
                  path="/products" 
                  element={<ProductListPage userId={userId} userRole={userRole} />} 
                />
                <Route 
                  path="/products/:id" 
                  element={<ProductDetailPage />} 
                />
                <Route 
                  path="/products/:id/edit" 
                  element={<ProductEditPage />} 
                />
                
                {/* Admin Promotion Routes */}
                <Route 
                  path="/promotions" 
                  element={<PromotionManagementPage />} 
                />
                <Route 
                  path="/promotions/create" 
                  element={<PromotionRequestPage />} 
                />
                
                {/* Admin Users Management */}
                <Route 
                  path="/users" 
                  element={<UsersManager />} 
                />

                {/* Admin Orders Management */}
                <Route 
                  path="/orders" 
                  element={<SellerOrderManagement />} 
                />

                {/* Admin Analytics */}
                <Route 
                  path="/analytics" 
                  element={<AdminAnalytics />} 
                />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        } />

        {/* Seller Routes */}
        <Route path="/seller/*" element={
          <PrivateRoute isAuthenticated={isAuthenticated} allowedRole="seller" userRole={userRole}>
            <SellerLayout>
              <Routes>
                <Route path="/" element={<SellerDashboard />} />
                <Route path="/dashboard" element={<SellerDashboard />} />
                
                {/* Seller Product Routes */}
                <Route 
                  path="/products" 
                  element={<ProductListPage userId={userId} userRole={userRole} />} 
                />
                <Route 
                  path="/products/:id" 
                  element={<ProductDetailPage />} 
                />
                <Route 
                  path="/products/:id/edit" 
                  element={<ProductEditPage />} 
                />
                
                {/* Seller Promotion Routes */}
                <Route 
                  path="/promotions" 
                  element={<PromotionManagementPage />} 
                />
                <Route 
                  path="/promotions/create" 
                  element={<PromotionRequestPage />} 
                />

                {/* Seller Orders Management */}
                <Route 
                  path="/orders" 
                  element={<SellerOrderManagement />} 
                />

                {/* Seller Analytics */}
                <Route 
                  path="/analytics" 
                  element={<SellerAnalytics />} 
                />
                <Route 
                  path="/messages" 
                  element={<SellerMessagesPage />} 
                />
              </Routes>
            </SellerLayout>
          </PrivateRoute>
        } />

        {/* Buyer Routes - Default for authenticated buyers and public access */}
        <Route path="/buyer/*" element={
          <LandingLayout onAuthChange={handleAuthChange} isAuthenticated={isAuthenticated} userRole={userRole}>
            <Routes>
              <Route path="/" element={<BuyerDashboard />} />
              
              {/* Buyer Product Routes (view only) */}
              <Route 
                path="/products" 
                element={<Productlistpage userId={userId} userRole={userRole} />} 
              />
              <Route 
                path="/products/:id" 
                element={<ProductDetailPage />} 
              />
              
              {/* Cart Route */}
              <Route 
                path="/cart" 
                element={<CartPage userId={userId} />} 
              />

              {/* Checkout Route */}
              <Route 
                path="/checkout" 
                element={<CheckoutPage userId={userId} />} 
              />

              {/* Orders Routes */}
              <Route 
                path="/orders" 
                element={<OrdersPage userId={userId} />} 
              />
              <Route 
                path="/order/:orderId" 
                element={<OrderDetailsPage />} 
              />
              <Route path="/messages" element={<MessagesPage />} />
            </Routes>
          </LandingLayout>
        } />

        {/* Default Route - Always show Buyer UI */}
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
  );
};

const PrivateRoute = ({ children, isAuthenticated, allowedRole, userRole }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== allowedRole) return <Navigate to={`/${userRole}`} replace />;
  return children;
};

export default App;